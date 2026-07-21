import { useStore } from '../store/useStore';
import { Share2, ArrowRight } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

export function RelationshipGraph() {
  const store = useStore();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Share2 className="text-qh-cyan" size={28} /> Relationship Graph
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Mapa de dependencias entre entidades (Proyectos, Tareas, Agentes)</p>
        </div>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-x-auto">
         
         <div className="min-w-[800px] flex justify-between">
            {/* Column 1: Projects */}
            <div className="w-64 space-y-4">
               <h3 className="text-qh-gold font-bold uppercase tracking-widest text-xs mb-4 text-center">Projects</h3>
               {store.projects.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-700 p-3 rounded-lg relative">
                     <div className="text-sm font-bold text-slate-200 truncate">{p.name}</div>
                     <div className="text-[10px] text-slate-500 uppercase">{tStatus(p.status)}</div>
                     {/* Connector right */}
                     <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 text-slate-600 px-2 flex items-center">
                        <ArrowRight size={14} />
                     </div>
                  </div>
               ))}
            </div>

            {/* Column 2: Tasks & Decisions */}
            <div className="w-64 space-y-4">
               <h3 className="text-qh-cyan font-bold uppercase tracking-widest text-xs mb-4 text-center">Tasks & Context</h3>
               {store.tasks.slice(0, 5).map(t => (
                  <div key={t.id} className="bg-slate-900 border border-qh-cyan/30 p-3 rounded-lg relative">
                     <div className="text-sm text-slate-200 truncate">{t.title}</div>
                     <div className="text-[10px] text-qh-cyan uppercase">{tStatus(t.status)}</div>
                     {/* Connector right */}
                     <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 text-slate-600 px-2 flex items-center">
                        <ArrowRight size={14} />
                     </div>
                  </div>
               ))}
            </div>

            {/* Column 3: Agents */}
            <div className="w-64 space-y-4">
               <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-4 text-center">Assigned Agents</h3>
               {store.agents.map(a => (
                  <div key={a.id} className="bg-slate-900 border border-purple-500/30 p-3 rounded-lg">
                     <div className="text-sm font-bold text-slate-200 truncate">{a.name}</div>
                     <div className="text-[10px] text-purple-400 uppercase">{a.role}</div>
                  </div>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
}
