import { useStore } from '../store/useStore';
import { Activity, AlertTriangle, PlayCircle, FolderKanban } from 'lucide-react';

export function Dashboard() {
  const store = useStore();

  const activeProjects = store.projects.filter(p => p.status === 'active');
  const activeAgents = store.agents.filter(a => a.status === 'active');
  const pendingTasks = store.tasks.filter(t => t.status !== 'done');
  const blockedTasks = store.tasks.filter(t => t.status === 'blocked');
  const recentEvents = [...store.events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="space-y-4 max-w-full mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">Panel del Sistema</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-qh-card border border-qh-border p-3 rounded-lg">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Proyectos Activos</div>
          <div className="text-2xl font-light text-qh-cyan font-mono">{String(activeProjects.length).padStart(2, '0')}</div>
        </div>
        <div className="bg-qh-card border border-qh-border p-3 rounded-lg">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">CEOs Activos</div>
          <div className="text-2xl font-light text-qh-amber font-mono">{String(activeAgents.length).padStart(2, '0')}</div>
        </div>
        <div className="bg-qh-card border border-qh-border p-3 rounded-lg">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Eventos Recientes</div>
          <div className="text-2xl font-light text-emerald-500 font-mono">{String(store.events.length).padStart(2, '0')}</div>
        </div>
        <div className="bg-qh-card border border-qh-border p-3 rounded-lg">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Tareas Pendientes</div>
          <div className="text-2xl font-light text-slate-200 font-mono">{String(pendingTasks.length).padStart(2, '0')}</div>
        </div>
        <div className="bg-qh-card border border-qh-border p-3 rounded-lg border-red-900/30">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Bloqueos</div>
          <div className="text-2xl font-light text-red-500 font-mono">{String(blockedTasks.length).padStart(2, '0')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-qh-card border border-qh-border rounded-lg p-3 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase border-b border-qh-border pb-2 mb-2">Proyectos & Próximas Acciones</h3>
          <div className="space-y-2">
            {activeProjects.map(p => (
              <div key={p.id} className="p-2 bg-slate-900/50 rounded border-l-2 border-qh-cyan">
                <div className="text-[11px] font-bold text-slate-200">{p.name}</div>
                <div className="text-[9px] text-slate-500 italic">Next: {p.nextAction}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-qh-card border border-qh-border rounded-lg p-3 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase border-b border-qh-border pb-2 mb-2">Eventos Recientes (Live)</h3>
          <div className="space-y-1 font-mono text-[9px] text-emerald-400/80 overflow-y-auto">
            {recentEvents.map(e => (
              <div key={e.id} className="flex gap-2">
                <span className="text-slate-600">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
                <span className="text-qh-amber italic">{e.type}:</span>
                <span className="truncate">{e.payload}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
