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
