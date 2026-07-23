# Dominus Brain Router Hibrido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ChatCentral talk to Dominus Prime with real system core, constitution, Supabase memories, and a visual hybrid Brain Router selector.

**Architecture:** Add small pure modules for brain routing and Dominus context packing, then wire them into a new Express endpoint and ChatCentral. The first real provider remains Gemini/Vertex; unavailable models are displayed visually but route through Gemini fallback with explicit metadata.

**Tech Stack:** Vite, React, TypeScript, Express, Supabase JS, Google GenAI SDK, Node test runner with `tsx --test`.

## Global Constraints

- Dominus agent ID is `11111111-1111-4111-8111-111111111111`.
- First real provider is Vertex/Gemini; GPT, Claude, and Kimi are UI/catalog entries only for this version.
- Memory proposals are returned and shown, but never saved automatically.
- `ChatCentral` must send `agentId`, `brainMode`, `modelId`, and `message` to the backend.
- The backend must load agent, memories, system core doc, and constitution doc before calling the model.
- If a requested model is not connected, fallback to `gemini-2.5-flash` and report the fallback.
- Keep changes minimal and do not build billing, Agent Builder model assignment, avatar live, VM manager, or real council mode now.

---

## File Structure

- Create `src/core/brainRouter.ts`: model catalog, brain mode types, and `resolveBrainSelection()`.
- Create `tests/brain-router.test.ts`: unit tests for available models, fallback, and auto recommendations.
- Create `src/core/dominusContext.ts`: pure context pack and prompt builder for agent, docs, memories, and message.
- Create `tests/dominus-context.test.ts`: unit tests for prompt composition and memory proposal instruction.
- Modify `src/core/providers/supabase.ts`: provide same Supabase fallback URL/publishable key as frontend when env vars are missing.
- Modify `src/server/routes/chat.ts`: add `POST /api/agents/:agentId/chat`, helper loading functions, and response metadata.
- Modify `src/pages/ChatCentral.tsx`: add visual model selector, send selected brain/model, and show fallback/memory proposal.

---

### Task 1: Brain Router Core

**Files:**
- Create: `src/core/brainRouter.ts`
- Test: `tests/brain-router.test.ts`

**Interfaces:**
- Produces: `BRAIN_MODELS`, `BrainMode`, `BrainSelectionRequest`, `ResolvedBrainSelection`, `resolveBrainSelection(request)`.
- Consumes: no project-specific runtime dependencies.

- [ ] **Step 1: Write the failing test**

Create `tests/brain-router.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BRAIN_MODELS, resolveBrainSelection } from '../src/core/brainRouter';

describe('brain router', () => {
  it('uses a connected Gemini model when requested manually', () => {
    const result = resolveBrainSelection({ brainMode: 'manual', modelId: 'gemini-2.5-pro', message: 'analiza este contexto' });

    assert.equal(result.requestedModelId, 'gemini-2.5-pro');
    assert.equal(result.usedModelId, 'gemini-2.5-pro');
    assert.equal(result.provider, 'vertex');
    assert.equal(result.fallbackUsed, false);
  });

  it('falls back to Gemini when the requested model is not connected', () => {
    const result = resolveBrainSelection({ brainMode: 'manual', modelId: 'claude-sonnet-5', message: 'escribi codigo' });

    assert.equal(result.requestedModelId, 'claude-sonnet-5');
    assert.equal(result.usedModelId, 'gemini-2.5-flash');
    assert.equal(result.provider, 'vertex');
    assert.equal(result.fallbackUsed, true);
    assert.match(result.fallbackReason || '', /todavia no conectado/i);
  });

  it('recommends code-capable catalog entries without forcing them in auto mode', () => {
    const result = resolveBrainSelection({ brainMode: 'auto', message: 'revisa este codigo y escribi el fix' });

    assert.equal(result.usedModelId, 'gemini-2.5-flash');
    assert.equal(result.recommendedModelId, 'claude-sonnet-5');
    assert.equal(result.fallbackUsed, true);
  });

  it('exposes visual catalog metadata for the chat selector', () => {
    const claude = BRAIN_MODELS.find((model) => model.id === 'claude-sonnet-5');

    assert.equal(claude?.displayName, 'Claude Sonnet 5');
    assert.equal(claude?.status, 'not_connected');
    assert.equal(claude?.recommendedFor.includes('codigo'), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/brain-router.test.ts`

Expected: fail because `src/core/brainRouter.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/brainRouter.ts` with:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/brain-router.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/brain-router.test.ts src/core/brainRouter.ts
git commit -m "feat: add dominus brain router core"
```

---

### Task 2: Dominus Context Pack Builder

**Files:**
- Create: `src/core/dominusContext.ts`
- Test: `tests/dominus-context.test.ts`

**Interfaces:**
- Consumes: plain agent/doc/memory data objects from the endpoint.
- Produces: `buildDominusContextPack(input)` returning `{ prompt: string; memoryProposalInstruction: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/dominus-context.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDominusContextPack } from '../src/core/dominusContext';

describe('Dominus context pack', () => {
  it('builds a prompt with system core, constitution, critical memories, and user message', () => {
    const result = buildDominusContextPack({
      agent: { name: 'Dominus Prime', role: 'Orquestador General' },
      systemCore: 'Sos Dominus Prime.',
      constitution: 'Sergio es autoridad final.',
      memories: [
        { title: 'Baja', content: 'menos importante', importance: 'baja', type: 'Contexto', tags: [] },
        { title: 'Critica', content: 'memoria critica', importance: 'crítica', type: 'Decision', tags: ['dominus'] },
      ],
      message: 'Que seguimos haciendo?',
    });

    assert.match(result.prompt, /SYSTEM CORE/);
    assert.match(result.prompt, /Sos Dominus Prime/);
    assert.match(result.prompt, /CONSTITUCION/);
    assert.match(result.prompt, /Sergio es autoridad final/);
    assert.match(result.prompt, /Critica/);
    assert.match(result.prompt, /Que seguimos haciendo\?/);
    assert.equal(result.prompt.includes('Baja'), true);
  });

  it('instructs the model to propose memory without claiming it was saved', () => {
    const result = buildDominusContextPack({
      agent: { name: 'Dominus Prime', role: 'Orquestador General' },
      systemCore: 'core',
      constitution: 'constitution',
      memories: [],
      message: 'guardar esta decision',
    });

    assert.match(result.prompt, /memoryProposal/);
    assert.match(result.prompt, /No afirmes que fue guardado/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dominus-context.test.ts`

Expected: fail because `src/core/dominusContext.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/dominusContext.ts` with:

```ts
interface DominusAgentContext {
  name: string;
  role: string;
}

interface DominusMemoryContext {
  title?: string;
  content?: string;
  importance?: string;
  type?: string;
  tags?: string[];
}

interface BuildDominusContextInput {
  agent: DominusAgentContext;
  systemCore: string;
  constitution: string;
  memories: DominusMemoryContext[];
  message: string;
}

export function buildDominusContextPack(input: BuildDominusContextInput) {
  const sortedMemories = [...input.memories].sort((a, b) => {
    const rank: Record<string, number> = { 'crítica': 4, critica: 4, alta: 3, media: 2, baja: 1 };
    return (rank[b.importance || ''] || 0) - (rank[a.importance || ''] || 0);
  });

  const memoriesText = sortedMemories.length
    ? sortedMemories.map((memory) => `- ${memory.title || 'Memoria'} [${memory.type || 'Contexto'} / ${memory.importance || 'media'}]: ${memory.content || ''}`).join('\n')
    : '- Sin memorias vinculadas recuperadas.';

  const memoryProposalInstruction = [
    'Si detectas una decision, contexto importante, proxima accion o riesgo que conviene guardar, devolve una propuesta de memoria en formato JSON al final bajo la clave memoryProposal.',
    'No afirmes que fue guardado. Solo proponelo para aprobacion humana.',
  ].join(' ');

  const prompt = [
    'SYSTEM CORE',
    input.systemCore.trim(),
    '',
    'AGENTE',
    `${input.agent.name}: ${input.agent.role}`,
    '',
    'CONSTITUCION',
    input.constitution.trim(),
    '',
    'MEMORIAS DEL AGENTE',
    memoriesText,
    '',
    'INSTRUCCION DE MEMORIA',
    memoryProposalInstruction,
    '',
    'MENSAJE DEL USUARIO',
    input.message,
  ].join('\n');

  return { prompt, memoryProposalInstruction };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dominus-context.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/dominus-context.test.ts src/core/dominusContext.ts
git commit -m "feat: build dominus context packs"
```

---

### Task 3: Dominus Chat Endpoint

**Files:**
- Modify: `src/core/providers/supabase.ts`
- Modify: `src/server/routes/chat.ts`
- Test: existing tests plus Task 1 and Task 2 tests

**Interfaces:**
- Consumes: `resolveBrainSelection()` and `buildDominusContextPack()`.
- Produces: `POST /api/agents/:agentId/chat` response with `text`, `brain`, and optional `memoryProposal`.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/dominus-context.test.ts`:

```ts
import { extractMemoryProposal } from '../src/core/dominusContext';

it('extracts a memoryProposal JSON block from model text', () => {
  const result = extractMemoryProposal('Respuesta\n```json\n{"memoryProposal":{"title":"Decision","content":"Guardar esto","type":"Decisión","importance":"alta","tags":["dominus"]}}\n```');

  assert.equal(result.text.includes('memoryProposal'), false);
  assert.equal(result.memoryProposal?.title, 'Decision');
  assert.equal(result.memoryProposal?.importance, 'alta');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dominus-context.test.ts`

Expected: fail because `extractMemoryProposal` is not exported.

- [ ] **Step 3: Implement proposal extraction and endpoint**

Add `extractMemoryProposal()` to `src/core/dominusContext.ts`:

```ts
export interface MemoryProposal {
  title: string;
  content: string;
  type: string;
  importance: string;
  tags: string[];
}

export function extractMemoryProposal(rawText: string): { text: string; memoryProposal?: MemoryProposal } {
  const jsonBlock = rawText.match(/```json\s*([\s\S]*?)```/i);
  if (!jsonBlock) return { text: rawText };

  try {
    const parsed = JSON.parse(jsonBlock[1]);
    if (!parsed.memoryProposal) return { text: rawText };
    return {
      text: rawText.replace(jsonBlock[0], '').trim(),
      memoryProposal: parsed.memoryProposal,
    };
  } catch {
    return { text: rawText };
  }
}
```

Update `src/core/providers/supabase.ts` so backend has the same safe publishable fallback as the frontend:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://okknbcumosciujogcqtc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_lfCC9gDWnL--ARhnZlLDXw_pgJsZqAs';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

Modify `src/server/routes/chat.ts`:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { supabase } from '../../core/providers/supabase';
import { resolveBrainSelection } from '../../core/brainRouter';
import { buildDominusContextPack, extractMemoryProposal } from '../../core/dominusContext';
```

Add route after existing `/think` route:

```ts
chatRouter.post('/agents/:agentId/chat', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, brainMode, modelId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const { data: agent, error: agentError } = await supabase.from('agents').select('*').eq('id', agentId).single();
    if (agentError || !agent) {
      res.status(404).json({ error: 'agent not found' });
      return;
    }

    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select('title,content,importance,type,tags')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (memoriesError) throw memoriesError;

    const systemCorePath = path.join(process.cwd(), agent.system_core_doc_path || 'docs/DOMINUS_PRIME_SYSTEM_CORE.md');
    const constitutionPath = path.join(process.cwd(), agent.constitution_doc_path || 'docs/DOMINUS_PRIME_CONSTITUTION.md');
    const [systemCore, constitution] = await Promise.all([
      readFile(systemCorePath, 'utf8'),
      readFile(constitutionPath, 'utf8'),
    ]);

    const brain = resolveBrainSelection({ brainMode, modelId, message });
    const context = buildDominusContextPack({
      agent: { name: agent.name, role: agent.role },
      systemCore,
      constitution,
      memories: memories || [],
      message,
    });

    const response = await ai.models.generateContent({
      model: brain.usedModelId,
      contents: context.prompt,
      config: brain.usedModelId === 'gemini-2.5-flash' ? { tools: [{ googleSearch: {} }] } : undefined,
    });

    const extracted = extractMemoryProposal(response.text || '');
    res.json({ text: extracted.text, brain, memoryProposal: extracted.memoryProposal });
  } catch (error: any) {
    console.error('Dominus chat error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 4: Run test to verify proposal extraction passes**

Run: `npm test -- tests/dominus-context.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/core/providers/supabase.ts src/server/routes/chat.ts src/core/dominusContext.ts tests/dominus-context.test.ts
git commit -m "feat: add dominus chat endpoint"
```

---

### Task 4: ChatCentral Visual Brain Selector

**Files:**
- Modify: `src/pages/ChatCentral.tsx`

**Interfaces:**
- Consumes: endpoint `POST /api/agents/:agentId/chat`.
- Produces: selected `brainMode` and `modelId` request data.

- [ ] **Step 1: Update ChatCentral state and catalog**

Import catalog:

```ts
import { BRAIN_MODELS, type BrainMode } from '../core/brainRouter';
```

Add state near existing state declarations:

```ts
const [brainMode, setBrainMode] = useState<BrainMode>('auto');
const [selectedModelId, setSelectedModelId] = useState('gemini-2.5-flash');
const [lastBrainMeta, setLastBrainMeta] = useState<any>(null);
```

- [ ] **Step 2: Send request to new endpoint**

Replace the endpoint/body section with:

```ts
const res = await fetch(`/api/agents/${selectedAgentId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMsg, brainMode, modelId: selectedModelId })
});
```

After `const data = await res.json();`, add:

```ts
setLastBrainMeta(data.brain || null);
```

After `let replyText = data.text;`, add:

```ts
if (data.brain?.fallbackUsed) {
  replyText = `> Brain Router: ${data.brain.fallbackReason}\n\n${replyText}`;
}

if (data.memoryProposal) {
  replyText += `\n\n---\n**Memoria sugerida:** ${data.memoryProposal.title}\n\n${data.memoryProposal.content}\n\n_Tipo: ${data.memoryProposal.type} · Importancia: ${data.memoryProposal.importance}_`;
}
```

- [ ] **Step 3: Add visual selector above messages**

Add JSX above the messages scroll area:

```tsx
<div className="border-b border-qh-border bg-slate-950/50 p-3 space-y-3">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Brain Router</div>
      <div className="text-xs text-slate-300">Elegi el cerebro libremente. Dominus recomienda, vos decidis.</div>
    </div>
    <select
      value={brainMode}
      onChange={(event) => setBrainMode(event.target.value as BrainMode)}
      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
    >
      <option value="auto">Auto</option>
      <option value="manual">Manual</option>
      <option value="council">Consejo</option>
    </select>
  </div>
  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
    {BRAIN_MODELS.map((model) => (
      <button
        key={model.id}
        onClick={() => { setSelectedModelId(model.id); if (brainMode === 'auto') setBrainMode('manual'); }}
        className={cn(
          'text-left rounded-xl border p-3 transition-all bg-slate-900/70 hover:border-qh-gold/70',
          selectedModelId === model.id ? 'border-qh-gold shadow-[0_0_20px_rgba(212,175,55,0.18)]' : 'border-slate-700'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] uppercase text-qh-gold">{model.icon.slice(0, 2)}</div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-100 truncate">{model.displayName}</div>
            <div className="text-[10px] text-slate-500 uppercase">{model.provider}</div>
          </div>
        </div>
        <div className={cn('text-[10px]', model.status === 'available' ? 'text-emerald-400' : 'text-amber-400')}>
          {model.status === 'available' ? 'Disponible' : 'Fallback Gemini'}
        </div>
      </button>
    ))}
  </div>
  {lastBrainMeta?.fallbackUsed && <div className="text-[11px] text-amber-300">{lastBrainMeta.fallbackReason}</div>}
</div>
```

- [ ] **Step 4: Run TypeScript check**

Run: `npm run lint`

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/pages/ChatCentral.tsx
git commit -m "feat: add visual brain selector to chat"
```

---

### Task 5: Final Verification And Deploy Readiness

**Files:**
- No planned source changes unless verification finds a specific issue.

**Interfaces:**
- Consumes all tasks.
- Produces verified implementation ready for Cloud Run deploy.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: no TypeScript errors.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: all tests pass. Existing Zustand storage warnings in Node test environment are acceptable if tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build passes. Existing Vite chunk-size warning is acceptable.

- [ ] **Step 4: Commit verification-only fixes if any**

If a verification command fails and requires code changes, fix with TDD where applicable, rerun the failing command, and commit only those files.

- [ ] **Step 5: Deploy only if requested after verification**

Run: `gcloud run deploy quantumcore --source . --region us-central1 --allow-unauthenticated --quiet`

Expected: service deploys a new revision and public URL responds `200 OK`.

---

## Self-Review

Spec coverage:

- Dominus endpoint covered by Task 3.
- Brain Router catalog and fallback covered by Task 1.
- Context pack with system core, constitution, and memory covered by Task 2.
- Visual selector covered by Task 4.
- Memory proposal without automatic write covered by Tasks 2, 3, and 4.
- Verification covered by Task 5.

Placeholder scan:

- No placeholder markers are intentionally left.
- Future items are explicitly marked as out of scope.

Type consistency:

- `BrainMode`, `BRAIN_MODELS`, and `resolveBrainSelection()` are defined before frontend/backend use.
- `buildDominusContextPack()` and `extractMemoryProposal()` are defined before route use.
- Endpoint request keys match frontend request keys: `message`, `brainMode`, `modelId`.
