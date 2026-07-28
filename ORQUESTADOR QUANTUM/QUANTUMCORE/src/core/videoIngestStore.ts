/**
 * Video Ingest Store — Persistencia real en Supabase (BD de Ingesta)
 * 
 * Este módulo conecta con la BD de catálogo de herramientas IA
 * (gbngjsulhqcwgkqoxozy) para guardar, buscar y consultar herramientas.
 * 
 * Tablas que usa:
 *   - herramientas (nombre, repo_url, para_que, categoria, estado, calidad, tags, detalle)
 *   - divisiones / subdivisiones (taxonomía)
 *   - herramienta_subdivision (many-to-many)
 */

import { dbRouter } from './providers/dbRouter';
import { NormalizedVideoInput, StructuredVideoAnalysis } from './videoIngest';
import {
  buildCatalogIngestionResult,
  CatalogIngestionResult,
  ExistingCatalogTool,
  findCatalogDuplicate,
} from './catalogIngestor';

function getIngestClient() {
  return dbRouter.getClient('ingest');
}

// ─── Types ──────────────────────────────────────────────────────────
export interface HerramientaRow {
  id: string;
  nombre: string;
  repo_url: string | null;
  para_que: string | null;
  categoria: string | null;
  estado: string | null;
  calidad: number | null;
  tags: string[];
  fuente: string | null;
  notas: string | null;
  detalle: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface SaveToolResult {
  id: string;
  status: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  catalogResult: CatalogIngestionResult;
}

export function buildPendingReviewTool(
  input: NormalizedVideoInput,
  analysis: StructuredVideoAnalysis,
) {
  const confidence = Math.round((analysis.confidence || 0) * 100);
  return {
    nombre: analysis.detectedToolName || analysis.title,
    repo_url: input.originalUrl,
    estado: 'pending_review',
    para_que: analysis.paraQue || analysis.summary,
    detalle: `${analysis.detalle || analysis.summary}\n\nConfianza: ${confidence}%`,
  };
}

export async function saveVideoDraft(
  client: { from: (table: string) => { insert: (rows: unknown[]) => Promise<{ data?: Array<{ id?: string }>; error?: { message: string } | null }> } },
  input: NormalizedVideoInput,
  analysis: StructuredVideoAnalysis,
): Promise<{ id: string; status: string }> {
  const draft = buildPendingReviewTool(input, analysis);
  const { data, error } = await client.from('herramientas').insert([draft]);
  if (error) throw new Error(`Error guardando borrador: ${error.message}`);
  return { id: data?.[0]?.id || 'unknown', status: draft.estado };
}

// ─── Read operations ────────────────────────────────────────────────

/** Fetch all tools from the catalog, optionally filtered */
export async function fetchTools(filters?: {
  categoria?: string;
  estado?: string;
  search?: string;
  limit?: number;
}): Promise<HerramientaRow[]> {
  const client = getIngestClient();
  let query = client
    .from('herramientas')
    .select('*')
    .order('creado_en', { ascending: false });

  if (filters?.categoria) {
    query = query.eq('categoria', filters.categoria);
  }
  if (filters?.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters?.search) {
    query = query.or(
      `nombre.ilike.%${filters.search}%,para_que.ilike.%${filters.search}%,detalle.ilike.%${filters.search}%`
    );
  }
  query = query.limit(filters?.limit || 50);

  const { data, error } = await query;
  if (error) {
    console.error('[videoIngestStore] Error fetching tools:', error.message);
    return [];
  }
  return (data || []) as HerramientaRow[];
}

/** Search tools by text query (uses Postgres full-text search) */
export async function searchTools(query: string, limit: number = 20): Promise<HerramientaRow[]> {
  const client = getIngestClient();
  const { data, error } = await client
    .from('herramientas')
    .select('*')
    .or(
      `nombre.ilike.%${query}%,para_que.ilike.%${query}%,detalle.ilike.%${query}%,categoria.ilike.%${query}%`
    )
    .order('creado_en', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[videoIngestStore] Error searching tools:', error.message);
    return [];
  }
  return (data || []) as HerramientaRow[];
}

/** Get catalog stats (count by division/estado) */
export async function getCatalogStats(): Promise<{
  total: number;
  byEstado: Record<string, number>;
  byCategoria: Record<string, number>;
}> {
  const client = getIngestClient();
  const { data, error } = await client.from('herramientas').select('estado, categoria');
  
  if (error || !data) {
    return { total: 0, byEstado: {}, byCategoria: {} };
  }

  const byEstado: Record<string, number> = {};
  const byCategoria: Record<string, number> = {};
  for (const row of data) {
    const e = row.estado || 'sin_estado';
    const c = row.categoria || 'sin_categoria';
    byEstado[e] = (byEstado[e] || 0) + 1;
    byCategoria[c] = (byCategoria[c] || 0) + 1;
  }

  return { total: data.length, byEstado, byCategoria };
}

/** Fetch taxonomy (divisiones + subdivisiones) */
export async function fetchTaxonomy(): Promise<{
  divisiones: Array<{ id: string; nombre: string }>;
  subdivisiones: Array<{ id: string; division_id: string; nombre: string }>;
}> {
  const client = getIngestClient();
  const [divRes, subRes] = await Promise.all([
    client.from('divisiones').select('id, nombre').order('orden'),
    client.from('subdivisiones').select('id, division_id, nombre').order('orden'),
  ]);

  return {
    divisiones: (divRes.data || []) as Array<{ id: string; nombre: string }>,
    subdivisiones: (subRes.data || []) as Array<{ id: string; division_id: string; nombre: string }>,
  };
}

// ─── Write operations ───────────────────────────────────────────────

/** Save a tool to the catalog from a video analysis result */
export async function saveToolFromAnalysis(
  input: NormalizedVideoInput,
  analysis: StructuredVideoAnalysis,
): Promise<SaveToolResult> {
  const client = getIngestClient();

  // 1. Fetch existing tools for dedup check
  const existingTools = await fetchTools({ limit: 200 });
  const existingForDedup: ExistingCatalogTool[] = existingTools.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    repo_url: t.repo_url || undefined,
    para_que: t.para_que || undefined,
    detalle: t.detalle || undefined,
    estado: t.estado || undefined,
  }));

  // 2. Build the full catalog result (scoring, taxonomy, dedup)
  const catalogResult = buildCatalogIngestionResult({
    input,
    analysis,
    existingTools: existingForDedup,
  });

  const tool = catalogResult.herramienta;
  const isDuplicate = catalogResult.estadoCatalogo === 'duplicada';

  // 3. Check for actual duplicate in DB
  const duplicate = findCatalogDuplicate(
    { nombre: tool.nombre, repo_url: tool.repo_url },
    existingForDedup,
  );

  if (isDuplicate && duplicate?.id) {
    // Enrich the existing tool instead of creating a new one
    await client
      .from('herramientas')
      .update({
        detalle: tool.detalle,
        notas: `Enriquecido por re-ingesta. Score: ${catalogResult.score.promedio}/10`,
      })
      .eq('id', duplicate.id);

    return {
      id: duplicate.id,
      status: 'duplicada',
      isDuplicate: true,
      duplicateOf: duplicate.nombre || duplicate.id,
      catalogResult,
    };
  }

  // 4. Insert new tool
  const { data, error } = await client
    .from('herramientas')
    .insert([
      {
        nombre: tool.nombre,
        repo_url: tool.repo_url || null,
        para_que: tool.para_que,
        categoria: catalogResult.taxonomia.division,
        estado: catalogResult.estadoCatalogo === 'publicable' ? 'usar' : 'verificar',
        calidad: Math.min(5, Math.round(catalogResult.score.promedio / 2)),
        tags: analysis.tags || [],
        fuente: input.sourceType,
        detalle: tool.detalle,
        notas: `Score: ${catalogResult.score.promedio}/10 | Confianza: ${catalogResult.score.confianza}% | ${catalogResult.accionSugerida}`,
      },
    ])
    .select('id')
    .single();

  if (error) {
    console.error('[videoIngestStore] Error inserting tool:', error.message);
    // If it's a unique constraint violation, it's a duplicate we missed
    if (error.message.includes('herramientas_nombre_categoria_uniq')) {
      return {
        id: 'duplicate',
        status: 'duplicada',
        isDuplicate: true,
        catalogResult,
      };
    }
    throw new Error(`Error guardando herramienta: ${error.message}`);
  }

  const newId = data?.id || 'unknown';

  // 5. Map to subdivision if we can determine one
  const taxonomy = catalogResult.taxonomia;
  if (taxonomy.subdivision) {
    // Try to find a matching subdivision slug
    const { data: subs } = await client
      .from('subdivisiones')
      .select('id')
      .ilike('nombre', `%${taxonomy.subdivision}%`)
      .limit(1);

    if (subs && subs.length > 0) {
      await client.from('herramienta_subdivision').upsert({
        herramienta_id: newId,
        subdivision_id: subs[0].id,
      });
    }
  }

  return {
    id: newId,
    status: catalogResult.estadoCatalogo,
    isDuplicate: false,
    catalogResult,
  };
}

/** Save a tool directly (manual entry) */
export async function saveToolDirect(tool: {
  nombre: string;
  repo_url?: string;
  para_que?: string;
  categoria?: string;
  tags?: string[];
  fuente?: string;
}): Promise<{ id: string }> {
  const client = getIngestClient();
  const { data, error } = await client
    .from('herramientas')
    .insert([
      {
        nombre: tool.nombre,
        repo_url: tool.repo_url || null,
        para_que: tool.para_que || null,
        categoria: tool.categoria || null,
        estado: 'verificar',
        tags: tool.tags || [],
        fuente: tool.fuente || 'manual',
      },
    ])
    .select('id')
    .single();

  if (error) throw new Error(`Error guardando herramienta: ${error.message}`);
  return { id: data?.id || 'unknown' };
}
