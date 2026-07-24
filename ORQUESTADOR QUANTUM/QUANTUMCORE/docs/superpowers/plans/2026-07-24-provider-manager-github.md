# Provider Manager + GitHub Repo Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional Provider Manager and GitHub repo connector so Dominus can select providers/models, apply safe fallbacks, and use an active GitHub repo as chat context.

**Architecture:** Keep provider metadata in focused core modules, expose secret-safe Express APIs, and keep browser/headless providers visible but blocked as `requires_runner` until local/VM runners exist. Implement real execution for Vertex and OpenAI-compatible APIs through backend adapters, while GitHub starts as a backend-validated repo metadata connector.

**Tech Stack:** Vite, React 19, TypeScript, Express, `@google/genai`, Supabase client, native `fetch`, Node test runner via `tsx --test`.

## Global Constraints

- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- OpenAI-compatible provider secrets must be read server-side from env only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
- Do not commit unless Sergio explicitly asks for a commit.
- Do not modify or delete unrelated dirty files in the repository root.

---

## File Structure

- Modify: `src/core/aiProviders.ts` owns provider/model types, templates, registry assembly, secret-safe serialization, and env-secret detection.
- Create: `src/core/providerRouter.ts` owns provider/model selection, fallback policy, and repo-aware context metadata.
- Create: `src/core/providerClients.ts` owns execution adapters for Vertex and OpenAI-compatible APIs.
- Modify: `src/core/brainRouter.ts` remains the compatibility layer for existing chat tests and exports catalog entries derived from provider-ready models.
- Modify: `src/server/routes/providers.ts` adds provider creation, testing, and model listing endpoints.
- Create: `src/server/routes/github.ts` owns GitHub repo URL parsing, metadata fetch, active repo selection, and safe context response.
- Modify: `src/server/app.ts` registers `githubRouter`.
- Modify: `src/server/routes/chat.ts` accepts `providerId`, `modelId`, and `repoId`, then calls the provider router/client instead of hardcoding Gemini everywhere.
- Modify: `src/pages/ApiProviders.tsx` becomes the Provider Manager UI.
- Modify: `src/pages/RepoConnector.tsx` removes mock-only behavior and calls backend GitHub endpoints.
- Modify: `src/pages/ChatCentral.tsx` adds compact bottom controls for provider/model/repo selection.
- Add tests: `tests/provider-manager.test.ts`, `tests/provider-router.test.ts`, `tests/github-connector.test.ts`, `tests/chat-provider-selection.test.ts`.

---

### Task 1: Provider Domain And Secret-Safe Registry

**Files:**
- Modify: `src/core/aiProviders.ts`
- Test: `tests/provider-manager.test.ts`

**Interfaces:**
- Consumes: existing `GCP_VERTEX_MODELS` and `getProviderRegistry()`.
- Produces: `ProviderKind`, `ProviderVendor`, `ProviderRuntimeStatus`, `ProviderDefinition`, `ProviderModelDefinition`, `getProviderTemplates()`, `getProviderRegistry(env?: NodeJS.ProcessEnv)`, `findProviderModel(providerId: string, modelId: string, env?: NodeJS.ProcessEnv)`.

- [ ] **Step 1: Write the failing provider registry tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getProviderRegistry, getProviderTemplates } from '../src/core/aiProviders';

describe('provider manager registry', () => {
  it('lists API, cloud, browser, headless, and local provider templates', () => {
    const kinds = new Set(getProviderTemplates().map((provider) => provider.kind));

    assert.equal(kinds.has('api'), true);
    assert.equal(kinds.has('cloud'), true);
    assert.equal(kinds.has('browser'), true);
    assert.equal(kinds.has('headless'), true);
    assert.equal(kinds.has('local'), true);
  });

  it('does not expose secret values when env vars are present', () => {
    const registry = getProviderRegistry({
      OPENAI_API_KEY: 'sk-real-secret',
      ANTHROPIC_API_KEY: 'anthropic-secret',
      OPENROUTER_API_KEY: 'openrouter-secret',
    } as NodeJS.ProcessEnv);
    const serialized = JSON.stringify(registry);

    assert.equal(registry.find((provider) => provider.id === 'openai-api')?.hasSecret, true);
    assert.equal(registry.find((provider) => provider.id === 'anthropic-api')?.hasSecret, true);
    assert.equal(registry.find((provider) => provider.id === 'openrouter-api')?.hasSecret, true);
    assert.doesNotMatch(serialized, /sk-real-secret|anthropic-secret|openrouter-secret/);
  });

  it('marks browser and headless plan providers as requiring runners', () => {
    const registry = getProviderRegistry({} as NodeJS.ProcessEnv);

    assert.equal(registry.find((provider) => provider.id === 'chatgpt-plus-browser')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'chatgpt-plus-headless')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'claude-pro-browser')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'claude-pro-headless')?.status, 'requires_runner');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/provider-manager.test.ts`

Expected: FAIL because `getProviderTemplates`, `kind`, `hasSecret`, and `requires_runner` provider statuses do not exist yet.

- [ ] **Step 3: Implement provider types and registry templates**

Add these exports in `src/core/aiProviders.ts`, preserving existing GCP models:

```ts
export type ProviderKind = 'api' | 'cloud' | 'browser' | 'headless' | 'local';
export type ProviderVendor = 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'openrouter' | 'ollama';
export type ProviderRuntimeStatus = 'connected' | 'needs_secret' | 'requires_runner' | 'needs_login' | 'limit_reached' | 'disabled' | 'failed';
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
      secretRef: 'OPENAI_API_KEY',
      hasSecret: false,
      priority: 10,
      costTier: 'medium',
      models: [
        { id: 'gpt-5.5', displayName: 'GPT-5.5', providerId: 'openai-api', family: 'gpt', connectionStatus: 'needs_secret', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['code', 'reasoning'], notes: 'Disponible cuando OPENAI_API_KEY este configurada.' },
        { id: 'gpt-5.5-mini', displayName: 'GPT-5.5 Mini', providerId: 'openai-api', family: 'gpt', connectionStatus: 'needs_secret', routerReady: false, capabilities: ['text', 'fast'], recommendedFor: ['fast', 'low_cost'], notes: 'Modelo rapido cuando OPENAI_API_KEY este configurada.' },
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
      secretRef: 'ANTHROPIC_API_KEY',
      hasSecret: false,
      priority: 20,
      costTier: 'high',
      models: [
        { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5', providerId: 'anthropic-api', family: 'claude', connectionStatus: 'needs_secret', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['code', 'architecture'], notes: 'Disponible cuando ANTHROPIC_API_KEY este configurada.' },
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
      secretRef: 'OPENROUTER_API_KEY',
      hasSecret: false,
      priority: 30,
      costTier: 'unknown',
      models: [
        { id: 'openrouter/auto', displayName: 'OpenRouter Auto', providerId: 'openrouter-api', family: 'openrouter', connectionStatus: 'needs_secret', routerReady: false, capabilities: ['text', 'router'], recommendedFor: ['fallback'], notes: 'Enruta desde OpenRouter cuando la API key exista.' },
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
      models: [{ id: 'chatgpt-plan-auto', displayName: 'ChatGPT Plan Auto', providerId: 'chatgpt-plus-browser', family: 'gpt', connectionStatus: 'requires_runner', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['personal_plan'], notes: 'Requiere runner local/VM para usar sesion browser.' }],
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
      models: [{ id: 'chatgpt-headless-auto', displayName: 'ChatGPT Headless Auto', providerId: 'chatgpt-plus-headless', family: 'gpt', connectionStatus: 'requires_runner', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['personal_plan'], notes: 'Requiere runner local/VM para usar sesion headless.' }],
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
      models: [{ id: 'claude-plan-auto', displayName: 'Claude Plan Auto', providerId: 'claude-pro-browser', family: 'claude', connectionStatus: 'requires_runner', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['personal_plan'], notes: 'Requiere runner local/VM para usar Claude Pro.' }],
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
      models: [{ id: 'claude-headless-auto', displayName: 'Claude Headless Auto', providerId: 'claude-pro-headless', family: 'claude', connectionStatus: 'requires_runner', routerReady: false, capabilities: ['text', 'code', 'reasoning'], recommendedFor: ['personal_plan'], notes: 'Requiere runner local/VM para usar Claude headless.' }],
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
      models: [{ id: 'ollama-auto', displayName: 'Ollama Auto', providerId: 'ollama-vm', family: 'ollama', connectionStatus: 'requires_runner', routerReady: false, capabilities: ['text', 'local'], recommendedFor: ['local_models'], notes: 'Requiere runner conectado a una VM/local.' }],
      notes: 'Reservado para runners locales/VM.',
    },
  ];
}
```

Update `getProviderRegistry(env = process.env)` so it maps templates and sets `status`, `hasSecret`, `routerReady`, and `connectionStatus` for API providers when their env secret exists. Keep the existing Vertex provider connected.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/provider-manager.test.ts`

Expected: PASS.

---

### Task 2: Provider Router And Execution Clients

**Files:**
- Create: `src/core/providerRouter.ts`
- Create: `src/core/providerClients.ts`
- Modify: `src/core/brainRouter.ts`
- Test: `tests/provider-router.test.ts`

**Interfaces:**
- Consumes: `getProviderRegistry(env)` from Task 1 and existing `ai` Vertex client.
- Produces: `resolveProviderSelection(request, env?)`, `generateWithProvider(request)`, `ProviderChatRequest`, `ProviderChatResult`.

- [ ] **Step 1: Write failing router tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProviderSelection } from '../src/core/providerRouter';

describe('provider router', () => {
  it('uses a requested router-ready OpenAI model when the server has an OpenAI secret', () => {
    const selection = resolveProviderSelection(
      { providerId: 'openai-api', modelId: 'gpt-5.5', message: 'arreglar codigo' },
      { OPENAI_API_KEY: 'secret' } as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'openai-api');
    assert.equal(selection.modelId, 'gpt-5.5');
    assert.equal(selection.fallbackUsed, false);
  });

  it('does not execute browser/headless providers before runners exist', () => {
    const selection = resolveProviderSelection(
      { providerId: 'chatgpt-plus-browser', modelId: 'chatgpt-plan-auto', message: 'codigo' },
      {} as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'gcp-vertex-ai');
    assert.equal(selection.modelId, 'gemini-2.5-flash');
    assert.equal(selection.fallbackUsed, true);
    assert.match(selection.fallbackReason || '', /requiere runner/i);
  });

  it('chooses code-capable API providers before Vertex when available in auto mode', () => {
    const selection = resolveProviderSelection(
      { brainMode: 'auto', message: 'necesito debuggear codigo TypeScript' },
      { OPENAI_API_KEY: 'secret' } as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'openai-api');
    assert.equal(selection.modelId, 'gpt-5.5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/provider-router.test.ts`

Expected: FAIL because `src/core/providerRouter.ts` does not exist.

- [ ] **Step 3: Implement provider router**

Create `src/core/providerRouter.ts`:

```ts
import { getProviderRegistry, ProviderDefinition, ProviderModelDefinition } from './aiProviders';

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
  return ['barato', 'cheap', 'low cost', 'masivo', 'clasificar'].some((word) => text.includes(word));
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

export function resolveProviderSelection(request: ProviderSelectionRequest, env: NodeJS.ProcessEnv = process.env): ProviderSelectionResult {
  const providers = getProviderRegistry(env);
  const requestedProvider = request.providerId ? providers.find((provider) => provider.id === request.providerId) : undefined;
  const requestedModel = requestedProvider && request.modelId ? requestedProvider.models.find((model) => model.id === request.modelId) : undefined;

  if (requestedProvider && requestedModel) {
    if (requestedProvider.status === 'requires_runner' || requestedModel.connectionStatus === 'requires_runner') {
      return defaultSelection(providers, 'El proveedor elegido requiere runner local/VM antes de ejecutarse.', request.repoId);
    }
    if (requestedModel.routerReady) {
      return {
        providerId: requestedProvider.id,
        providerName: requestedProvider.name,
        modelId: requestedModel.id,
        modelDisplayName: requestedModel.displayName,
        fallbackUsed: false,
        repoId: request.repoId,
      };
    }
    return defaultSelection(providers, 'El modelo elegido todavia no esta conectado.', request.repoId);
  }

  const readyModels = providers.flatMap((provider) => provider.models
    .filter((model) => model.routerReady)
    .map((model) => ({ provider, model })));

  const preferred = readyModels.find(({ provider, model }) => isCodeTask(request.message) && provider.id === 'openai-api' && model.capabilities.includes('code'))
    || readyModels.find(({ model }) => isCheapTask(request.message) && model.capabilities.includes('cheap'))
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
```

- [ ] **Step 4: Implement execution clients**

Create `src/core/providerClients.ts`:

```ts
import { ai } from './providers/ai';
import { ProviderSelectionResult } from './providerRouter';

export interface ProviderChatRequest {
  selection: ProviderSelectionResult;
  prompt: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProviderChatResult {
  text: string;
  providerId: string;
  modelId: string;
}

async function generateWithVertex(modelId: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({ model: modelId, contents: prompt });
  return response.text || '';
}

async function generateWithOpenAICompatible(baseUrl: string, apiKey: string, modelId: string, prompt: string): Promise<string> {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

export async function generateWithProvider(request: ProviderChatRequest): Promise<ProviderChatResult> {
  const env = request.env || process.env;
  const { selection, prompt } = request;

  if (selection.providerId === 'gcp-vertex-ai') {
    return { text: await generateWithVertex(selection.modelId, prompt), providerId: selection.providerId, modelId: selection.modelId };
  }

  if (selection.providerId === 'openai-api') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    return { text: await generateWithOpenAICompatible('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, selection.modelId, prompt), providerId: selection.providerId, modelId: selection.modelId };
  }

  if (selection.providerId === 'openrouter-api') {
    if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
    return { text: await generateWithOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, selection.modelId, prompt), providerId: selection.providerId, modelId: selection.modelId };
  }

  throw new Error(`Provider ${selection.providerId} is not executable yet`);
}
```

- [ ] **Step 5: Run router tests**

Run: `npm test -- tests/provider-router.test.ts`

Expected: PASS.

---

### Task 3: Provider API Routes

**Files:**
- Modify: `src/server/routes/providers.ts`
- Test: `tests/provider-api.test.ts`

**Interfaces:**
- Consumes: `getProviderRegistry`, `resolveProviderSelection`.
- Produces: `GET /api/providers`, `POST /api/providers/:id/test`, `GET /api/providers/:id/models`.

- [ ] **Step 1: Write failing API tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app } from '../src/server/app';

function listen() {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('invalid test server address');
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

describe('provider API routes', () => {
  it('returns secret-safe provider metadata', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers`);
      const data = await response.json() as { providers: unknown[] };
      const serialized = JSON.stringify(data);

      assert.equal(response.status, 200);
      assert.equal(data.providers.length >= 8, true);
      assert.doesNotMatch(serialized, /apiKey|secretKey|sk-/i);
    } finally {
      await server.close();
    }
  });

  it('lists models for one provider', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers/gcp-vertex-ai/models`);
      const data = await response.json() as { models: Array<{ id: string }> };

      assert.equal(response.status, 200);
      assert.equal(data.models.some((model) => model.id === 'gemini-2.5-flash'), true);
    } finally {
      await server.close();
    }
  });

  it('reports requires_runner for browser providers without executing them', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers/chatgpt-plus-browser/test`, { method: 'POST' });
      const data = await response.json() as { status: string; message: string };

      assert.equal(response.status, 200);
      assert.equal(data.status, 'requires_runner');
      assert.match(data.message, /runner/i);
    } finally {
      await server.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/provider-api.test.ts`

Expected: FAIL because provider model/test endpoints are not implemented.

- [ ] **Step 3: Implement provider endpoints**

Update `src/server/routes/providers.ts`:

```ts
import { Router } from 'express';
import { getProviderRegistry } from '../../core/aiProviders';

export const providersRouter = Router();

providersRouter.get('/providers', (_req, res) => {
  res.json({ providers: getProviderRegistry() });
});

providersRouter.get('/providers/:id/models', (req, res) => {
  const provider = getProviderRegistry().find((item) => item.id === req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'provider not found' });
    return;
  }
  res.json({ models: provider.models });
});

providersRouter.post('/providers/:id/test', (req, res) => {
  const provider = getProviderRegistry().find((item) => item.id === req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'provider not found' });
    return;
  }
  if (provider.status === 'requires_runner') {
    res.json({ status: provider.status, message: 'Este proveedor requiere runner local/VM antes de ejecutarse.' });
    return;
  }
  if (provider.status === 'needs_secret') {
    res.json({ status: provider.status, message: `Configura ${provider.secretRef} en el backend para activar este proveedor.` });
    return;
  }
  res.json({ status: provider.status, message: 'Proveedor disponible para el router.' });
});
```

- [ ] **Step 4: Run API tests**

Run: `npm test -- tests/provider-api.test.ts`

Expected: PASS.

---

### Task 4: Chat Route Provider Selection

**Files:**
- Modify: `src/server/routes/chat.ts`
- Test: `tests/chat-provider-selection.test.ts`

**Interfaces:**
- Consumes: `resolveProviderSelection(request)` and `generateWithProvider(request)`.
- Produces: `/api/agents/:agentId/chat` response `brain` object with `providerId`, `modelId`, `fallbackUsed`, `repoId`.

- [ ] **Step 1: Write failing contract test**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('chat provider selection contract', () => {
  it('accepts providerId, modelId, and repoId in Dominus chat route', () => {
    const chatRoute = readProjectFile('src/server/routes/chat.ts');

    assert.match(chatRoute, /providerId/);
    assert.match(chatRoute, /repoId/);
    assert.match(chatRoute, /resolveProviderSelection/);
    assert.match(chatRoute, /generateWithProvider/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/chat-provider-selection.test.ts`

Expected: FAIL because `chat.ts` does not use the new provider router/client.

- [ ] **Step 3: Update chat route request parsing and execution**

In `src/server/routes/chat.ts`, add imports:

```ts
import { resolveProviderSelection } from '../../core/providerRouter';
import { generateWithProvider } from '../../core/providerClients';
```

Change the body destructuring inside `/agents/:agentId/chat`:

```ts
const { message, brainMode, modelId, vsModelIds, providerId, repoId } = req.body;
```

Replace the non-`vs_2` generation block with:

```ts
const providerSelection = resolveProviderSelection({ brainMode, providerId, modelId, repoId, message });
const response = await generateWithProvider({
  selection: providerSelection,
  prompt: context.prompt,
});

const extracted = extractMemoryProposal(response.text || '');
res.json({
  text: extracted.text,
  brain: {
    ...brain,
    providerId: providerSelection.providerId,
    providerName: providerSelection.providerName,
    usedModelId: providerSelection.modelId,
    modelDisplayName: providerSelection.modelDisplayName,
    fallbackUsed: providerSelection.fallbackUsed,
    fallbackReason: providerSelection.fallbackReason,
    repoId: providerSelection.repoId,
  },
  memoryProposal: extracted.memoryProposal,
});
```

Keep the existing `vs_2` branch on Vertex models for now so the verified V.S 2 behavior does not regress.

- [ ] **Step 4: Run chat contract test**

Run: `npm test -- tests/chat-provider-selection.test.ts`

Expected: PASS.

- [ ] **Step 5: Run existing brain/chat tests**

Run: `npm test -- tests/brain-router.test.ts tests/chat-command-ui.test.ts`

Expected: PASS.

---

### Task 5: GitHub Repo Connector Backend

**Files:**
- Create: `src/server/routes/github.ts`
- Modify: `src/server/app.ts`
- Test: `tests/github-connector.test.ts`

**Interfaces:**
- Produces: `parseGitHubRepoUrl(url: string)`, `githubRouter`, `POST /api/github/repos`, `GET /api/github/repos`, `PATCH /api/github/repos/:id/active`, `GET /api/github/repos/:id/context`.

- [ ] **Step 1: Write failing GitHub tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGitHubRepoUrl } from '../src/server/routes/github';

describe('github connector', () => {
  it('parses HTTPS GitHub repository URLs', () => {
    assert.deepEqual(parseGitHubRepoUrl('https://github.com/owner/repo'), { owner: 'owner', name: 'repo' });
    assert.deepEqual(parseGitHubRepoUrl('https://github.com/owner/repo.git'), { owner: 'owner', name: 'repo' });
  });

  it('rejects non-GitHub URLs', () => {
    assert.throws(() => parseGitHubRepoUrl('https://gitlab.com/owner/repo'), /GitHub/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/github-connector.test.ts`

Expected: FAIL because `src/server/routes/github.ts` does not exist.

- [ ] **Step 3: Implement GitHub route module**

Create `src/server/routes/github.ts`:

```ts
import { Router } from 'express';

export interface GitHubRepoRecord {
  id: string;
  provider: 'github';
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  status: 'connected' | 'needs_auth' | 'failed';
  active: boolean;
  lastIndexedAt?: number;
  notes: string;
}

const repos = new Map<string, GitHubRepoRecord>();
let activeRepoId: string | undefined;

export function parseGitHubRepoUrl(url: string): { owner: string; name: string } {
  const parsed = new URL(url);
  if (parsed.hostname !== 'github.com') throw new Error('Only GitHub repository URLs are supported');
  const [owner, rawName] = parsed.pathname.replace(/^\//, '').split('/');
  const name = rawName?.replace(/\.git$/, '');
  if (!owner || !name) throw new Error('Invalid GitHub repository URL');
  return { owner, name };
}

async function fetchRepoMetadata(owner: string, name: string): Promise<{ defaultBranch: string; private: boolean }> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers });
  if (response.status === 401 || response.status === 403) throw new Error('GitHub auth required or rate limited');
  if (!response.ok) throw new Error(`GitHub repo fetch failed: ${response.status}`);
  const data = await response.json() as { default_branch?: string; private?: boolean };
  return { defaultBranch: data.default_branch || 'main', private: Boolean(data.private) };
}

export const githubRouter = Router();

githubRouter.get('/github/repos', (_req, res) => {
  res.json({ repos: Array.from(repos.values()) });
});

githubRouter.post('/github/repos', async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    const { owner, name } = parseGitHubRepoUrl(url);
    const metadata = await fetchRepoMetadata(owner, name);
    const id = `${owner}/${name}`;
    const repo: GitHubRepoRecord = {
      id,
      provider: 'github',
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
      defaultBranch: metadata.defaultBranch,
      status: 'connected',
      active: activeRepoId ? activeRepoId === id : true,
      lastIndexedAt: Date.now(),
      notes: metadata.private ? 'Repo privado conectado con token server-side.' : 'Repo publico conectado desde GitHub API.',
    };
    repos.set(id, repo);
    if (!activeRepoId) activeRepoId = id;
    res.status(201).json({ repo: { ...repo, active: activeRepoId === id } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

githubRouter.patch('/github/repos/:id/active', (req, res) => {
  const repo = repos.get(req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }
  activeRepoId = repo.id;
  res.json({ repo: { ...repo, active: true } });
});

githubRouter.get('/github/repos/:id/context', (req, res) => {
  const repo = repos.get(req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }
  res.json({
    context: {
      repoId: repo.id,
      title: `${repo.owner}/${repo.name}`,
      summary: `Repositorio GitHub ${repo.owner}/${repo.name} en branch ${repo.defaultBranch}.`,
      url: repo.url,
      lastIndexedAt: repo.lastIndexedAt,
    },
  });
});
```

- [ ] **Step 4: Register GitHub router**

Modify `src/server/app.ts`:

```ts
import { githubRouter } from './routes/github';

app.use('/api', githubRouter);
```

- [ ] **Step 5: Run GitHub tests**

Run: `npm test -- tests/github-connector.test.ts`

Expected: PASS.

---

### Task 6: Provider Manager UI And Chat Controls

**Files:**
- Modify: `src/pages/ApiProviders.tsx`
- Modify: `src/pages/ChatCentral.tsx`
- Test: `tests/provider-manager-ui.test.ts`

**Interfaces:**
- Consumes: `GET /api/providers`, `POST /api/providers/:id/test`.
- Produces: visible provider type filters, provider/model selectors, and chat request fields `providerId`, `modelId`, `repoId`.

- [ ] **Step 1: Write failing UI contract tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('provider manager UI', () => {
  it('renders provider manager controls without secret fields', () => {
    const page = readProjectFile('src/pages/ApiProviders.tsx');

    assert.match(page, /Agregar proveedor/);
    assert.match(page, /Browser/);
    assert.match(page, /Headless/);
    assert.match(page, /Local\/VM/);
    assert.match(page, /\/api\/providers/);
    assert.doesNotMatch(page, /type="password"|localStorage|apiKey|secretKey/i);
  });

  it('sends providerId modelId and repoId from chat requests', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');

    assert.match(chat, /providerId/);
    assert.match(chat, /modelId/);
    assert.match(chat, /repoId/);
    assert.match(chat, /\/api\/providers/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/provider-manager-ui.test.ts`

Expected: FAIL because the UI does not yet expose all controls.

- [ ] **Step 3: Update Provider Manager UI**

In `src/pages/ApiProviders.tsx`, add local state:

```tsx
const [kindFilter, setKindFilter] = useState<string>('all');
const [testingProviderId, setTestingProviderId] = useState<string>('');
const [testMessage, setTestMessage] = useState<string>('');
const filteredProviders = kindFilter === 'all' ? providers : providers.filter((provider) => provider.kind === kindFilter);
```

Add buttons above the grid:

```tsx
<div className="mb-4 flex flex-wrap gap-2">
  {['all', 'api', 'cloud', 'browser', 'headless', 'local'].map((kind) => (
    <button key={kind} onClick={() => setKindFilter(kind)} className="glass-button text-xs uppercase">
      {kind === 'all' ? 'Todos' : kind === 'local' ? 'Local/VM' : kind}
    </button>
  ))}
  <button className="glass-button text-xs uppercase">Agregar proveedor</button>
</div>
```

Add a test action inside each provider card:

```tsx
<button
  className="rounded-lg border border-qh-cyan/30 px-3 py-2 text-[10px] font-mono text-qh-cyan"
  disabled={testingProviderId === provider.id}
  onClick={() => {
    setTestingProviderId(provider.id);
    fetch(`/api/providers/${provider.id}/test`, { method: 'POST' })
      .then((response) => response.json())
      .then((data) => setTestMessage(`${provider.name}: ${data.message || data.status}`))
      .catch((error) => setTestMessage(`${provider.name}: ${error.message}`))
      .finally(() => setTestingProviderId(''));
  }}
>
  Probar
</button>
```

Render `testMessage` below the controls when present.

- [ ] **Step 4: Add chat provider/model/repo controls**

In `src/pages/ChatCentral.tsx`, fetch providers from `/api/providers`, store selected `providerId`, `modelId`, and `repoId`, and include them in the Dominus chat request body:

```tsx
body: JSON.stringify({
  message: input,
  brainMode,
  modelId: selectedModelId,
  providerId: selectedProviderId,
  repoId: selectedRepoId,
  vsModelIds: selectedVsModelIds,
})
```

Use simple selects in the compact chat footer. Keep existing visual style and avoid moving the main chat layout.

- [ ] **Step 5: Run UI contract tests**

Run: `npm test -- tests/provider-manager-ui.test.ts`

Expected: PASS.

---

### Task 7: GitHub RepoConnector UI

**Files:**
- Modify: `src/pages/RepoConnector.tsx`
- Test: `tests/github-ui.test.ts`

**Interfaces:**
- Consumes: `GET /api/github/repos`, `POST /api/github/repos`, `PATCH /api/github/repos/:id/active`, `GET /api/github/repos/:id/context`.
- Produces: real GitHub repo add/select UI without mock copy.

- [ ] **Step 1: Write failing GitHub UI tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('github repo connector UI', () => {
  it('uses backend GitHub endpoints instead of mock repo creation', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /\/api\/github\/repos/);
    assert.match(page, /setActiveRepo/);
    assert.doesNotMatch(page, /Modo Simulado|Conectar Simulado|Add mock repo|alert\(/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/github-ui.test.ts`

Expected: FAIL because the page still contains mock behavior.

- [ ] **Step 3: Replace mock repo creation with backend calls**

In `src/pages/RepoConnector.tsx`, add state:

```tsx
const [repos, setRepos] = useState<RepoConnection[]>([]);
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

Add fetch helper:

```tsx
const loadRepos = () => {
  fetch('/api/github/repos')
    .then((response) => response.json())
    .then((data) => setRepos((data.repos || []).map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      provider: 'github',
      repoUrl: repo.url,
      localPath: '',
      defaultBranch: repo.defaultBranch,
      activeBranch: repo.defaultBranch,
      status: repo.status === 'connected' ? 'conectado' : 'error',
      graphifyStatus: repo.lastIndexedAt ? 'imported' : 'missing',
      lastIndexedAt: repo.lastIndexedAt,
      notes: repo.notes,
    }))))
    .catch((err) => setError(err.message));
};
```

Add connect helper:

```tsx
const handleAdd = () => {
  setLoading(true);
  setError('');
  fetch('/api/github/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo conectar el repo');
      return data;
    })
    .then(() => {
      setShowAdd(false);
      setUrl('');
      loadRepos();
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
};
```

Add active helper:

```tsx
const setActiveRepo = (id: string) => {
  fetch(`/api/github/repos/${encodeURIComponent(id)}/active`, { method: 'PATCH' })
    .then(() => loadRepos())
    .catch((err) => setError(err.message));
};
```

Use `repos` instead of `store.repoConnections` for rendering. Remove `local` option from this MVP screen or mark it as `requires runner` disabled.

- [ ] **Step 4: Run GitHub UI test**

Run: `npm test -- tests/github-ui.test.ts`

Expected: PASS.

---

### Task 8: Full Verification And Deployment Prep

**Files:**
- Review: changed files only.
- No new test file.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified build ready for deploy.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- tests/provider-manager.test.ts tests/provider-router.test.ts tests/provider-api.test.ts tests/chat-provider-selection.test.ts tests/github-connector.test.ts tests/provider-manager-ui.test.ts tests/github-ui.test.ts`

Expected: all listed tests PASS.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: all tests PASS. Existing Zustand storage warnings are acceptable if test count shows zero failures.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: `tsc --noEmit` completes with exit 0. If it exceeds 120 seconds without errors, rerun with a 300000 ms timeout before treating it as blocked.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Vite and esbuild complete with exit 0. Existing chunk-size warning is acceptable.

- [ ] **Step 5: Review diff scope**

Run: `git diff -- "ORQUESTADOR QUANTUM/QUANTUMCORE"`

Expected: diff only contains Provider Manager, GitHub connector, router, tests, and docs changes. Do not revert unrelated repository-root changes.

- [ ] **Step 6: Report deploy readiness**

Report these facts to Sergio:

```txt
Provider Manager status: verified locally / blocked with reason
GitHub connector status: verified locally / blocked with reason
Tests: command and pass/fail count
Lint: pass/fail
Build: pass/fail
Deploy: not run unless Sergio asks
```

---

## Self-Review

Spec coverage:

- Provider menu and model registry: covered by Tasks 1, 3, and 6.
- API/cloud providers: covered by Tasks 1, 2, 3, and 4.
- Browser/headless plan providers: covered by Tasks 1, 2, 3, and 6 as `requires_runner`.
- Router fallback: covered by Task 2 and Task 4.
- GitHub repo connector: covered by Task 5 and Task 7.
- Secret safety: covered by Task 1, Task 3, Task 6, and global constraints.
- Runners excluded: explicitly enforced by Task 1 statuses and global constraints.

Placeholder scan:

- The plan contains no unresolved placeholder markers.
- Browser/headless is not described as half-implemented; it is explicitly represented as `requires_runner`.

Type consistency:

- Provider status names match across registry, router, API, and UI.
- GitHub repo id uses `owner/name`; endpoint callers must use `encodeURIComponent(id)` for path use.
- Chat request fields are consistently `providerId`, `modelId`, and `repoId`.
