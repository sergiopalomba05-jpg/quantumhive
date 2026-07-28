export type LanguageType = "es" | "en" | "pt";

export interface TranslationDictionary {
  brandTitle: string;
  brandSubtitle: string;
  secureAgent: string;
  searchPlaceholder: string;
  minutesLabel: string;
  phoneView: string;
  expandedView: string;
  selectLanguage: string;
  changeLanguageTitle: string;
  changeLanguageDesc: string;
  closeBtn: string;
  
  // Navigation Tabs
  tabChats: string;
  tabServices: string;
  tabTranslate: string;
  tabCreate: string;
  tabPacks: string;
  tabCalendar: string;
  tabGmail: string;
  tabClassroom: string;

  // General Actions / Labels
  activeCall: string;
  incomingCall: string;
  placedCall: string;
  durationLabel: string;
  inviteBtn: string;
  backBtn: string;
  nextBtn: string;
  finishBtn: string;
  tipTitle: string;

  // Translation Hub Header
  transHubTitle: string;
  transHubDesc: string;
  transInputPlaceholder: string;
  transBtn: string;
  transModeStandard: string;
  transModeLearn: string;
  transModeFormal: string;
  transErrorMsg: string;

  // VM Configurator
  vmConfigTitle: string;
  vmConfigDesc: string;
}

export const translations: Record<LanguageType, TranslationDictionary> = {
  es: {
    brandTitle: "QUANTUM HIVE",
    brandSubtitle: "NÚCLEO DE INTELIGENCIA SOBERANA",
    secureAgent: "CONEXIÓN SEGURA",
    searchPlaceholder: "Buscar avatares, roles o protocolos...",
    minutesLabel: "MINUTOS",
    phoneView: "Vista de Teléfono",
    expandedView: "Vista de Escritorio",
    selectLanguage: "Idioma",
    changeLanguageTitle: "Seleccionar Idioma de la Intranet",
    changeLanguageDesc: "Toda la plataforma y el asistente virtual autoguiado se adaptarán al idioma seleccionado de forma nativa.",
    closeBtn: "Cerrar",

    // Navigation Tabs
    tabChats: "Portal Hive",
    tabServices: "Servicios",
    tabTranslate: "Traductor",
    tabCreate: "Diseño Core",
    tabPacks: "Packs",
    tabCalendar: "Calendario",
    tabGmail: "Gmail",
    tabClassroom: "Aulas",

    // General Actions
    activeCall: "Llamada Activa",
    incomingCall: "Entrante",
    placedCall: "Saliente",
    durationLabel: "Duración",
    inviteBtn: "Invitar",
    backBtn: "ATRÁS",
    nextBtn: "SIGUIENTE",
    finishBtn: "FINALIZAR",
    tipTitle: "Tip Corporativo",

    // Translation Hub
    transHubTitle: "Traductor Inteligente de Quantum Hive",
    transHubDesc: "Traducción de ultra-alta fidelidad, análisis de matices y desglose técnico mediante la red inteligente Quantum Hive.",
    transInputPlaceholder: "Escribe o pega texto en cualquier idioma para traducir...",
    transBtn: "Procesar con Red Quantum Core",
    transModeStandard: "Estándar",
    transModeLearn: "Modo Aprender",
    transModeFormal: "Modo Formal",
    transErrorMsg: "Ocurrió un error al procesar tu traducción con la red soberana de Quantum Hive. Por favor intenta de nuevo.",

    // VM Configurator
    vmConfigTitle: "Consola de Máquinas Virtuales",
    vmConfigDesc: "Monitoreo y encendido de nodos virtuales alojados en la nube multinube soberana."
  },
  en: {
    brandTitle: "QUANTUM HIVE",
    brandSubtitle: "SOVEREIGN INTELLIGENCE CORE",
    secureAgent: "SECURE CONNECTION",
    searchPlaceholder: "Search avatars, roles, or protocols...",
    minutesLabel: "MINUTES",
    phoneView: "Phone View",
    expandedView: "Desktop View",
    selectLanguage: "Language",
    changeLanguageTitle: "Select Intranet Language",
    changeLanguageDesc: "The entire platform and the self-guided virtual assistant will adapt to the selected language natively.",
    closeBtn: "Close",

    // Navigation Tabs
    tabChats: "Hive Portal",
    tabServices: "Services",
    tabTranslate: "Translator",
    tabCreate: "Core Design",
    tabPacks: "Packs",
    tabCalendar: "Calendar",
    tabGmail: "Gmail",
    tabClassroom: "Classroom",

    // General Actions
    activeCall: "Active Call",
    incomingCall: "Incoming",
    placedCall: "Outgoing",
    durationLabel: "Duration",
    inviteBtn: "Invite",
    backBtn: "BACK",
    nextBtn: "NEXT",
    finishBtn: "FINISH",
    tipTitle: "Corporate Tip",

    // Translation Hub
    transHubTitle: "Quantum Hive Intelligent Translator",
    transHubDesc: "Ultra-high fidelity translation, nuance analysis, and technical breakdown using the Quantum Hive intelligent network.",
    transInputPlaceholder: "Type or paste text in any language to translate...",
    transBtn: "Process with Quantum Core",
    transModeStandard: "Standard",
    transModeLearn: "Learn Mode",
    transModeFormal: "Formal Mode",
    transErrorMsg: "An error occurred while processing your translation with the Quantum Hive sovereign network. Please try again.",

    // VM Configurator
    vmConfigTitle: "Virtual Machines Console",
    vmConfigDesc: "Monitor and boot virtual nodes hosted on the sovereign multi-cloud."
  },
  pt: {
    brandTitle: "QUANTUM HIVE",
    brandSubtitle: "NÚCLEO DE INTELIGÊNCIA SOBERANA",
    secureAgent: "CONEXÃO SEGURA",
    searchPlaceholder: "Buscar avatares, funções ou protocolos...",
    minutesLabel: "MINUTOS",
    phoneView: "Visualização Celular",
    expandedView: "Visualização Desktop",
    selectLanguage: "Idioma",
    changeLanguageTitle: "Selecionar Idioma da Intranet",
    changeLanguageDesc: "Toda a plataforma e o assistente virtual autoguiado se adaptarão ao idioma selecionado nativamente.",
    closeBtn: "Fechar",

    // Navigation Tabs
    tabChats: "Portal Hive",
    tabServices: "Serviços",
    tabTranslate: "Tradutor",
    tabCreate: "Design Core",
    tabPacks: "Packs",
    tabCalendar: "Calendário",
    tabGmail: "Gmail",
    tabClassroom: "Aulas",

    // General Actions
    activeCall: "Chamada Ativa",
    incomingCall: "Entrada",
    placedCall: "Saída",
    durationLabel: "Duração",
    inviteBtn: "Convidar",
    backBtn: "VOLTAR",
    nextBtn: "AVANÇAR",
    finishBtn: "FINALIZAR",
    tipTitle: "Dica Corporativa",

    // Translation Hub
    transHubTitle: "Tradutor Inteligente Quantum Hive",
    transHubDesc: "Tradução de ultra-alta fidelidade, análise de nuances e detalhamento técnico usando a rede inteligente Quantum Hive.",
    transInputPlaceholder: "Digite ou cole o texto em qualquer idioma para traduzir...",
    transBtn: "Processar com Rede Quantum Core",
    transModeStandard: "Padrão",
    transModeLearn: "Modo Aprender",
    transModeFormal: "Modo Formal",
    transErrorMsg: "Ocorreu um erro ao processar sua tradução com a rede soberana Quantum Hive. Por favor, tente novamente.",

    // VM Configurator
    vmConfigTitle: "Console de Máquinas Virtuais",
    vmConfigDesc: "Monitore e inicie nós virtuais hospedados na nuvem múltipla soberana."
  }
};
