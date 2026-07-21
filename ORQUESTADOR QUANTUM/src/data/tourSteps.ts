export interface TourStep {
  id: string;
  target?: string; // CSS selector
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const tours: Record<string, TourStep[]> = {
  global: [
    {
      id: 'g1',
      title: 'Bienvenido a QuantumHive',
      description: 'Este es tu panel de control central. Hagamos un recorrido rápido por las características principales.',
      placement: 'center',
    },
    {
      id: 'g2',
      target: '[data-tour="sidebar-nav"]',
      title: 'Navegación',
      description: 'Cambia entre el Panel, Ideas, Proyectos, Tareas y más desde este menú.',
      placement: 'right',
    },
    {
      id: 'g3',
      target: '[data-tour="learning-mode-toggle"]',
      title: 'Modo de Aprendizaje',
      description: 'Activa esto en cualquier momento para ver explicaciones detalladas y consejos en toda la aplicación.',
      placement: 'bottom',
    },
    {
      id: 'g4',
      target: '[data-tour="top-bar"]',
      title: 'Contexto y Estado',
      description: 'Aquí puedes acceder a la configuración, restablecer el tutorial o ver tus notificaciones.',
      placement: 'bottom',
    }
  ],
  startHere: [
    {
      id: 'sh1',
      title: 'Guided Workflow',
      description: 'Esta es la guía principal de la aplicación. Te ayuda a entender en qué orden debes usar las funciones para obtener el máximo valor.',
      placement: 'center',
    }
  ],
  channels: [
    {
      id: 'ch1',
      title: 'Canales de Comunicación de Agentes',
      description: 'Aquí puedes gestionar por dónde se comunican tus agentes: Internal Chat, HumanIA Chat, WhatsApp, Telegram, Gmail, etc.',
      placement: 'center',
    },
    {
      id: 'ch2',
      title: 'Múltiples Canales',
      description: 'Diferencia entre canales internos (QuantumHive), canales públicos (HumanIA) y canales externos (WhatsApp, Telegram).',
      placement: 'bottom',
    },
    {
      id: 'ch3',
      title: 'Asignación de Agentes',
      description: 'Asigna uno o varios agentes a cada canal. Cada uno puede tener diferentes roles (Ej: uno responde dudas, otro toma pedidos).',
      placement: 'bottom',
    },
    {
      id: 'ch4',
      title: 'Simulación Mock',
      description: 'Como MVP, puedes simular mensajes entrantes para probar la reactividad del sistema antes de conectar webhooks reales.',
      placement: 'top',
    },
    {
      id: 'ch5',
      title: 'Seguridad y Backend',
      description: 'Los canales externos (WhatsApp, Telegram) requerirán integración de backend y aprobaciones manuales para envíos de riesgo alto.',
      placement: 'center',
    }
  ],
  dashboard: [
    {
      id: 'd1',
      target: '[data-tour="dashboard-header"]',
      title: 'Resumen del Panel',
      description: 'Este es el centro de control. Te muestra un resumen de alto nivel de todos tus elementos activos.',
      placement: 'bottom',
    },
    {
      id: 'd2',
      target: '[data-tour="dashboard-metrics"]',
      title: 'Métricas Clave',
      description: 'Ve rápidamente cuántas ideas, proyectos y agentes activos tienes.',
      placement: 'bottom',
    }
  ],
  chat: [
    {
      id: 'c1',
      target: '[data-tour="chat-input"]',
      title: 'Chat Central',
      description: 'Aquí es donde puedes interactuar con tus agentes. Escribe un mensaje o usa las Acciones Rápidas.',
      placement: 'top',
    },
    {
      id: 'c2',
      target: '[data-tour="chat-agent-select"]',
      title: 'Seleccionar Agente',
      description: 'Elige con qué agente quieres hablar. Cada agente puede tener diferentes habilidades y contextos.',
      placement: 'bottom',
    }
  ],
  ideas: [
    {
      id: 'i1',
      target: '[data-tour="add-idea-btn"]',
      title: 'Agregar Idea',
      description: 'Haz clic aquí para registrar una nueva idea. Luego puedes convertir las ideas en proyectos procesables.',
      placement: 'left',
    }
  ],
  projects: [
    {
      id: 'p1',
      target: '[data-tour="add-project-btn"]',
      title: 'Nuevo Proyecto',
      description: 'Crea un nuevo proyecto, asigna un agente CEO y haz un seguimiento de sus tareas y decisiones.',
      placement: 'left',
    }
  ],
  agents: [
    {
      id: 'a1',
      title: 'Registro de Agentes',
      description: 'Administra tus agentes autónomos aquí. Puedes asignarles roles y modelos específicos.',
      placement: 'center',
    }
  ],
  memory: [
    {
      id: 'm1',
      title: 'Memoria Compartida',
      description: 'Este es el contexto a largo plazo de tu espacio de trabajo. Las decisiones importantes y el contexto se guardan aquí para que los agentes hagan referencia.',
      placement: 'center',
    }
  ],
  tasks: [
    {
      id: 't1',
      title: 'Gestión de Tareas',
      description: 'Haz un seguimiento de acciones granulares. Las tareas se pueden asignar a proyectos y agentes específicos.',
      placement: 'center',
    }
  ],
  liveCommand: [
    {
      id: 'lc1',
      target: '[data-tour="live-command-mic"]',
      title: 'Control por Voz',
      description: 'Haz clic en el micrófono para iniciar una sesión de voz en vivo con tu agente.',
      placement: 'top',
    }
  ],
  liveScreen: [
    {
      id: 'ls1',
      title: 'Asistente de Pantalla en Vivo',
      description: 'Comparte tu pantalla para que el agente pueda ver tu contexto. Nota: las capacidades están claramente etiquetadas como REALES o MOCK/FUTURO.',
      placement: 'center',
    }
  ]

  , skillAdvisor: [
    {
      id: 'sa1',
      title: 'Asesor de Skills',
      description: 'Esta sección recomienda qué skills, MCPs, CLIs, agentes o workflows usar según la tarea concreta.',
      placement: 'center',
    },
    {
      id: 'sa2',
      target: 'input[placeholder*="¿Qué querés hacer?"]',
      title: 'Búsqueda por Intención',
      description: 'Escribí lo que querés hacer en lenguaje natural. Ejemplo: "quiero mejorar una landing", "tengo un bug", "quiero analizar un reel".',
      placement: 'bottom',
    },
    {
      id: 'sa3',
      title: 'Resultados y Orden',
      description: 'Verás cards con skills recomendadas (por qué sirven, confianza, cuándo usarlas) y un orden de trabajo sugerido. Ejemplo: brainstorming -> writing-plans -> implementation.',
      placement: 'center',
    },
    {
      id: 'sa4',
      title: 'Prompt y Workflows',
      description: 'Genera un prompt listo para copiar y usar con un agente, o permite crear un workflow reutilizable.',
      placement: 'center',
    },
    {
      id: 'sa5',
      title: 'Skill Sources & Estado',
      description: 'Registrá fuentes (GitHub, local, MCP). El estado indica si la skill está "installed" (lista), "available" (conocida), "missing" o "future".',
      placement: 'center',
    }
  ]
,
  knowledgeGraph: [
    {
      id: 'kg1',
      title: 'Grafo de Conocimiento / Graphify',
      description: 'El Grafo de Conocimiento te permite explorar visualmente cómo se conectan los módulos, ideas, agentes y proyectos de tu sistema.',
      placement: 'center',
    },
    {
      id: 'kg2',
      target: 'input[placeholder*="Buscar nodos"]',
      title: 'Búsqueda de Nodos',
      description: 'Busca cualquier archivo, clase, agente o tarea por nombre para centrar el grafo en ese elemento.',
      placement: 'bottom',
    },
    {
      id: 'kg3',
      title: 'Filtrar por Tipos',
      description: 'Usa los botones superiores para aislar elementos específicos (solo módulos, solo agentes, etc.).',
      placement: 'bottom',
    },
    {
      id: 'kg4',
      title: 'Detalle del Nodo',
      description: 'Al hacer clic en un nodo, verás a la derecha su resumen, tags, y relaciones entrantes/salientes.',
      placement: 'left',
    },
    {
      id: 'kg5',
      title: 'Acciones Inteligentes',
      description: 'Desde el panel lateral puedes "Explicar el nodo" con IA, enviarlo al contexto de un agente, o crear tareas directamente vinculadas a este código/módulo.',
      placement: 'left',
    },
    {
      id: 'kg6',
      title: 'Futuro: Graphify',
      description: 'Esta versión es interactiva pero con datos iniciales mock. Próximamente se conectará con "graphify-out/graph.json" para leer el código real de tus repositorios.',
      placement: 'center',
    }
  ]
,
  visualPlanner: [
    {
      id: 'vp1',
      title: 'Planificador Visual de Nodos',
      description: 'El lugar para pensar y diseñar usando nodos visuales sin ejecutar código aún. Ideal para planificar la arquitectura o los flujos.',
      placement: 'center',
    },
    {
      id: 'vp2',
      title: 'Mapas y Roadmaps',
      description: 'Idea Map, Workflow Map, Pipeline Map y Roadmap Builder te dan diferentes lienzos para distintas necesidades de planificación.',
      placement: 'bottom',
    },
    {
      id: 'vp3',
      title: 'Lista de Boards',
      description: 'Aquí verás todos tus tableros activos. Al hacer clic en uno, se cargará su canvas en el centro.',
      placement: 'right',
    },
    {
      id: 'vp4',
      title: 'Canvas (Mock mode)',
      description: 'Por ahora puedes ver los nodos distribuidos, exportar la información o agregar nodos nuevos de forma estática. Después se volverá 100% interactivo y conectable a N8N.',
      placement: 'center',
    },
    {
      id: 'vp5',
      title: 'Detalles y Acciones',
      description: 'Cuando seleccionas un nodo, puedes ver sus tags, estado (Mock, Real, Future, Blocked) y convertir el nodo en una Tarea real en tu QuantumHive.',
      placement: 'left',
    }
  ]
,
  promptStudio: [
    {
      id: 'ps1',
      title: 'Estudio de Prompts',
      description: 'Bienvenido al generador de prompts, workflows y loops. Aquí conviertes ideas crudas en instrucciones accionables.',
      placement: 'center',
    },
    {
      id: 'ps2',
      title: 'Idea Cruda',
      description: 'Escribe tu idea con tus propias palabras. El sistema se encargará de formalizarla en un prompt profesional.',
      placement: 'bottom',
    },
    {
      id: 'ps3',
      title: 'Prompt Maestro',
      description: 'El sistema genera un prompt principal detallado con contexto, rol, restricciones y formato de salida.',
      placement: 'bottom',
    },
    {
      id: 'ps4',
      title: 'Prompt Pack',
      description: 'Divide tu prompt maestro en etapas lógicas (Brainstorming, Research, Execution, etc.) para que los agentes puedan procesarlo paso a paso.',
      placement: 'top',
    },
    {
      id: 'ps5',
      title: 'Constructor de Loop',
      description: 'Automatiza la ejecución de los prompts. Puedes simularlo (Mock mode), hacerlo paso a paso manual, o preparar el loop futuro.',
      placement: 'left',
    }
  ]
  , agentBuilder: [
    {
      id: 'ab1',
      title: 'Creador de Agentes',
      description: 'Bienvenido al constructor de orquestación de agentes. Aquí configuras cómo actúa y piensa tu asistente.',
      placement: 'center',
    },
    {
      id: 'ab2',
      title: 'Elegir cuerpo/worker',
      description: 'El cuerpo define qué puede hacer el agente. Para código usá OpenCode. Para backend usá Cloud Run. Para multimedia usá GPU VM. Para controlar tu PC usá Local Desktop Worker con aprobación.',
      placement: 'center',
    }
  ],
  databases: [
    {
      id: 'db1',
      title: 'Conexión de Bases de Datos',
      description: 'Qué es una conexión DB: Es el registro de dónde vive la memoria, los eventos o los datos de tus proyectos. Puede ser Firestore, Postgres, Vector DB o Sheets.',
      placement: 'center',
    },
    {
      id: 'db2',
      title: 'Asignar a proyectos y agentes',
      description: 'Puedes asociar DB a proyecto y permitir acceso a agentes o workers específicos, limitando el alcance.',
      placement: 'bottom',
    },
    {
      id: 'db3',
      title: 'Secretos y Read-Only',
      description: 'Qué significa read-only: Protección contra escrituras accidentales. Por qué los secretos no se guardan en frontend: Por seguridad (Zero-Trust), los passwords solo viven en el Backend/Secret Manager.',
      placement: 'center',
    },
    {
      id: 'db4',
      title: 'Solicitar Integración',
      description: 'Cómo crear tarea para conexión real: Usa el botón "Solicitar Integración Real" para generar un ticket en el backlog de tareas.',
      placement: 'left',
    }
  ]
};