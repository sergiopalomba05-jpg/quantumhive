import { useStore } from '../store/useStore';
import { Activity, AlertTriangle, PlayCircle, FolderKanban, Bot, ShieldCheck, Sparkles } from 'lucide-react';

export function Dashboard() {
  const store = useStore();

  const activeProjects = store.projects.filter(p => p.status === 'active');
  const activeAgents = store.agents.filter(a => a.status === 'active');
  const pendingTasks = store.tasks.filter(t => t.status !== 'done');
  const blockedTasks = store.tasks.filter(t => t.status === 'blocked');
  const recentEvents = [...store.events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="space-y-5 max-w-full mx-auto">
      <div className="qh-hero-card">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-qh-gold/20 bg-qh-gold/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-qh-gold">
              <Sparkles size={12} /> QuantumHive Control Room
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-3xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">
              Sala de control para agentes, decisiones y ejecución segura.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Visión operativa del sistema: proyectos activos, CEOs digitales, bloqueos y eventos recientes sin ejecutar acciones destructivas fuera de la cola de aprobación.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4 ring-1 ring-qh-cyan/10">
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Estado del Núcleo</div>
            <div className="mt-3 flex items-center gap-3 text-emerald-400">
              <Activity size={22} />
              <span className="font-mono text-2xl">ÓPTIMO</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest text-slate-400">
              <span className="rounded-full border border-white/10 px-3 py-2">Mock seguro</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Auditado</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="qh-stat-card">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Proyectos Activos</div>
          <div className="relative text-3xl font-light text-qh-cyan font-mono">{String(activeProjects.length).padStart(2, '0')}</div>
        </div>
        <div className="qh-stat-card">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">CEOs Activos</div>
          <div className="relative text-3xl font-light text-qh-amber font-mono">{String(activeAgents.length).padStart(2, '0')}</div>
        </div>
        <div className="qh-stat-card">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Eventos Recientes</div>
          <div className="relative text-3xl font-light text-emerald-500 font-mono">{String(store.events.length).padStart(2, '0')}</div>
        </div>
        <div className="qh-stat-card">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Tareas Pendientes</div>
          <div className="relative text-3xl font-light text-slate-200 font-mono">{String(pendingTasks.length).padStart(2, '0')}</div>
        </div>
        <div className="qh-stat-card border-red-900/30">
          <div className="text-[9px] text-slate-500 uppercase tracking-tighter">Bloqueos</div>
          <div className="relative text-3xl font-light text-red-500 font-mono">{String(blockedTasks.length).padStart(2, '0')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase border-b border-white/10 pb-3 mb-3 flex items-center gap-2"><FolderKanban size={14} className="text-qh-cyan" /> Proyectos y próximas acciones</h3>
          <div className="space-y-2">
            {activeProjects.map(p => (
              <div key={p.id} className="p-3 bg-slate-950/50 rounded-2xl border border-white/10 border-l-qh-cyan">
                <div className="text-[11px] font-bold text-slate-200">{p.name}</div>
                <div className="text-[9px] text-slate-500 italic">Siguiente: {p.nextAction}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel p-4 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase border-b border-white/10 pb-3 mb-3 flex items-center gap-2"><ShieldCheck size={14} className="text-qh-gold" /> Eventos recientes en vivo</h3>
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
