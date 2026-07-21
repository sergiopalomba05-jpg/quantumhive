export type MacroDivision = 'Carta Viva' | 'HumanIA' | 'Trading' | 'Infraestructura' | 'Roblox/Unreal' | 'Ghost' | 'General';

export type IdeaStatus = 'inbox' | 'evaluating' | 'backlog' | 'active' | 'paused' | 'discarded';
export type IdeaPriority = 'ahora' | 'próxima' | 'después' | 'parking lot';
export type IdeaType = 'MVP' | 'expansión' | 'visión futura' | 'bug' | 'mejora' | 'investigación';

export interface Idea {
  id: string;
  title: string;
  description: string;
  macroDivision: MacroDivision;
  type: IdeaType;
  priority: IdeaPriority;
  status: IdeaStatus;
  dependencies: string;
  notes: string;
  createdAt: number;
}

export type ProjectStatus = 'planned' | 'active' | 'blocked' | 'paused' | 'shipped';

export interface Project {
  id: string;
  name: string;
  macroDivision: MacroDivision;
  status: ProjectStatus;
  repo: string;
  ceoAgentId: string;
  goal: string;
  nextAction: string;
  risks: string;
  lastUpdate: number;
}

export type AgentStatus = 'active' | 'paused';
export type PreferredModel = 'vertex' | 'azure' | 'local' | 'manual';

export interface Agent {
  brainProviderId?: string;
  defaultModelId?: string;
  workerIds?: string[];
  repoConnectionIds?: string[];
  memoryScope?: string;
  skillIds?: string[];
  mcpServerIds?: string[];
  communicationChannelIds?: string[];
  permissions?: string[];
  costLimitDaily?: string;
  approvalPolicy?: string;
  id: string;
  name: string;
  role: string;
  macroDivision: MacroDivision;
  status: AgentStatus;
  preferredModel: PreferredModel;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export type MemoryImportance = 'baja' | 'media' | 'alta' | 'crítica';
export type MemoryType = 'Decisión' | 'Contexto' | 'Credencial pendiente' | 'Recurso cloud' | 'Riesgo' | 'Aprendizaje' | 'Estado actual' | 'Próxima acción';

export interface Memory {
  id: string;
  title: string;
  content: string;
  projectId?: string;
  agentId?: string;
  tags: string[];
  date: number;
  type: MemoryType;
  importance: MemoryImportance;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  agentId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: number;
  acceptanceCriteria: string;
  notes: string;
  createdAt: number;
}

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface SystemEvent {
  id: string;
  type: string;
  actor: string;
  projectId?: string;
  payload: string;
  timestamp: number;
  severity: EventSeverity;
}

export interface ModelProvider {
  id: string;
  name: string;
  status: string;
  defaultModel: string;
  estimatedUsage: string;
  estimatedCostMock: string;
  lastRequest: number;
  notes: string;
}

export interface CloudResource {
  id: string;
  provider: string;
  name: string;
  status: string;
  estimatedCost: string;
  projectId?: string;
  notes: string;
}

export interface Decision {
  id: string;
  title: string;
  decision: string;
  reason: string;
  projectId?: string;
  date: number;
  decidedBy: string;
}

export type VideoSourceType = 'instagram_reel' | 'youtube' | 'whatsapp_video' | 'tiktok' | 'x_video' | 'web' | 'uploaded_video' | 'uploaded_audio' | 'voice_note' | 'text_note';
export type VideoStatus = 'inbox' | 'queued' | 'analyzing' | 'analyzed' | 'converted_to_memory' | 'converted_to_task' | 'archived' | 'failed';
export type VideoCategory = 'ai_tool' | 'skill' | 'business_idea' | 'tutorial' | 'competitor' | 'inspiration' | 'bugfix' | 'automation' | 'design' | 'avatar' | 'marketing' | 'trading' | 'other';

export interface VideoInboxItem {
  id: string;
  sourceType: VideoSourceType;
  originalUrl?: string;
  title: string;
  description: string;
  status: VideoStatus;
  category: VideoCategory;
  relatedProjectId?: string;
  assignedAgentId?: string;
  priority: TaskPriority;
  transcript?: string;
  summary?: string;
  extractedTools?: string[];
  extractedSkills?: string[];
  actionableSteps?: string[];
  tags: string[];
  createdAt: number;
  analyzedAt?: number;
  notes: string;
}

export interface ToolSkill {
  id: string;
  name: string;
  category: string;
  description: string;
  source: string;
  originalUrl?: string;
  usageSummary: string;
  steps: string[];
  useCases: string[];
  recommendedProjectIds: string[];
  recommendedAgentId?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'discovered' | 'testing' | 'adopted' | 'rejected';
  tags: string[];
  date: number;
}

export interface WorkspaceIntegrationState {
  workspaceIntegrations: Record<string, string>;
  syncedEmails: any[];
  syncedEvents: any[];
  syncedFiles: any[];
  syncedWorkspaceTasks: any[];
  syncedNotes: any[];
  syncedMeetings: any[];
  syncedContacts: any[];
  syncedChatMessages: any[];
}

export interface VoiceSession {
  id: string;
  agentId: string;
  transcript: string;
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  timestamp: number;
}

export type AuditLogAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'login' | 'model_call' | 'workspace_action' | 'screen_share.started' | 'screen_share.stopped' | 'snapshot.captured' | 'agent_action.proposed' | 'agent_action.approved' | 'agent_action.rejected' | 'agent_action.executed_mock';
export type AuditLogModule = 'ideas' | 'projects' | 'agents' | 'tasks' | 'memories' | 'decisions' | 'videos' | 'workspace' | 'auth' | 'system' | 'cloud' | 'models';

export interface AuditLog {
  id: string;
  action: AuditLogAction;
  actor: string;
  module: AuditLogModule;
  entityId?: string;
  summary: string;
  timestamp: number;
  severity: EventSeverity;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'mock_executed';

export interface ApprovalRequest {
  id: string;
  actionType: 'send_email' | 'calendar_edit' | 'google_task' | 'drive_write' | 'docs_write' | 'sheets_write' | 'cli_exec' | 'paid_api' | 'delete_entity' | 'other';
  description: string;
  requester: string;
  status: ApprovalStatus;
  timestamp: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  payload?: any;
}

export interface Connection {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'needs_auth' | 'mock';
  whereStored: string;
  requiredScopes: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  lastChecked: number;
}

export type AgentActionRisk = 'low' | 'medium' | 'high' | 'critical';
export type AgentActionStatus = 'proposed' | 'approved' | 'rejected' | 'executing_mock' | 'completed' | 'failed';

export interface AgentActionRequest {
  id: string;
  agentId: string;
  projectId?: string;
  actionType: 'view_screen' | 'click_mouse' | 'type_keyboard' | 'open_app' | 'run_cli_command' | 'edit_file' | 'browser_navigation' | 'destructive_action';
  targetApp?: string;
  description: string;
  proposedSteps: string[];
  riskLevel: AgentActionRisk;
  status: AgentActionStatus;
  requiresApproval: boolean;
  createdAt: number;
  approvedAt?: number;
  result?: string;
}


export interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  triggers: string[];
  bestFor: string[];
  avoidWhen: string[];
  inputNeeded: string[];
  outputExpected: string[];
  relatedSkills: string[];
  compatibleAgents: string[];
  examplePrompts: string[];
  source: 'built_in' | 'github' | 'local' | 'manual' | 'mcp';
  installStatus: 'available' | 'installed' | 'missing' | 'future';
  confidenceScore: number;
  tags: string[];
}

export interface SkillRecommendation {
  id: string;
  taskId?: string;
  projectId?: string;
  agentId?: string;
  userIntent: string;
  recommendedSkillIds: string[];
  reason: string;
  confidence: number;
  suggestedOrder: string[];
  generatedPrompt: string;
  status: 'suggested' | 'accepted' | 'rejected' | 'used';
  createdAt: number;
}

export interface SkillSource {
  id: string;
  url: string;
  type: 'github_repo' | 'local_folder' | 'mcp_server' | 'manual_catalog' | 'opencode_skills' | 'claude_skills';
  status: 'active' | 'syncing' | 'error';
  lastSync?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
  triggerIntent: string[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'file' | 'module' | 'function' | 'class' | 'doc' | 'decision' | 'project' | 'agent' | 'skill' | 'task' | 'memory' | 'video' | 'cloud_resource';
  sourcePath?: string;
  sourceLocation?: string;
  summary: string;
  tags: string[];
  community?: string;
  importance: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  confidence: number;
  evidence?: string;
  metadata?: Record<string, any>;
}

export interface GraphQuery {
  id: string;
  question: string;
  resultSummary: string;
  relatedNodeIds: string[];
  createdAt: number;
  agentId?: string;
}

export type VisualBoardType = 'idea_map' | 'workflow_map' | 'pipeline_map' | 'roadmap';
export type VisualNodeStatus = 'mock' | 'real' | 'future' | 'blocked' | 'done' | 'active';

export interface VisualNodeBoard {
  id: string;
  title: string;
  boardType: VisualBoardType;
  projectId?: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface VisualNode {
  id: string;
  boardId: string;
  type: string;
  title: string;
  description: string;
  x: number;
  y: number;
  status: VisualNodeStatus;
  linkedEntityType?: string;
  linkedEntityId?: string;
  assignedAgentId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface VisualEdge {
  id: string;
  boardId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  edgeType: 'depends_on' | 'produces' | 'triggers' | 'assigns' | 'validates' | 'blocks' | 'informs';
  confidence: number;
}

export interface PromptProject {
  id: string;
  title: string;
  rawInput: string;
  relatedProjectId?: string;
  targetAgentId?: string;
  outputType: 'spec' | 'plan' | 'design' | 'code' | 'analysis' | 'workflow' | 'prompt_pack' | 'debugging';
  detailLevel: 'fast' | 'normal' | 'deep';
  mode: 'manual_blocks' | 'full_loop';
  constraints: string;
  status: 'draft' | 'prompt_ready' | 'workflow_ready' | 'in_progress' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface PromptPackItem {
  id: string;
  promptProjectId: string;
  stage: string;
  title: string;
  purpose: string;
  targetAgentId?: string;
  recommendedSkillIds: string[];
  inputRequired: string;
  promptText: string;
  expectedOutput: string;
  status: 'draft' | 'ready' | 'used' | 'archived';
  order: number;
}

export interface PromptLoopStep {
  id: string;
  loopId: string;
  order: number;
  title: string;
  promptPackItemId?: string;
  actionType: 'prompt' | 'create_task' | 'create_memory' | 'create_workflow' | 'review' | 'verify' | 'export_context';
  status: 'pending' | 'active' | 'waiting_approval' | 'done' | 'failed';
  outputSummary?: string;
}

export interface PromptLoop {
  id: string;
  promptProjectId: string;
  name: string;
  mode: 'manual_blocks' | 'assisted_loop' | 'full_loop_mock' | 'full_loop_future';
  steps: PromptLoopStep[];
  currentStep: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  requiresApproval: boolean;
  createdAt: number;
}

export type ChannelType = 'internal_chat' | 'humania_chat' | 'whatsapp' | 'telegram' | 'gmail' | 'google_chat' | 'web_widget' | 'voice_live' | 'screen_live' | 'discord' | 'slack';
export type ChannelStatus = 'active' | 'mock' | 'future' | 'needs_backend' | 'disabled';
export type ChannelDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface CommunicationChannel {
  id: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  provider: string;
  assignedAgentIds: string[];
  relatedProjectIds: string[];
  direction: ChannelDirection;
  requiresApproval: boolean;
  webhookUrl?: string;
  lastMessageAt?: number;
  notes: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export type MemoryScope = 'global' | 'project' | 'user' | 'channel';

export interface AgentChannelBinding {
  id: string;
  agentId: string;
  channelId: string;
  projectId?: string;
  personaOverride?: string;
  allowedActions: string[];
  memoryScope: MemoryScope;
  status: 'active' | 'paused' | 'mock';
  createdAt: number;
}

export type RepoStatus = 'simulado' | 'conectado' | 'requiere_backend' | 'requiere_worker_local' | 'error';
export type GraphifyStatus = 'missing' | 'imported' | 'stale' | 'updating';

export interface RepoConnection {
  id: string;
  name: string;
  provider: 'github' | 'local' | 'gitlab' | 'bitbucket';
  repoUrl: string;
  localPath: string;
  defaultBranch: string;
  activeBranch: string;
  projectId?: string;
  status: RepoStatus;
  graphifyStatus: GraphifyStatus;
  lastIndexedAt?: number;
  notes: string;
}

export type WorkerType = 'internal_mock' | 'cloud_run_worker' | 'local_desktop_worker' | 'opencode_worker' | 'openclaw_worker' | 'openhands_worker' | 'hermes_worker' | 'gpu_vm_worker' | 'browser_worker' | 'n8n_worker' | 'mcp_tool_worker' | 'claudecode_worker' | 'codex_worker' | 'antigravity_worker' | 'custom_worker';
export type WorkerRuntime = 'local' | 'cloud' | 'browser' | 'vm' | 'external';
export type WorkerStatus = 'disponible' | 'simulado' | 'futuro' | 'desconectado' | 'requiere_configuracion' | 'bloqueado';

export interface WorkerDefinition {
  id: string;
  name: string;
  type: WorkerType;
  runtime: WorkerRuntime;
  status: WorkerStatus;
  description?: string;
  capabilities: string[];
  allowedProjects: string[];
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  endpoint?: string;
  lastHeartbeatAt?: number;
  notes: string;
}

export type WorkOrderStatus = 'propuesta' | 'pendiente_aprobacion' | 'aprobada' | 'ejecutando_simulado' | 'completada' | 'fallida' | 'rechazada';

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  agentId?: string;
  workerId?: string;
  contextPackId?: string;
  requiredCapabilities: string[];
  status: WorkOrderStatus;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  proposedSteps: string[];
  resultSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export type BrainProviderStatus = 'activo' | 'simulado' | 'futuro' | 'requiere_backend' | 'requiere_api_key' | 'error';

export interface BrainProvider {
  id: string;
  name: string;
  providerType: string;
  status: BrainProviderStatus;
  availableModels: string[];
  defaultModel: string;
  strengths: string[];
  bestFor: string[];
  freeTier: boolean;
  estimatedCost: string;
  rateLimits: string;
  whereSecretLives: 'secret_manager' | 'local_env' | 'user_supplied_future' | 'none';
  notes: string;
}

export type LLMModality = 'text' | 'vision' | 'audio' | 'video' | 'embeddings' | 'realtime';
export type LLMCostTier = 'gratis' | 'bajo' | 'medio' | 'alto';

export interface LLMModel {
  id: string;
  providerId: string;
  name: string;
  modality: LLMModality[];
  contextWindow: string;
  costTier: LLMCostTier;
  bestFor: string;
  status: string;
}

export interface MCPServerDefinition {
  id: string;
  name: string;
  command: string;
  status: string;
  capabilities: string[];
  requiredSecrets: string[];
  linkedAgents: string[];
  linkedWorkers: string[];
  notes: string;
}

export interface ApiConnectorDefinition {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  authType: string;
  status: string;
  requiredSecrets: string[];
  allowedActions: string[];
  notes: string;
}

export interface CliToolDefinition {
  id: string;
  name: string;
  commandName: string;
  status: string;
  capabilities: string[];
  requiresLocalWorker: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
}

export type DatabaseType = 'document' | 'relational' | 'vector' | 'cache' | 'warehouse' | 'spreadsheet' | 'local';
export type DatabaseStatus = 'activa' | 'simulada' | 'requiere_backend' | 'requiere_secret' | 'desconectada' | 'error' | 'futuro';

export interface DatabaseConnection {
  id: string;
  name: string;
  provider: string;
  dbType: DatabaseType;
  status: DatabaseStatus;
  relatedProjectIds: string[];
  purpose: string;
  hostLabel: string;
  databaseName: string;
  schemaName: string;
  whereSecretLives: 'secret_manager' | 'env_var' | 'local_only' | 'not_configured';
  readOnly: boolean;
  allowedAgents: string[];
  allowedWorkers: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastCheckedAt?: number;
  notes: string;
}

export interface AgentWorkerBinding {
  id: string;
  agentId: string;
  workerId: string;
  role: 'primary' | 'secondary' | 'fallback';
  permissions: string[];
  approvalPolicy: string;
  status: string;
  createdAt: number;
}

export interface AgentDatabaseBinding {
  id: string;
  agentId: string;
  databaseId: string;
  permissions: string[];
}

export interface WorkerDatabaseBinding {
  id: string;
  workerId: string;
  databaseId: string;
  permissions: string[];
}
