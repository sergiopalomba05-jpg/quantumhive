/**
 * Video Ingest API Routes
 * 
 * Endpoints para el Ingestador de Videos:
 *   POST /video-ingest/manual     → Recibir URL manual desde la UI
 *   POST /video-ingest/telegram   → Recibir webhook de Telegram
 *   GET  /video-ingest/items      → Listar herramientas del catálogo
 *   GET  /video-ingest/search     → Buscar herramientas por texto
 *   GET  /video-ingest/stats      → Estadísticas del catálogo
 *   GET  /video-ingest/taxonomy   → Divisiones y subdivisiones
 *   POST /video-ingest/items/:id/approve → Aprobar herramienta
 */

import { Router } from 'express';
import { detectVideoSource, normalizeTelegramMessage } from '../../core/videoIngest';
import { buildCatalogIngestionResult, sanitizeCatalogUrl } from '../../core/catalogIngestor';
import {
  saveToolFromAnalysis,
  fetchTools,
  searchTools,
  getCatalogStats,
  fetchTaxonomy,
} from '../../core/videoIngestStore';
import { dbRouter } from '../../core/providers/dbRouter';

export const videoIngestRouter = Router();

function guessToolNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0] || host;
  } catch {
    return 'Herramienta detectada';
  }
}

function isAllowedTelegramChat(chatId: number): boolean {
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed) return true;
  return String(chatId) === allowed;
}

// ─── POST /video-ingest/manual ──────────────────────────────────────
// Recibe un link desde la UI de QuantumCore y lo procesa
videoIngestRouter.post('/video-ingest/manual', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const cleanUrl = sanitizeCatalogUrl(url);
    const sourceType = detectVideoSource(cleanUrl);
    const toolName = guessToolNameFromUrl(cleanUrl);

    const input = {
      sourceType,
      originalUrl: cleanUrl,
      telegram: { chatId: 0, messageId: 0 },
    };

    const analysis = {
      title: toolName,
      summary: `Herramienta detectada desde link manual: ${cleanUrl}`,
      category: 'ai_tool' as const,
      detectedToolName: toolName,
      paraQue: 'Herramienta por clasificar — enviada manualmente al catálogo de QuantumCore',
      detalle: `Link enviado manualmente. Fuente: ${sourceType}. Requiere análisis profundo con Gemini para enriquecer la ficha.`,
      tags: ['manual', sourceType],
      actionableSteps: ['Analizar con Gemini', 'Completar ficha', 'Comparar con similares'],
      confidence: 0.5,
    };

    const result = await saveToolFromAnalysis(input, analysis);

    res.status(202).json({
      ok: true,
      item: {
        id: result.id,
        nombre: toolName,
        repo_url: cleanUrl,
        sourceType,
        status: result.status,
        isDuplicate: result.isDuplicate,
        duplicateOf: result.duplicateOf,
        score: result.catalogResult.score,
        taxonomia: result.catalogResult.taxonomia,
        accionSugerida: result.catalogResult.accionSugerida,
      },
    });
  } catch (err: any) {
    console.error('[videoIngest] Error processing manual ingest:', err);
    res.status(500).json({ error: err.message || 'Error procesando URL' });
  }
});

// ─── POST /video-ingest/telegram ────────────────────────────────────
// Recibe webhook de Telegram
videoIngestRouter.post('/video-ingest/telegram', async (req, res) => {
  const normalized = normalizeTelegramMessage(req.body);
  if (!normalized) {
    res.status(200).json({ ok: true, ignored: true, reason: 'no video url or file found' });
    return;
  }

  if (!isAllowedTelegramChat(normalized.telegram.chatId)) {
    res.status(403).json({ error: 'telegram chat not allowed' });
    return;
  }

  try {
    const cleanUrl = sanitizeCatalogUrl(normalized.originalUrl);
    const toolName = guessToolNameFromUrl(cleanUrl);

    const analysis = {
      title: toolName,
      summary: `Herramienta recibida via Telegram: ${cleanUrl}`,
      category: 'ai_tool' as const,
      detectedToolName: toolName,
      paraQue: 'Herramienta recibida por Telegram — pendiente de análisis con Gemini',
      detalle: `Recibido via Telegram. Chat: ${normalized.telegram.chatId}. Requiere análisis multimodal.`,
      tags: ['telegram', normalized.sourceType],
      actionableSteps: ['Analizar video con Gemini', 'Clasificar herramienta', 'Comparar'],
      confidence: 0.4,
    };

    const result = await saveToolFromAnalysis(normalized, analysis);

    res.status(202).json({
      ok: true,
      item: {
        id: result.id,
        nombre: toolName,
        status: result.status,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (err: any) {
    console.error('[videoIngest] Error processing Telegram ingest:', err);
    res.status(500).json({ error: err.message || 'Error procesando mensaje de Telegram' });
  }
});

// ─── GET /video-ingest/items ────────────────────────────────────────
// Lista herramientas del catálogo (lee de la BD real)
videoIngestRouter.get('/video-ingest/items', async (req, res) => {
  try {
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : undefined;
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const tools = await fetchTools({ categoria, estado, limit });

    // Map to the format the frontend expects
    const items = tools.map((tool) => ({
      id: tool.id,
      sourceType: tool.fuente || 'web',
      originalUrl: tool.repo_url || '',
      displayUrl: tool.repo_url || '',
      status: tool.estado === 'usar' ? 'approved' : tool.estado === 'verificar' ? 'pending_review' : 'queued',
      routedBy: 'dominus' as const,
      ingestorAgentName: 'Ingestador de Videos',
      catalog: {
        status: tool.estado || 'verificar',
        score: { confianza: 60, promedio: tool.calidad ? tool.calidad * 2 : 5 },
        taxonomia: {
          division: tool.categoria || 'Sin clasificar',
          subdivision: '',
          utilidad: tool.para_que || '',
        },
        accionSugerida: tool.estado === 'usar' ? 'publicada en catálogo' : 'pendiente de revisión',
      },
      nombre: tool.nombre,
      para_que: tool.para_que,
      detalle: tool.detalle,
      tags: tool.tags || [],
      createdAt: new Date(tool.creado_en).getTime(),
    }));

    res.json({ items });
  } catch (err: any) {
    console.error('[videoIngest] Error listing items:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /video-ingest/search ───────────────────────────────────────
// Busca herramientas por texto libre
videoIngestRouter.get('/video-ingest/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (!q) {
    res.status(400).json({ error: 'query parameter "q" is required' });
    return;
  }

  try {
    const tools = await searchTools(q);
    res.json({
      query: q,
      count: tools.length,
      herramientas: tools.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        repo_url: t.repo_url,
        para_que: t.para_que,
        categoria: t.categoria,
        estado: t.estado,
        calidad: t.calidad,
        tags: t.tags,
        detalle: t.detalle,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /video-ingest/stats ────────────────────────────────────────
// Estadísticas del catálogo
videoIngestRouter.get('/video-ingest/stats', async (_req, res) => {
  try {
    const stats = await getCatalogStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /video-ingest/taxonomy ─────────────────────────────────────
// Divisiones y subdivisiones del catálogo
videoIngestRouter.get('/video-ingest/taxonomy', async (_req, res) => {
  try {
    const taxonomy = await fetchTaxonomy();
    res.json(taxonomy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /video-ingest/items/:id/approve ───────────────────────────
// Aprobar herramienta (cambiar estado a 'usar')
videoIngestRouter.post('/video-ingest/items/:id/approve', async (req, res) => {
  try {
    const client = dbRouter.getClient('ingest');
    const { data, error } = await client
      .from('herramientas')
      .update({ estado: 'usar' })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      res.status(404).json({ error: 'herramienta no encontrada' });
      return;
    }
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
