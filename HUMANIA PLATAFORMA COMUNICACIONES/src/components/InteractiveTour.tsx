import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Compass, Languages, Calendar, Mail, BookOpen, Clock, 
  ChevronRight, ChevronLeft, X, Play, HelpCircle, GraduationCap, 
  ShieldCheck, ArrowRight, Monitor, Smartphone, CheckSquare, Target, Info, Flame
} from "lucide-react";
import { LanguageType } from "../lib/translations";

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  tabKey?: "chats" | "services" | "translate" | "calendar" | "gmail" | "classroom" | "billing";
  icon: React.ReactNode;
  highlightText: string;
}

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: any) => void;
  language: LanguageType;
}

export default function InteractiveTour({ isOpen, onClose, onSelectTab, language }: InteractiveTourProps) {
  const [tourMode, setTourMode] = useState<"conceptual" | "immersive">("conceptual");
  const [currentStep, setCurrentStep] = useState(0);
  const [immersiveStep, setImmersiveStep] = useState(0);

  // Multilingual conceptual steps
  const conceptualStepsByLang: Record<LanguageType, TourStep[]> = {
    es: [
      {
        title: "Bienvenido a Quantum Hive v3.5",
        subtitle: "Arquitectura Corporativa de Elite",
        description: "Quantum Hive es una plataforma multinube soberana. Integra agentes de inteligencia de negocios con su propio enrutador nativo (compatible con GPT, Claude y núcleos soberanos Quantum) y cuenta con un balance local de tokens gratuitos.",
        icon: <Sparkles className="w-10 h-10 text-brand-primary animate-pulse" />,
        highlightText: "Infraestructura de alta disponibilidad alojada en la Nube Quantum."
      },
      {
        title: "Consola de Traducción & Matices",
        subtitle: "Módulo Lingüístico Soberano",
        description: "Desarrollado para la comunicación corporativa global. Cuenta con análisis de estilo técnico, glosarios y explicaciones gramaticales nativas alojadas en la infraestructura local.",
        tabKey: "translate",
        icon: <Languages className="w-10 h-10 text-pink-400" />,
        highlightText: "Prueba el modo 'Aprender' para ver los desgloses gramaticales automáticos."
      },
      {
        title: "Portal de Agentes & Chats",
        subtitle: "Interacción Multimodal",
        description: "Inicia chats interactivos o videollamadas con avatares pre-configurados (Ares, Sophia, Liam, Eva u Oliver) alojados de forma segura en Base QuantumHive.",
        tabKey: "chats",
        icon: <Sparkles className="w-10 h-10 text-blue-400" />,
        highlightText: "Haz clic en el icono del teléfono de un agente para simular una llamada de alta fidelidad."
      },
      {
        title: "Generador de Contratos Inteligentes",
        subtitle: "Diseño Legal & Firma Digital",
        description: "Contrata nuevos roles de IA a medida para tu empresa o redacta propuestas comerciales estructuradas de forma automática al instante.",
        tabKey: "services",
        icon: <Compass className="w-10 h-10 text-emerald-400" />,
        highlightText: "Estructurado con cláusulas de confidencialidad de la Nube Quantum."
      },
      {
        title: "Servidores & Tiempo Virtual",
        subtitle: "Monitoreo en Tiempo Real",
        description: "Controla el encendido, apagado y reinicio de servidores virtuales privados y administra tus bolsas de minutos/tokens empresariales desde el panel central.",
        tabKey: "billing",
        icon: <Clock className="w-10 h-10 text-cyan-400" />,
        highlightText: "Tus agentes y bases de datos se sincronizan en caliente en la Base QuantumHive."
      }
    ],
    en: [
      {
        title: "Welcome to Quantum Hive v3.5",
        subtitle: "Elite Enterprise Architecture",
        description: "Quantum Hive is a sovereign multi-cloud platform. It integrates business intelligence agents with its own native router (compatible with GPT, Claude, and Quantum sovereign cores) and includes a local balance of free tokens.",
        icon: <Sparkles className="w-10 h-10 text-brand-primary animate-pulse" />,
        highlightText: "High-availability infrastructure hosted on the Quantum Cloud."
      },
      {
        title: "Translation & Nuance Console",
        subtitle: "Sovereign Language Module",
        description: "Developed for global corporate communication. Features technical style analysis, glossaries, and native grammatical breakdowns hosted on the local infrastructure.",
        tabKey: "translate",
        icon: <Languages className="w-10 h-10 text-pink-400" />,
        highlightText: "Try the 'Learn' mode to view automatic grammatical breakdowns."
      },
      {
        title: "Agent Portal & Chats",
        subtitle: "Multimodal Interaction",
        description: "Start interactive chats or video calls with pre-configured avatars (Ares, Sophia, Liam, Eva, or Oliver) securely hosted on QuantumHive Base.",
        tabKey: "chats",
        icon: <Sparkles className="w-10 h-10 text-blue-400" />,
        highlightText: "Click on an agent's phone icon to simulate a high-fidelity call."
      },
      {
        title: "Smart Contracts Generator",
        subtitle: "Legal Design & Digital Signature",
        description: "Hire customized IA roles tailored for your company or write structured commercial proposals automatically in seconds.",
        tabKey: "services",
        icon: <Compass className="w-10 h-10 text-emerald-400" />,
        highlightText: "Structured with confidentiality clauses from the Quantum Cloud."
      },
      {
        title: "Virtual Servers & Compute Pack",
        subtitle: "Real-time Monitoring",
        description: "Control the power status (boot, stop, reboot) of virtual private servers and manage your enterprise minute/token packages from the central panel.",
        tabKey: "billing",
        icon: <Clock className="w-10 h-10 text-cyan-400" />,
        highlightText: "Your agents and databases sync hot within the QuantumHive Base."
      }
    ],
    pt: [
      {
        title: "Bem-vindo ao Quantum Hive v3.5",
        subtitle: "Arquitetura Corporativa de Elite",
        description: "Quantum Hive é uma plataforma de nuvem múltipla soberana. Integra agentes de inteligência de negócios com seu próprio roteador nativo (compatível com GPT, Claude e núcleos soberanos Quantum) e possui um saldo local de tokens gratuitos.",
        icon: <Sparkles className="w-10 h-10 text-brand-primary animate-pulse" />,
        highlightText: "Infraestrutura de alta disponibilidade hospedada na Nuvem Quantum."
      },
      {
        title: "Console de Tradução & Nuances",
        subtitle: "Módulo de Idiomas Soberano",
        description: "Desenvolvido para comunicação corporativa global. Oferece análise de estilo técnico, glossários e explicações de gramática nativas hospedadas na infraestrutura local.",
        tabKey: "translate",
        icon: <Languages className="w-10 h-10 text-pink-400" />,
        highlightText: "Experimente o modo 'Aprender' para ver os detalhamentos de gramática automáticos."
      },
      {
        title: "Portal de Agentes & Chats",
        subtitle: "Interação Multimodal",
        description: "Inicie chats interativos ou chamadas de vídeo com avatares pré-configurados (Ares, Sophia, Liam, Eva ou Oliver) hospedados com segurança na Base QuantumHive.",
        tabKey: "chats",
        icon: <Sparkles className="w-10 h-10 text-blue-400" />,
        highlightText: "Clique no ícone de telefone de um agente para simular uma chamada de alta fidelidade."
      },
      {
        title: "Gerador de Contratos Inteligentes",
        subtitle: "Design Jurídico & Assinatura Digital",
        description: "Contrate novas funções de IA sob medida para sua empresa ou redija propostas comerciais estruturadas automaticamente em segundos.",
        tabKey: "services",
        icon: <Compass className="w-10 h-10 text-emerald-400" />,
        highlightText: "Estruturado com cláusulas de confidencialidade da Nuvem Quantum."
      },
      {
        title: "Servidores Virtuais & Carga de Cômputo",
        subtitle: "Monitoramento em Tempo Real",
        description: "Controle o estado de energia (ligar, desligar, reiniciar) de servidores virtuais privados e gerencie seus pacotes corporativos de minutos/tokens a partir do painel central.",
        tabKey: "billing",
        icon: <Clock className="w-10 h-10 text-cyan-400" />,
        highlightText: "Seus agentes e bancos de dados sincronizam em tempo real na Base QuantumHive."
      }
    ]
  };

  // Multilingual immersive steps
  const immersiveStepsByLang = {
    es: [
      {
        title: "Abre el Traductor Inteligente",
        instruction: "Haz clic en el botón 'Traductor' en la barra inferior para activar la consola de traducción.",
        tabKey: "translate",
        actionHighlight: "Botón de Traductor en la barra de navegación inferior.",
        tip: "Usa el selector para alternar entre los modos Estándar, Aprender y Formal."
      },
      {
        title: "Expande la Visión de Pantalla",
        instruction: "Toca el botón con forma de Monitor en la esquina superior derecha para activar el modo de Pantalla Completa. Esto expandirá la consola para facilitar el trabajo cómodo en computadoras de escritorio.",
        actionHighlight: "Botón de Monitor en la esquina superior derecha del teléfono.",
        tip: "Puedes volver a hacer clic en él para contraer la vista de nuevo."
      },
      {
        title: "Genera un Contrato Comercial",
        instruction: "Cambia a la pestaña 'Servicios' (el compás en la barra inferior) y prueba escribir una propuesta de contrato corporativo.",
        tabKey: "services",
        actionHighlight: "Pestaña 'Servicios' en el menú de navegación inferior.",
        tip: "El motor redactará cláusulas con la firma de Quantum Hive de forma automática."
      },
      {
        title: "Administra las Máquinas Virtuales",
        instruction: "Dirígete a la sección 'Packs' (icono de monedas en la barra inferior) para ver el estado de carga y red de las bases de datos Quantum.",
        tabKey: "billing",
        actionHighlight: "Menú 'Packs' en el menú de navegación inferior.",
        tip: "Prueba apagar o reiniciar un nodo del servidor multinube para ver cómo reacciona el sistema."
      }
    ],
    en: [
      {
        title: "Open the Smart Translator",
        instruction: "Click on the 'Translator' button in the bottom bar to activate the translation console.",
        tabKey: "translate",
        actionHighlight: "Translator button in the bottom navigation bar.",
        tip: "Use the selector to toggle between Standard, Learn, and Formal modes."
      },
      {
        title: "Expand the Screen View",
        instruction: "Tap the Monitor-shaped button in the top right corner to activate Fullscreen mode. This will expand the console to facilitate comfortable work on desktop computers.",
        actionHighlight: "Monitor button in the top right corner of the phone frame.",
        tip: "You can click on it again to collapse the view back to mobile size."
      },
      {
        title: "Generate a Business Contract",
        instruction: "Switch to the 'Services' tab (the compass in the bottom bar) and try writing a corporate contract proposal.",
        tabKey: "services",
        actionHighlight: "'Services' tab in the bottom navigation menu.",
        tip: "The core will automatically draft clauses branded with Quantum Hive's signature."
      },
      {
        title: "Manage Virtual Machines",
        instruction: "Head over to the 'Packs' section (coin icon in the bottom bar) to view the load and network status of Quantum databases.",
        tabKey: "billing",
        actionHighlight: "'Packs' menu in the bottom navigation bar.",
        tip: "Try turning off or restarting a node of the multi-cloud server to see how the system reacts."
      }
    ],
    pt: [
      {
        title: "Abra o Tradutor Inteligente",
        instruction: "Clique no botão 'Tradutor' na barra inferior para ativar o console de tradução.",
        tabKey: "translate",
        actionHighlight: "Botão do Tradutor na barra de navegação inferior.",
        tip: "Use o seletor para alternar entre os modos Padrão, Aprender e Formal."
      },
      {
        title: "Expanda a Visão de Tela",
        instruction: "Toque no botão em forma de Monitor no canto superior direito para ativar o modo de tela cheia. Isso expandirá o console para facilitar o trabalho confortável em computadores desktop.",
        actionHighlight: "Botão de Monitor no canto superior direito do telefone.",
        tip: "Você pode clicar nele novamente para contrair a visualização."
      },
      {
        title: "Gere um Contrato Comercial",
        instruction: "Mude para a guia 'Serviços' (o compasso na barra inferior) e tente escrever uma proposta de contrato corporativo.",
        tabKey: "services",
        actionHighlight: "Guia 'Serviços' no menu de navegação inferior.",
        tip: "O motor redigirá cláusulas com a assinatura do Quantum Hive automaticamente."
      },
      {
        title: "Gerencie as Máquinas Virtuais",
        instruction: "Vá para a seção 'Packs' (ícone de moedas na barra inferior) para ver o status de carga e rede dos bancos de dados Quantum.",
        tabKey: "billing",
        actionHighlight: "Menu 'Packs' no menu de navegação inferior.",
        tip: "Tente desligar ou reiniciar um nó do servidor de nuvem múltipla para ver como o sistema reage."
      }
    ]
  };

  if (!isOpen) return null;

  const conceptualSteps = conceptualStepsByLang[language] || conceptualStepsByLang.es;
  const immersiveSteps = immersiveStepsByLang[language] || immersiveStepsByLang.es;

  const currentConceptual = conceptualSteps[currentStep];
  const currentImmersive = immersiveSteps[immersiveStep];

  const handleNextConceptual = () => {
    if (currentStep < conceptualSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      const nextStep = conceptualSteps[nextStepIndex];
      if (nextStep.tabKey) {
        onSelectTab(nextStep.tabKey);
      }
    } else {
      // Transition to immersive tour directly
      setTourMode("immersive");
      onSelectTab(immersiveSteps[0].tabKey);
    }
  };

  const handlePrevConceptual = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      const prevStep = conceptualSteps[prevStepIndex];
      if (prevStep.tabKey) {
        onSelectTab(prevStep.tabKey);
      }
    }
  };

  const handleNextImmersive = () => {
    if (immersiveStep < immersiveSteps.length - 1) {
      const nextStepIndex = immersiveStep + 1;
      setImmersiveStep(nextStepIndex);
      const nextStep = immersiveSteps[nextStepIndex];
      if (nextStep.tabKey) {
        onSelectTab(nextStep.tabKey);
      }
    } else {
      handleFinish();
    }
  };

  const handlePrevImmersive = () => {
    if (immersiveStep > 0) {
      const prevStepIndex = immersiveStep - 1;
      setImmersiveStep(prevStepIndex);
      const prevStep = immersiveSteps[prevStepIndex];
      if (prevStep.tabKey) {
        onSelectTab(prevStep.tabKey);
      }
    } else {
      setTourMode("conceptual");
      setCurrentStep(conceptualSteps.length - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("quantum_tutorial_shown", "true");
    onClose();
    // Reset counters
    setCurrentStep(0);
    setImmersiveStep(0);
    setTourMode("conceptual");
  };

  // Static strings translations
  const tSkip = language === "en" ? "SKIP" : language === "pt" ? "PULAR" : "SALTAR";
  const tBack = language === "en" ? "BACK" : language === "pt" ? "VOLTAR" : "ATRÁS";
  const tNext = language === "en" ? "NEXT" : language === "pt" ? "AVANÇAR" : "SIGUIENTE";
  const tTrain = language === "en" ? "TRAIN ➜" : language === "pt" ? "TREINAR ➜" : "ENTRENAR ➜";
  const tFinish = language === "en" ? "FINISH TOUR" : language === "pt" ? "CONCLUIR TOUR" : "FINALIZAR TOUR";
  const tGeneral = language === "en" ? "View General Explanation" : language === "pt" ? "Ver Explicação Geral" : "Ver Explicación General";
  const tGoSelf = language === "en" ? "Go to Self-Guided ➜" : language === "pt" ? "Ir para Auto-Guiado ➜" : "Ir a Autoguiado ➜";

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4"
        id="interactive-tour-overlay"
      >
        {/* TOP STATUS BAR OVERLAY TO ENCOURAGE IMMERSIVE */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[10px] sm:text-xs font-mono text-white/50 bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <span>NUBE CORPORATIVA: QUANTUM HIVE SOBERANA ACTIVE</span>
          </div>
          <span className="text-brand-primary uppercase">
            {language === "en" ? "IMMERSIVE TRAINING MODE" : language === "pt" ? "MODO TREINAMENTO IMERSIVO" : "MODO ENTRENAMIENTO INMERSIVO"}
          </span>
        </div>

        {tourMode === "conceptual" ? (
          /* CONCEPTUAL STEP CARD */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md bg-brand-surface border border-brand-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Progress Bar */}
            <div className="h-1.5 w-full bg-white/5 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-brand-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / conceptualSteps.length) * 100}%` }}
              />
            </div>

            {/* Skip / Close Button */}
            <button 
              onClick={handleFinish}
              className="absolute top-4 right-4 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/50 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-white/5"
              title="Cerrar"
            >
              <span>{tSkip}</span>
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Content Area */}
            <div className="p-6 space-y-5 flex-1">
              {/* Step Icon */}
              <div className="flex justify-center py-2">
                <div className="p-4 bg-black/40 rounded-full border border-brand-primary/20 shadow-inner">
                  {currentConceptual.icon}
                </div>
              </div>

              {/* Step Titles */}
              <div className="text-center space-y-1">
                <span className="text-[9px] font-mono font-bold tracking-widest text-brand-primary uppercase">
                  {language === "en" ? "Infrastructure Explanation" : language === "pt" ? "Explicação de Infraestrutura" : "Explicación de Infraestructura"} • {currentStep + 1} de {conceptualSteps.length}
                </span>
                <h3 className="text-base font-bold text-white tracking-wide">{currentConceptual.title}</h3>
                <p className="text-xs text-brand-primary/80 font-medium">{currentConceptual.subtitle}</p>
              </div>

              {/* Step Description */}
              <p className="text-xs text-white/70 text-center leading-relaxed font-sans max-h-[120px] overflow-y-auto pr-1">
                {currentConceptual.description}
              </p>

              {/* Active Highlight Alert Box */}
              <div className="p-3.5 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0 animate-pulse" />
                <p className="text-[10px] text-white/80 leading-relaxed font-sans italic">
                  <strong>{language === "en" ? "Network Details:" : language === "pt" ? "Detalhes da Rede:" : "Detalle de Red:"}</strong> {currentConceptual.highlightText}
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-black/30 border-t border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={handlePrevConceptual}
                disabled={currentStep === 0}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{tBack}</span>
              </button>

              {/* Mode Swapper inside dots */}
              <button
                onClick={() => {
                  setTourMode("immersive");
                  onSelectTab(immersiveSteps[0].tabKey);
                }}
                className="text-[9px] font-mono text-brand-primary hover:underline border border-brand-primary/20 bg-brand-primary/5 px-2 py-0.5 rounded-full"
              >
                {tGoSelf}
              </button>

              <button
                onClick={handleNextConceptual}
                className="px-4 py-2 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                <span>{currentStep === conceptualSteps.length - 1 ? tTrain : tNext}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* IMMERSIVE INTERACTIVE STEP DIALOG */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-lg bg-[#0a111a] border-2 border-brand-primary/40 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(212,175,55,0.3)] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Progress Bar */}
            <div className="h-1.5 w-full bg-white/5 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${((immersiveStep + 1) / immersiveSteps.length) * 100}%` }}
              />
            </div>

            {/* Skip / Close Button */}
            <button 
              onClick={handleFinish}
              className="absolute top-4 right-4 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/50 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-white/5"
            >
              <span>{language === "en" ? "COMPLETED" : language === "pt" ? "CONCLUÍDO" : "COMPLETADO"}</span>
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Content Area */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/35 text-[9px] text-emerald-400 font-mono font-bold animate-pulse">
                  {language === "en" ? "SELF-GUIDED CONSOLE" : language === "pt" ? "CONSOLE AUTOGUIADO" : "CONSOLA AUTOGUIADA"}
                </div>
                <span className="text-[9px] font-mono text-white/40">
                  {language === "en" ? "STEP" : language === "pt" ? "PASSO" : "PASO"} {immersiveStep + 1} de {immersiveSteps.length}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-primary animate-bounce" />
                  <span>{currentImmersive.title}</span>
                </h3>
                <p className="text-xs text-white/90 leading-relaxed font-sans font-medium bg-black/40 p-3 rounded-2xl border border-white/5">
                  {currentImmersive.instruction}
                </p>
              </div>

              {/* Action Highlight Box */}
              <div className="p-3 bg-[#111926] border border-white/5 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-brand-primary font-bold uppercase">
                  <Info className="w-3.5 h-3.5" />
                  <span>{language === "en" ? "Interact Area on screen:" : language === "pt" ? "Área para interagir na tela:" : "Área a interactuar en la pantalla:"}</span>
                </div>
                <p className="text-[11px] text-white/75 font-sans italic pl-5">{currentImmersive.actionHighlight}</p>
              </div>

              {/* Tips */}
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono uppercase text-brand-primary font-bold block">
                    {language === "en" ? "Corporate Tip" : language === "pt" ? "Dica Corporativa" : "Tip de Elite"}
                  </span>
                  <p className="text-[10px] text-white/85 leading-relaxed font-sans">{currentImmersive.tip}</p>
                </div>
              </div>
            </div>

            {/* Immersive Action Footer */}
            <div className="p-4 bg-black/50 border-t border-white/5 flex items-center justify-between gap-3">
              <button
                onClick={handlePrevImmersive}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{tBack}</span>
              </button>

              <button
                onClick={() => {
                  setTourMode("conceptual");
                  setCurrentStep(0);
                }}
                className="text-[9px] font-mono text-white/50 hover:underline"
              >
                {tGeneral}
              </button>

              <button
                onClick={handleNextImmersive}
                className="px-4 py-2 bg-emerald-500 text-black hover:bg-emerald-400 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <span>{immersiveStep === immersiveSteps.length - 1 ? tFinish : tNext}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
