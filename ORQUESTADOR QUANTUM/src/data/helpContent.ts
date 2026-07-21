export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    id: 'intro',
    title: '¿Qué es QuantumHive Control Plane?',
    content: 'QuantumHive es un centro de comando unificado para orquestar agentes de IA, ideas, proyectos y memoria a largo plazo. En lugar de chats aislados, aquí toda la información está conectada, permitiendo que tus agentes colaboren con un contexto rico.',
    tags: ['intro', 'basics']
  },
  {
    id: 'first-5-mins',
    title: 'Primeros 5 minutos usando la app',
    content: '1. Registra una idea rápida.\
2. Crea un proyecto y asígnale un CEO Agent.\
3. Ve al Chat Central y pídele a tu Asistente Global que desglose el proyecto en tareas.\
4. Observa cómo todo se conecta automáticamente en el grafo de conocimiento.',
    tags: ['intro', 'quickstart']
  },
  {
    id: 'idea-to-project',
    title: 'Cómo convertir una idea en proyecto',
    content: 'Desde la pestaña Ideas, puedes ver la lista de ideas. Haz clic en una idea y usa el botón "Convertir a Proyecto". Esto promoverá la idea a un proyecto activo, donde podrás asignar un CEO Agent y agregar tareas.',
    tags: ['ideas', 'projects']
  },
  {
    id: 'shared-memory',
    title: 'Cómo usar memoria compartida',
    content: 'La Memoria Compartida es el cerebro a largo plazo. Los agentes pueden leer y escribir aquí. Úsala para guardar decisiones técnicas, contexto de la empresa, o preferencias personales. Puedes etiquetar memorias como "decision", "context", "learning", etc.',
    tags: ['memory', 'context']
  },
  {
    id: 'ceo-agents',
    title: 'Cómo hablar con un CEO Agent',
    content: 'Ve a "Agents" o al Chat Central. Puedes seleccionar a un agente específico en el selector superior. Al hacerlo, la conversación se enrutará a ese modelo con las instrucciones (System Prompt) específicas de ese rol.',
    tags: ['agents', 'chat']
  },
  {
    id: 'live-screen',
    title: 'Cómo usar Asistente de Pantalla en Vivo',
    content: 'Ve a Asistente de Pantalla en Vivo. Activa "Screen Share". El agente (simulado en el frontend, o real si usas Gemini Live API) podrá "ver" tu pantalla. En el futuro, a través de un Desktop Worker local, el agente propondrá acciones (clicks, teclado) que aparecerán en la Cola de Aprobación.',
    tags: ['live', 'screen', 'vision']
  },
  {
    id: 'approval-queue',
    title: 'Qué es Approval Queue',
    content: 'Es la barrera de seguridad de QuantumHive. Ninguna acción destructiva o que interactúe con tu computadora (escribir archivos, comandos de consola) se ejecuta sola. El agente propone la acción, y tú debes aprobarla explícitamente.',
    tags: ['security', 'approval', 'actions']
  },
  {
    id: 'real-vs-mock',
    title: 'Qué capacidades son reales hoy y cuáles son futuras/mock',
    content: 'Reales hoy: Interfaz, estado local, compartición de pantalla local, logs, gestión de contexto. Mock/Futuro: Interacciones reales con OS, edición de archivos reales, clics reales, y consumo de APIs de facturación (AWS/GCP). Revisa el "Estado Real de Capacidades" en la pantalla de Live Assistant.',
    tags: ['mock', 'future', 'reality']
  }
];
