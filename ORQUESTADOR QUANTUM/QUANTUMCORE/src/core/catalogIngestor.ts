import { NormalizedVideoInput, StructuredVideoAnalysis } from './videoIngest';

export type CatalogPricing = 'gratis' | 'freemium' | 'paga' | 'open_source' | 'desconocido';
export type CatalogIngestStatus = 'detectada' | 'clasificada' | 'comparada' | 'publicable' | 'dudosa' | 'duplicada' | 'descartada';

export interface ExistingCatalogTool {
  id?: string;
  nombre?: string;
  repo_url?: string;
  para_que?: string;
  detalle?: string;
  estado?: string;
}

export interface CatalogToolDraft {
  nombre: string;
  repo_url: string;
  para_que: string;
  detalle: string;
  estado: CatalogIngestStatus;
  precio: CatalogPricing;
}

export interface CatalogToolScore {
  calidad: number;
  utilidadQuantumCore: number;
  facilidadUso: number;
  potenciaTecnica: number;
  precioAccesibilidad: number;
  automatizacion: number;
  confianza: number;
  promedio: number;
}

export interface CatalogTaxonomyPlacement {
  division: string;
  subdivision: string;
  utilidad: string;
}

export interface CatalogIngestionResult {
  herramienta: CatalogToolDraft;
  estadoCatalogo: CatalogIngestStatus;
  taxonomia: CatalogTaxonomyPlacement;
  score: CatalogToolScore;
  duplicadoDe?: string;
  accionSugerida: string;
  comparativa: {
    mejorPara: string;
    similarA: string[];
  };
}

export function normalizeToolName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeCatalogUrl(value: string): string {
  if (value.startsWith('telegram:')) return value;
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

function getHostname(value?: string): string {
  if (!value || value.startsWith('telegram:')) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function findCatalogDuplicate(
  candidate: Pick<CatalogToolDraft, 'nombre' | 'repo_url'>,
  existingTools: ExistingCatalogTool[],
): ExistingCatalogTool | undefined {
  const candidateName = normalizeToolName(candidate.nombre);
  const candidateHost = getHostname(candidate.repo_url);

  return existingTools.find((tool) => {
    const toolName = normalizeToolName(tool.nombre || '');
    const toolHost = getHostname(tool.repo_url);
    if (candidateHost && toolHost && candidateHost === toolHost) return true;
    if (!candidateName || !toolName) return false;
    return candidateName === toolName || candidateName.includes(toolName) || toolName.includes(candidateName);
  });
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function scoreCatalogTool(input: {
  pricing?: CatalogPricing;
  qualitySignals?: string[];
  utility?: string;
  automationSignals?: string[];
  confidence: number;
}): CatalogToolScore {
  const qualitySignalCount = input.qualitySignals?.length || 0;
  const automationSignalCount = input.automationSignals?.length || 0;
  const utilityWords = input.utility?.split(/\s+/).filter(Boolean).length || 0;
  const priceScoreByType: Record<CatalogPricing, number> = {
    gratis: 10,
    open_source: 9,
    freemium: 7,
    desconocido: 5,
    paga: 4,
  };

  const calidad = clampScore(6 + qualitySignalCount + input.confidence * 2);
  const utilidadQuantumCore = clampScore(5 + Math.min(utilityWords, 4) + input.confidence);
  const facilidadUso = clampScore(6 + (input.pricing === 'gratis' || input.pricing === 'freemium' ? 1 : 0));
  const potenciaTecnica = clampScore(6 + qualitySignalCount * 0.75 + automationSignalCount * 0.5);
  const precioAccesibilidad = priceScoreByType[input.pricing || 'desconocido'];
  const automatizacion = clampScore(5 + automationSignalCount * 1.5);
  const confianza = Math.round(input.confidence * 100);
  const promedio = Math.round((calidad + utilidadQuantumCore + facilidadUso + potenciaTecnica + precioAccesibilidad + automatizacion) / 6);

  return {
    calidad,
    utilidadQuantumCore,
    facilidadUso,
    potenciaTecnica,
    precioAccesibilidad,
    automatizacion,
    confianza,
    promedio,
  };
}

function detectPricing(analysis: StructuredVideoAnalysis): CatalogPricing {
  const text = `${analysis.summary} ${analysis.detalle} ${analysis.tags.join(' ')}`.toLowerCase();
  if (/open\s*source|github|oss|codigo abierto/.test(text)) return 'open_source';
  if (/gratis|free\b|free-tier|free tier/.test(text)) return 'gratis';
  if (/freemium|plan gratis/.test(text)) return 'freemium';
  if (/paga|paid|suscripcion|subscription|pricing/.test(text)) return 'paga';
  return 'desconocido';
}

function placeInTaxonomy(analysis: StructuredVideoAnalysis): CatalogTaxonomyPlacement {
  const text = `${analysis.title} ${analysis.summary} ${analysis.paraQue} ${analysis.tags.join(' ')}`.toLowerCase();
  if (/web|frontend|react|landing|sitio|ui/.test(text)) {
    return {
      division: 'Webs y Apps',
      subdivision: 'Generadores de UI y frontend',
      utilidad: 'Crear interfaces web, landings y prototipos frontend',
    };
  }
  if (/video|reel|avatar|render/.test(text)) {
    return {
      division: 'Video e Imagen IA',
      subdivision: 'Generacion y edicion de video',
      utilidad: 'Crear o editar contenido multimedia',
    };
  }
  if (/automat|agent|mcp|workflow|n8n/.test(text)) {
    return {
      division: 'Automatizacion y Agentes',
      subdivision: 'Workflows y agentes operativos',
      utilidad: 'Automatizar tareas y coordinar agentes',
    };
  }
  if (/cloud|api|free-tier|modelo|dataset/.test(text)) {
    return {
      division: 'Infraestructura y Recursos Gratis',
      subdivision: 'Cloud, APIs, modelos y datasets',
      utilidad: 'Conseguir capacidad tecnica reutilizable',
    };
  }
  return {
    division: analysis.catalogDivision || 'Herramientas IA',
    subdivision: analysis.catalogSubdivision || 'Recursos por clasificar',
    utilidad: analysis.paraQue,
  };
}

function decideStatus(confidence: number, duplicate?: ExistingCatalogTool): CatalogIngestStatus {
  if (duplicate) return 'duplicada';
  if (confidence >= 0.8) return 'publicable';
  if (confidence >= 0.55) return 'dudosa';
  return 'descartada';
}

export function buildCatalogIngestionResult(input: {
  analysis: StructuredVideoAnalysis;
  input: NormalizedVideoInput;
  existingTools: ExistingCatalogTool[];
}): CatalogIngestionResult {
  const name = (input.analysis.detectedToolName || input.analysis.title).trim();
  const pricing = detectPricing(input.analysis);
  const duplicate = findCatalogDuplicate({ nombre: name, repo_url: input.input.originalUrl }, input.existingTools);
  const status = decideStatus(input.analysis.confidence, duplicate);
  const taxonomy = placeInTaxonomy(input.analysis);
  const qualitySignals = [input.analysis.summary, input.analysis.detalle].filter(Boolean);
  const automationSignals = input.analysis.tags.filter((tag) => /ia|ai|automat|agent|workflow|gener/.test(tag.toLowerCase()));
  const score = scoreCatalogTool({
    pricing,
    qualitySignals,
    utility: input.analysis.paraQue,
    automationSignals,
    confidence: input.analysis.confidence,
  });

  return {
    herramienta: {
      nombre: name,
      repo_url: input.input.originalUrl,
      para_que: input.analysis.paraQue,
      detalle: `${input.analysis.detalle}\nResumen: ${input.analysis.summary}\nTaxonomia: ${taxonomy.division} > ${taxonomy.subdivision}\nPuntaje promedio: ${score.promedio}/10\nPrecio: ${pricing}`,
      estado: status,
      precio: pricing,
    },
    estadoCatalogo: status,
    taxonomia: taxonomy,
    score,
    duplicadoDe: duplicate?.id,
    accionSugerida: duplicate
      ? `enriquecer herramienta existente: ${duplicate.nombre || duplicate.id}`
      : status === 'publicable'
        ? 'publicar en la PWA del catalogo'
        : status === 'dudosa'
          ? 'mantener visible en QuantumCore para completar informacion'
          : 'descartar o esperar mas evidencia',
    comparativa: {
      mejorPara: taxonomy.utilidad,
      similarA: input.existingTools
        .filter((tool) => normalizeToolName(tool.nombre || '') !== normalizeToolName(name))
        .slice(0, 5)
        .map((tool) => tool.nombre || tool.id || 'herramienta similar'),
    },
  };
}
