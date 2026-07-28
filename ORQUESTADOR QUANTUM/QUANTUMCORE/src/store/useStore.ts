import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseConnection,
  MacroDivision,
  ProjectStatus,
  AgentStatus,
  PreferredModel,
  RepoConnection,
  AgentWorkerBinding,
  AgentDatabaseBinding,
  WorkerDatabaseBinding, WorkerDefinition, WorkOrder, BrainProvider, LLMModel, MCPServerDefinition, ApiConnectorDefinition, CliToolDefinition, Idea, Project, Agent, ChatMessage, Memory, Task, SystemEvent,
  ModelProvider, CloudResource, Decision, VideoInboxItem, ToolSkill, VoiceSession, ContextualAssistant, AssistantSession, AssistantProposedAction,
  AuditLog, ApprovalRequest, Connection, AgentActionRequest, SkillDefinition, SkillRecommendation, SkillSource, WorkflowTemplate, KnowledgeGraphNode, KnowledgeGraphEdge, GraphQuery, VisualNodeBoard, VisualNode, VisualEdge, PromptProject, PromptPackItem, PromptLoop, CommunicationChannel, AgentChannelBinding
} from '../types';
import { WorkflowDefinition, WorkflowRun } from '../workflows/types';
import { createStarterAgentWorkflow } from '../workflows/runtime';
import { supabase } from '../lib/supabase';

export type UserMode = 'beginner' | 'power' | 'developer';

interface AppState {
  contextualAssistants: ContextualAssistant[];
  assistantSessions: AssistantSession[];
  assistantProposedActions: AssistantProposedAction[];
  ideas: Idea[];
  projects: Project[];
  agents: Agent[];
  chatMessages: ChatMessage[];
  memories: Memory[];
  tasks: Task[];
  events: SystemEvent[];
  modelProviders: ModelProvider[];
  cloudResources: CloudResource[];
  decisions: Decision[];
  videoInboxItems: VideoInboxItem[];
  toolSkills: ToolSkill[];
  voiceSessions: VoiceSession[];
  auditLogs: AuditLog[];
  approvals: ApprovalRequest[];
  connections: Connection[];
  communicationChannels: CommunicationChannel[];
  agentChannelBindings: AgentChannelBinding[];
  agentWorkerBindings: AgentWorkerBinding[];
  agentDatabaseBindings: AgentDatabaseBinding[];
  workerDatabaseBindings: WorkerDatabaseBinding[];
  agentActions: AgentActionRequest[];
  skillDefinitions: SkillDefinition[];
  skillRecommendations: SkillRecommendation[];
  skillSources: SkillSource[];
  workflowTemplates: WorkflowTemplate[];
  knowledgeGraphNodes: KnowledgeGraphNode[];
  knowledgeGraphEdges: KnowledgeGraphEdge[];
  graphQueries: GraphQuery[];
  userMode: UserMode;
  pinnedRoutes: string[];
  visualNodeBoards: VisualNodeBoard[];
  visualNodes: VisualNode[];
  visualEdges: VisualEdge[];
  promptProjects: PromptProject[];
  promptPackItems: PromptPackItem[];
  promptLoops: PromptLoop[];
  repoConnections: RepoConnection[];
  workerDefinitions: WorkerDefinition[];
  workOrders: WorkOrder[];
  brainProviders: BrainProvider[];
  llmModels: LLMModel[];
  mcpServerDefinitions: MCPServerDefinition[];
  apiConnectorDefinitions: ApiConnectorDefinition[];
  cliToolDefinitions: CliToolDefinition[];
  databaseConnections: DatabaseConnection[];
  workflowDefinitions: WorkflowDefinition[];
  workflowRuns: WorkflowRun[];
  
  workspaceIntegrations: Record<string, string>;
  syncedEmails: any[];
  syncedEvents: any[];
  syncedFiles: any[];
  syncedWorkspaceTasks: any[];
  syncedNotes: any[];
  syncedMeetings: any[];
  syncedContacts: any[];
  syncedChatMessages: any[];

  // Actions
  setUserMode: (mode: UserMode) => void;
  togglePinnedRoute: (route: string) => void;
  
  addVisualNodeBoard: (board: Omit<VisualNodeBoard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVisualNodeBoard: (id: string, updates: Partial<VisualNodeBoard>) => void;
  addVisualNode: (node: Omit<VisualNode, 'id'>) => void;
  updateVisualNode: (id: string, updates: Partial<VisualNode>) => void;
  addVisualEdge: (edge: Omit<VisualEdge, 'id'>) => void;
  updateVisualEdge: (id: string, updates: Partial<VisualEdge>) => void;
  addPromptProject: (project: Omit<PromptProject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePromptProject: (id: string, updates: Partial<PromptProject>) => void;
  addPromptPackItem: (item: Omit<PromptPackItem, 'id'>) => void;
  updatePromptPackItem: (id: string, updates: Partial<PromptPackItem>) => void;
  addPromptLoop: (loop: Omit<PromptLoop, 'id' | 'createdAt'>) => void;
  updatePromptLoop: (id: string, updates: Partial<PromptLoop>) => void;


  fetchIdeas: () => Promise<void>;
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt'>) => Promise<void>;
  updateIdea: (id: string, idea: Partial<Idea>) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;

  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'lastUpdate'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;

  fetchAgents: () => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id'>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  
  fetchMemories: () => Promise<void>;
  addMemory: (memory: Omit<Memory, 'id' | 'date'>) => Promise<void>;
  updateMemory: (id: string, memory: Partial<Memory>) => Promise<void>;

  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;

  addEvent: (event: Omit<SystemEvent, 'id' | 'timestamp'>) => void;

  addVideoItem: (item: Omit<VideoInboxItem, 'id' | 'createdAt'> & { id?: string }) => void;
  updateVideoItem: (id: string, item: Partial<VideoInboxItem>) => void;

  addToolSkill: (tool: Omit<ToolSkill, 'id' | 'date'>) => void;
  
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  addApproval: (approval: Omit<ApprovalRequest, 'id' | 'timestamp'>) => void;
  updateApproval: (id: string, approval: Partial<ApprovalRequest>) => void;
  updateConnection: (id: string, connection: Partial<Connection>) => void;
  addCommunicationChannel: (channel: Omit<CommunicationChannel, 'id'>) => void;
  updateCommunicationChannel: (id: string, updates: Partial<CommunicationChannel>) => void;
  addAgentChannelBinding: (binding: Omit<AgentChannelBinding, 'id' | 'createdAt'>) => void;
  updateAgentChannelBinding: (id: string, updates: Partial<AgentChannelBinding>) => void;
  addAgentAction: (action: Omit<AgentActionRequest, 'id' | 'createdAt'>) => void;
  updateAgentAction: (id: string, action: Partial<AgentActionRequest>) => void;
  addSkillDefinition: (skill: Omit<SkillDefinition, 'id'>) => void;
  updateSkillDefinition: (id: string, updates: Partial<SkillDefinition>) => void;
  addSkillRecommendation: (rec: Omit<SkillRecommendation, 'id' | 'createdAt'>) => void;
  updateSkillRecommendation: (id: string, updates: Partial<SkillRecommendation>) => void;
  addSkillSource: (source: Omit<SkillSource, 'id'>) => void;
  updateSkillSource: (id: string, updates: Partial<SkillSource>) => void;
  addKnowledgeGraphNode: (node: Omit<KnowledgeGraphNode, 'id'>) => void;
  addGraphQuery: (query: Omit<GraphQuery, 'id' | 'createdAt'>) => void;
  addWorkflowDefinition: (workflow: WorkflowDefinition) => void;
  updateWorkflowDefinition: (id: string, updates: Partial<WorkflowDefinition>) => void;
  addWorkflowRun: (run: WorkflowRun) => void;


  onboardingCompleted: boolean;
  completedTours: string[];
  learningModeEnabled: boolean;
  dismissedTips: string[];
  
  setOnboardingCompleted: (completed: boolean) => void;
  completeTour: (tourId: string) => void;
  setLearningMode: (enabled: boolean) => void;
  dismissTip: (tipId: string) => void;
  resetTutorials: () => void;

  resetData: () => void;
}

const DOMINUS_PRIME_AGENT_ID = '11111111-1111-4111-8111-111111111111';
const INGESTADOR_VIDEOS_AGENT_ID = '22222222-2222-4222-8222-222222222222';
const PITCH_MASTER_AGENT_ID = 'f496b1ed-e609-43b6-a2f1-c64ddc9529cb';
const INGESTADOR_PDF_AGENT_ID = '33333333-3333-4333-8333-333333333333';

const SEED_AGENTS: Agent[] = [
  {
    id: DOMINUS_PRIME_AGENT_ID,
    name: 'Dominus Prime',
    role: 'Orquestador General de QuantumCore y CEO II operativo de QuantumHive. Segundo cerebro operativo de Sergio: centraliza contexto, coordina agentes, prioriza proyectos, protege la vision, arma context packs y convierte decisiones en tareas, memoria, eventos y auditoria trazable.',
    macroDivision: 'General',
    status: 'active',
    preferredModel: 'vertex',
    brainProviderId: 'vertex',
    defaultModelId: 'gemini',
    memoryScope: 'global,projects,decisions,tasks,technical,operational',
    permissions: ['read_context', 'create_tasks', 'propose_actions', 'request_approval', 'coordinate_agents', 'write_memory'],
    approvalPolicy: 'required_for_sensitive_actions',
  },
  {
    id: INGESTADOR_VIDEOS_AGENT_ID,
    name: 'Ingestador de Videos',
    role: 'Agente principal del catalogo multimedia de herramientas. Recibe links, reels, videos y posts enviados por Sergio; detecta herramientas, clasifica por taxonomia, deduplica, compara alternativas, asigna puntajes y deja cada recurso listo para la PWA del catalogo cuando la confianza es suficiente.',
    macroDivision: 'General',
    status: 'active',
    preferredModel: 'vertex',
    brainProviderId: 'vertex',
    defaultModelId: 'gemini-3.6-flash',
    memoryScope: 'catalogo_multimedia,herramientas,taxonomia,video_ingest,comparativas',
    permissions: ['catalogo_multimedia', 'ingest_links', 'analyze_video', 'classify_taxonomy', 'dedupe_tools', 'score_tools', 'compare_tools', 'publish_catalog_candidates'],
    approvalPolicy: 'automatico_si_confianza_alta',
  },
  {
    id: INGESTADOR_PDF_AGENT_ID,
    name: 'Ingestador de PDFs y Conversaciones',
    role: 'Agente especializado en leer PDFs largos, manuales técnicos y conversaciones. Extrae datos estructurados, resume y alimenta la memoria semántica (Memanto) con contexto denso.',
    macroDivision: 'General',
    status: 'active',
    preferredModel: 'vertex',
    brainProviderId: 'vertex',
    defaultModelId: 'gemini',
    memoryScope: 'documentos,pdfs,conversaciones,memanto',
    permissions: ['read_pdfs', 'parse_conversations', 'write_memanto'],
    approvalPolicy: 'automatico_si_confianza_alta',
  },
  {
    id: PITCH_MASTER_AGENT_ID,
    name: 'Pitch Master',
    role: 'Documentador de Inversores',
    macroDivision: 'General',
    status: 'active',
    preferredModel: 'vertex',
    brainProviderId: 'vertex',
    defaultModelId: 'gemini',
    memoryScope: 'inversores,pitch,documentos',
    permissions: ['read_context', 'write_memory'],
    approvalPolicy: 'required_for_sensitive_actions',
  },
  { id: uuidv4(), name: 'Asistente Global', role: 'Orquestador personal central', macroDivision: 'General', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Carta Viva', role: 'Responsable MVP comercial Carta Viva', macroDivision: 'Carta Viva', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO HumanIA', role: 'Responsable HumanIA Chat, World y agentes', macroDivision: 'HumanIA', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Infraestructura', role: 'Responsable Cloud Run, Firestore, Vertex, Azure', macroDivision: 'Infraestructura', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Avatar Engine', role: 'Responsable videos, avatares y assets', macroDivision: 'Carta Viva', status: 'active', preferredModel: 'local' },
  { id: uuidv4(), name: 'CEO Trading', role: 'Placeholder futuro trading', macroDivision: 'Trading', status: 'paused', preferredModel: 'manual' },
];

function ensureCoreAgents(agents: Agent[]): Agent[] {
  const coreAgents = SEED_AGENTS.filter(agent => [DOMINUS_PRIME_AGENT_ID, INGESTADOR_VIDEOS_AGENT_ID, PITCH_MASTER_AGENT_ID, INGESTADOR_PDF_AGENT_ID].includes(agent.id));
  const existingIds = new Set(agents.map(agent => agent.id));
  const missingCoreAgents = coreAgents.filter(agent => !existingIds.has(agent.id));
  return [...agents, ...missingCoreAgents];
}

const SEED_PROJECTS: Project[] = [
  { id: uuidv4(), name: 'Carta Viva MVP', macroDivision: 'Carta Viva', status: 'active', repo: 'carta-viva-ui', ceoAgentId: SEED_AGENTS[3].id, goal: 'Lanzar MVP con avatar cacheado manual', nextAction: 'Hacer videos de Sol manualmente', risks: 'Costos altos si usamos GPU sin validar', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'QuantumHive Control Plane', macroDivision: 'Infraestructura', status: 'active', repo: 'quantum-hive', ceoAgentId: DOMINUS_PRIME_AGENT_ID, goal: 'Panel central de control personal', nextAction: 'Diseñar frontend AI Studio', risks: 'Perderse en features, mantener MVP', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'HumanIA Chat', macroDivision: 'HumanIA', status: 'planned', repo: 'humania-core', ceoAgentId: SEED_AGENTS[4].id, goal: 'Chat base para interactuar con NPCs', nextAction: 'Definir DB schema', risks: 'Ninguno', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'HumanIA World', macroDivision: 'HumanIA', status: 'planned', repo: 'humania-world', ceoAgentId: SEED_AGENTS[4].id, goal: 'Mundo inmersivo', nextAction: 'Visión futura', risks: 'Scope creep', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'Avatar Cache Engine', macroDivision: 'Carta Viva', status: 'active', repo: 'avatar-engine', ceoAgentId: SEED_AGENTS[6].id, goal: 'Motor para servir video cacheado', nextAction: 'Integrar en MVP', risks: 'Latencia de video', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'Azure Provider Integration', macroDivision: 'Infraestructura', status: 'blocked', repo: 'provider-router', ceoAgentId: SEED_AGENTS[5].id, goal: 'Tener fallback a Azure OpenAI', nextAction: 'Esperar backend', risks: 'Bloqueado por backend', lastUpdate: Date.now() },
];


const SEED_SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: uuidv4(),
    name: 'brainstorming',
    category: 'planning',
    description: 'Genera ideas expansivas sin restricciones',
    triggers: ['idear', 'pensar', 'brainstorm', 'opciones'],
    bestFor: ['inicio de proyecto', 'resolución de problemas abiertos'],
    avoidWhen: ['ejecución estricta', 'debugging'],
    inputNeeded: ['contexto inicial', 'objetivo'],
    outputExpected: ['lista de ideas', 'conceptos'],
    relatedSkills: ['writing-plans', 'abogado-del-diablo'],
    compatibleAgents: ['Master AI', 'Cerebro'],
    examplePrompts: ['Hagamos un brainstorming sobre...'],
    source: 'built_in',
    installStatus: 'available',
    confidenceScore: 0.9,
    tags: ['planning', 'creative']
  },
  {
    id: uuidv4(),
    name: 'writing-plans',
    category: 'planning',
    description: 'Convierte ideas en planes estructurados',
    triggers: ['planear', 'estructurar', 'pasos', 'roadmap'],
    bestFor: ['preparación de desarrollo', 'organización de tareas'],
    avoidWhen: ['exploración', 'codificación directa'],
    inputNeeded: ['idea clara', 'requerimientos'],
    outputExpected: ['documento de plan', 'lista de pasos'],
    relatedSkills: ['brainstorming', 'executing-plans'],
    compatibleAgents: ['Master AI', 'Product Manager'],
    examplePrompts: ['Escribe un plan de implementación para...'],
    source: 'built_in',
    installStatus: 'installed',
    confidenceScore: 0.95,
    tags: ['planning', 'structure']
  },
  {
    id: uuidv4(),
    name: 'systematic-debugging',
    category: 'development',
    description: 'Encuentra y arregla bugs de forma metódica',
    triggers: ['bug', 'error', 'no funciona', 'fix'],
    bestFor: ['errores complejos', 'código roto'],
    avoidWhen: ['creación de nuevas features'],
    inputNeeded: ['logs de error', 'código actual', 'comportamiento esperado'],
    outputExpected: ['causa raíz', 'solución en código'],
    relatedSkills: ['test-driven-development'],
    compatibleAgents: ['Master AI', 'DevOps'],
    examplePrompts: ['Ayudame a debuggear este error: ...'],
    source: 'built_in',
    installStatus: 'installed',
    confidenceScore: 0.98,
    tags: ['dev', 'debug']
  },
  {
    id: uuidv4(),
    name: 'frontend-design',
    category: 'design',
    description: 'Diseña interfaces de usuario frontend',
    triggers: ['diseñar', 'ui', 'frontend', 'landing', 'vista'],
    bestFor: ['páginas web', 'componentes UI'],
    avoidWhen: ['backend logic', 'databases'],
    inputNeeded: ['wireframes', 'requisitos visuales', 'inspiración'],
    outputExpected: ['código frontend', 'componentes React'],
    relatedSkills: ['high-end-visual-design', 'ui-ux-pro-max'],
    compatibleAgents: ['Master AI', 'UI Designer'],
    examplePrompts: ['Diseña una landing page para...'],
    source: 'built_in',
    installStatus: 'installed',
    confidenceScore: 0.9,
    tags: ['design', 'frontend']
  },
  {
    id: uuidv4(),
    name: 'abogado-del-diablo',
    category: 'review',
    description: 'Critica despiadadamente una idea o plan',
    triggers: ['criticar', 'evaluar', 'riesgos', 'viable'],
    bestFor: ['validación de ideas', 'prevención de errores'],
    avoidWhen: ['brainstorming inicial', 'baja moral'],
    inputNeeded: ['idea o plan a evaluar'],
    outputExpected: ['lista de riesgos', 'puntos débiles', 'preguntas difíciles'],
    relatedSkills: ['brainstorming', 'design-review'],
    compatibleAgents: ['Master AI', 'QA'],
    examplePrompts: ['Actúa como abogado del diablo y destroza esta idea: ...'],
    source: 'built_in',
    installStatus: 'available',
    confidenceScore: 0.85,
    tags: ['review', 'critical']
  },
  {
    id: uuidv4(),
    name: 'watch',
    category: 'media',
    description: 'Analiza contenido de video',
    triggers: ['mirar video', 'analizar reel', 'youtube'],
    bestFor: ['procesamiento de media', 'extracción de info de videos'],
    avoidWhen: ['texto plano'],
    inputNeeded: ['url del video', 'archivo de video'],
    outputExpected: ['resumen', 'transcripción', 'puntos clave'],
    relatedSkills: ['video-downloader', 'youtube-clipper'],
    compatibleAgents: ['Master AI'],
    examplePrompts: ['Mira este video y dime de qué trata...'],
    source: 'built_in',
    installStatus: 'future',
    confidenceScore: 0.7,
    tags: ['video', 'media']
  }
];

const SEED_SKILL_RECOMMENDATIONS: SkillRecommendation[] = [];
const SEED_SKILL_SOURCES: SkillSource[] = [
  { id: uuidv4(), url: 'https://github.com/example/skills', type: 'github_repo', status: 'active', lastSync: Date.now() }
];
const SEED_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [];


const SEED_GRAPH_NODES: KnowledgeGraphNode[] = [
  { id: 'node_1', label: 'QuantumHive Control Plane', type: 'project', summary: 'Panel central de control personal', tags: ['ui', 'core'], importance: 0.9 },
  { id: 'node_2', label: 'Carta Viva MVP', type: 'project', summary: 'Lanzar MVP con avatar cacheado manual', tags: ['mvp', 'video'], importance: 0.8 },
  { id: 'node_3', label: 'HumanIA Chat', type: 'project', summary: 'Chat base para interactuar con NPCs', tags: ['chat', 'npc'], importance: 0.7 },
  { id: 'node_4', label: 'Avatar Cache Engine', type: 'project', summary: 'Motor para servir video cacheado', tags: ['video', 'backend'], importance: 0.8 },
  { id: 'node_5', label: 'Registro de Agentes', type: 'module', summary: 'Directorio de agentes IA disponibles', tags: ['agents', 'core'], importance: 0.9 },
  { id: 'node_6', label: 'Bus de Eventos', type: 'module', summary: 'Bus de eventos del sistema', tags: ['events', 'infra'], importance: 0.9 },
  { id: 'node_7', label: 'Shared Memory', type: 'module', summary: 'Memoria a largo plazo compartida', tags: ['memory', 'core'], importance: 0.95 },
  { id: 'node_8', label: 'Enrutador de Modelos', type: 'module', summary: 'Enrutador dinámico de modelos de lenguaje', tags: ['models', 'llm'], importance: 0.85 },
  { id: 'node_9', label: 'Vertex AI Provider', type: 'cloud_resource', summary: 'Proveedor primario de LLM', tags: ['gcp', 'llm'], importance: 0.9 },
  { id: 'node_10', label: 'Azure Provider', type: 'cloud_resource', summary: 'Proveedor fallback', tags: ['azure', 'llm'], importance: 0.7 },
  { id: 'node_11', label: 'Firestore', type: 'cloud_resource', summary: 'Base de datos principal', tags: ['db', 'gcp'], importance: 0.95 },
  { id: 'node_12', label: 'Cloud Run', type: 'cloud_resource', summary: 'Entorno de ejecución de contenedores', tags: ['compute', 'gcp'], importance: 0.9 },
  { id: 'node_13', label: 'Skill Advisor', type: 'module', summary: 'Recomendador de skills y herramientas', tags: ['skills', 'ui'], importance: 0.8 },
  { id: 'node_14', label: 'Bandeja de Videos', type: 'module', summary: 'Bandeja de entrada para procesamiento de media', tags: ['video', 'media'], importance: 0.7 },
  { id: 'node_15', label: 'Tool/Skill Library', type: 'module', summary: 'Librería central de herramientas', tags: ['skills', 'library'], importance: 0.8 },
  { id: 'node_16', label: 'Live Screen Assistant', type: 'module', summary: 'Asistente con visión de pantalla', tags: ['vision', 'ui'], importance: 0.85 },
  { id: 'node_17', label: 'Graphify Repo Graph', type: 'module', summary: 'Generador de grafo de código', tags: ['graph', 'code'], importance: 0.8 },
  { id: 'node_18', label: 'OpenCode Worker', type: 'module', summary: 'Worker local de ejecución', tags: ['execution', 'local'], importance: 0.9 },
  { id: 'node_19', label: 'Local Desktop Worker future', type: 'module', summary: 'Integración OS futura', tags: ['future', 'os'], importance: 0.6 }
];

const SEED_GRAPH_EDGES: KnowledgeGraphEdge[] = [
  { id: 'edge_1', source: 'node_1', target: 'node_5', relation: 'contains', confidence: 1.0 },
  { id: 'edge_2', source: 'node_1', target: 'node_6', relation: 'contains', confidence: 1.0 },
  { id: 'edge_3', source: 'node_1', target: 'node_7', relation: 'contains', confidence: 1.0 },
  { id: 'edge_4', source: 'node_1', target: 'node_8', relation: 'routes to', confidence: 0.9 },
  { id: 'edge_5', source: 'node_8', target: 'node_9', relation: 'uses', confidence: 0.95 },
  { id: 'edge_6', source: 'node_8', target: 'node_10', relation: 'prepares', confidence: 0.8 },
  { id: 'edge_7', source: 'node_14', target: 'node_15', relation: 'creates entries', confidence: 0.85 },
  { id: 'edge_8', source: 'node_13', target: 'node_15', relation: 'recommends', confidence: 0.9 },
  { id: 'edge_9', source: 'node_5', target: 'node_1', relation: 'assigns Tasks', confidence: 0.8 },
  { id: 'edge_10', source: 'node_7', target: 'node_1', relation: 'feeds Context Packs', confidence: 0.9 },
  { id: 'edge_11', source: 'node_17', target: 'node_1', relation: 'explains codebase', confidence: 0.95 },
  { id: 'edge_12', source: 'node_16', target: 'node_1', relation: 'creates Action Requests', confidence: 0.9 },
  { id: 'edge_13', source: 'node_18', target: 'node_1', relation: 'executes approved tasks', confidence: 0.95 }
];

const SEED_GRAPH_QUERIES: GraphQuery[] = [];



const SEED_PROMPT_PROJECTS: PromptProject[] = [
  { id: 'pp_1', title: 'Optimizar landing Carta Viva', rawInput: 'Quiero mejorar visualmente esta landing', outputType: 'design', detailLevel: 'deep', mode: 'manual_blocks', constraints: '', status: 'prompt_ready', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'pp_2', title: 'Crear pipeline de videos cacheados para Sol', rawInput: 'Quiero hacer un video avatar para Carta Viva', outputType: 'workflow', detailLevel: 'normal', mode: 'full_loop', constraints: '', status: 'draft', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'pp_3', title: 'Analizar idea HumanIA World', rawInput: 'Quiero analizar si esta idea sirve', outputType: 'analysis', detailLevel: 'deep', mode: 'manual_blocks', constraints: '', status: 'draft', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'pp_4', title: 'Conectar backend Cloud Run + Firestore', rawInput: 'Quiero conectar Firestore con mi backend', outputType: 'spec', detailLevel: 'normal', mode: 'manual_blocks', constraints: '', status: 'draft', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'pp_5', title: 'Crear workflow de ingesta de reels', rawInput: 'Quiero crear un workflow para procesar reels', outputType: 'workflow', detailLevel: 'fast', mode: 'manual_blocks', constraints: '', status: 'draft', createdAt: Date.now(), updatedAt: Date.now() }
];

const SEED_PROMPT_PACK_ITEMS: PromptPackItem[] = [
  { id: 'ppi_1', promptProjectId: 'pp_1', stage: 'Brainstorm visual direction', title: 'Brainstorm visual direction', purpose: 'Definir el estilo visual', recommendedSkillIds: ['frontend-design'], inputRequired: 'URL de la landing', promptText: 'Analizá esta landing de Carta Viva manteniendo la estructura funcional actual, proponé mejoras visuales premium.', expectedOutput: 'Lista de ideas de diseño', status: 'ready', order: 1 },
  { id: 'ppi_2', promptProjectId: 'pp_1', stage: 'Audit current page', title: 'Audit current page', purpose: 'Detectar problemas', recommendedSkillIds: ['design-review'], inputRequired: 'URL de la landing', promptText: 'Detectá fricción de conversión y devolvé un plan por secciones con prioridad.', expectedOutput: 'Reporte de auditoría', status: 'ready', order: 2 }
];

const SEED_PROMPT_LOOPS: PromptLoop[] = [
  {
    id: 'pl_1',
    promptProjectId: 'pp_1',
    name: 'Loop: Optimizar landing Carta Viva',
    mode: 'manual_blocks',
    steps: [
      { id: 'pls_1', loopId: 'pl_1', order: 1, title: 'Brainstorm', promptPackItemId: 'ppi_1', actionType: 'prompt', status: 'done', outputSummary: 'Ideas generadas' },
      { id: 'pls_2', loopId: 'pl_1', order: 2, title: 'Design Review', promptPackItemId: 'ppi_2', actionType: 'review', status: 'active' },
      { id: 'pls_3', loopId: 'pl_1', order: 3, title: 'Implementation Plan', actionType: 'prompt', status: 'pending' },
      { id: 'pls_4', loopId: 'pl_1', order: 4, title: 'Execute', actionType: 'create_task', status: 'pending' },
      { id: 'pls_5', loopId: 'pl_1', order: 5, title: 'Verify', actionType: 'verify', status: 'pending' },
      { id: 'pls_6', loopId: 'pl_1', order: 6, title: 'Memory', actionType: 'create_memory', status: 'pending' }
    ],
    currentStep: 1,
    status: 'running',
    requiresApproval: true,
    createdAt: Date.now()
  }
];


const SEED_CHANNELS: CommunicationChannel[] = [
  {
    id: 'ch-1',
    name: 'Internal Chat',
    type: 'internal_chat',
    status: 'active',
    provider: 'quantumhive',
    assignedAgentIds: ['a1', 'a2'], // Assuming CEO and some other agent
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: false,
    notes: 'Chat UI por defecto para QuantumHive.',
    riskLevel: 'low'
  },
  {
    id: 'ch-2',
    name: 'HumanIA Chat',
    type: 'humania_chat',
    status: 'future',
    provider: 'humania',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: false,
    notes: 'Canal público/user-facing para agentes HumanIA.',
    riskLevel: 'medium'
  },
  {
    id: 'ch-3',
    name: 'WhatsApp Business',
    type: 'whatsapp',
    status: 'needs_backend',
    provider: 'meta',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: true,
    notes: 'Usar después para ingesta de reels, mensajes y contacto externo.',
    riskLevel: 'high'
  },
  {
    id: 'ch-4',
    name: 'Telegram Bot',
    type: 'telegram',
    status: 'future',
    provider: 'telegram',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: false,
    notes: 'Primer canal externo recomendado por facilidad de webhooks.',
    riskLevel: 'low'
  },
  {
    id: 'ch-5',
    name: 'Gmail',
    type: 'gmail',
    status: 'mock',
    provider: 'google',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: true,
    notes: 'Convertir emails en tareas/memorias con aprobación.',
    riskLevel: 'high'
  },
  {
    id: 'ch-6',
    name: 'Google Chat',
    type: 'google_chat',
    status: 'future',
    provider: 'google',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: false,
    notes: 'Para resúmenes internos.',
    riskLevel: 'low'
  },
  {
    id: 'ch-7',
    name: 'Voice / Live',
    type: 'voice_live',
    status: 'mock',
    provider: 'webrtc',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'bidirectional',
    requiresApproval: false,
    notes: 'Sesiones de voz en vivo.',
    riskLevel: 'medium'
  },
  {
    id: 'ch-8',
    name: 'Live Screen Assistant',
    type: 'screen_live',
    status: 'future',
    provider: 'webrtc',
    assignedAgentIds: [],
    relatedProjectIds: [],
    direction: 'inbound',
    requiresApproval: false,
    notes: 'Pantalla compartida para agentes.',
    riskLevel: 'medium'
  }
];

const SEED_VISUAL_BOARDS: VisualNodeBoard[] = [
  { id: 'board_1', title: 'HumanIA World', boardType: 'idea_map', description: 'Idea general de HumanIA World', status: 'active', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'board_2', title: 'Idea a Proyecto', boardType: 'workflow_map', description: 'Flujo de trabajo de ideas a proyectos', status: 'active', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'board_3', title: 'Control Plane Backend', boardType: 'pipeline_map', description: 'Pipeline técnico del backend', status: 'active', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'board_4', title: 'Hoja de Ruta del Producto', boardType: 'roadmap', description: 'Hoja de ruta actual', status: 'active', createdAt: Date.now(), updatedAt: Date.now() }
];

const SEED_VISUAL_NODES: VisualNode[] = [
  // HumanIA World Idea Map
  { id: 'vn_1', boardId: 'board_1', type: 'Idea', title: 'HumanIA World', description: 'Concepto principal', x: 400, y: 50, status: 'active', tags: ['core'] },
  { id: 'vn_2', boardId: 'board_1', type: 'Proyecto', title: 'HumanIA Chat', description: 'Sistema de chat', x: 200, y: 150, status: 'active', tags: ['ui'] },
  { id: 'vn_3', boardId: 'board_1', type: 'Modulo', title: 'Registro de Agentes', description: 'Registro de agentes', x: 400, y: 150, status: 'active', tags: ['core'] },
  { id: 'vn_4', boardId: 'board_1', type: 'Modulo', title: 'Memoria Compartida', description: 'Memoria compartida', x: 600, y: 150, status: 'active', tags: ['db'] },
  { id: 'vn_5', boardId: 'board_1', type: 'Modulo', title: 'Roblox/Unreal Client', description: 'Cliente 3D', x: 400, y: 250, status: 'future', tags: ['game'] },

  // Idea to Project Workflow
  { id: 'vn_w1', boardId: 'board_2', type: 'Disparador', title: 'Nueva Idea', description: 'Idea enviada', x: 100, y: 150, status: 'real', tags: [] },
  { id: 'vn_w2', boardId: 'board_2', type: 'Agente', title: 'Revisión del CEO', description: 'Agente revisa la idea', x: 300, y: 150, status: 'active', tags: [] },
  { id: 'vn_w3', boardId: 'board_2', type: 'Task', title: 'Create Project', description: 'Project initialization', x: 500, y: 150, status: 'active', tags: [] },

  // Pipeline
  { id: 'vn_p1', boardId: 'board_3', type: 'Source', title: 'Frontend Mock', description: 'Mock data source', x: 100, y: 150, status: 'mock', tags: [] },
  { id: 'vn_p2', boardId: 'board_3', type: 'API', title: 'Cloud Run API', description: 'Backend service', x: 300, y: 150, status: 'future', tags: [] },
  { id: 'vn_p3', boardId: 'board_3', type: 'Storage', title: 'Firestore', description: 'Database', x: 500, y: 150, status: 'future', tags: [] },
  
  // Roadmap
  { id: 'vn_r1', boardId: 'board_4', type: 'Milestone', title: 'Now: Visual Planner', description: 'Visual tools', x: 150, y: 100, status: 'active', tags: [] },
  { id: 'vn_r2', boardId: 'board_4', type: 'Milestone', title: 'Next: N8N Intergration', description: 'Real workflows', x: 150, y: 200, status: 'future', tags: [] },
  { id: 'vn_r3', boardId: 'board_4', type: 'Milestone', title: 'Later: Desktop Agent', description: 'Local OS worker', x: 150, y: 300, status: 'blocked', tags: [] }
];

const SEED_VISUAL_EDGES: VisualEdge[] = [
  // HumanIA World
  { id: 've_1', boardId: 'board_1', sourceNodeId: 'vn_1', targetNodeId: 'vn_2', label: 'contiene', edgeType: 'depends_on', confidence: 1 },
  { id: 've_2', boardId: 'board_1', sourceNodeId: 'vn_1', targetNodeId: 'vn_3', label: 'contains', edgeType: 'depends_on', confidence: 1 },
  { id: 've_3', boardId: 'board_1', sourceNodeId: 'vn_1', targetNodeId: 'vn_4', label: 'contains', edgeType: 'depends_on', confidence: 1 },
  { id: 've_4', boardId: 'board_1', sourceNodeId: 'vn_3', targetNodeId: 'vn_5', label: 'conecta a', edgeType: 'informs', confidence: 0.8 },
  
  // Workflow
  { id: 've_w1', boardId: 'board_2', sourceNodeId: 'vn_w1', targetNodeId: 'vn_w2', label: 'dispara', edgeType: 'triggers', confidence: 1 },
  { id: 've_w2', boardId: 'board_2', sourceNodeId: 'vn_w2', targetNodeId: 'vn_w3', label: 'aprueba', edgeType: 'validates', confidence: 1 },
  
  // Pipeline
  { id: 've_p1', boardId: 'board_3', sourceNodeId: 'vn_p1', targetNodeId: 'vn_p2', label: 'calls', edgeType: 'triggers', confidence: 1 },
  { id: 've_p2', boardId: 'board_3', sourceNodeId: 'vn_p2', targetNodeId: 'vn_p3', label: 'reads/writes', edgeType: 'produces', confidence: 1 }
];

const SEED_IDEAS: Idea[] = [
  {
    id: uuidv4(),
    title: 'HumanIA World Second Life',
    description: 'Mundo social tipo Second Life/Habbo/Roblox donde humanos y NPCs IA conviven. El usuario descubre agentes en el mundo, les pide el número y continúa la relación en HumanIA Chat.',
    macroDivision: 'HumanIA',
    type: 'visión futura',
    priority: 'después',
    status: 'visión' as any, // mapping custom state
    dependencies: 'HumanIA Chat, Registro de Agentes, Memoria, Enrutador de Modelos, Event Bus',
    notes: '',
    createdAt: Date.now()
  }
];

const SEED_MEMORIES: Memory[] = [
  { id: uuidv4(), title: 'Carta Viva se lanza primero', content: 'Lanzar con avatar cacheado manual', tags: ['MVP', 'Strategy'], date: Date.now(), type: 'Decisión', importance: 'crítica' },
  { id: uuidv4(), title: 'Videos manuales', content: 'Los videos de Sol se harán manualmente en Google Vids o creador web.', tags: ['Avatars', 'Video'], date: Date.now(), type: 'Contexto', importance: 'alta' },
  { id: uuidv4(), title: 'Cuidado con GPU', content: 'No gastar GPU hasta tener cache/flujo validado.', tags: ['Cost', 'Infra'], date: Date.now(), type: 'Riesgo', importance: 'alta' },
  { id: uuidv4(), title: 'Prioridad Control Plane', content: 'Control Plane es prioridad antes de seguir expandiendo.', tags: ['Priority'], date: Date.now(), type: 'Próxima acción', importance: 'crítica' },
  { id: uuidv4(), title: 'Azure', content: 'Azure se integrará después del bus/memoria, no antes.', tags: ['Azure', 'Infra'], date: Date.now(), type: 'Contexto', importance: 'media' },
  { id: uuidv4(), title: 'GCP Base', content: 'GCP será base inicial: Cloud Run + Firestore + Vertex.', tags: ['GCP', 'Infra'], date: Date.now(), type: 'Contexto', importance: 'alta' },
];

const SEED_TASKS: Task[] = [
  { id: uuidv4(), title: 'Diseñar frontend Control Plane en Google AI Studio', projectId: SEED_PROJECTS[1].id, agentId: SEED_AGENTS[0].id, status: 'done', priority: 'critical', acceptanceCriteria: 'UI Mockups Listos', notes: '', createdAt: Date.now() },
  { id: uuidv4(), title: 'Descargar código al repo', projectId: SEED_PROJECTS[1].id, status: 'todo', priority: 'high', acceptanceCriteria: 'Archivos en local', notes: '', createdAt: Date.now() },
  { id: uuidv4(), title: 'Conectar backend real Cloud Run', projectId: SEED_PROJECTS[1].id, status: 'blocked', priority: 'high', acceptanceCriteria: 'API Viva', notes: 'Esperando frontend', createdAt: Date.now() },
];

const SEED_EVENTS: SystemEvent[] = [
  { id: uuidv4(), type: 'idea.created', actor: 'User', payload: 'Idea creada HumanIA World', timestamp: Date.now() - 100000, severity: 'info' },
  { id: uuidv4(), type: 'project.created', actor: 'System', payload: 'Proyecto QuantumHive inicializado', timestamp: Date.now() - 50000, severity: 'info' },
];

const SEED_DECISIONS: Decision[] = [
  { id: uuidv4(), title: 'GCP Primary', decision: 'Usar GCP primero para Control Plane.', reason: 'Velocidad y ecosistema.', date: Date.now(), decidedBy: 'User' },
  { id: uuidv4(), title: 'Azure Delayed', decision: 'Integrar Azure después del backend mínimo.', reason: 'No bloquear MVP.', date: Date.now(), decidedBy: 'User' },
  { id: uuidv4(), title: 'HumanIA Scope', decision: 'HumanIA actual sirve como base de Chat, no Control Plane.', reason: 'Separación de responsabilidades.', date: Date.now(), decidedBy: 'User' },
];

const SEED_MODELS: ModelProvider[] = [
  { id: uuidv4(), name: 'Vertex AI', status: 'active', defaultModel: 'gemini-1.5-pro', estimatedUsage: '12k tokens', estimatedCostMock: '$0.05', lastRequest: Date.now(), notes: 'Proveedor principal' },
  { id: uuidv4(), name: 'Azure Foundry', status: 'prepared, off', defaultModel: 'gpt-4o', estimatedUsage: '0', estimatedCostMock: '$0.00', lastRequest: 0, notes: 'Proveedor de respaldo' },
];

const SEED_CLOUD: CloudResource[] = [
  { id: uuidv4(), provider: 'GCP', name: 'bubbly-stone-502214-u7', status: 'active', estimatedCost: '$0.00', notes: 'Proyecto' },
  { id: uuidv4(), provider: 'GCP', name: 'motor-avatares-video-test', status: 'active', estimatedCost: '$0.50', notes: 'Cloud Run' },
  { id: uuidv4(), provider: 'GCP', name: 'control-plane-db', status: 'planned', estimatedCost: '$0.00', notes: 'Firestore futuro' },
  { id: uuidv4(), provider: 'GCP', name: 'VM GPU', status: 'blocked', estimatedCost: '$0.00', notes: 'Bloqueada por cuota L4' },
];

const SEED_VIDEO_INBOX: VideoInboxItem[] = [
  { id: uuidv4(), sourceType: 'instagram_reel', title: 'Generador videos IA', description: 'Reel de Instagram sobre una herramienta IA para crear videos.', status: 'inbox', category: 'ai_tool', priority: 'medium', tags: ['video', 'generator'], createdAt: Date.now(), notes: '' },
  { id: uuidv4(), sourceType: 'youtube', title: 'Agentes Autónomos', description: 'YouTube tutorial sobre agentes autónomos.', status: 'inbox', category: 'tutorial', priority: 'high', tags: ['agents'], createdAt: Date.now(), notes: '' },
  { id: uuidv4(), sourceType: 'voice_note', title: 'Investigar Carta Viva', description: 'Investigar esta herramienta para Carta Viva', status: 'inbox', category: 'other', priority: 'high', tags: ['investigation'], createdAt: Date.now(), notes: '' },
];


const SEED_REPO_CONNECTIONS: RepoConnection[] = [
  { id: 'repo_1', name: 'quantum-hive', provider: 'github', repoUrl: 'https://github.com/org/quantum-hive', localPath: '', defaultBranch: 'main', activeBranch: 'main', status: 'simulado', graphifyStatus: 'imported', lastIndexedAt: Date.now(), notes: 'Core monorepo' }
];

const SEED_WORKER_DEFINITIONS: WorkerDefinition[] = [
  { id: 'worker_opencode', name: 'OpenCode Worker Local', type: 'opencode_worker', runtime: 'local', status: 'simulado', capabilities: ['read_repo', 'edit_code', 'run_cli', 'run_tests'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Worker local principal para desarrollo asistido.' },
  { id: 'worker_cloud_run', name: 'Cloud Run Worker', type: 'cloud_run_worker', runtime: 'cloud', status: 'futuro', capabilities: ['run_api_job', 'call_vertex', 'write_firestore', 'process_webhook'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Ejecutor backend serverless para produccion.' },
  { id: 'worker_local_desktop', name: 'Local Desktop Worker', type: 'local_desktop_worker', runtime: 'local', status: 'futuro', capabilities: ['use_browser', 'control_mouse', 'type_keyboard', 'read_screen'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'Control local de pantalla y sistema operativo con aprobacion por accion.' },
  { id: 'worker_browser', name: 'Browser Automation Worker', type: 'browser_worker', runtime: 'browser', status: 'simulado', capabilities: ['open_page', 'click', 'fill_form', 'extract_data'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Automatizacion web tipo Playwright.' },
  { id: 'worker_gpu', name: 'GPU VM / ComfyUI Worker', type: 'gpu_vm_worker', runtime: 'vm', status: 'bloqueado', capabilities: ['generate_image', 'generate_video', 'run_comfyui', 'render_avatar'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'Worker multimedia pesado bloqueado por cuota GPU.' },
  { id: 'worker_n8n', name: 'N8N Workflow Worker', type: 'n8n_worker', runtime: 'external', status: 'futuro', capabilities: ['execute_n8n_workflow', 'import_template', 'export_workflow'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Compatibilidad opcional con instancia N8N real.' },
  { id: 'worker_github_actions', name: 'GitHub Actions Worker', type: 'custom_worker', runtime: 'cloud', status: 'futuro', capabilities: ['run_ci', 'deploy_repo', 'build_artifact'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Ejecucion via pipelines CI/CD.' },
  { id: 'worker_supabase', name: 'Supabase Worker', type: 'custom_worker', runtime: 'cloud', status: 'futuro', capabilities: ['query_postgres', 'sync_tables', 'call_edge_function'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Operaciones controladas sobre proyectos Supabase.' },
  { id: 'worker_openclaw', name: 'OpenClaw Agent', type: 'openclaw_worker', runtime: 'local', status: 'disponible', capabilities: ['system_control', 'terminal_access'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'OpenClaw system worker' },
  { id: 'worker_openhands', name: 'OpenHands (OpenDevin)', type: 'openhands_worker', runtime: 'vm', status: 'disponible', capabilities: ['read_repo', 'edit_code', 'run_tests', 'browser_interaction'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Autonomous software engineering' },
  { id: 'worker_claudecode', name: 'Claude Code', type: 'claudecode_worker', runtime: 'local', status: 'disponible', capabilities: ['cli_assistant', 'edit_code', 'git_ops'], allowedProjects: [], requiresApproval: true, riskLevel: 'medium', notes: 'Anthropic terminal assistant' },
  { id: 'worker_antigravity', name: 'Antigravity (Google)', type: 'antigravity_worker', runtime: 'cloud', status: 'simulado', capabilities: ['full_stack_dev', 'deployment', 'tool_use'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Agentic AI coding assistant' },
];

const SEED_BRAIN_PROVIDERS: BrainProvider[] = [
  { id: 'brain_1', name: 'Vertex AI / Gemini', providerType: 'Google Vertex AI', status: 'simulado', availableModels: ['gemini-1.5-pro', 'gemini-1.5-flash'], defaultModel: 'gemini-1.5-pro', strengths: ['Contexto enorme', 'Reasoning'], bestFor: ['Análisis de repo completo', 'Code generation'], freeTier: false, estimatedCost: '$0.05 / request', rateLimits: 'Standard', whereSecretLives: 'secret_manager', notes: 'Cerebro principal' },
  { id: 'brain_2', name: 'Local Ollama', providerType: 'Local Runtime', status: 'futuro', availableModels: ['llama3', 'mistral'], defaultModel: 'llama3', strengths: ['Privacidad', 'Gratis'], bestFor: ['Tareas ligeras offline'], freeTier: true, estimatedCost: '$0', rateLimits: 'Hardware dependiente', whereSecretLives: 'none', notes: 'Backup local' }
];

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


const SEED_DATABASE_CONNECTIONS: DatabaseConnection[] = [
  { id: 'db_1', name: 'Firestore Control Plane', provider: 'Google Cloud', dbType: 'document', status: 'simulada', purpose: 'memoria, eventos, tareas, agentes', hostLabel: 'firestore.googleapis.com', databaseName: '(default)', schemaName: '', whereSecretLives: 'secret_manager', readOnly: false, allowedAgents: [], allowedWorkers: [], riskLevel: 'high', relatedProjectIds: [], notes: 'Base central del sistema' },
  { id: 'db_2', name: 'Supabase Carta Viva', provider: 'Supabase', dbType: 'relational', status: 'requiere_secret', purpose: 'restaurantes, clientes, eventos, pedidos', hostLabel: 'db.supabase.co', databaseName: 'postgres', schemaName: 'public', whereSecretLives: 'not_configured', readOnly: true, allowedAgents: [], allowedWorkers: [], riskLevel: 'critical', relatedProjectIds: [], notes: 'Mock DB externa productiva' },
  { id: 'db_3', name: 'Cloud SQL Postgres', provider: 'Google Cloud', dbType: 'relational', status: 'futuro', purpose: 'control plane serio futuro', hostLabel: '10.0.0.x', databaseName: 'quantumhive', schemaName: 'public', whereSecretLives: 'not_configured', readOnly: false, allowedAgents: [], allowedWorkers: [], riskLevel: 'high', relatedProjectIds: [], notes: 'Plan migración relacional' },
  { id: 'db_4', name: 'Vector DB', provider: 'Pinecone/Qdrant', dbType: 'vector', status: 'futuro', purpose: 'embeddings, memoria semántica, búsqueda', hostLabel: 'vector.svc', databaseName: 'knowledge', schemaName: '', whereSecretLives: 'not_configured', readOnly: false, allowedAgents: [], allowedWorkers: [], riskLevel: 'medium', relatedProjectIds: [], notes: 'RAG system core' },
  { id: 'db_5', name: 'SQLite local worker', provider: 'local', dbType: 'local', status: 'futuro', purpose: 'cache local, worker state', hostLabel: 'localhost', databaseName: 'local.db', schemaName: '', whereSecretLives: 'local_only', readOnly: false, allowedAgents: [], allowedWorkers: [], riskLevel: 'low', relatedProjectIds: [], notes: 'Offline capabilities' },
  { id: 'db_6', name: 'Google Sheets DB', provider: 'Google Workspace', dbType: 'spreadsheet', status: 'simulada', purpose: 'backlog/exportaciones', hostLabel: 'docs.google.com', databaseName: 'Sheet1', schemaName: '', whereSecretLives: 'not_configured', readOnly: false, allowedAgents: [], allowedWorkers: [], riskLevel: 'low', relatedProjectIds: [], notes: 'Simple DB via API' }
];

const SEED_AGENT_WORKER_BINDINGS: AgentWorkerBinding[] = [];
const SEED_AGENT_DB_BINDINGS: AgentDatabaseBinding[] = [];
const SEED_WORKER_DB_BINDINGS: WorkerDatabaseBinding[] = [];

const SEED_CONTEXTUAL_ASSISTANTS: ContextualAssistant[] = [
  { id: 'ca_1', name: 'Asistente Global de Inicio', sectionId: '/', macroArea: 'Centro de Comando', purpose: 'ayuda al usuario a decidir qué hacer primero y recomienda próxima acción', capabilities: ['sugiere_seccion', 'genera_resumen', 'onboarding'], suggestedActions: ['Resumen Diario', 'Ver Onboarding'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_2', name: 'Asistente de Captura', sectionId: '/ideas', macroArea: 'Captura', purpose: 'toma idea cruda, clasifica y recomienda prioridad', capabilities: ['clasifica', 'convierte_a_proyecto'], suggestedActions: ['Clasificar', 'Crear Proyecto'], safetyRules: ['crear_borradores'], status: 'simulado' },
  { id: 'ca_3', name: 'Asistente de Proyectos', sectionId: '/projects', macroArea: 'Proyectos', purpose: 'crea proyecto desde idea, define objetivo y riesgos', capabilities: ['crear_roadmaps', 'sugerir_tareas'], suggestedActions: ['Definir Hitos', 'Sugerir Tareas'], safetyRules: ['crear_estructuras'], status: 'simulado' },
  { id: 'ca_4', name: 'Asistente de Tareas', sectionId: '/tasks', macroArea: 'Ejecución', purpose: 'convierte objetivo en tareas claras y sugiere worker', capabilities: ['dividir_tareas', 'sugerir_agentes'], suggestedActions: ['Subdividir Tarea', 'Asignar Agente'], safetyRules: ['crear_tareas'], status: 'simulado' },
  { id: 'ca_5', name: 'Asistente Constructor de Agentes', sectionId: '/agent-builder', macroArea: 'Agentes', purpose: 'crea agentes desde lenguaje simple', capabilities: ['sugiere_rol', 'configura_prompt', 'asigna_worker'], suggestedActions: ['Generar Prompt', 'Asignar Worker Automático'], safetyRules: ['sugerir_configuracion'], status: 'simulado' },
  { id: 'ca_6', name: 'Asistente de Cerebros / LLM Router', sectionId: '/brain-registry', macroArea: 'Inteligencia', purpose: 'recomienda proveedor según tarea', capabilities: ['comparar_modelos', 'explicar_costos'], suggestedActions: ['Configurar Vertex', 'Usar Local'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_7', name: 'Asistente de Workers', sectionId: '/worker-registry', macroArea: 'Agentes', purpose: 'explica qué cuerpo necesita un agente', capabilities: ['explicar_cuerpos', 'sugerir_permisos'], suggestedActions: ['Asignar Cloud Run', 'Ver Riesgos'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_8', name: 'Asistente de Repos', sectionId: '/repo-connector', macroArea: 'Ejecución', purpose: 'guía para conectar repo GitHub/local', capabilities: ['crear_context_pack', 'indexar'], suggestedActions: ['Indexar Repo', 'Conectar Worker'], safetyRules: ['solo_lectura_repo'], status: 'simulado' },
  { id: 'ca_9', name: 'Asistente Graphify', sectionId: '/graph', macroArea: 'Conocimiento', purpose: 'ayuda a buscar nodos y recomienda qué nodo enviar a agente', capabilities: ['explorar_nodos', 'crear_tareas_desde_nodos'], suggestedActions: ['Buscar Módulos', 'Enviar a Agente'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_10', name: 'Asistente de Memoria', sectionId: '/memory', macroArea: 'Conocimiento', purpose: 'decide qué conviene guardar como memoria y resume', capabilities: ['resumir_contexto', 'detectar_criticos'], suggestedActions: ['Limpiar Duplicados', 'Crear Contexto Maestro'], safetyRules: ['borrado_manual'], status: 'simulado' },
  { id: 'ca_11', name: 'Asistente de Decisiones', sectionId: '/decisions', macroArea: 'Conocimiento', purpose: 'ayuda a registrar decisiones y pide alternativas', capabilities: ['registrar_decisiones', 'conectar_proyectos'], suggestedActions: ['Registrar Decisión', 'Ver Alternativas'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_12', name: 'Ingestador de Videos', sectionId: '/catalogo-herramientas', macroArea: 'Catálogo', purpose: 'analiza links multimedia, deduplica herramientas, aplica scoring y acomoda recursos en la taxonomia del catalogo', capabilities: ['catalogo_multimedia', 'analizar_video', 'dedupe_tools', 'score_tools', 'clasificar_taxonomia'], suggestedActions: ['Ingerir Link', 'Comparar Herramientas', 'Publicar en PWA'], safetyRules: ['no_guardar_secretos', 'validar_confianza'], status: 'simulado' },
  { id: 'ca_13', name: 'Asistente de Herramientas y Skills', sectionId: '/mcp-hub', macroArea: 'Workspace', purpose: 'recomienda herramientas para una necesidad', capabilities: ['recomendar_skills', 'vincular_proyectos'], suggestedActions: ['Buscar Tool', 'Vincular a Proyecto'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_14', name: 'Asesor de Skills', sectionId: '/skill-advisor', macroArea: 'Inteligencia', purpose: 'recomienda qué skills usar para cada tarea', capabilities: ['generar_orden', 'explicar_uso'], suggestedActions: ['Generar Prompts', 'Crear Workflow'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_15', name: 'Asistente de Prompts', sectionId: '/prompt-studio', macroArea: 'Inteligencia', purpose: 'convierte idea cruda en prompt maestro', capabilities: ['crear_loops', 'recomendar_skills'], suggestedActions: ['Mejorar Prompt', 'Crear Loop'], safetyRules: ['crear_prompts'], status: 'simulado' },
  { id: 'ca_16', name: 'Asistente Planificador Visual', sectionId: '/planner', macroArea: 'Ejecución', purpose: 'convierte idea en mapa visual', capabilities: ['crear_roadmap', 'convertir_nodos'], suggestedActions: ['Crear Mapa', 'Exportar a Tareas'], safetyRules: ['crear_nodos'], status: 'simulado' },
  { id: 'ca_17', name: 'Asistente de Workspace', sectionId: '/workspace', macroArea: 'Workspace', purpose: 'explica integraciones y recomienda usos', capabilities: ['convertir_emails', 'explicar_integracion'], suggestedActions: ['Probar Gmail', 'Probar Docs'], safetyRules: ['requiere_aprobacion_externa'], status: 'simulado' },
  { id: 'ca_18', name: 'Asistente de Bases de Datos', sectionId: '/databases', macroArea: 'Workspace', purpose: 'recomienda DB según caso de uso', capabilities: ['explicar_dbs', 'definir_permisos'], suggestedActions: ['Recomendar DB', 'Configurar Permisos'], safetyRules: ['requiere_aprobacion_externa'], status: 'simulado' },
  { id: 'ca_19', name: 'Asistente de Canales', sectionId: '/channels', macroArea: 'Agentes', purpose: 'recomienda canales de comunicación', capabilities: ['explicar_canales', 'definir_scope'], suggestedActions: ['Configurar Telegram', 'Definir Inbound'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_20', name: 'Asistente de Aprobaciones', sectionId: '/approvals', macroArea: 'Centro de Comando', purpose: 'explica riesgos y recomienda aprobaciones', capabilities: ['revisar_acciones', 'mostrar_impacto'], suggestedActions: ['Aprobar Todo', 'Rechazar Riesgos'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_21', name: 'Asistente de Desarrollo', sectionId: '/dev-env', macroArea: 'Desarrollo', purpose: 'arma entorno ideal por proyecto', capabilities: ['sugerir_herramientas', 'crear_setup'], suggestedActions: ['Armar Entorno', 'Sugerir Plugins'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_22', name: 'Asistente de Deploy', sectionId: '/cloud', macroArea: 'Desarrollo', purpose: 'crea checklist de deploy', capabilities: ['revisar_variables', 'registrar_bloqueos'], suggestedActions: ['Checklist Deploy', 'Revisar Secrets'], safetyRules: ['requiere_aprobacion_deploy'], status: 'simulado' },
  { id: 'ca_23', name: 'Asistente Live', sectionId: '/voice', macroArea: 'Captura', purpose: 'permite operar por voz y comandos', capabilities: ['interpretar_voz', 'mandar_contexto'], suggestedActions: ['Crear Tarea por Voz', 'Dictar Memoria'], safetyRules: ['crear_borradores'], status: 'simulado' },
  { id: 'ca_24', name: 'Asistente Pantalla en Vivo', sectionId: '/live-assistant', macroArea: 'Agentes', purpose: 'guía screen share y analiza', capabilities: ['analizar_pantalla', 'proponer_acciones'], suggestedActions: ['Capturar Pantalla', 'Analizar Actividad'], safetyRules: ['requiere_aprobacion_cli'], status: 'simulado' },
  { id: 'ca_25', name: 'Asistente de Auditoría', sectionId: '/audit', macroArea: 'Centro de Comando', purpose: 'explica logs de auditoría', capabilities: ['filtrar_logs', 'explicar_eventos'], suggestedActions: ['Resumir Logs', 'Detectar Anomalías'], safetyRules: ['solo_lectura'], status: 'simulado' },
  { id: 'ca_26', name: 'Asistente de Modelos', sectionId: '/models', macroArea: 'Inteligencia', purpose: 'guía sobre modelos disponibles', capabilities: ['comparar', 'testear'], suggestedActions: ['Probar Modelo', 'Comparar Costos'], safetyRules: ['solo_lectura'], status: 'simulado' },
];

const initialState = {
  contextualAssistants: SEED_CONTEXTUAL_ASSISTANTS,
  assistantSessions: [],
  assistantProposedActions: [],
  ideas: SEED_IDEAS,
  projects: SEED_PROJECTS,
  agents: SEED_AGENTS,
  chatMessages: [],
  memories: SEED_MEMORIES,
  tasks: SEED_TASKS,
  events: SEED_EVENTS,
  modelProviders: SEED_MODELS,
  cloudResources: SEED_CLOUD,
  decisions: SEED_DECISIONS,
  videoInboxItems: SEED_VIDEO_INBOX,
  toolSkills: [],
  voiceSessions: [],
  auditLogs: [],
  approvals: [],
  connections: [],
  communicationChannels: SEED_CHANNELS,
  agentChannelBindings: [],
  agentWorkerBindings: SEED_AGENT_WORKER_BINDINGS,
  agentDatabaseBindings: SEED_AGENT_DB_BINDINGS,
  workerDatabaseBindings: SEED_WORKER_DB_BINDINGS,
  agentActions: [],
  skillDefinitions: SEED_SKILL_DEFINITIONS,
  skillRecommendations: SEED_SKILL_RECOMMENDATIONS,
  skillSources: SEED_SKILL_SOURCES,
  workflowTemplates: SEED_WORKFLOW_TEMPLATES,
  knowledgeGraphNodes: SEED_GRAPH_NODES,
  knowledgeGraphEdges: SEED_GRAPH_EDGES,
  graphQueries: SEED_GRAPH_QUERIES,
  userMode: 'beginner' as UserMode,
  pinnedRoutes: ['/chat', '/brief', '/ideas', '/tasks'],
  visualNodeBoards: SEED_VISUAL_BOARDS,
  visualNodes: SEED_VISUAL_NODES,
  visualEdges: SEED_VISUAL_EDGES,
  promptProjects: SEED_PROMPT_PROJECTS,
  promptPackItems: SEED_PROMPT_PACK_ITEMS,
  promptLoops: SEED_PROMPT_LOOPS,
  repoConnections: SEED_REPO_CONNECTIONS,
  workerDefinitions: SEED_WORKER_DEFINITIONS,
  workOrders: [],
  brainProviders: SEED_BRAIN_PROVIDERS,
  llmModels: [],
  mcpServerDefinitions: SEED_MCP_SERVERS,
  apiConnectorDefinitions: [],
  cliToolDefinitions: [],
  databaseConnections: SEED_DATABASE_CONNECTIONS,
  workflowDefinitions: [createStarterAgentWorkflow(DOMINUS_PRIME_AGENT_ID, 'Dominus Prime')],
  workflowRuns: [],
  onboardingCompleted: false,
  completedTours: [],
  learningModeEnabled: false,
  dismissedTips: [],
  workspaceIntegrations: {},
  syncedEmails: [],
  syncedEvents: [],
  syncedFiles: [],
  syncedWorkspaceTasks: [],
  syncedNotes: [],
  syncedMeetings: [],
  syncedContacts: [],
  syncedChatMessages: [],
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      fetchIdeas: async () => {
        try {
          const { data, error } = await supabase.from('ideas').select('*');
          if (data && !error) {
            const mappedIdeas: Idea[] = data.map(db => ({
              id: db.id || uuidv4(),
              title: db.title || 'Sin Título',
              description: db.description || '',
              macroDivision: (db.macro_division || 'General') as MacroDivision,
              type: (db.type || 'MVP') as any,
              priority: (db.priority || 'parking lot') as any,
              status: (db.status || 'inbox') as any,
              dependencies: db.dependencies || '',
              notes: db.notes || '',
              createdAt: db.created_at ? new Date(db.created_at).getTime() : Date.now()
            }));
            set({ ideas: mappedIdeas });
          }
        } catch (err) {
          console.error("Error fetching ideas", err);
        }
      },
      addIdea: async (idea) => {
        const newId = uuidv4();
        const { error } = await supabase.from('ideas').insert([{
          id: newId,
          title: idea.title,
          description: idea.description,
          macro_division: idea.macroDivision,
          type: idea.type,
          priority: idea.priority,
          status: idea.status,
          dependencies: idea.dependencies,
          notes: idea.notes
        }]);
        if (!error) {
          set((state) => ({
            ideas: [{ ...idea, id: newId, createdAt: Date.now() }, ...state.ideas]
          }));
        }
      },
      updateIdea: async (id, updates) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.macroDivision !== undefined) dbUpdates.macro_division = updates.macroDivision;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('ideas').update(dbUpdates).eq('id', id);
        if (!error) {
          set((state) => ({
            ideas: state.ideas.map(i => i.id === id ? { ...i, ...updates } : i)
          }));
        }
      },
      deleteIdea: async (id) => {
        const { error } = await supabase.from('ideas').delete().eq('id', id);
        if (!error) {
          set((state) => ({
            ideas: state.ideas.filter(i => i.id !== id)
          }));
        }
      },

      fetchProjects: async () => {
        try {
          const { data, error } = await supabase.from('projects').select('*');
          if (data && !error) {
            const mappedProjects: Project[] = data.map(db => ({
              id: db.id || uuidv4(),
              name: db.name || 'Proyecto Sin Nombre',
              macroDivision: (db.macro_division || 'General') as MacroDivision,
              status: (db.status || 'planned') as ProjectStatus,
              repo: db.repo || '',
              ceoAgentId: db.ceo_agent_id || '',
              goal: db.goal || '',
              nextAction: db.next_action || '',
              risks: db.risks || '',
              lastUpdate: db.last_update ? new Date(db.last_update).getTime() : (db.updated_at ? new Date(db.updated_at).getTime() : Date.now())
            }));
            set({ projects: mappedProjects });
          }
        } catch (err) {
          console.error("Error fetching projects", err);
        }
      },
      addProject: async (project) => {
        const newId = uuidv4();
        const { error } = await supabase.from('projects').insert([{
          id: newId,
          name: project.name,
          macro_division: project.macroDivision,
          status: project.status,
          repo: project.repo,
          ceo_agent_id: project.ceoAgentId || null,
          goal: project.goal,
          next_action: project.nextAction,
          risks: project.risks
        }]);
        if (!error) {
          set((state) => ({
            projects: [{ ...project, id: newId, lastUpdate: Date.now() }, ...state.projects]
          }));
        }
      },
      updateProject: async (id, updates) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.macroDivision !== undefined) dbUpdates.macro_division = updates.macroDivision;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.repo !== undefined) dbUpdates.repo = updates.repo;
        if (updates.ceoAgentId !== undefined) dbUpdates.ceo_agent_id = updates.ceoAgentId || null;
        if (updates.goal !== undefined) dbUpdates.goal = updates.goal;
        if (updates.nextAction !== undefined) dbUpdates.next_action = updates.nextAction;
        if (updates.risks !== undefined) dbUpdates.risks = updates.risks;
        dbUpdates.last_update = new Date().toISOString();

        const { error } = await supabase.from('projects').update(dbUpdates).eq('id', id);
        if (!error) {
          set((state) => ({
            projects: state.projects.map(p => p.id === id ? { ...p, ...updates, lastUpdate: Date.now() } : p)
          }));
        }
      },

      fetchAgents: async () => {
        try {
          const { data, error } = await supabase.from('agents').select('*');
          if (data && !error) {
            const mappedAgents: Agent[] = data.map(dbAgent => ({
              id: dbAgent.id || uuidv4(),
              name: dbAgent.name || 'Agente Sin Nombre',
              role: dbAgent.role || 'Asistente',
              macroDivision: (dbAgent.macro_division || 'General') as MacroDivision,
              status: (dbAgent.status || 'active') as AgentStatus,
              preferredModel: (dbAgent.preferred_model || 'vertex') as PreferredModel,
              brainProviderId: dbAgent.brain_provider_id || undefined,
              defaultModelId: dbAgent.default_model_id || undefined,
              workerIds: dbAgent.worker_ids || undefined,
              repoConnectionIds: dbAgent.repo_connection_ids || undefined,
              memoryScope: dbAgent.memory_scope || undefined,
              skillIds: dbAgent.skill_ids || undefined,
              mcpServerIds: dbAgent.mcp_server_ids || undefined,
              communicationChannelIds: dbAgent.communication_channel_ids || undefined,
              permissions: dbAgent.permissions || undefined,
              costLimitDaily: dbAgent.cost_limit_daily || undefined,
              approvalPolicy: dbAgent.provider_policy || undefined,
            }));
            set({ agents: ensureCoreAgents(mappedAgents) });
          }
        } catch (err) {
          console.error("Error fetching agents", err);
        }
      },

      addAgent: async (agent) => {
        const newId = uuidv4();
        const { error } = await supabase.from('agents').insert([{
          id: newId,
          name: agent.name,
          role: agent.role,
          macro_division: agent.macroDivision,
          status: agent.status,
          preferred_model: agent.preferredModel,
          brain_provider_id: agent.brainProviderId,
          default_model_id: agent.defaultModelId,
          worker_ids: agent.workerIds,
          repo_connection_ids: agent.repoConnectionIds,
          memory_scope: agent.memoryScope,
          skill_ids: agent.skillIds,
          mcp_server_ids: agent.mcpServerIds,
          communication_channel_ids: agent.communicationChannelIds,
          permissions: agent.permissions,
          cost_limit_daily: agent.costLimitDaily,
          provider_policy: agent.approvalPolicy
        }]);
        if (!error) {
          set((state) => ({
            agents: [{ ...agent, id: newId }, ...state.agents]
          }));
        } else {
          console.error("Error creating agent in Supabase", error);
        }
      },

      updateAgent: async (id, updates) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.macroDivision !== undefined) dbUpdates.macro_division = updates.macroDivision;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.preferredModel !== undefined) dbUpdates.preferred_model = updates.preferredModel;
        if (updates.brainProviderId !== undefined) dbUpdates.brain_provider_id = updates.brainProviderId;
        if (updates.defaultModelId !== undefined) dbUpdates.default_model_id = updates.defaultModelId;
        if (updates.workerIds !== undefined) dbUpdates.worker_ids = updates.workerIds;
        if (updates.repoConnectionIds !== undefined) dbUpdates.repo_connection_ids = updates.repoConnectionIds;
        if (updates.memoryScope !== undefined) dbUpdates.memory_scope = updates.memoryScope;
        if (updates.skillIds !== undefined) dbUpdates.skill_ids = updates.skillIds;
        if (updates.mcpServerIds !== undefined) dbUpdates.mcp_server_ids = updates.mcpServerIds;
        if (updates.communicationChannelIds !== undefined) dbUpdates.communication_channel_ids = updates.communicationChannelIds;
        if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
        if (updates.costLimitDaily !== undefined) dbUpdates.cost_limit_daily = updates.costLimitDaily;
        if (updates.approvalPolicy !== undefined) dbUpdates.provider_policy = updates.approvalPolicy;

        const { error } = await supabase.from('agents').update(dbUpdates).eq('id', id);
        
        if (!error) {
          set((state) => ({
            agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
          }));
        } else {
          console.error("Error updating agent in Supabase", error);
        }
      },

      addChatMessage: (msg) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...msg, id: uuidv4(), timestamp: Date.now() }]
      })),

      fetchMemories: async () => {
        try {
          const { data, error } = await supabase.from('memories').select('*');
          if (data && !error) {
            const mappedMemories: Memory[] = data.map(db => ({
              id: db.id || uuidv4(),
              title: db.title || '',
              content: db.content || '',
              projectId: db.project_id || undefined,
              agentId: db.agent_id || undefined,
              tags: db.tags || [],
              date: db.created_at ? new Date(db.created_at).getTime() : Date.now(),
              type: (db.type || 'Contexto') as any,
              importance: (db.importance || 'baja') as any
            }));
            set({ memories: mappedMemories });
          }
        } catch (err) {
          console.error("Error fetching memories", err);
        }
      },
      addMemory: async (memory) => {
        const newId = uuidv4();
        const { error } = await supabase.from('memories').insert([{
          id: newId,
          title: memory.title,
          content: memory.content,
          project_id: memory.projectId || null,
          agent_id: memory.agentId || null,
          tags: memory.tags,
          type: memory.type,
          importance: memory.importance,
          scope: memory.projectId ? 'project' : (memory.agentId ? 'agent' : 'global')
        }]);
        if (!error) {
          set((state) => ({
            memories: [{ ...memory, id: newId, date: Date.now() }, ...state.memories]
          }));
        }
      },
      updateMemory: async (id, updates) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
        if (updates.agentId !== undefined) dbUpdates.agent_id = updates.agentId || null;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.importance !== undefined) dbUpdates.importance = updates.importance;

        const { error } = await supabase.from('memories').update(dbUpdates).eq('id', id);
        if (!error) {
          set((state) => ({
            memories: state.memories.map(m => m.id === id ? { ...m, ...updates } : m)
          }));
        }
      },

      fetchTasks: async () => {
        try {
          const { data, error } = await supabase.from('tasks').select('*');
          if (data && !error) {
            const mappedTasks: Task[] = data.map(db => ({
              id: db.id || uuidv4(),
              title: db.title || 'Tarea Sin Nombre',
              projectId: db.project_id || undefined,
              agentId: db.assignee_agent_id || undefined,
              status: (db.status || 'todo') as any,
              priority: (db.priority || 'medium') as any,
              deadline: db.deadline ? new Date(db.deadline).getTime() : undefined,
              acceptanceCriteria: db.acceptance_criteria || '',
              notes: db.notes || '',
              createdAt: db.created_at ? new Date(db.created_at).getTime() : Date.now()
            }));
            set({ tasks: mappedTasks });
          }
        } catch (err) {
          console.error("Error fetching tasks", err);
        }
      },
      addTask: async (task) => {
        const newId = uuidv4();
        const { error } = await supabase.from('tasks').insert([{
          id: newId,
          title: task.title,
          project_id: task.projectId || null,
          assignee_agent_id: task.agentId || null,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
          acceptance_criteria: task.acceptanceCriteria,
          notes: task.notes
        }]);
        if (!error) {
          set((state) => ({
            tasks: [{ ...task, id: newId, createdAt: Date.now() }, ...state.tasks]
          }));
        }
      },
      updateTask: async (id, updates) => {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
        if (updates.agentId !== undefined) dbUpdates.assignee_agent_id = updates.agentId || null;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline ? new Date(updates.deadline).toISOString() : null;
        if (updates.acceptanceCriteria !== undefined) dbUpdates.acceptance_criteria = updates.acceptanceCriteria;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
        if (!error) {
          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
          }));
        }
      },

      addEvent: (event) => set((state) => ({
        events: [{ ...event, id: uuidv4(), timestamp: Date.now() }, ...state.events]
      })),

      addVideoItem: (item) => set((state) => ({
        videoInboxItems: [{ ...item, id: (item as any).id || uuidv4(), createdAt: Date.now() }, ...state.videoInboxItems]
      })),
      updateVideoItem: (id, updates) => set((state) => ({
        videoInboxItems: state.videoInboxItems.map(v => v.id === id ? { ...v, ...updates } : v)
      })),

      addToolSkill: (tool) => set((state) => ({
        toolSkills: [{ ...tool, id: uuidv4(), date: Date.now() }, ...state.toolSkills]
      })),

      addAuditLog: (log) => set((state) => ({
        auditLogs: [{ ...log, id: uuidv4(), timestamp: Date.now() }, ...state.auditLogs]
      })),
      addApproval: (approval) => set((state) => ({
        approvals: [{ ...approval, id: uuidv4(), timestamp: Date.now() }, ...state.approvals]
      })),
      updateApproval: (id, updates) => set((state) => ({
        approvals: state.approvals.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      addCommunicationChannel: (channel) => set((state) => ({ communicationChannels: [...state.communicationChannels, { ...channel, id: uuidv4() }] })),
      updateCommunicationChannel: (id, updates) => set((state) => ({ communicationChannels: state.communicationChannels.map(c => c.id === id ? { ...c, ...updates } : c) })),
      addAgentChannelBinding: (binding) => set((state) => ({ agentChannelBindings: [...state.agentChannelBindings, { ...binding, id: uuidv4(), createdAt: Date.now() }] })),
      updateAgentChannelBinding: (id, updates) => set((state) => ({ agentChannelBindings: state.agentChannelBindings.map(b => b.id === id ? { ...b, ...updates } : b) })),
      addAgentAction: (action) => set((state) => ({
        agentActions: [{ ...action, id: uuidv4(), createdAt: Date.now() }, ...state.agentActions]
      })),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      completeTour: (tourId) => set((state) => ({ completedTours: [...new Set([...state.completedTours, tourId])] })),
      setLearningMode: (enabled) => set({ learningModeEnabled: enabled }),
      dismissTip: (tipId) => set((state) => ({ dismissedTips: [...new Set([...state.dismissedTips, tipId])] })),
      resetTutorials: () => set({ onboardingCompleted: false, completedTours: [], dismissedTips: [] }),
      
      updateAgentAction: (id, updates) => set((state) => ({
        agentActions: state.agentActions.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
  addSkillDefinition: (skill) => set((state) => ({ skillDefinitions: [...state.skillDefinitions, { ...skill, id: uuidv4() }] })),
  updateSkillDefinition: (id, updates) => set((state) => ({ skillDefinitions: state.skillDefinitions.map(s => s.id === id ? { ...s, ...updates } : s) })),
  addSkillRecommendation: (rec) => set((state) => ({ skillRecommendations: [...state.skillRecommendations, { ...rec, id: uuidv4(), createdAt: Date.now() }] })),
  updateSkillRecommendation: (id, updates) => set((state) => ({ skillRecommendations: state.skillRecommendations.map(s => s.id === id ? { ...s, ...updates } : s) })),
  addSkillSource: (source) => set((state) => ({ skillSources: [...state.skillSources, { ...source, id: uuidv4() }] })),
  updateSkillSource: (id, updates) => set((state) => ({ skillSources: state.skillSources.map(s => s.id === id ? { ...s, ...updates } : s) })),
  addKnowledgeGraphNode: (node) => set((state) => ({ knowledgeGraphNodes: [...state.knowledgeGraphNodes, { ...node, id: uuidv4() }] })),
  addGraphQuery: (query) => set((state) => ({ graphQueries: [{ ...query, id: uuidv4(), createdAt: Date.now() }, ...state.graphQueries] })),
  setUserMode: (mode) => set({ userMode: mode }),
  togglePinnedRoute: (route) => set((state) => {
    const currentPinned = state.pinnedRoutes || [];
    return {
      pinnedRoutes: currentPinned.includes(route)
        ? currentPinned.filter(r => r !== route)
        : [...currentPinned, route]
    };
  }),
  addVisualNodeBoard: (board) => set((state) => ({ visualNodeBoards: [...state.visualNodeBoards, { ...board, id: uuidv4(), createdAt: Date.now(), updatedAt: Date.now() }] })),
  updateVisualNodeBoard: (id, updates) => set((state) => ({ visualNodeBoards: state.visualNodeBoards.map(b => b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b) })),
  addVisualNode: (node) => set((state) => ({ visualNodes: [...state.visualNodes, { ...node, id: uuidv4() }] })),
  updateVisualNode: (id, updates) => set((state) => ({ visualNodes: state.visualNodes.map(n => n.id === id ? { ...n, ...updates } : n) })),
  addVisualEdge: (edge) => set((state) => ({ visualEdges: [...state.visualEdges, { ...edge, id: uuidv4() }] })),
  updateVisualEdge: (id, updates) => set((state) => ({ visualEdges: state.visualEdges.map(e => e.id === id ? { ...e, ...updates } : e) })),
  addPromptProject: (project) => set((state) => ({ promptProjects: [...state.promptProjects, { ...project, id: uuidv4(), createdAt: Date.now(), updatedAt: Date.now() }] })),
  updatePromptProject: (id, updates) => set((state) => ({ promptProjects: state.promptProjects.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p) })),
  addPromptPackItem: (item) => set((state) => ({ promptPackItems: [...state.promptPackItems, { ...item, id: uuidv4() }] })),
  updatePromptPackItem: (id, updates) => set((state) => ({ promptPackItems: state.promptPackItems.map(p => p.id === id ? { ...p, ...updates } : p) })),
  addPromptLoop: (loop) => set((state) => ({ promptLoops: [...state.promptLoops, { ...loop, id: uuidv4(), createdAt: Date.now() }] })),
  updatePromptLoop: (id, updates) => set((state) => ({ promptLoops: state.promptLoops.map(l => l.id === id ? { ...l, ...updates } : l) })),
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


      resetData: () => set(initialState),
    }),
    {
      name: 'quantum-hive-storage-v3',
      version: 3,
    }
  )
);
