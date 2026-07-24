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
