import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  LayoutDashboard, MessageSquare, Lightbulb, FolderKanban, 
  Bot, Database, CheckSquare, Activity, Cpu, Cloud, 
  Scale, Video, Mic, Wrench, TerminalSquare, Eye,
  Lock, ShieldCheck, ScrollText, Package, Newspaper, Share2,
  GitMerge, Wand2, ChevronDown, ChevronRight, Play, Search, Pin
} from 'lucide-react';
import { BrainCircuit, FolderGit2, ServerCog, Brain, Plug2, DatabaseZap } from 'lucide-react';
import { cn } from '../lib/utils';

export const macroAreas = [
  {
    id: 'command-center',
    title: 'A. Centro de Comando',
    icon: LayoutDashboard,
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Panel' },
      { to: '/start', icon: Play, label: 'Empezar Acá' },
      { to: '/brief', icon: Newspaper, label: 'Resumen Diario' },
      { to: '/approvals', icon: ShieldCheck, label: 'Cola de Aprobación' },
      { to: '/events', icon: Activity, label: 'Actividad / Notificaciones' }
    ]
  },
  {
    id: 'capture-inbox',
    title: 'B. Captura e Inbox',
    icon: Lightbulb,
    links: [
      { to: '/ideas', icon: Lightbulb, label: 'Inbox de Ideas' },
      { to: '/video-inbox', icon: Video, label: 'Bandeja de Videos' },
      { to: '/voice', icon: Mic, label: 'Notas de Voz' }
    ]
  },
  {
    id: 'projects-execution',
    title: 'C. Proyectos y Ejecución',
    icon: FolderKanban,
    links: [
      { to: '/projects', icon: FolderKanban, label: 'Proyectos' },
      { to: '/tasks', icon: CheckSquare, label: 'Tareas' },
      { to: '/planner', icon: GitMerge, label: 'Planificador Visual' },
      { to: '/repo-connector', icon: FolderGit2, label: 'Conector de Repos' }
    ]
  },
  {
    id: 'agents-chat',
    title: 'D. Agentes y Chat',
    icon: Bot,
    links: [
      { to: '/chat', icon: MessageSquare, label: 'Chat Central' },
      { to: '/agents', icon: Bot, label: 'Registro de Agentes' },
      { to: '/agent-builder', icon: Bot, label: 'Creador de Agentes' },
      { to: '/worker-registry', icon: ServerCog, label: 'Registro de Workers' },
      { to: '/channels', icon: MessageSquare, label: 'Canales de Comunicación' },
      { to: '/live-assistant', icon: Eye, label: 'Asistente en Vivo' }
    ]
  },
  {
    id: 'knowledge-memory',
    title: 'E. Conocimiento y Memoria',
    icon: Database,
    links: [
      { to: '/memory', icon: Database, label: 'Memoria Compartida' },
      { to: '/decisions', icon: Scale, label: 'Decisiones' },
      { to: '/graph', icon: Share2, label: 'Grafo de Conocimiento' },
      { to: '/packs', icon: Package, label: 'Paquetes de Contexto' },
      { to: '/audit', icon: ScrollText, label: 'Registro de Auditoría' }
    ]
  },
  {
    id: 'intelligence',
    title: 'F. Inteligencia y Automatización',
    icon: BrainCircuit,
    links: [
      { to: '/prompt-studio', icon: Wand2, label: 'Estudio de Prompts' },
      { to: '/skill-advisor', icon: BrainCircuit, label: 'Asesor de Skills' },
      { to: '/models', icon: Cpu, label: 'Enrutador de Modelos' },
      { to: '/brain-registry', icon: Brain, label: 'Enrutador de Cerebros' }
    ]
  },
  {
    id: 'workspace',
    title: 'G. Bases de Datos, Workspace e Integr.',
    icon: Cloud,
    links: [
      { to: '/databases', icon: DatabaseZap, label: 'Bases de Datos' },
      { to: '/workspace', icon: Cloud, label: 'Integraciones Workspace' },
      { to: '/connections', icon: Lock, label: 'Registro Conexiones' },
      { to: '/cloud', icon: Cloud, label: 'Recursos Cloud' }
    ]
  },
  {
    id: 'dev-env',
    title: 'H. Entorno de Desarrollo',
    icon: TerminalSquare,
    links: [
      { to: '/dev-env', icon: TerminalSquare, label: 'Entorno de Desarrollo' },
      { to: '/mcp-hub', icon: Plug2, label: 'MCP / API / CLI Hub' }
    ]
  }
];

// Flat nav items for compat
export const navItems = macroAreas.flatMap(a => a.links);

interface SidebarProps {
  variant?: 'desktop' | 'drawer';
}

export function Sidebar({ variant = 'desktop' }: SidebarProps) {
  const store = useStore();
  const location = useLocation();
  const currentPath = location.pathname;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('qh-expanded-groups');
      return stored ? JSON.parse(stored) : { 'command-center': true, 'capture-inbox': true };
    } catch {
      return { 'command-center': true };
    }
  });

  useEffect(() => {
    localStorage.setItem('qh-expanded-groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getPinnedLinks = () => {
    return store.pinnedRoutes.map(path => navItems.find(n => n.to === path)).filter(Boolean) as typeof navItems;
  };

  return (
    <aside className={cn(
      "relative overflow-hidden w-72 border-r border-white/10 flex-col shrink-0 bg-qh-panel/88 h-full shadow-[12px_0_48px_rgba(0,0,0,0.35)] ring-1 ring-qh-gold/5 before:absolute before:inset-0 before:bg-[image:linear-gradient(180deg,rgba(2,3,6,0.58),rgba(2,3,6,0.68)),var(--qh-sidebar-image)] before:bg-cover before:bg-center before:opacity-100 before:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_12%,rgba(245,205,112,0.18),transparent_16rem)] after:pointer-events-none",
      variant === 'desktop' ? "hidden md:flex qh-content-layer" : "flex"
    )}>
      <div className="relative z-10 overflow-hidden p-4 border-b border-white/10 bg-gradient-to-b from-qh-gold/8 to-transparent">
        <div className="absolute inset-0 opacity-35 mix-blend-screen bg-[image:var(--qh-sidebar-texture)] bg-cover bg-center" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_14px_rgba(245,205,112,0.55)]">
            <path d="M50 5L90 28.094V74.282L50 97.376L10 74.282V28.094L50 5Z" stroke="#d4af37" strokeWidth="4" fill="rgba(212,175,55,0.1)"/>
            <circle cx="50" cy="50" r="15" stroke="#d4af37" strokeWidth="2" fill="none"/>
            <circle cx="50" cy="50" r="4" fill="#d4af37"/>
            <line x1="50" y1="25" x2="50" y2="35" stroke="#d4af37" strokeWidth="2"/>
            <line x1="50" y1="75" x2="50" y2="65" stroke="#d4af37" strokeWidth="2"/>
            <line x1="28.35" y1="37.5" x2="37.01" y2="42.5" stroke="#d4af37" strokeWidth="2"/>
            <line x1="71.65" y1="62.5" x2="62.99" y2="57.5" stroke="#d4af37" strokeWidth="2"/>
            <line x1="71.65" y1="37.5" x2="62.99" y2="42.5" stroke="#d4af37" strokeWidth="2"/>
            <line x1="28.35" y1="62.5" x2="37.01" y2="57.5" stroke="#d4af37" strokeWidth="2"/>
          </svg>
          <div className="relative min-w-0">
            <img src="/brand/curated/logo-lockup.jpeg" alt="QuantumHive" className="mb-1 h-5 w-auto max-w-[170px] object-contain mix-blend-screen" />
            <h1 className="text-[13px] font-display font-extrabold uppercase tracking-[0.24em] text-slate-100">Quantum<span className="text-qh-gold">Hive</span></h1>
            <div className="text-[8px] uppercase tracking-[0.34em] text-qh-cyan/70">Control Plane</div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="text-[9px] text-qh-gold/70 uppercase tracking-[0.3em]">Sala de Control</div>
          <select 
            value={store.userMode}
            onChange={(e) => store.setUserMode(e.target.value as any)}
            className="bg-slate-950/80 border border-white/10 text-slate-300 text-[9px] uppercase font-bold rounded-full px-2 py-1 outline-none focus:border-qh-cyan"
          >
            <option value="beginner">Principiante</option>
            <option value="power">Usuario Avanzado</option>
            <option value="developer">Desarrollador</option>
          </select>
        </div>
      </div>
      
      <div className="relative z-10 flex-1 overflow-y-auto p-2 hide-scrollbar">
        {/* Próxima Mejor Acción Widget */}
        <div className="relative overflow-hidden rounded-[1.25rem] border border-qh-gold/15 bg-slate-950/62 p-3 mb-4 ring-1 ring-qh-cyan/10">
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-qh-gold/10 blur-2xl" />
          <h3 className="relative text-[9px] uppercase tracking-widest text-qh-cyan font-bold mb-2">Próxima Mejor Acción</h3>
          <p className="text-xs text-slate-400 leading-tight">Revisar Resumen Diario y confirmar 2 aprobaciones pendientes.</p>
        </div>

        {/* Pinned Routes */}
        {getPinnedLinks().length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 mb-2 flex items-center gap-2">
              <Pin size={10} className="text-qh-gold"/> Favoritos
            </h3>
            <div className="space-y-0.5">
              {getPinnedLinks().map(link => (
                <div key={`pin-${link.to}`} className="flex group relative">
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => cn(
                      "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      isActive 
                        ? "bg-qh-cyan/10 text-qh-cyan border-l-2 border-qh-cyan shadow-[0_0_22px_rgba(66,232,255,0.1)]" 
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <link.icon size={14} className="shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                  <button onClick={() => store.togglePinnedRoute(link.to)} className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity">
                    <Pin size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Macro Areas */}
        <div className="space-y-4">
          {macroAreas.map(area => {
            // Respect user mode: Hide Dev Env if beginner
            if (store.userMode === 'beginner' && (area.id === 'dev-env' || area.id === 'intelligence')) return null;

            return (
              <div key={area.id} className="space-y-1">
                <button 
                  onClick={() => toggleGroup(area.id)}
                  className="w-full flex items-center justify-between px-3 py-1 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                    {area.title}
                  </span>
                  {expandedGroups[area.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                
                {expandedGroups[area.id] && (
                  <div className="space-y-0.5 pl-2">
                    {area.links.map(link => (
                      <div key={link.to} className="flex group relative">
                        <NavLink
                          to={link.to}
                          className={({ isActive }) => cn(
                            "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                            isActive 
                              ? "bg-qh-cyan/10 text-qh-cyan border-l-2 border-qh-cyan shadow-[0_0_22px_rgba(66,232,255,0.1)]" 
                              : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                          )}
                        >
                          <link.icon size={14} className="shrink-0 opacity-70" />
                          <span>{link.label}</span>
                        </NavLink>
                        <button onClick={() => store.togglePinnedRoute(link.to)} className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-qh-gold transition-opacity">
                          <Pin size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
