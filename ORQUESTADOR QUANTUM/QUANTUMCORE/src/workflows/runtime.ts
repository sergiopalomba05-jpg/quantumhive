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
