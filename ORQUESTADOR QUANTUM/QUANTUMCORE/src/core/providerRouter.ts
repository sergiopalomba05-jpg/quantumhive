import { getProviderRegistry, type ProviderDefinition, type ProviderModelDefinition } from './aiProviders';

export interface ProviderSelectionRequest {
  brainMode?: 'auto' | 'manual' | 'vs_2' | 'dev' | 'low_cost';
  providerId?: string;
  modelId?: string;
  message?: string;
  repoId?: string;
}

export interface ProviderSelectionResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelDisplayName: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  repoId?: string;
}

const DEFAULT_PROVIDER_ID = 'gcp-vertex-ai';
const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

function isCodeTask(message = '') {
  const text = message.toLowerCase();
  return ['codigo', 'code', 'bug', 'debug', 'typescript', 'repo', 'refactor'].some((word) => text.includes(word));
}

function isCheapTask(message = '') {
  const text = message.toLowerCase();
  return ['barato', 'cheap', 'low cost', 'low-cost', 'masivo', 'clasificar'].some((word) => text.includes(word));
}

function hasLowCostSignal(model: ProviderModelDefinition) {
  return model.capabilities.includes('cheap') || model.capabilities.includes('low_cost') || model.recommendedFor?.includes('low_cost');
}

function findReadyModel(providers: ProviderDefinition[], providerId: string, modelId: string) {
  const provider = providers.find((item) => item.id === providerId);
  const model = provider?.models.find((item) => item.id === modelId);
  if (!provider || !model || !model.routerReady) return undefined;
  return { provider, model };
}

function defaultSelection(providers: ProviderDefinition[], fallbackReason?: string, repoId?: string): ProviderSelectionResult {
  const fallback = findReadyModel(providers, DEFAULT_PROVIDER_ID, DEFAULT_MODEL_ID);
  if (!fallback) throw new Error('Default Vertex fallback is not available');

  return {
    providerId: fallback.provider.id,
    providerName: fallback.provider.name,
    modelId: fallback.model.id,
    modelDisplayName: fallback.model.displayName,
    fallbackUsed: Boolean(fallbackReason),
    fallbackReason,
    repoId,
  };
}

export function resolveProviderSelection(
  request: ProviderSelectionRequest,
  env: NodeJS.ProcessEnv = process.env,
): ProviderSelectionResult {
  const providers = getProviderRegistry(env);
  const requestedProvider = request.providerId ? providers.find((provider) => provider.id === request.providerId) : undefined;
  const requestedModel = requestedProvider && request.modelId
    ? requestedProvider.models.find((model) => model.id === request.modelId)
    : undefined;

  if (requestedProvider || request.providerId || request.modelId) {
    if (requestedProvider?.status === 'requires_runner' || requestedModel?.connectionStatus === 'requires_runner') {
      return defaultSelection(providers, 'El proveedor elegido requiere runner local/VM antes de ejecutarse.', request.repoId);
    }

    if (requestedProvider && requestedModel?.routerReady) {
      return {
        providerId: requestedProvider.id,
        providerName: requestedProvider.name,
        modelId: requestedModel.id,
        modelDisplayName: requestedModel.displayName,
        fallbackUsed: false,
        repoId: request.repoId,
      };
    }

    return defaultSelection(providers, 'El proveedor o modelo elegido todavia no esta conectado.', request.repoId);
  }

  const readyModels = providers.flatMap((provider) => provider.models
    .filter((model) => model.routerReady)
    .map((model) => ({ provider, model })));

  const wantsCodeApi = (request.brainMode === 'auto' || request.brainMode === 'dev') && isCodeTask(request.message);
  const wantsLowCost = request.brainMode === 'low_cost' || isCheapTask(request.message);
  const preferred = readyModels.find(({ provider, model }) => wantsCodeApi && provider.id === 'openai-api' && model.capabilities.includes('code'))
    || readyModels.find(({ model }) => wantsLowCost && hasLowCostSignal(model))
    || readyModels.find(({ provider, model }) => provider.id === DEFAULT_PROVIDER_ID && model.id === DEFAULT_MODEL_ID);

  if (!preferred) return defaultSelection(providers, 'No habia modelos listos en el router.', request.repoId);

  return {
    providerId: preferred.provider.id,
    providerName: preferred.provider.name,
    modelId: preferred.model.id,
    modelDisplayName: preferred.model.displayName,
    fallbackUsed: false,
    repoId: request.repoId,
  };
}
