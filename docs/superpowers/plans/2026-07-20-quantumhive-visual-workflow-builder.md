# QuantumHive Visual Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build QuantumHive's own visual workflow builder so agents can be designed, simulated, exported, and later connected to LangGraph/N8N without making N8N the core runtime.

**Architecture:** The frontend owns a React Flow canvas and stores QuantumHive workflow definitions in Zustand/localStorage for the first MVP. The backend remains a thin API for now; future tasks add Cloud Run execution, LangGraph adapter, and N8N import/export. N8N is optional compatibility, not the source of truth.

**Tech Stack:** Vite, React 19, Zustand, TypeScript, `@xyflow/react`, Express, Firestore later, Cloud Run later, LangGraph later, N8N API later.

## Global Constraints

- UI visible copy must be Spanish-first.
- Do not store real API keys or credentials in frontend/localStorage.
- Do not execute destructive actions automatically.
- Every sensitive action must create an approval request before real execution.
- Every simulated or real workflow run must write an audit log entry.
- N8N real connection is future work because the current N8N instance is old/not responding.
- Keep existing Cloud Run fixes: `process.env.PORT` support and `wss://` live socket on HTTPS.
- Preserve hardened `firestore.rules`.
- Do not replace the entire app with the clone. Copy useful pieces selectively.

---

## File Structure

- Create: `orquestador quantum/src/workflows/types.ts`
  Defines QuantumHive workflow entities, node kinds, node config, run state, template metadata, and export shape.
- Create: `orquestador quantum/src/workflows/catalog.ts`
  Holds the visual node library for triggers, agents, brains, workers, tools, memory, approvals, conditions, outputs, and N8N-compatible nodes.
- Create: `orquestador quantum/src/workflows/runtime.ts`
  Pure functions for creating starter workflows, validating graphs, simulating run steps, and exporting JSON.
- Create: `orquestador quantum/tests/workflow-runtime.test.ts`
  Node tests for validation, starter workflow generation, simulation safety, and export format.
- Modify: `orquestador quantum/src/types/index.ts`
  Adds workflow entity interfaces only if not imported from `src/workflows/types.ts`; prefer importing from the focused file in new code.
- Modify: `orquestador quantum/src/store/useStore.ts`
  Adds `workflowDefinitions`, `workflowTemplates`, `workflowRuns`, `addWorkflowDefinition`, `updateWorkflowDefinition`, `addWorkflowRun`.
- Create: `orquestador quantum/src/components/assistants/ContextualAssistantWidget.tsx`
  Copy improved assistant widget from clone, then add an imperative open mechanism if needed.
- Create: `orquestador quantum/src/components/assistants/SectionAssistantPrompt.tsx`
  Shows per-section popup that routes users into the contextual assistant.
- Modify: `orquestador quantum/src/components/Layout.tsx`
  Mounts `ContextualAssistantWidget` and `SectionAssistantPrompt`; includes assistant entities in context export.
- Modify: `orquestador quantum/src/pages/VisualPlanner.tsx`
  Adds or replaces current planner with React Flow MVP canvas backed by workflow definitions.
- Modify: `orquestador quantum/src/pages/AgentBuilder.tsx`
  Adds workflow creation from agent setup and shows associated workflow template.
- Modify: `orquestador quantum/src/pages/McpHub.tsx`
  Expands visual MCP/API/CLI library and adds N8N template reference catalog.
- Modify: `orquestador quantum/package.json`
  Adds `@xyflow/react` and keeps `test` script.

---

### Task 1: Workflow Runtime Core

**Files:**
- Create: `orquestador quantum/src/workflows/types.ts`
- Create: `orquestador quantum/src/workflows/catalog.ts`
- Create: `orquestador quantum/src/workflows/runtime.ts`
- Create: `orquestador quantum/tests/workflow-runtime.test.ts`
- Modify: `orquestador quantum/package.json`

**Interfaces:**
- Produces: `WorkflowDefinition`, `WorkflowNode`, `WorkflowEdge`, `WorkflowRun`, `createStarterAgentWorkflow(agentId: string, agentName: string): WorkflowDefinition`, `validateWorkflow(definition: WorkflowDefinition): WorkflowValidationResult`, `simulateWorkflowRun(definition: WorkflowDefinition): WorkflowRun`, `exportWorkflowJson(definition: WorkflowDefinition): string`.
- Consumes: no previous task output.

- [ ] **Step 1: Write the failing test**

Create `orquestador quantum/tests/workflow-runtime.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createStarterAgentWorkflow,
  exportWorkflowJson,
  simulateWorkflowRun,
  validateWorkflow,
} from '../src/workflows/runtime';

describe('QuantumHive workflow runtime', () => {
  it('creates a starter agent workflow with trigger, agent, approval, worker, memory, and audit nodes', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');

    assert.equal(workflow.agentId, 'agent_1');
    assert.equal(workflow.name, 'Workflow inicial - CEO Test');
    assert.deepEqual(
      workflow.nodes.map((node) => node.kind),
      ['trigger', 'agent', 'approval', 'worker', 'memory', 'audit']
    );
    assert.equal(workflow.edges.length, 5);
  });

  it('validates that every edge points to existing nodes', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    workflow.edges[0] = { ...workflow.edges[0], target: 'missing_node' };

    const result = validateWorkflow(workflow);

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ['La conexion edge_trigger_agent apunta a un nodo inexistente.']);
  });

  it('simulates runs without executing real external actions', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const run = simulateWorkflowRun(workflow);

    assert.equal(run.workflowId, workflow.id);
    assert.equal(run.status, 'completed_mock');
    assert.equal(run.steps.length, workflow.nodes.length);
    assert.ok(run.steps.every((step) => step.executionMode === 'mock'));
  });

  it('exports stable QuantumHive workflow JSON', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const exported = JSON.parse(exportWorkflowJson(workflow));

    assert.equal(exported.schemaVersion, 'qh.workflow.v1');
    assert.equal(exported.name, 'Workflow inicial - CEO Test');
    assert.equal(exported.nodes.length, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test "tests/workflow-runtime.test.ts"`

Expected: FAIL with module not found for `../src/workflows/runtime`.

- [ ] **Step 3: Add dependency and test script**

Run: `npm install @xyflow/react`

Modify `orquestador quantum/package.json` if needed:

```json
{
  "scripts": {
    "test": "tsx --test \"tests/**/*.test.ts\""
  },
  "dependencies": {
    "@xyflow/react": "latest"
  }
}
```

- [ ] **Step 4: Write workflow types**

Create `orquestador quantum/src/workflows/types.ts`:

```ts
export type WorkflowNodeKind =
  | 'trigger'
  | 'agent'
  | 'brain'
  | 'worker'
  | 'tool'
  | 'memory'
  | 'approval'
  | 'condition'
  | 'output'
  | 'audit'
  | 'n8n';

export type WorkflowExecutionMode = 'mock' | 'backend' | 'langgraph' | 'n8n';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  position: WorkflowNodePosition;
  config: Record<string, unknown>;
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface WorkflowDefinition {
  id: string;
  schemaVersion: 'qh.workflow.v1';
  name: string;
  description: string;
  agentId?: string;
  projectId?: string;
  executionMode: WorkflowExecutionMode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowRunStep {
  id: string;
  nodeId: string;
  title: string;
  status: 'completed_mock' | 'waiting_approval' | 'skipped' | 'failed';
  executionMode: WorkflowExecutionMode;
  summary: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'completed_mock' | 'waiting_approval' | 'failed';
  steps: WorkflowRunStep[];
  startedAt: number;
  finishedAt: number;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}
```

- [ ] **Step 5: Write catalog**

Create `orquestador quantum/src/workflows/catalog.ts`:

```ts
import { WorkflowNodeKind } from './types';

export interface WorkflowNodeLibraryItem {
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  defaultRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  defaultRequiresApproval: boolean;
}

export const WORKFLOW_NODE_LIBRARY: WorkflowNodeLibraryItem[] = [
  { kind: 'trigger', title: 'Disparador', description: 'Inicia el flujo desde una accion manual, idea, webhook o agenda.', defaultRiskLevel: 'low', defaultRequiresApproval: false },
  { kind: 'agent', title: 'Agente', description: 'Ejecuta razonamiento con rol, memoria y herramientas.', defaultRiskLevel: 'medium', defaultRequiresApproval: false },
  { kind: 'brain', title: 'Cerebro / Modelo', description: 'Selecciona Vertex, local u otro proveedor de IA.', defaultRiskLevel: 'medium', defaultRequiresApproval: false },
  { kind: 'worker', title: 'Worker / Cuerpo', description: 'Ejecuta acciones mediante OpenCode, Cloud Run, Local Desktop u otro worker.', defaultRiskLevel: 'high', defaultRequiresApproval: true },
  { kind: 'tool', title: 'Herramienta / MCP', description: 'Conecta una herramienta, API, CLI o MCP server.', defaultRiskLevel: 'medium', defaultRequiresApproval: false },
  { kind: 'memory', title: 'Memoria', description: 'Lee o guarda contexto importante.', defaultRiskLevel: 'low', defaultRequiresApproval: false },
  { kind: 'approval', title: 'Aprobacion Humana', description: 'Pausa el flujo hasta aprobacion del usuario.', defaultRiskLevel: 'high', defaultRequiresApproval: true },
  { kind: 'condition', title: 'Condicion', description: 'Divide el flujo segun estado, riesgo o resultado.', defaultRiskLevel: 'low', defaultRequiresApproval: false },
  { kind: 'output', title: 'Salida', description: 'Crea tarea, proyecto, memoria, reporte o brief.', defaultRiskLevel: 'low', defaultRequiresApproval: false },
  { kind: 'audit', title: 'Registro de Auditoria', description: 'Registra que paso y quien lo disparo.', defaultRiskLevel: 'low', defaultRequiresApproval: false },
  { kind: 'n8n', title: 'Nodo compatible N8N', description: 'Representa un nodo importable/exportable a N8N en el futuro.', defaultRiskLevel: 'medium', defaultRequiresApproval: false },
];
```

- [ ] **Step 6: Write runtime implementation**

Create `orquestador quantum/src/workflows/runtime.ts`:

```ts
import { WorkflowDefinition, WorkflowRun, WorkflowValidationResult } from './types';

const now = () => Date.now();

export function createStarterAgentWorkflow(agentId: string, agentName: string): WorkflowDefinition {
  const timestamp = now();
  const id = `workflow_${timestamp}`;

  const nodes = [
    { id: 'trigger_manual', kind: 'trigger' as const, title: 'Inicio manual', description: 'El usuario inicia el flujo desde QuantumHive.', position: { x: 80, y: 180 }, config: { triggerType: 'manual' }, requiresApproval: false, riskLevel: 'low' as const },
    { id: 'agent_main', kind: 'agent' as const, title: agentName, description: 'Agente principal del flujo.', position: { x: 320, y: 180 }, config: { agentId }, requiresApproval: false, riskLevel: 'medium' as const },
    { id: 'approval_gate', kind: 'approval' as const, title: 'Aprobacion humana', description: 'Confirma acciones sensibles antes de ejecutar.', position: { x: 560, y: 180 }, config: { policy: 'required_for_high_risk' }, requiresApproval: true, riskLevel: 'high' as const },
    { id: 'worker_execute', kind: 'worker' as const, title: 'Worker asignado', description: 'Ejecuta la accion en modo simulado hasta conectar backend.', position: { x: 800, y: 180 }, config: { executionMode: 'mock' }, requiresApproval: true, riskLevel: 'high' as const },
    { id: 'memory_save', kind: 'memory' as const, title: 'Guardar memoria', description: 'Guarda resultado y aprendizaje del flujo.', position: { x: 1040, y: 180 }, config: { memoryType: 'Aprendizaje' }, requiresApproval: false, riskLevel: 'low' as const },
    { id: 'audit_log', kind: 'audit' as const, title: 'Auditoria', description: 'Registra el flujo ejecutado.', position: { x: 1280, y: 180 }, config: { module: 'workflow' }, requiresApproval: false, riskLevel: 'low' as const },
  ];

  return {
    id,
    schemaVersion: 'qh.workflow.v1',
    name: `Workflow inicial - ${agentName}`,
    description: 'Flujo base para convertir un agente en una orquestacion visual segura.',
    agentId,
    executionMode: 'mock',
    nodes,
    edges: [
      { id: 'edge_trigger_agent', source: 'trigger_manual', target: 'agent_main', label: 'inicia' },
      { id: 'edge_agent_approval', source: 'agent_main', target: 'approval_gate', label: 'propone accion' },
      { id: 'edge_approval_worker', source: 'approval_gate', target: 'worker_execute', label: 'aprueba' },
      { id: 'edge_worker_memory', source: 'worker_execute', target: 'memory_save', label: 'resultado' },
      { id: 'edge_memory_audit', source: 'memory_save', target: 'audit_log', label: 'registra' },
    ],
    tags: ['agent', 'starter', 'mock'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function validateWorkflow(definition: WorkflowDefinition): WorkflowValidationResult {
  const nodeIds = new Set(definition.nodes.map((node) => node.id));
  const errors: string[] = [];

  for (const edge of definition.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`La conexion ${edge.id} apunta a un nodo inexistente.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function simulateWorkflowRun(definition: WorkflowDefinition): WorkflowRun {
  const startedAt = now();
  return {
    id: `run_${startedAt}`,
    workflowId: definition.id,
    status: 'completed_mock',
    startedAt,
    finishedAt: startedAt,
    steps: definition.nodes.map((node) => ({
      id: `step_${node.id}`,
      nodeId: node.id,
      title: node.title,
      status: 'completed_mock',
      executionMode: 'mock',
      summary: `Nodo simulado sin ejecutar accion real: ${node.title}`,
    })),
  };
}

export function exportWorkflowJson(definition: WorkflowDefinition): string {
  return JSON.stringify(definition, null, 2);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test`

Expected: PASS with existing runtime tests and new workflow tests.

- [ ] **Step 8: Commit**

Run:

```bash
git add "orquestador quantum/package.json" "orquestador quantum/package-lock.json" "orquestador quantum/src/workflows" "orquestador quantum/tests/workflow-runtime.test.ts"
git commit -m "feat: add QuantumHive workflow runtime core"
```

---

### Task 2: Store Integration and Visual Seeds

**Files:**
- Modify: `orquestador quantum/src/store/useStore.ts`
- Modify: `orquestador quantum/src/types/index.ts`
- Test: `orquestador quantum/tests/workflow-store.test.ts`

**Interfaces:**
- Consumes: `WorkflowDefinition`, `WorkflowRun` from `src/workflows/types.ts`.
- Produces: store fields `workflowDefinitions`, `workflowTemplates`, `workflowRuns`; actions `addWorkflowDefinition(workflow)`, `updateWorkflowDefinition(id, updates)`, `addWorkflowRun(run)`.

- [ ] **Step 1: Write the failing test**

Create `orquestador quantum/tests/workflow-store.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useStore } from '../src/store/useStore';
import { createStarterAgentWorkflow, simulateWorkflowRun } from '../src/workflows/runtime';

describe('workflow store integration', () => {
  it('stores workflow definitions and workflow runs', () => {
    useStore.getState().resetData();
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const run = simulateWorkflowRun(workflow);

    useStore.getState().addWorkflowDefinition(workflow);
    useStore.getState().addWorkflowRun(run);

    assert.equal(useStore.getState().workflowDefinitions.length, 1);
    assert.equal(useStore.getState().workflowRuns.length, 1);
    assert.equal(useStore.getState().workflowDefinitions[0].name, 'Workflow inicial - CEO Test');
  });

  it('updates workflow definitions by id', () => {
    useStore.getState().resetData();
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');

    useStore.getState().addWorkflowDefinition(workflow);
    useStore.getState().updateWorkflowDefinition(workflow.id, { name: 'Workflow actualizado' });

    assert.equal(useStore.getState().workflowDefinitions[0].name, 'Workflow actualizado');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test "tests/workflow-store.test.ts"`

Expected: FAIL because `workflowDefinitions` and actions do not exist on `useStore`.

- [ ] **Step 3: Add imports and state fields**

Modify `orquestador quantum/src/store/useStore.ts` imports:

```ts
import { WorkflowDefinition, WorkflowRun } from '../workflows/types';
```

Add to `interface AppState`:

```ts
  workflowDefinitions: WorkflowDefinition[];
  workflowTemplates: WorkflowDefinition[];
  workflowRuns: WorkflowRun[];
  addWorkflowDefinition: (workflow: WorkflowDefinition) => void;
  updateWorkflowDefinition: (id: string, updates: Partial<WorkflowDefinition>) => void;
  addWorkflowRun: (run: WorkflowRun) => void;
```

- [ ] **Step 4: Add initial state**

Modify `initialState`:

```ts
  workflowDefinitions: [],
  workflowTemplates: [],
  workflowRuns: [],
```

- [ ] **Step 5: Add store actions**

Inside the persisted store object, add:

```ts
      addWorkflowDefinition: (workflow) => set((state) => ({
        workflowDefinitions: [workflow, ...state.workflowDefinitions],
      })),
      updateWorkflowDefinition: (id, updates) => set((state) => ({
        workflowDefinitions: state.workflowDefinitions.map((workflow) =>
          workflow.id === id ? { ...workflow, ...updates, updatedAt: Date.now() } : workflow
        ),
      })),
      addWorkflowRun: (run) => set((state) => ({
        workflowRuns: [run, ...state.workflowRuns],
      })),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add "orquestador quantum/src/store/useStore.ts" "orquestador quantum/tests/workflow-store.test.ts"
git commit -m "feat: persist workflow definitions in store"
```

---

### Task 3: Contextual Assistants and Section Prompts

**Files:**
- Create: `orquestador quantum/src/components/assistants/ContextualAssistantWidget.tsx`
- Create: `orquestador quantum/src/components/assistants/SectionAssistantPrompt.tsx`
- Modify: `orquestador quantum/src/components/Layout.tsx`
- Modify: `orquestador quantum/src/store/useStore.ts`
- Modify: `orquestador quantum/src/types/index.ts`

**Interfaces:**
- Consumes: `contextualAssistants`, `dismissedTips`, `dismissTip` from store.
- Produces: global assistant button and per-route popup that can open assistant panel.

- [ ] **Step 1: Write the failing test for prompt selection**

Create `orquestador quantum/tests/assistant-prompt.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSectionAssistantPrompt } from '../src/components/assistants/sectionPromptModel';

describe('section assistant prompt model', () => {
  it('builds a Spanish prompt for Agent Builder', () => {
    const prompt = getSectionAssistantPrompt('/agent-builder', 'Asistente Constructor de Agentes');

    assert.equal(prompt.tipId, 'assistant-tip:/agent-builder');
    assert.equal(prompt.title, 'Queres que te ayude a crear tu agente?');
    assert.match(prompt.body, /rol, cerebro, worker, herramientas/);
  });

  it('falls back to a generic Spanish prompt', () => {
    const prompt = getSectionAssistantPrompt('/unknown', 'Asistente Global');

    assert.equal(prompt.title, 'Queres ayuda con esta seccion?');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test "tests/assistant-prompt.test.ts"`

Expected: FAIL because `sectionPromptModel` does not exist.

- [ ] **Step 3: Create prompt model**

Create `orquestador quantum/src/components/assistants/sectionPromptModel.ts`:

```ts
export interface SectionAssistantPromptModel {
  tipId: string;
  title: string;
  body: string;
}

const SECTION_PROMPTS: Record<string, Omit<SectionAssistantPromptModel, 'tipId'>> = {
  '/agent-builder': {
    title: 'Queres que te ayude a crear tu agente?',
    body: 'Puedo recomendar rol, cerebro, worker, herramientas, permisos y workflow inicial sin que tengas que conocer la parte tecnica.',
  },
  '/planner': {
    title: 'Queres que armemos el flujo visual?',
    body: 'Puedo convertir tu objetivo en nodos conectados: agente, worker, memoria, aprobacion y salida.',
  },
  '/mcp-hub': {
    title: 'Queres que te recomiende herramientas?',
    body: 'Puedo sugerir MCP servers, APIs y CLI tools segun lo que quieras automatizar.',
  },
};

export function getSectionAssistantPrompt(pathname: string, assistantName: string): SectionAssistantPromptModel {
  const prompt = SECTION_PROMPTS[pathname] ?? {
    title: 'Queres ayuda con esta seccion?',
    body: `${assistantName} puede explicarte esta pantalla y proponerte proximos pasos en modo simulado.`,
  };

  return {
    tipId: `assistant-tip:${pathname}`,
    ...prompt,
  };
}
```

- [ ] **Step 4: Copy and adapt assistant widget from clone**

Create `orquestador quantum/src/components/assistants/ContextualAssistantWidget.tsx` from the clone version, then change the open state to accept a DOM event:

```ts
useEffect(() => {
  const openAssistant = () => setIsOpen(true);
  window.addEventListener('qh:open-contextual-assistant', openAssistant);
  return () => window.removeEventListener('qh:open-contextual-assistant', openAssistant);
}, []);
```

- [ ] **Step 5: Create section prompt component**

Create `orquestador quantum/src/components/assistants/SectionAssistantPrompt.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSectionAssistantPrompt } from './sectionPromptModel';

export function SectionAssistantPrompt() {
  const location = useLocation();
  const store = useStore();
  const [visible, setVisible] = useState(false);
  const assistant = store.contextualAssistants?.find((item) => item.sectionId === location.pathname);
  const prompt = getSectionAssistantPrompt(location.pathname, assistant?.name || 'Asistente Global');

  useEffect(() => {
    setVisible(Boolean(assistant) && !store.dismissedTips.includes(prompt.tipId));
  }, [assistant, prompt.tipId, store.dismissedTips]);

  if (!visible || !assistant) return null;

  const openAssistant = () => {
    window.dispatchEvent(new Event('qh:open-contextual-assistant'));
    store.dismissTip(prompt.tipId);
    setVisible(false);
  };

  const dismiss = () => {
    store.dismissTip(prompt.tipId);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm rounded-xl border border-qh-cyan/30 bg-slate-950 p-4 shadow-2xl shadow-black/40">
      <button onClick={dismiss} className="absolute right-2 top-2 text-slate-500 hover:text-white" aria-label="Cerrar ayuda">
        <X size={16} />
      </button>
      <div className="mb-2 flex items-center gap-2 text-qh-cyan">
        <Sparkles size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Asistente disponible</span>
      </div>
      <h3 className="pr-6 text-sm font-bold text-white">{prompt.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{prompt.body}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={openAssistant} className="rounded-lg border border-qh-cyan/30 bg-qh-cyan/10 px-3 py-2 text-xs font-bold text-qh-cyan hover:bg-qh-cyan/20">
          Abrir asistente
        </button>
        <button onClick={dismiss} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white">
          No mostrar de nuevo
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Mount components in Layout**

Modify `orquestador quantum/src/components/Layout.tsx` imports:

```ts
import { ContextualAssistantWidget } from './assistants/ContextualAssistantWidget';
import { SectionAssistantPrompt } from './assistants/SectionAssistantPrompt';
```

Add `<ContextualAssistantWidget />` in the top bar and `<SectionAssistantPrompt />` near the end of the layout root.

- [ ] **Step 7: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: all pass; build may keep the existing chunk-size warning.

- [ ] **Step 8: Commit**

Run:

```bash
git add "orquestador quantum/src/components/assistants" "orquestador quantum/src/components/Layout.tsx" "orquestador quantum/src/store/useStore.ts" "orquestador quantum/src/types/index.ts" "orquestador quantum/tests/assistant-prompt.test.ts"
git commit -m "feat: add contextual assistant prompts"
```

---

### Task 4: Visual Workflow Canvas MVP

**Files:**
- Modify: `orquestador quantum/src/pages/VisualPlanner.tsx`
- Create: `orquestador quantum/src/components/workflows/WorkflowCanvas.tsx`
- Create: `orquestador quantum/src/components/workflows/WorkflowNodeLibrary.tsx`
- Create: `orquestador quantum/src/components/workflows/WorkflowRunPanel.tsx`

**Interfaces:**
- Consumes: `WORKFLOW_NODE_LIBRARY`, `WorkflowDefinition`, `simulateWorkflowRun`, store workflow actions.
- Produces: a usable embedded canvas for creating, connecting, saving, simulating, and exporting workflows.

- [ ] **Step 1: Create canvas component**

Create `orquestador quantum/src/components/workflows/WorkflowCanvas.tsx`:

```tsx
import '@xyflow/react/dist/style.css';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import { WorkflowDefinition } from '../../workflows/types';

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition;
}

export function WorkflowCanvas({ workflow }: WorkflowCanvasProps) {
  const nodes = workflow.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: `${node.title}\n${node.kind}` },
    type: 'default',
  }));

  const edges = workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));

  return (
    <div className="h-[560px] overflow-hidden rounded-xl border border-qh-border bg-slate-950">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Create node library component**

Create `orquestador quantum/src/components/workflows/WorkflowNodeLibrary.tsx`:

```tsx
import { WORKFLOW_NODE_LIBRARY } from '../../workflows/catalog';

export function WorkflowNodeLibrary() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {WORKFLOW_NODE_LIBRARY.map((item) => (
        <div key={item.kind} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="text-sm font-bold text-slate-100">{item.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.description}</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-qh-gold">{item.kind}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create run panel component**

Create `orquestador quantum/src/components/workflows/WorkflowRunPanel.tsx`:

```tsx
import { WorkflowRun } from '../../workflows/types';

interface WorkflowRunPanelProps {
  run?: WorkflowRun;
}

export function WorkflowRunPanel({ run }: WorkflowRunPanelProps) {
  if (!run) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-500">Todavia no hay ejecucion simulada.</div>;
  }

  return (
    <div className="rounded-xl border border-qh-cyan/30 bg-slate-900/80 p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-widest text-qh-cyan">Ejecucion simulada</div>
      <div className="space-y-2">
        {run.steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-slate-800 bg-black/30 p-3">
            <div className="text-sm font-bold text-slate-200">{step.title}</div>
            <div className="text-xs text-slate-400">{step.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modify Visual Planner page**

Modify `orquestador quantum/src/pages/VisualPlanner.tsx` to use a starter workflow when no workflow exists:

```tsx
import { useMemo, useState } from 'react';
import { Download, Play, Plus } from 'lucide-react';
import { WorkflowCanvas } from '../components/workflows/WorkflowCanvas';
import { WorkflowNodeLibrary } from '../components/workflows/WorkflowNodeLibrary';
import { WorkflowRunPanel } from '../components/workflows/WorkflowRunPanel';
import { useStore } from '../store/useStore';
import { createStarterAgentWorkflow, exportWorkflowJson, simulateWorkflowRun } from '../workflows/runtime';

export function VisualPlanner() {
  const store = useStore();
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(store.workflowDefinitions[0]?.id || null);
  const activeWorkflow = store.workflowDefinitions.find((workflow) => workflow.id === activeWorkflowId) || store.workflowDefinitions[0];
  const latestRun = useMemo(() => store.workflowRuns.find((run) => run.workflowId === activeWorkflow?.id), [store.workflowRuns, activeWorkflow?.id]);

  const createWorkflow = () => {
    const agent = store.agents[0];
    const workflow = createStarterAgentWorkflow(agent?.id || 'agent_manual', agent?.name || 'Agente Manual');
    store.addWorkflowDefinition(workflow);
    setActiveWorkflowId(workflow.id);
  };

  const simulate = () => {
    if (!activeWorkflow) return;
    const run = simulateWorkflowRun(activeWorkflow);
    store.addWorkflowRun(run);
    store.addAuditLog({ action: 'agent_action.executed_mock', actor: 'workflow-runtime', module: 'system', summary: `Workflow simulado: ${activeWorkflow.name}`, severity: 'info' });
  };

  const exportJson = () => {
    if (!activeWorkflow) return;
    const blob = new Blob([exportWorkflowJson(activeWorkflow)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkflow.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Workflow Builder Visual</h2>
          <p className="mt-1 text-sm text-slate-400">Canvas propio de QuantumHive para disenar agentes, workers, memoria, aprobaciones y herramientas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={createWorkflow} className="glass-button"><Plus size={14} /> Crear workflow inicial</button>
          <button onClick={simulate} disabled={!activeWorkflow} className="glass-button"><Play size={14} /> Simular</button>
          <button onClick={exportJson} disabled={!activeWorkflow} className="glass-button"><Download size={14} /> Exportar JSON</button>
        </div>
      </div>

      {activeWorkflow ? <WorkflowCanvas workflow={activeWorkflow} /> : <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Crea un workflow inicial para empezar.</div>}

      <WorkflowRunPanel run={latestRun} />

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Biblioteca de nodos</h3>
        <WorkflowNodeLibrary />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: PASS; bundle-size warning is acceptable.

- [ ] **Step 6: Commit**

Run:

```bash
git add "orquestador quantum/src/pages/VisualPlanner.tsx" "orquestador quantum/src/components/workflows"
git commit -m "feat: add visual workflow canvas MVP"
```

---

### Task 5: Agent Builder Creates Workflow

**Files:**
- Modify: `orquestador quantum/src/pages/AgentBuilder.tsx`
- Test: `orquestador quantum/tests/agent-workflow.test.ts`

**Interfaces:**
- Consumes: `createStarterAgentWorkflow`, `store.addWorkflowDefinition`.
- Produces: new agents get an initial workflow definition.

- [ ] **Step 1: Write failing pure helper test**

Create `orquestador quantum/tests/agent-workflow.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStarterAgentWorkflow } from '../src/workflows/runtime';

describe('agent workflow creation', () => {
  it('names the starter workflow after the created agent', () => {
    const workflow = createStarterAgentWorkflow('agent_77', 'Agente Ventas');

    assert.equal(workflow.agentId, 'agent_77');
    assert.equal(workflow.name, 'Workflow inicial - Agente Ventas');
  });
});
```

- [ ] **Step 2: Run test to verify it passes after Task 1**

Run: `npx tsx --test "tests/agent-workflow.test.ts"`

Expected: PASS after Task 1. If it fails, fix Task 1 before editing UI.

- [ ] **Step 3: Modify AgentBuilder save flow**

In `orquestador quantum/src/pages/AgentBuilder.tsx`, import:

```ts
import { createStarterAgentWorkflow } from '../workflows/runtime';
```

Inside `handleSave`, after creating `newAgent`, add:

```ts
    const starterWorkflow = createStarterAgentWorkflow(newAgent.id, newAgent.name);
    useStore.setState(state => ({
      agents: [...state.agents, newAgent],
      workflowDefinitions: [starterWorkflow, ...state.workflowDefinitions],
    }));
```

Replace the existing separate `agents` setState with this combined update to avoid adding the agent twice.

- [ ] **Step 4: Add UI confirmation**

In the confirmation step, add text under the connection summary:

```tsx
<div>
  <div className="text-xs text-gray-500 mb-1">Workflow inicial</div>
  <div className="text-sm text-qh-gold">Se creara un flujo visual base para este agente.</div>
</div>
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add "orquestador quantum/src/pages/AgentBuilder.tsx" "orquestador quantum/tests/agent-workflow.test.ts"
git commit -m "feat: create starter workflow from agent builder"
```

---

### Task 6: Expanded Workers and MCP Visual Catalog

**Files:**
- Modify: `orquestador quantum/src/store/useStore.ts`
- Modify: `orquestador quantum/src/pages/McpHub.tsx`

**Interfaces:**
- Consumes: existing `WorkerDefinition`, `MCPServerDefinition`, `ApiConnectorDefinition`, `CliToolDefinition`.
- Produces: richer visual library for future real connections.

- [ ] **Step 1: Expand workers**

Replace `SEED_WORKER_DEFINITIONS` with entries for:

```ts
const SEED_WORKER_DEFINITIONS: WorkerDefinition[] = [
  { id: 'worker_opencode', name: 'OpenCode Worker Local', type: 'opencode_worker', runtime: 'local', status: 'simulado', capabilities: ['read_repo', 'edit_code', 'run_cli', 'run_tests'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Worker local principal para desarrollo asistido.' },
  { id: 'worker_cloud_run', name: 'Cloud Run Worker', type: 'cloud_run_worker', runtime: 'cloud', status: 'futuro', capabilities: ['run_api_job', 'call_vertex', 'write_firestore', 'process_webhook'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Ejecutor backend serverless para produccion.' },
  { id: 'worker_local_desktop', name: 'Local Desktop Worker', type: 'local_desktop_worker', runtime: 'local', status: 'futuro', capabilities: ['use_browser', 'control_mouse', 'type_keyboard', 'read_screen'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'Control local de pantalla y sistema operativo con aprobacion por accion.' },
  { id: 'worker_browser', name: 'Browser Automation Worker', type: 'browser_worker', runtime: 'browser', status: 'simulado', capabilities: ['open_page', 'click', 'fill_form', 'extract_data'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Automatizacion web tipo Playwright.' },
  { id: 'worker_gpu', name: 'GPU VM / ComfyUI Worker', type: 'gpu_vm_worker', runtime: 'vm', status: 'bloqueado', capabilities: ['generate_image', 'generate_video', 'run_comfyui', 'render_avatar'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'Worker multimedia pesado bloqueado por cuota GPU.' },
  { id: 'worker_n8n', name: 'N8N Workflow Worker', type: 'n8n_worker', runtime: 'external', status: 'futuro', capabilities: ['execute_n8n_workflow', 'import_template', 'export_workflow'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Compatibilidad opcional con instancia N8N real.' },
  { id: 'worker_github_actions', name: 'GitHub Actions Worker', type: 'custom_worker', runtime: 'cloud', status: 'futuro', capabilities: ['run_ci', 'deploy_repo', 'build_artifact'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Ejecucion via pipelines CI/CD.' },
  { id: 'worker_supabase', name: 'Supabase Worker', type: 'custom_worker', runtime: 'cloud', status: 'futuro', capabilities: ['query_postgres', 'sync_tables', 'call_edge_function'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Operaciones controladas sobre proyectos Supabase.' },
];
```

- [ ] **Step 2: Expand MCP servers**

Replace `SEED_MCP_SERVERS` with:

```ts
const SEED_MCP_SERVERS: MCPServerDefinition[] = [
  { id: 'mcp_filesystem', name: 'Filesystem MCP', command: 'npx @modelcontextprotocol/server-filesystem', status: 'simulado', capabilities: ['read_files', 'write_files'], requiredSecrets: [], linkedAgents: [], linkedWorkers: [], notes: 'Acceso controlado a archivos locales.' },
  { id: 'mcp_github', name: 'GitHub MCP', command: 'npx @modelcontextprotocol/server-github', status: 'futuro', capabilities: ['read_repo', 'issues', 'pull_requests'], requiredSecrets: ['GITHUB_TOKEN'], linkedAgents: [], linkedWorkers: [], notes: 'Integracion con repos GitHub.' },
  { id: 'mcp_google_workspace', name: 'Google Workspace MCP', command: 'custom:google-workspace-mcp', status: 'futuro', capabilities: ['gmail', 'calendar', 'drive', 'docs', 'sheets'], requiredSecrets: ['GOOGLE_OAUTH'], linkedAgents: [], linkedWorkers: [], notes: 'Workspace con aprobaciones para acciones externas.' },
  { id: 'mcp_supabase', name: 'Supabase MCP', command: 'custom:supabase-mcp', status: 'futuro', capabilities: ['query_db', 'inspect_schema', 'edge_functions'], requiredSecrets: ['SUPABASE_SERVICE_ROLE'], linkedAgents: [], linkedWorkers: [], notes: 'Operaciones Supabase backend-only.' },
  { id: 'mcp_playwright', name: 'Playwright MCP', command: 'npx @playwright/mcp', status: 'simulado', capabilities: ['browse', 'click', 'screenshot', 'qa'], requiredSecrets: [], linkedAgents: [], linkedWorkers: [], notes: 'Automatizacion visual de navegador.' },
  { id: 'mcp_n8n', name: 'N8N MCP', command: 'custom:n8n-mcp', status: 'futuro', capabilities: ['list_workflows', 'create_workflow', 'deploy_template'], requiredSecrets: ['N8N_API_KEY'], linkedAgents: [], linkedWorkers: [], notes: 'Conexion futura con N8N real.' },
  { id: 'mcp_render', name: 'Render MCP', command: 'custom:render-mcp', status: 'simulado', capabilities: ['deploy', 'logs', 'env_vars'], requiredSecrets: ['RENDER_API_KEY'], linkedAgents: [], linkedWorkers: [], notes: 'Gestion de servicios Render.' },
  { id: 'mcp_context7', name: 'Context7 Docs MCP', command: 'custom:context7', status: 'simulado', capabilities: ['docs_lookup', 'code_examples'], requiredSecrets: [], linkedAgents: [], linkedWorkers: [], notes: 'Consulta documentacion actualizada.' },
];
```

- [ ] **Step 3: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add "orquestador quantum/src/store/useStore.ts" "orquestador quantum/src/pages/McpHub.tsx"
git commit -m "feat: expand worker and MCP catalogs"
```

---

### Task 7: N8N Template Reference Catalog

**Files:**
- Create: `orquestador quantum/src/workflows/n8nTemplates.ts`
- Modify: `orquestador quantum/src/pages/McpHub.tsx`

**Interfaces:**
- Produces: static N8N template references for visual planning while real N8N connection is deferred.

- [ ] **Step 1: Create template catalog**

Create `orquestador quantum/src/workflows/n8nTemplates.ts`:

```ts
export interface N8NTemplateReference {
  id: number;
  name: string;
  url: string;
  category: string;
  usefulFor: string[];
  requiredServices: string[];
}

export const N8N_TEMPLATE_REFERENCES: N8NTemplateReference[] = [
  { id: 4827, name: 'AI WhatsApp Chatbot con RAG', url: 'https://n8n.io/workflows/4827', category: 'customer_support', usefulFor: ['WhatsApp', 'RAG', 'soporte'], requiredServices: ['WhatsApp Business API', 'MongoDB Atlas', 'OpenAI'] },
  { id: 4846, name: 'Generar videos AI y subir a YouTube', url: 'https://n8n.io/workflows/4846', category: 'content_creation', usefulFor: ['video', 'YouTube', 'Google Sheets'], requiredServices: ['Google Sheets', 'Google Drive', 'OpenAI', 'YouTube'] },
  { id: 4352, name: 'Automatizacion Social con Google Trends', url: 'https://n8n.io/workflows/4352', category: 'marketing', usefulFor: ['social media', 'trends', 'posts'], requiredServices: ['Google Trends', 'Perplexity', 'LinkedIn'] },
  { id: 5171, name: 'Tutorial interactivo de APIs', url: 'https://n8n.io/workflows/5171', category: 'education', usefulFor: ['aprendizaje', 'API', 'webhooks'], requiredServices: [] },
];
```

- [ ] **Step 2: Render catalog in MCP Hub**

In `orquestador quantum/src/pages/McpHub.tsx`, import:

```ts
import { N8N_TEMPLATE_REFERENCES } from '../workflows/n8nTemplates';
```

Add a section:

```tsx
<div className="glass-panel p-5 md:col-span-2 lg:col-span-3">
  <h3 className="mb-4 flex items-center gap-2 font-bold text-white">Templates N8N de referencia</h3>
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    {N8N_TEMPLATE_REFERENCES.map((template) => (
      <a key={template.id} href={template.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-black/30 p-3 hover:border-qh-cyan/40">
        <div className="text-sm font-bold text-slate-100">{template.name}</div>
        <div className="mt-1 text-xs text-slate-400">{template.usefulFor.join(' · ')}</div>
        <div className="mt-2 text-[10px] uppercase tracking-widest text-qh-gold">n8n.io/workflows/{template.id}</div>
      </a>
    ))}
  </div>
  <p className="mt-4 text-xs text-slate-500">Conexion real con N8N queda desactivada hasta crear una instancia nueva con credenciales corporativas.</p>
</div>
```

- [ ] **Step 3: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add "orquestador quantum/src/workflows/n8nTemplates.ts" "orquestador quantum/src/pages/McpHub.tsx"
git commit -m "feat: add N8N template reference catalog"
```

---

## Later Phase: Backend Runtime and LangGraph Adapter

Do not implement this until the frontend canvas MVP is stable.

Backend shape:

```text
POST /api/workflows/:id/simulate
POST /api/workflows/:id/run
POST /api/workflows/:id/export/n8n
POST /api/langgraph/run
```

LangGraph responsibility:

- run stateful AI workflows,
- choose next node,
- call model/tool adapters,
- pause for approval,
- write memory/audit log.

N8N adapter responsibility:

- test connection,
- list workflows,
- import templates,
- create workflow draft,
- activate workflow only after approval.

---

## Verification Commands

Run after every task:

```bash
npm test
npm run lint
npm run build
```

Expected:

- `npm test`: all tests pass.
- `npm run lint`: TypeScript passes.
- `npm run build`: Vite/esbuild succeeds. Existing chunk-size warning is acceptable.

---

## Self-Review

- Spec coverage: covers canvas propio, workflow model, contextual assistant prompts, expanded workers/MCP, N8N optional compatibility, and LangGraph backend phase.
- Completeness scan: no incomplete markers; later-phase scope is explicitly deferred with concrete endpoint shape.
- Type consistency: workflow type names are consistent across runtime, tests, store, and UI tasks.
- Scope check: MVP is large but split into independently testable tasks. Real N8N and LangGraph execution are intentionally excluded from first implementation.
