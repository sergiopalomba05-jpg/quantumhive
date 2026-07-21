import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseConnection,
  RepoConnection,
  AgentWorkerBinding,
  AgentDatabaseBinding,
  WorkerDatabaseBinding, WorkerDefinition, WorkOrder, BrainProvider, LLMModel, MCPServerDefinition, ApiConnectorDefinition, CliToolDefinition, Idea, Project, Agent, ChatMessage, Memory, Task, SystemEvent,
  ModelProvider, CloudResource, Decision, VideoInboxItem, ToolSkill, VoiceSession,
  AuditLog, ApprovalRequest, Connection, AgentActionRequest, SkillDefinition, SkillRecommendation, SkillSource, WorkflowTemplate, KnowledgeGraphNode, KnowledgeGraphEdge, GraphQuery, VisualNodeBoard, VisualNode, VisualEdge, PromptProject, PromptPackItem, PromptLoop, CommunicationChannel, AgentChannelBinding
} from '../types';

export type UserMode = 'beginner' | 'power' | 'developer';

interface AppState {
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
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt'>) => void;
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


  updateIdea: (id: string, idea: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;

  addProject: (project: Omit<Project, 'id' | 'lastUpdate'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;

  addAgent: (agent: Omit<Agent, 'id'>) => void;
  
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  
  addMemory: (memory: Omit<Memory, 'id' | 'date'>) => void;
  updateMemory: (id: string, memory: Partial<Memory>) => void;

  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;

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

const SEED_AGENTS: Agent[] = [
  { id: uuidv4(), name: 'Asistente Global', role: 'Orquestador personal central', macroDivision: 'General', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Carta Viva', role: 'Responsable MVP comercial Carta Viva', macroDivision: 'Carta Viva', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO HumanIA', role: 'Responsable HumanIA Chat, World y agentes', macroDivision: 'HumanIA', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Infraestructura', role: 'Responsable Cloud Run, Firestore, Vertex, Azure', macroDivision: 'Infraestructura', status: 'active', preferredModel: 'vertex' },
  { id: uuidv4(), name: 'CEO Avatar Engine', role: 'Responsable videos, avatares y assets', macroDivision: 'Carta Viva', status: 'active', preferredModel: 'local' },
  { id: uuidv4(), name: 'CEO Trading', role: 'Placeholder futuro trading', macroDivision: 'Trading', status: 'paused', preferredModel: 'manual' },
];

const SEED_PROJECTS: Project[] = [
  { id: uuidv4(), name: 'Carta Viva MVP', macroDivision: 'Carta Viva', status: 'active', repo: 'carta-viva-ui', ceoAgentId: SEED_AGENTS[1].id, goal: 'Lanzar MVP con avatar cacheado manual', nextAction: 'Hacer videos de Sol manualmente', risks: 'Costos altos si usamos GPU sin validar', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'QuantumHive Control Plane', macroDivision: 'Infraestructura', status: 'active', repo: 'quantum-hive', ceoAgentId: SEED_AGENTS[0].id, goal: 'Panel central de control personal', nextAction: 'Diseñar frontend AI Studio', risks: 'Perderse en features, mantener MVP', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'HumanIA Chat', macroDivision: 'HumanIA', status: 'planned', repo: 'humania-core', ceoAgentId: SEED_AGENTS[2].id, goal: 'Chat base para interactuar con NPCs', nextAction: 'Definir DB schema', risks: 'Ninguno', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'HumanIA World', macroDivision: 'HumanIA', status: 'planned', repo: 'humania-world', ceoAgentId: SEED_AGENTS[2].id, goal: 'Mundo inmersivo', nextAction: 'Visión futura', risks: 'Scope creep', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'Avatar Cache Engine', macroDivision: 'Carta Viva', status: 'active', repo: 'avatar-engine', ceoAgentId: SEED_AGENTS[4].id, goal: 'Motor para servir video cacheado', nextAction: 'Integrar en MVP', risks: 'Latencia de video', lastUpdate: Date.now() },
  { id: uuidv4(), name: 'Azure Provider Integration', macroDivision: 'Infraestructura', status: 'blocked', repo: 'provider-router', ceoAgentId: SEED_AGENTS[3].id, goal: 'Tener fallback a Azure OpenAI', nextAction: 'Esperar backend', risks: 'Bloqueado por backend', lastUpdate: Date.now() },
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
  { id: 'worker_1', name: 'OpenCode Worker Local', type: 'opencode_worker', runtime: 'local', status: 'simulado', capabilities: ['read_repo', 'edit_code', 'run_cli'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Simula el entorno de ejecución' },
  { id: 'worker_2', name: 'Live Desktop Control', type: 'local_desktop_worker', runtime: 'local', status: 'futuro', capabilities: ['use_browser', 'control_mouse', 'type_keyboard'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'Futuro worker para automatización' },
  { id: 'worker_3', name: 'OpenClaw Agent', type: 'openclaw_worker', runtime: 'local', status: 'disponible', capabilities: ['system_control', 'terminal_access'], allowedProjects: [], requiresApproval: true, riskLevel: 'critical', notes: 'OpenClaw system worker' },
  { id: 'worker_4', name: 'Hermes / Nous', type: 'hermes_worker', runtime: 'cloud', status: 'simulado', capabilities: ['data_processing', 'fast_execution'], allowedProjects: [], requiresApproval: false, riskLevel: 'low', notes: 'Fast processing agent' },
  { id: 'worker_5', name: 'OpenHands (OpenDevin)', type: 'openhands_worker', runtime: 'vm', status: 'disponible', capabilities: ['read_repo', 'edit_code', 'run_tests', 'browser_interaction'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Autonomous software engineering' },
  { id: 'worker_6', name: 'Claude Code', type: 'claudecode_worker', runtime: 'local', status: 'disponible', capabilities: ['cli_assistant', 'edit_code', 'git_ops'], allowedProjects: [], requiresApproval: true, riskLevel: 'medium', notes: 'Anthropic terminal assistant' },
  { id: 'worker_7', name: 'Codex Legacy', type: 'codex_worker', runtime: 'cloud', status: 'desconectado', capabilities: ['code_completion', 'refactoring'], allowedProjects: [], requiresApproval: false, riskLevel: 'medium', notes: 'Legacy code worker' },
  { id: 'worker_8', name: 'Antigravity (Google)', type: 'antigravity_worker', runtime: 'cloud', status: 'simulado', capabilities: ['full_stack_dev', 'deployment', 'tool_use'], allowedProjects: [], requiresApproval: true, riskLevel: 'high', notes: 'Agentic AI coding assistant' },
  { id: 'worker_9', name: 'N8N Pipeline Worker', type: 'n8n_worker', runtime: 'external', status: 'simulado', capabilities: ['workflow_automation', 'api_integration'], allowedProjects: [], requiresApproval: false, riskLevel: 'medium', notes: 'Automation pipeline executor' }
];

const SEED_BRAIN_PROVIDERS: BrainProvider[] = [
  { id: 'brain_1', name: 'Vertex AI / Gemini', providerType: 'Google Vertex AI', status: 'simulado', availableModels: ['gemini-1.5-pro', 'gemini-1.5-flash'], defaultModel: 'gemini-1.5-pro', strengths: ['Contexto enorme', 'Reasoning'], bestFor: ['Análisis de repo completo', 'Code generation'], freeTier: false, estimatedCost: '$0.05 / request', rateLimits: 'Standard', whereSecretLives: 'secret_manager', notes: 'Cerebro principal' },
  { id: 'brain_2', name: 'Local Ollama', providerType: 'Local Runtime', status: 'futuro', availableModels: ['llama3', 'mistral'], defaultModel: 'llama3', strengths: ['Privacidad', 'Gratis'], bestFor: ['Tareas ligeras offline'], freeTier: true, estimatedCost: '$0', rateLimits: 'Hardware dependiente', whereSecretLives: 'none', notes: 'Backup local' }
];

const SEED_MCP_SERVERS: MCPServerDefinition[] = [
  { id: 'mcp_1', name: 'Local FS', command: 'npx mcp-local-fs', status: 'simulado', capabilities: ['read_files', 'write_files'], requiredSecrets: [], linkedAgents: [], linkedWorkers: [], notes: 'Acceso a sistema de archivos' }
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
const initialState = {
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
      
      addIdea: (idea) => set((state) => {
        const newIdea = { ...idea, id: uuidv4(), createdAt: Date.now() };
        return { ideas: [newIdea, ...state.ideas] };
      }),
      updateIdea: (id, updates) => set((state) => ({
        ideas: state.ideas.map(i => i.id === id ? { ...i, ...updates } : i)
      })),
      deleteIdea: (id) => set((state) => ({
        ideas: state.ideas.filter(i => i.id !== id)
      })),

      addProject: (project) => set((state) => ({
        projects: [{ ...project, id: uuidv4(), lastUpdate: Date.now() }, ...state.projects]
      })),
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates, lastUpdate: Date.now() } : p)
      })),

      addAgent: (agent) => set((state) => ({
        agents: [{ ...agent, id: uuidv4() }, ...state.agents]
      })),

      addChatMessage: (msg) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...msg, id: uuidv4(), timestamp: Date.now() }]
      })),

      addMemory: (memory) => set((state) => ({
        memories: [{ ...memory, id: uuidv4(), date: Date.now() }, ...state.memories]
      })),
      updateMemory: (id, updates) => set((state) => ({
        memories: state.memories.map(m => m.id === id ? { ...m, ...updates } : m)
      })),

      addTask: (task) => set((state) => ({
        tasks: [{ ...task, id: uuidv4(), createdAt: Date.now() }, ...state.tasks]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

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
  togglePinnedRoute: (route) => set((state) => ({
    pinnedRoutes: state.pinnedRoutes.includes(route)
      ? state.pinnedRoutes.filter(r => r !== route)
      : [...state.pinnedRoutes, route]
  })),
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


      resetData: () => set(initialState),
    }),
    {
      name: 'quantum-hive-storage',
    }
  )
);
