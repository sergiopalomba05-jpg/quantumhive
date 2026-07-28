export type BrainMode = 'auto' | 'manual' | 'vs_2';
export type BrainModelStatus = 'available' | 'not_connected';

export interface BrainModelDefinition {
  id: string;
  displayName: string;
  shortLabel: string;
  logoLabel: string;
  provider: 'vertex' | 'openai' | 'anthropic' | 'kimi';
  status: BrainModelStatus;
  icon: string;
  recommendedFor: string[];
  description: string;
}

export interface BrainSelectionRequest {
  brainMode?: BrainMode;
  modelId?: string;
  vsModelIds?: string[];
  message?: string;
}

export interface ResolvedBrainSelection {
  mode: BrainMode;
  requestedModelId: string;
  usedModelId: string;
  provider: BrainModelDefinition['provider'];
  fallbackUsed: boolean;
  fallbackReason?: string;
  recommendedModelId: string;
  usedModelIds?: string[];
  synthesizerModelId?: string;
}

export const DEFAULT_CONNECTED_MODEL_ID = 'gemini-2.5-flash';

export const BRAIN_MODELS: BrainModelDefinition[] = [
  {
    id: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash',
    shortLabel: '3.6 FLASH',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'not_connected',
    icon: 'gemini',
    recommendedFor: ['general', 'rapido', 'agente', 'balanced'],
    description: 'Último modelo Stable. Balance velocidad/inteligencia. Default del sistema.',
  },
  {
    id: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    shortLabel: '3.5 FLASH',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'not_connected',
    icon: 'gemini',
    recommendedFor: ['thinking', 'analisis', 'code', 'agente'],
    description: 'Modelo más inteligente para agentic y coding tasks. Stable.',
  },
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash (Legacy)',
    shortLabel: '2.5 FLASH',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'available',
    icon: 'gemini',
    recommendedFor: ['contexto', 'general', 'rapido'],
    description: 'Legacy. Se retira Octubre 2026. Migrar a 3.6 Flash.',
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro (Legacy)',
    shortLabel: '2.5 PRO',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'available',
    icon: 'gemini',
    recommendedFor: ['thinking', 'analisis', 'contexto'],
    description: 'Legacy. Se retira Octubre 2026. Sintetizador de V.S 2 Cerebros.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    shortLabel: 'LITE',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'available',
    icon: 'gemini',
    recommendedFor: ['rapido', 'bajo_costo', 'clasificacion'],
    description: 'Modelo liviano Stable para tareas masivas y clasificación.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    shortLabel: '3.1 PRO',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'not_connected',
    icon: 'gemini',
    recommendedFor: ['reasoning', 'advanced', 'preview'],
    description: 'Preview del modelo Pro más avanzado. 1M tokens. Pendiente validación.',
  },
  {
    id: 'gemini-live-3.1-flash-preview',
    displayName: 'Gemini Live 3.1 Flash Preview',
    shortLabel: 'LIVE',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'not_connected',
    icon: 'gemini',
    recommendedFor: ['voz', 'live', 'realtime'],
    description: 'Live API A2A para diálogo realtime y voz.',
  },
  {
    id: 'gemini-live-2.5-flash-preview-native-audio',
    displayName: 'Gemini Live 2.5 Flash Native Audio (Legacy)',
    shortLabel: 'LIVE',
    logoLabel: 'Gemini',
    provider: 'vertex',
    status: 'not_connected',
    icon: 'gemini',
    recommendedFor: ['voz', 'audio', 'realtime'],
    description: 'Legacy. Live API 2.5. Migrar a 3.1 Flash Preview.',
  },
  {
    id: 'gpt-chat-latest',
    displayName: 'GPT Chat Latest',
    shortLabel: 'GPT',
    logoLabel: 'OpenAI',
    provider: 'openai',
    status: 'not_connected',
    icon: 'openai',
    recommendedFor: ['planificacion', 'producto', 'estrategia'],
    description: 'Proveedor futuro recomendado para planificacion y producto.',
  },
  {
    id: 'claude-sonnet-5',
    displayName: 'Claude Sonnet 5',
    shortLabel: 'CLAUDE',
    logoLabel: 'Anthropic',
    provider: 'anthropic',
    status: 'not_connected',
    icon: 'claude',
    recommendedFor: ['codigo', 'refactor', 'arquitectura'],
    description: 'Proveedor futuro recomendado para escribir y revisar codigo.',
  },
  {
    id: 'kimi-k2.6',
    displayName: 'Kimi K2.6',
    shortLabel: 'KIMI',
    logoLabel: 'Kimi',
    provider: 'kimi',
    status: 'not_connected',
    icon: 'kimi',
    recommendedFor: ['codigo', 'contexto_largo'],
    description: 'Proveedor futuro alternativo para codigo y contexto largo.',
  },
];

function recommendModelId(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('codigo') || text.includes('code') || text.includes('refactor') || text.includes('bug')) {
    return 'claude-sonnet-5';
  }
  if (text.includes('plan') || text.includes('estrategia') || text.includes('negocio')) {
    return 'gpt-chat-latest';
  }
  return DEFAULT_CONNECTED_MODEL_ID;
}

export function resolveBrainSelection(request: BrainSelectionRequest): ResolvedBrainSelection {
  const mode = request.brainMode ?? 'auto';
  const recommendedModelId = recommendModelId(request.message ?? '');
  const requestedModelId = mode === 'auto' ? recommendedModelId : request.modelId || DEFAULT_CONNECTED_MODEL_ID;
  const requestedModel = BRAIN_MODELS.find((model) => model.id === requestedModelId) ?? BRAIN_MODELS[0];

  if (requestedModel.status === 'available') {
    return {
      mode,
      requestedModelId,
      usedModelId: requestedModel.id,
      provider: requestedModel.provider,
      fallbackUsed: false,
      recommendedModelId,
    };
  }

  return {
    mode,
    requestedModelId,
    usedModelId: DEFAULT_CONNECTED_MODEL_ID,
    provider: 'vertex',
    fallbackUsed: true,
    fallbackReason: 'Modelo elegido todavia no conectado. Se uso Gemini como fallback.',
    recommendedModelId,
  };
}

export function resolveVsBrainSelection(request: BrainSelectionRequest): ResolvedBrainSelection {
  const requested = request.vsModelIds?.length ? request.vsModelIds : ['gemini-2.5-flash', 'gemini-2.5-pro'];
  const connected = requested
    .map((id) => BRAIN_MODELS.find((model) => model.id === id))
    .filter((model): model is BrainModelDefinition => model?.status === 'available' && model.provider === 'vertex');
  const usedModelIds = Array.from(new Set(connected.map((model) => model.id))).slice(0, 2);

  for (const fallbackId of ['gemini-2.5-flash', 'gemini-2.5-pro']) {
    if (usedModelIds.length >= 2) break;
    if (!usedModelIds.includes(fallbackId)) usedModelIds.push(fallbackId);
  }

  const fallbackUsed = requested.length !== usedModelIds.length || requested.some((id, index) => usedModelIds[index] !== id);

  return {
    mode: 'vs_2',
    requestedModelId: request.modelId || requested[0] || DEFAULT_CONNECTED_MODEL_ID,
    usedModelId: usedModelIds[0] || DEFAULT_CONNECTED_MODEL_ID,
    usedModelIds,
    synthesizerModelId: 'gemini-2.5-pro',
    provider: 'vertex',
    fallbackUsed,
    fallbackReason: fallbackUsed ? 'V.S 2 Cerebros usa solo modelos conectados de Vertex Gemini en esta fase.' : undefined,
    recommendedModelId: recommendModelId(request.message ?? ''),
  };
}
