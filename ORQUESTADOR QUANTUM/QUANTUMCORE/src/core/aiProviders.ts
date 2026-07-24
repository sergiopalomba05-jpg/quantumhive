export type ProviderKind = 'api' | 'cloud' | 'browser' | 'headless' | 'local';
export type ProviderVendor = 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'openrouter' | 'ollama';
export type ProviderRuntimeStatus =
  | 'connected'
  | 'needs_secret'
  | 'requires_runner'
  | 'needs_login'
  | 'limit_reached'
  | 'disabled'
  | 'failed';
export type ProviderStatus = ProviderRuntimeStatus;
export type ModelConnectionStatus = 'verified' | 'candidate' | 'catalog_only' | 'requires_runner' | 'needs_secret';

export interface ProviderModelDefinition {
  id: string;
  displayName: string;
  providerId?: string;
  family: 'gemini' | 'gpt' | 'claude' | 'openrouter' | 'bedrock' | 'gemma' | 'third_party' | 'azure_deployment' | 'nim' | 'ollama';
  connectionStatus: ModelConnectionStatus;
  routerReady: boolean;
  capabilities: string[];
  recommendedFor?: string[];
  notes: string;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  kind: ProviderKind;
  vendor: ProviderVendor;
  status: ProviderRuntimeStatus;
  runtime: string;
  secretRef: string;
  hasSecret: boolean;
  priority: number;
  costTier: 'free' | 'low' | 'medium' | 'high' | 'unknown';
  models: ProviderModelDefinition[];
  notes: string;
}

export const GCP_VERTEX_MODELS: ProviderModelDefinition[] = [
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    family: 'gemini',
    connectionStatus: 'verified',
    routerReady: true,
    capabilities: ['text', 'multimodal', 'fast', 'grounding'],
    notes: 'Verificado en Cloud Run con Vertex. Modelo rapido por defecto.',
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    family: 'gemini',
    connectionStatus: 'verified',
    routerReady: true,
    capabilities: ['text', 'multimodal', 'reasoning', 'code'],
    notes: 'Verificado en Cloud Run con Vertex. Sintetizador de V.S 2 Cerebros.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    family: 'gemini',
    connectionStatus: 'candidate',
    routerReady: false,
    capabilities: ['text', 'fast', 'low_cost'],
    notes: 'Candidato para tareas masivas livianas; requiere prueba en este proyecto.',
  },
  {
    id: 'gemini-2.5-flash-image',
    displayName: 'Gemini 2.5 Flash Image',
    family: 'gemini',
    connectionStatus: 'candidate',
    routerReady: false,
    capabilities: ['image', 'multimodal', 'creative'],
    notes: 'Candidato para generacion/edicion de imagen; requiere prueba en este proyecto.',
  },
  {
    id: 'gemini-live-2.5-flash-preview-native-audio',
    displayName: 'Gemini Live 2.5 Flash Native Audio',
    family: 'gemini',
    connectionStatus: 'candidate',
    routerReady: false,
    capabilities: ['audio', 'live', 'realtime'],
    notes: 'Candidato para voz/live; requiere integracion especifica de Live API.',
  },
  {
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    family: 'gemini',
    connectionStatus: 'catalog_only',
    routerReady: false,
    capabilities: ['text', 'preview'],
    notes: 'Visible como familia de catalogo; no usar hasta validarlo contra Vertex del proyecto.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    family: 'gemini',
    connectionStatus: 'catalog_only',
    routerReady: false,
    capabilities: ['text', 'fast', 'preview'],
    notes: 'Catalogo publico; pendiente de verificacion local por limitacion actual de gcloud auth.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    family: 'gemini',
    connectionStatus: 'catalog_only',
    routerReady: false,
    capabilities: ['text', 'reasoning', 'preview'],
    notes: 'No conectado: antes fallo en este proyecto; queda visible solo como referencia.',
  },
  {
    id: 'gemma-model-garden',
    displayName: 'Gemma via Vertex Model Garden',
    family: 'gemma',
    connectionStatus: 'catalog_only',
    routerReady: false,
    capabilities: ['open_model', 'deployable'],
    notes: 'Familia open model desplegable desde Model Garden; no es endpoint Gemini directo.',
  },
];

const API_SECRET_ENV_KEYS: Record<string, string> = {
  'openai-api': 'OPENAI_API_KEY',
  'anthropic-api': 'ANTHROPIC_API_KEY',
  'openrouter-api': 'OPENROUTER_API_KEY',
};

const hasEnvSecret = (env: NodeJS.ProcessEnv, key: string) => Boolean(env[key]?.trim());

export function getProviderTemplates(): ProviderDefinition[] {
  return [
    {
      id: 'gcp-vertex-ai',
      name: 'Google Cloud Vertex AI',
      kind: 'cloud',
      vendor: 'google',
      status: 'connected',
      runtime: 'Cloud Run service account / Vertex AI',
      secretRef: 'gcp-runtime-identity',
      hasSecret: true,
      priority: 40,
      costTier: 'low',
      models: GCP_VERTEX_MODELS.map((model) => ({ ...model, providerId: 'gcp-vertex-ai' })),
      notes: 'Proveedor principal actual. Vertex usa identidad de Cloud Run.',
    },
    {
      id: 'openai-api',
      name: 'OpenAI API',
      kind: 'api',
      vendor: 'openai',
      status: 'needs_secret',
      runtime: 'OpenAI Responses/Chat API',
      secretRef: 'openai-server-secret',
      hasSecret: false,
      priority: 10,
      costTier: 'medium',
      models: [
        {
          id: 'gpt-5.5',
          displayName: 'GPT-5.5',
          providerId: 'openai-api',
          family: 'gpt',
          connectionStatus: 'needs_secret',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['code', 'reasoning'],
          notes: 'Disponible cuando el secreto server-side de OpenAI este configurado.',
        },
        {
          id: 'gpt-5.5-mini',
          displayName: 'GPT-5.5 Mini',
          providerId: 'openai-api',
          family: 'gpt',
          connectionStatus: 'needs_secret',
          routerReady: false,
          capabilities: ['text', 'fast'],
          recommendedFor: ['fast', 'low_cost'],
          notes: 'Modelo rapido cuando el secreto server-side de OpenAI este configurado.',
        },
      ],
      notes: 'API oficial de OpenAI. No usa el plan web de ChatGPT.',
    },
    {
      id: 'anthropic-api',
      name: 'Anthropic API',
      kind: 'api',
      vendor: 'anthropic',
      status: 'needs_secret',
      runtime: 'Anthropic Messages API',
      secretRef: 'anthropic-server-secret',
      hasSecret: false,
      priority: 20,
      costTier: 'high',
      models: [
        {
          id: 'claude-sonnet-5',
          displayName: 'Claude Sonnet 5',
          providerId: 'anthropic-api',
          family: 'claude',
          connectionStatus: 'needs_secret',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['code', 'architecture'],
          notes: 'Disponible cuando el secreto server-side de Anthropic este configurado.',
        },
      ],
      notes: 'API oficial de Anthropic. Distinto de Claude Pro browser.',
    },
    {
      id: 'openrouter-api',
      name: 'OpenRouter',
      kind: 'api',
      vendor: 'openrouter',
      status: 'needs_secret',
      runtime: 'OpenAI-compatible OpenRouter API',
      secretRef: 'openrouter-server-secret',
      hasSecret: false,
      priority: 30,
      costTier: 'unknown',
      models: [
        {
          id: 'openrouter/auto',
          displayName: 'OpenRouter Auto',
          providerId: 'openrouter-api',
          family: 'openrouter',
          connectionStatus: 'needs_secret',
          routerReady: false,
          capabilities: ['text', 'router'],
          recommendedFor: ['fallback'],
          notes: 'Enruta desde OpenRouter cuando el secreto server-side exista.',
        },
      ],
      notes: 'Proveedor multi-modelo compatible con OpenAI API.',
    },
    {
      id: 'chatgpt-plus-browser',
      name: 'ChatGPT Pro/Plus Browser',
      kind: 'browser',
      vendor: 'openai',
      status: 'requires_runner',
      runtime: 'Personal browser session through future runner',
      secretRef: 'runner-session-only',
      hasSecret: false,
      priority: 50,
      costTier: 'unknown',
      models: [
        {
          id: 'chatgpt-plan-auto',
          displayName: 'ChatGPT Plan Auto',
          providerId: 'chatgpt-plus-browser',
          family: 'gpt',
          connectionStatus: 'requires_runner',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['personal_plan'],
          notes: 'Requiere runner local/VM para usar sesion browser.',
        },
      ],
      notes: 'Aparece en el menu, pero no se ejecuta desde Cloud Run.',
    },
    {
      id: 'chatgpt-plus-headless',
      name: 'ChatGPT Pro/Plus Headless',
      kind: 'headless',
      vendor: 'openai',
      status: 'requires_runner',
      runtime: 'Personal headless session through future runner',
      secretRef: 'runner-session-only',
      hasSecret: false,
      priority: 55,
      costTier: 'unknown',
      models: [
        {
          id: 'chatgpt-headless-auto',
          displayName: 'ChatGPT Headless Auto',
          providerId: 'chatgpt-plus-headless',
          family: 'gpt',
          connectionStatus: 'requires_runner',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['personal_plan'],
          notes: 'Requiere runner local/VM para usar sesion headless.',
        },
      ],
      notes: 'Modo futuro para planes personales sin ventana visible.',
    },
    {
      id: 'claude-pro-browser',
      name: 'Claude Pro Browser',
      kind: 'browser',
      vendor: 'anthropic',
      status: 'requires_runner',
      runtime: 'Personal browser session through future runner',
      secretRef: 'runner-session-only',
      hasSecret: false,
      priority: 60,
      costTier: 'unknown',
      models: [
        {
          id: 'claude-plan-auto',
          displayName: 'Claude Plan Auto',
          providerId: 'claude-pro-browser',
          family: 'claude',
          connectionStatus: 'requires_runner',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['personal_plan'],
          notes: 'Requiere runner local/VM para usar Claude Pro.',
        },
      ],
      notes: 'Aparece en el menu, pero no se ejecuta desde Cloud Run.',
    },
    {
      id: 'claude-pro-headless',
      name: 'Claude Pro Headless',
      kind: 'headless',
      vendor: 'anthropic',
      status: 'requires_runner',
      runtime: 'Personal headless session through future runner',
      secretRef: 'runner-session-only',
      hasSecret: false,
      priority: 65,
      costTier: 'unknown',
      models: [
        {
          id: 'claude-headless-auto',
          displayName: 'Claude Headless Auto',
          providerId: 'claude-pro-headless',
          family: 'claude',
          connectionStatus: 'requires_runner',
          routerReady: false,
          capabilities: ['text', 'code', 'reasoning'],
          recommendedFor: ['personal_plan'],
          notes: 'Requiere runner local/VM para usar Claude headless.',
        },
      ],
      notes: 'Modo futuro para planes personales sin ventana visible.',
    },
    {
      id: 'ollama-vm',
      name: 'Ollama / VM Local',
      kind: 'local',
      vendor: 'ollama',
      status: 'requires_runner',
      runtime: 'Future VM/local runner',
      secretRef: 'runner-endpoint',
      hasSecret: false,
      priority: 90,
      costTier: 'free',
      models: [
        {
          id: 'ollama-auto',
          displayName: 'Ollama Auto',
          providerId: 'ollama-vm',
          family: 'ollama',
          connectionStatus: 'requires_runner',
          routerReady: false,
          capabilities: ['text', 'local'],
          recommendedFor: ['local_models'],
          notes: 'Requiere runner conectado a una VM/local.',
        },
      ],
      notes: 'Reservado para runners locales/VM.',
    },
  ];
}

export function getProviderRegistry(env: NodeJS.ProcessEnv = process.env): ProviderDefinition[] {
  return getProviderTemplates().map((provider) => {
    if (provider.kind !== 'api') return provider;

    const envKey = API_SECRET_ENV_KEYS[provider.id];
    const hasSecret = envKey ? hasEnvSecret(env, envKey) : false;
    if (!hasSecret) return provider;

    return {
      ...provider,
      hasSecret: true,
      status: 'connected',
      models: provider.models.map((model) => ({
        ...model,
        connectionStatus: 'verified',
        routerReady: true,
      })),
    };
  });
}

export function findProviderModel(providerId: string, modelId: string, env: NodeJS.ProcessEnv = process.env) {
  const provider = getProviderRegistry(env).find((item) => item.id === providerId);
  const model = provider?.models.find((item) => item.id === modelId);

  if (!provider || !model) return undefined;
  return { provider, model };
}
