import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';

import { createControlRoomStyle, normalizePointerPosition } from '../lib/controlRoomTheme';
import { createVisualProfileStyle, getVisualProfileForPath } from '../lib/visualProfiles';
import { cn } from '../lib/utils';
import {
  X, Menu, Lightbulb, Play, FolderKanban, MessageSquare, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { ContextualAssistantWidget } from './assistants/ContextualAssistantWidget';
import { SectionAssistantPrompt } from './assistants/SectionAssistantPrompt';

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [controlRoomPointer, setControlRoomPointer] = useState({ x: 62, y: 28 });
  const location = useLocation();
  const visualProfile = getVisualProfileForPath(location.pathname);
  const isChatRoute = location.pathname === '/chat';

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

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    setControlRoomPointer(normalizePointerPosition(event.clientX, event.clientY, window.innerWidth, window.innerHeight));
  };

  return (
    <div
      className="qh-shell flex h-screen overflow-hidden"
      style={{
        ...createControlRoomStyle(controlRoomPointer),
        ...createVisualProfileStyle(visualProfile),
      } as React.CSSProperties}
      onPointerMove={handlePointerMove}
    >
      <div className="qh-control-room-bg" aria-hidden="true" />
      <div className="qh-cursor-reactor" aria-hidden="true" />
      <div className="qh-live-circuit qh-live-circuit-a" aria-hidden="true" />
      <div className="qh-live-circuit qh-live-circuit-b" aria-hidden="true" />
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="hidden md:block">
        {sidebarCollapsed ? (
          <button
            type="button"
            aria-label="Mostrar navegación"
            onClick={() => setSidebarCollapsed(false)}
            className="sidebar-edge-toggle"
            style={{ left: '0.25rem' }}
            title="Mostrar navegación"
          >
            <PanelLeftOpen size={16} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Ocultar navegación"
            onClick={() => setSidebarCollapsed(true)}
            className="sidebar-edge-toggle"
            style={{ left: '17.85rem' }}
            title="Ocultar navegación"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/55 text-qh-cyan backdrop-blur-xl md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir navegación"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

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
            <div className="p-6 h-full overflow-y-auto hide-scrollbar">
              <h1 className="text-xl font-display font-bold text-qh-amber mb-6">QuantumHive</h1>
              <Sidebar variant="drawer" />
            </div>
          </div>
        </div>
      )}
      <div className="qh-content-layer flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className={cn(
          "flex-1 bg-transparent",
          isChatRoute ? "min-h-0 overflow-hidden p-0" : "overflow-y-auto p-4 pb-20 md:p-6 md:pb-6"
        )}>
          {!isChatRoute && <Breadcrumbs />}
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 border-t border-white/10 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_30px_rgba(0,0,0,0.65)] z-40">
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
      <ContextualAssistantWidget />
      <SectionAssistantPrompt />
    </div>
  );
}
