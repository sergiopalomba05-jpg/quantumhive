import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard, MessageSquare, Lightbulb, FolderKanban,
  Bot, Database, CheckSquare, Activity, Cpu, Cloud,
  Scale, Video, Mic, Wrench, TerminalSquare, Eye,
  Lock, ShieldCheck, ScrollText, Package, Newspaper, Share2,
  GitMerge, Wand2, ChevronDown, ChevronRight, Play, Search, Pin, Layers
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
      { to: '/catalogo-herramientas', icon: Video, label: 'Catálogo de Herramientas' },
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
      { to: '/memory', icon: Layers, label: 'Memoria y Organización (6 Capas)' },
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
      { to: '/brain-registry', icon: Brain, label: 'Enrutador de Cerebros' },
      { to: '/api-providers', icon: Plug2, label: 'Proveedores de IA / APIs' }
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
  collapsed?: boolean;
}

export function Sidebar({ variant = 'desktop', collapsed = false }: SidebarProps) {
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
    return (store.pinnedRoutes || []).map(path => navItems.find(n => n.to === path)).filter(Boolean) as typeof navItems;
  };

  return (
    <aside className={cn(
      "quantum-sidebar relative overflow-hidden border-r border-white/10 flex-col shrink-0 h-full bg-transparent shadow-[12px_0_48px_rgba(0,0,0,0.25)] before:absolute before:inset-0 before:bg-[image:linear-gradient(180deg,rgba(2,3,6,0.16),rgba(2,3,6,0.30)),var(--qh-sidebar-image)] before:bg-cover before:bg-center before:opacity-100 before:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(90deg,rgba(5,8,13,0.22),rgba(5,8,13,0.03)),radial-gradient(circle_at_50%_12%,rgba(66,232,255,0.06),transparent_16rem)] after:pointer-events-none",
      variant === 'desktop'
        ? cn("hidden md:flex qh-content-layer transition-[width,opacity,transform,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]", collapsed ? "w-0 -translate-x-5 border-transparent opacity-0 pointer-events-none" : "w-72 opacity-100")
        : "flex w-72"
    )}>
      <div className="relative z-10 overflow-hidden p-4 border-b border-white/10 bg-gradient-to-b from-qh-gold/8 to-transparent">
        <div className="absolute inset-0 opacity-35 mix-blend-screen bg-[image:var(--qh-sidebar-texture)] bg-cover bg-center" aria-hidden="true" />
        <div className="quantumcore-sidebar-brand flex items-center gap-3">
          <img
            src="/brand/custom/quantumhive_isotipo_v01_transparente_recortado.png"
            alt="QuantumCore"
            className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_0_16px_rgba(245,205,112,0.4)]"
          />
          <div className="relative min-w-0">
            <h1 className="text-[13px] font-display font-extrabold uppercase tracking-[0.24em] text-slate-100">QuantumCore</h1>
            <div className="text-[8px] uppercase tracking-[0.34em] text-qh-cyan/80">Sistema Operativo</div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="text-[9px] text-qh-gold/70 uppercase tracking-[0.3em]">Sala de Control</div>
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
            <h3 className="sidebar-section-label px-3 mb-2 flex items-center gap-2">
              <Pin size={10} className="text-qh-gold"/> Favoritos
            </h3>
            <div className="space-y-0.5">
              {getPinnedLinks().map(link => (
                <div key={`pin-${link.to}`} className="flex group relative">
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => cn(
                      "sidebar-nav-link flex-1",
                      isActive ? "sidebar-nav-active" : "sidebar-nav-idle"
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
        <div className="sidebar-concept-tree space-y-4">
          {macroAreas.map(area => {
            const AreaIcon = area.icon;

            return (
              <div key={area.id} className="sidebar-macro-node space-y-1">
                <button
                  onClick={() => toggleGroup(area.id)}
                  className="sidebar-section-trigger w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <span className="sidebar-section-label flex items-center gap-2">
                    <AreaIcon size={15} className="sidebar-macro-icon shrink-0" />
                    {area.title}
                  </span>
                  {expandedGroups[area.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>

                {expandedGroups[area.id] && (
                  <div className="sidebar-subtree space-y-1 pl-5">
                    {area.links.map(link => (
                      <div key={link.to} className="sidebar-subnode flex group relative">
                        <span className="sidebar-subnode-branch" aria-hidden="true" />
                        <NavLink
                          to={link.to}
                          className={({ isActive }) => cn(
                            "sidebar-nav-link flex-1 sidebar-subnode-tab",
                            isActive ? "sidebar-nav-active" : "sidebar-nav-idle"
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
