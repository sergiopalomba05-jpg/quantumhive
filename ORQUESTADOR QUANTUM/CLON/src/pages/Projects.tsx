import { useStore } from '../store/useStore';
import { FolderKanban, Play, AlertTriangle } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

export function Projects() {
  const store = useStore();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <FolderKanban className="text-qh-cyan" /> Proyectos Activos
        </h2>
      </div>

      <div className="space-y-4">
        {store.projects.map(p => (
          <div key={p.id} className="glass-panel p-5 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-xl text-white">{p.name}</h3>
                <span className={cn(
                  "text-xs px-2 py-1 rounded font-mono",
                  p.status === 'active' ? "bg-qh-cyan/20 text-qh-cyan" : 
                  p.status === 'blocked' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"
                )}>
                  {tStatus(p.status)}
                </span>
                <span className="text-xs text-gray-500 border border-white/10 px-2 py-1 rounded">{p.macroDivision}</span>
              </div>
              <p className="text-sm text-gray-300 mb-3">{p.goal}</p>
              
              <div className="flex items-start gap-2 mt-4 text-sm bg-black/30 p-3 rounded-lg border border-white/5">
                <Play size={16} className="text-qh-amber mt-0.5 shrink-0" />
                <div>
                  <div className="text-gray-400 text-xs font-bold">PRÓXIMA ACCIÓN</div>
                  <div className="text-white">{p.nextAction}</div>
                </div>
              </div>
            </div>
            
            <div className="md:w-64 flex flex-col gap-3 text-sm">
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="text-gray-500 text-xs font-bold mb-1">CEO ASIGNADO</div>
                <div className="text-qh-cyan font-medium">{store.agents.find(a => a.id === p.ceoAgentId)?.name || 'Sin asignar'}</div>
              </div>
              
              {p.risks && (
                <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-red-300">
                  <div className="text-red-500/70 text-xs font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> RIESGOS</div>
                  <div>{p.risks}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
