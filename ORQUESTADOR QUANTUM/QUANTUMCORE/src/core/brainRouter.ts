export type BrainMode = 'auto' | 'manual' | 'council';
export type BrainModelStatus = 'available' | 'not_connected';

export interface BrainModelDefinition {
  id: string;
  displayName: string;
  provider: 'vertex' | 'openai' | 'anthropic' | 'kimi';
  status: BrainModelStatus;
  icon: string;
  recommendedFor: string[];
  description: string;
}

export interface BrainSelectionRequest {
  brainMode?: BrainMode;
  modelId?: string;
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
}

export const DEFAULT_CONNECTED_MODEL_ID = 'gemini-2.5-flash';

export const BRAIN_MODELS: BrainModelDefinition[] = [
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    provider: 'vertex',
    status: 'available',
    icon: 'gemini',
    recommendedFor: ['contexto', 'general', 'rapido'],
    description: 'Cerebro conectado inicial para contexto, chat general y fallback.',
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'vertex',
    status: 'available',
    icon: 'gemini',
    recommendedFor: ['thinking', 'analisis', 'contexto'],
    description: 'Modo conectado para razonamiento mas alto dentro de Vertex.',
  },
  {
    id: 'gpt-chat-latest',
    displayName: 'GPT Chat Latest',
    provider: 'openai',
    status: 'not_connected',
    icon: 'openai',
    recommendedFor: ['planificacion', 'producto', 'estrategia'],
    description: 'Proveedor futuro recomendado para planificacion y producto.',
  },
  {
    id: 'claude-sonnet-5',
    displayName: 'Claude Sonnet 5',
    provider: 'anthropic',
    status: 'not_connected',
    icon: 'claude',
    recommendedFor: ['codigo', 'refactor', 'arquitectura'],
    description: 'Proveedor futuro recomendado para escribir y revisar codigo.',
  },
  {
    id: 'kimi-k2.6',
    displayName: 'Kimi K2.6',
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
