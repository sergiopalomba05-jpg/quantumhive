import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { detectVideoSource, normalizeTelegramMessage } from '../../core/videoIngest';
import { buildCatalogIngestionResult, sanitizeCatalogUrl } from '../../core/catalogIngestor';

export const videoIngestRouter = Router();

interface VideoIngestItem {
  id: string;
  sourceType: string;
  originalUrl: string;
  status: 'queued' | 'analyzing' | 'pending_review' | 'approved' | 'failed';
  routedBy: 'dominus';
  displayUrl: string;
  ingestorAgentName: 'Ingestador de Videos';
  catalog: {
    status: string;
    score: { confianza: number; promedio: number };
    taxonomia: { division: string; subdivision: string; utilidad: string };
    accionSugerida: string;
  };
  createdAt: number;
  telegram?: {
    chatId: number;
    messageId: number;
    fromId?: number;
    fileId?: string;
  };
}

const items: VideoIngestItem[] = [];

function guessToolNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0] || host;
  } catch {
    return 'Herramienta detectada';
  }
}

function buildCatalogLoopMetadata(originalUrl: string) {
  const cleanUrl = sanitizeCatalogUrl(originalUrl);
  const sourceType = detectVideoSource(cleanUrl);
  const toolName = guessToolNameFromUrl(cleanUrl);
  const result = buildCatalogIngestionResult({
    input: {
      sourceType,
      originalUrl: cleanUrl,
      telegram: { chatId: 0, messageId: 0 },
    },
    analysis: {
      title: toolName,
      summary: 'Herramienta web detectada desde un link enviado por Sergio al catalogo multimedia.',
      category: 'ai_tool',
      detectedToolName: toolName,
      paraQue: 'Crear interfaces web, automatizar trabajo o enriquecer el catalogo de herramientas de QuantumCore',
      detalle: 'Clasificacion inicial automatica. El analisis profundo con Gemini puede enriquecer precio, calidad y comparativas.',
      tags: ['web', 'herramienta', 'catalogo'],
      actionableSteps: ['Comparar contra herramientas similares', 'Completar ficha si falta informacion'],
      confidence: 0.6,
    },
    existingTools: [],
  });

  return {
    cleanUrl,
    catalog: {
      status: result.estadoCatalogo,
      score: { confianza: result.score.confianza, promedio: result.score.promedio },
      taxonomia: result.taxonomia,
      accionSugerida: result.accionSugerida,
    },
  };
}

function isAllowedTelegramChat(chatId: number): boolean {
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed) return true;
  return String(chatId) === allowed;
}

function enqueueItem(input: Omit<VideoIngestItem, 'id' | 'createdAt' | 'routedBy' | 'status'>): VideoIngestItem {
  const item: VideoIngestItem = {
    ...input,
    id: randomUUID(),
    status: 'queued',
    routedBy: 'dominus',
    createdAt: Date.now(),
  };
  items.unshift(item);
  return item;
}

videoIngestRouter.post('/video-ingest/manual', (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const metadata = buildCatalogLoopMetadata(url);
  const item = enqueueItem({
    sourceType: detectVideoSource(metadata.cleanUrl),
    originalUrl: metadata.cleanUrl,
    displayUrl: metadata.cleanUrl,
    ingestorAgentName: 'Ingestador de Videos',
    catalog: metadata.catalog,
  });

  res.status(202).json({ item });
});

videoIngestRouter.post('/video-ingest/telegram', (req, res) => {
  const input = normalizeTelegramMessage(req.body);
  if (!input) {
    res.status(200).json({ ok: true, ignored: true, reason: 'no video url or file found' });
    return;
  }

  if (!isAllowedTelegramChat(input.telegram.chatId)) {
    res.status(403).json({ error: 'telegram chat not allowed' });
    return;
  }

  const metadata = buildCatalogLoopMetadata(input.originalUrl);
  const item = enqueueItem({
    sourceType: detectVideoSource(metadata.cleanUrl),
    originalUrl: metadata.cleanUrl,
    displayUrl: metadata.cleanUrl,
    ingestorAgentName: 'Ingestador de Videos',
    catalog: metadata.catalog,
    telegram: input.telegram,
  });

  res.status(202).json({ ok: true, item });
});

videoIngestRouter.get('/video-ingest/items', (_req, res) => {
  res.json({ items });
});

videoIngestRouter.post('/video-ingest/items/:id/approve', (req, res) => {
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'video ingest item not found' });
    return;
  }
  item.status = 'approved';
  res.json({ item });
});
