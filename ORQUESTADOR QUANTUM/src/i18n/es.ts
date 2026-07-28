export const es = {
  // Navigation & Macro Areas
  'A. Command Center': 'A. Centro de Comando',
  'Dashboard': 'Panel',
  'Start Here': 'Empezar Acá',
  'Daily Brief': 'Resumen Diario',
  'Approval Queue': 'Cola de Aprobación',
  'Activity': 'Actividad / Notificaciones',
  'Command Palette': 'Paleta de Comandos',
  'Unified Search': 'Búsqueda Global',

  'B. Capture & Inbox': 'B. Captura e Inbox',
  'Ideas': 'Inbox de Ideas',
  'Video Inbox': 'Bandeja de Videos Inteligente',
  'Video Intelligence Inbox': 'Bandeja de Videos Inteligente',
  'Voice Notes': 'Notas de Voz',
  'Quick Capture': 'Captura Rápida',

  'C. Projects & Execution': 'C. Proyectos y Ejecución',
  'Projects': 'Proyectos',
  'Tasks': 'Tareas',
  'Visual Planner': 'Planificador Visual de Nodos',
  'Visual Node Planner': 'Planificador Visual de Nodos',
  'Workflow Map': 'Mapa de Workflows',
  'Pipeline Map': 'Mapa de Pipelines',
  'Roadmap Builder': 'Constructor de Roadmaps',
  'Action Requests': 'Solicitudes de Acción',

  'D. Agents & Chat': 'D. Agentes y Chat',
  'Chat Central': 'Chat Central',
  'Agents': 'Agentes',
  'Agent Registry': 'Registro de Agentes',
  'Live Assistant': 'Asistente de Pantalla en Vivo',
  'Live Command Center': 'Centro de Comando en Vivo',
  'Live Screen Assistant': 'Asistente de Pantalla en Vivo',
  'Agent Worklog': 'Registro de Trabajo del Agente',
  'Comms Channels': 'Canales de Comunicación',

  'E. Knowledge & Memory': 'E. Conocimiento y Memoria',
  'Shared Memory': 'Memoria Compartida',
  'Decisions': 'Decisiones',
  'Knowledge Graph': 'Grafo de Conocimiento',
  'Knowledge Graph / Graphify': 'Grafo de Conocimiento / Graphify',
  'Context Packs': 'Paquetes de Contexto',
  'Audit Log': 'Registro de Auditoría',

  'F. Intelligence & Auto': 'F. Inteligencia y Automatización',
  'Prompt Studio': 'Estudio de Prompts',
  'Skill Advisor': 'Asesor de Skills',
  'Model Router': 'Enrutador de Modelos',

  'G. Workspace & Cloud': 'G. Workspace e Integraciones',
  'Workspace': 'Integraciones de Workspace',
  'Workspace Integrations': 'Integraciones de Workspace',
  'Connections': 'Registro de Conexiones',
  'Connections Registry': 'Registro de Conexiones',
  'Cloud Resources': 'Recursos Cloud',
  'Cloud': 'Recursos Cloud',

  'H. Dev Environment': 'H. Entorno de Desarrollo',
  'Dev Environment': 'Entorno de Desarrollo',
  'Workers': 'Workers / Ejecutores',

  'Help Center': 'Centro de Ayuda',
  'Learning Mode': 'Modo Aprendizaje',
  'Reality Check': 'Estado Real de Capacidades',
  'Tool/Skill Library': 'Biblioteca de Herramientas y Skills',
  'Next Best Action': 'Próxima Mejor Acción',

  // Statuses
  'active': 'activo',
  'paused': 'pausado',
  'blocked': 'bloqueado',
  'shipped': 'publicado',
  'done': 'hecho',
  'review': 'en revisión',
  'todo': 'pendiente',
  'in_progress': 'en progreso',
  'draft': 'borrador',
  'archived': 'archivado',
  'failed': 'fallido',
  'connected': 'conectado',
  'disconnected': 'desconectado',
  'needs_auth': 'requiere autorización',
  'needs_backend': 'requiere backend',
  'mock': 'simulado',
  'future': 'futuro',
  'real': 'real'
};

export function t(key: string): string {
  // If exact match
  if (es[key as keyof typeof es]) return es[key as keyof typeof es];
  
  // Try lowercase
  const lowerKey = key.toLowerCase();
  if (es[lowerKey as keyof typeof es]) {
    // try to preserve capitalization of original key
    const val = es[lowerKey as keyof typeof es];
    if (key === key.toUpperCase()) return val.toUpperCase();
    if (key[0] === key[0].toUpperCase()) return val.charAt(0).toUpperCase() + val.slice(1);
    return val;
  }

  // fallback
  return key;
}
