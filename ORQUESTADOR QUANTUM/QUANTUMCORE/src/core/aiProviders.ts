export type ProviderStatus = 'connected' | 'pending' | 'requires_enablement';
export type ModelConnectionStatus = 'verified' | 'candidate' | 'catalog_only';

export interface ProviderModelDefinition {
  id: string;
  displayName: string;
  family: 'gemini' | 'gemma' | 'third_party' | 'azure_deployment' | 'nim';
  connectionStatus: ModelConnectionStatus;
  routerReady: boolean;
  capabilities: string[];
  notes: string;
}

export interface ProviderRegistryItem {
  id: string;
  name: string;
  status: ProviderStatus;
  runtime: string;
  secretRef: string;
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

export function getProviderRegistry(): ProviderRegistryItem[] {
  return [
    {
      id: 'gcp-vertex-ai',
      name: 'Google Cloud Vertex AI',
      status: 'connected',
      runtime: 'Cloud Run service account / Vertex AI',
      secretRef: 'gcp-runtime-identity',
      models: GCP_VERTEX_MODELS,
      notes: 'Proveedor principal. Solo los modelos verificados se usan automaticamente en Dominus.',
    },
    {
      id: 'azure-openai',
      name: 'Azure OpenAI',
      status: 'pending',
      runtime: 'Azure deployments',
      secretRef: 'AZURE_OPENAI_CONFIG',
      models: [],
      notes: 'Siguiente proveedor: los modelos reales dependen de deployments del recurso Azure.',
    },
  ];
}
