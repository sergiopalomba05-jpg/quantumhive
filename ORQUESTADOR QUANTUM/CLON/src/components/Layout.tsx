import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { ContextualAssistantWidget } from './assistants/ContextualAssistantWidget';
import { useStore } from '../store/useStore';
import { useTour } from './onboarding/TourProvider';
import { cn } from '../lib/utils';
import { 
  X, Menu, LogIn, LogOut, FileText, Download, HelpCircle, RefreshCw, Lightbulb, Play, FolderKanban, MessageSquare 
} from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { startTour } = useTour();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();

  // Handle command palette shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on path change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  
  const learningModeEnabled = store.learningModeEnabled;
  const setLearningMode = store.setLearningMode;

  

  const exportContext = () => {
    // Generate JSON context
            const contextStr = JSON.stringify({
      projects: store.projects,
      tasks: store.tasks,
      decisions: store.decisions,
      memories: store.memories,
      repoConnections: store.repoConnections,
      workerDefinitions: store.workerDefinitions,
      workOrders: store.workOrders,
      brainProviders: store.brainProviders,
      llmModels: store.llmModels,
      mcpServerDefinitions: store.mcpServerDefinitions,
      apiConnectorDefinitions: store.apiConnectorDefinitions,
      cliToolDefinitions: store.cliToolDefinitions,
      databaseConnections: store.databaseConnections,
      agentDatabaseBindings: store.agentDatabaseBindings,
      workerDatabaseBindings: store.workerDatabaseBindings,
      agentWorkerBindings: store.agentWorkerBindings,
      contextualAssistants: store.contextualAssistants,
      assistantSessions: store.assistantSessions,
      assistantProposedActions: store.assistantProposedActions
    }, null, 2);
    
    // Create and trigger download
    const blob = new Blob([contextStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantumhive-context-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySummary = () => {
    const activeProjects = store.projects?.filter(p => p.status === 'active') || [];
    const blockedTasks = store.tasks?.filter(t => t.status === 'blocked') || [];
    const recentDecisions = store.decisions?.slice(0, 5) || [];
    
    const summary = `# QuantumHive Resumen de Contexto Maestro\nDate: ${new Date().toLocaleString()}\n\n## Proyectos Activos\n${activeProjects.map(p => `- **${p.name}**: ${p.goal} (Siguiente: ${p.nextAction})`).join('\n')}\n\n## Bloqueos\n${blockedTasks.length ? blockedTasks.map(t => `- [${t.priority}] ${t.title} (Notas: ${t.notes})`).join('\n') : 'No hay tareas bloqueadas.'}\n\n## Decisiones Recientes\n${recentDecisions.map(d => `- **${d.title}**: ${d.decision}`).join('\n')}\n\n## Workspace Integrations\n- Emails importantes pendientes: ${store.syncedEmails?.length || 0}\n- Próximos eventos: ${store.syncedEvents?.length || 0}\n- Archivos recientes por proyecto: ${store.syncedFiles?.length || 0}\n- Tareas sincronizadas: ${store.syncedWorkspaceTasks?.length || 0}\n- Notas importadas: ${store.syncedNotes?.length || 0}\n- Mensajes importantes de Google Chat: ${store.syncedChatMessages?.length || 0}\n\n## Live Screen Sessions\n- Agent Action Requests: ${store.agentActions?.length || 0}\n- Action Approvals: ${store.approvals?.length || 0}\n- Screen Snapshots metadata: 0 (Mock)\n- Live Screen Sessions: 0 (Mock)\n    `.trim();
    
    navigator.clipboard.writeText(summary);
    alert('Summary copied to clipboard!');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-qh-bg border-r border-qh-border">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            {/* Full navigation in mobile drawer */}
            <div className="p-6 h-full overflow-y-auto hide-scrollbar">
              <h1 className="text-xl font-display font-bold text-qh-amber mb-6">QuantumHive</h1>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 border-b border-qh-border flex items-center justify-between px-4 sm:px-6 bg-qh-header shrink-0">
          <div className="flex items-center gap-4">
            <button type="button" className="-m-2 p-2 text-slate-400 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="hidden sm:inline-flex text-[10px] font-semibold text-slate-300 uppercase tracking-wider">ESTADO: <span className="text-emerald-500 ml-1">ÓPTIMO</span></span>
          </div>
          <div className="flex items-center gap-4" data-tour="top-bar">
            <button 
              data-tour="learning-mode-toggle"
              onClick={() => setLearningMode(!learningModeEnabled)} 
              className={cn("glass-button py-1.5 transition-colors", learningModeEnabled ? "bg-qh-gold/20 text-qh-gold border-qh-gold/30" : "")} 
              title="Modo Aprendizaje"
            >
              <Lightbulb size={12} />
              <span className="hidden sm:inline">Aprender</span>
            </button>
            <button 
              onClick={() => startTour('global')} 
              className="glass-button py-1.5" 
              title="Tutorial Global"
            >
              <HelpCircle size={12} />
              <span className="hidden sm:inline">Guía</span>
            </button>
            <button 
              onClick={() => { alert('Tutoriales reseteados (mock).'); }} 
              className="glass-button py-1.5 text-red-400 hover:text-red-300" 
              title="Reiniciar Tutoriales"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
            <ContextualAssistantWidget />
            <button onClick={copySummary} className="glass-button py-1.5" title="Resumen para nueva ventana">
              <FileText size={12} />
              <span className="hidden sm:inline">Contexto</span>
            </button>
            <button onClick={exportContext} className="glass-button py-1.5 text-qh-cyan border-qh-cyan/30 bg-qh-cyan/10 hover:bg-qh-cyan/20" title="Exportar contexto maestro">
              <Download size={12} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                  QH
                </div>
              </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 bg-qh-bg pb-20 md:pb-4">
          <Breadcrumbs />
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-qh-border flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-40">
          <NavLink to="/start" className={({isActive}) => cn("flex flex-col items-center p-2 transition-colors", isActive ? "text-qh-gold" : "text-slate-400")}>
            <Play size={20} className="mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Inicio</span>
          </NavLink>
          <NavLink to="/ideas" className={({isActive}) => cn("flex flex-col items-center p-2 transition-colors", isActive ? "text-qh-cyan" : "text-slate-400")}>
            <Lightbulb size={20} className="mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Capturar</span>
          </NavLink>
          <NavLink to="/chat" className={({isActive}) => cn("flex flex-col items-center p-2 transition-colors", isActive ? "text-purple-400" : "text-slate-400")}>
            <MessageSquare size={20} className="mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Chat</span>
          </NavLink>
          <NavLink to="/projects" className={({isActive}) => cn("flex flex-col items-center p-2 transition-colors", isActive ? "text-emerald-400" : "text-slate-400")}>
            <FolderKanban size={20} className="mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Work</span>
          </NavLink>
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center p-2 text-slate-400 hover:text-white transition-colors">
            <Menu size={20} className="mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-bold">Más</span>
          </button>
        </nav>
      </div>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
