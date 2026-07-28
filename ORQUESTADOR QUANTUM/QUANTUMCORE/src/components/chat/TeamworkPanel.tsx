import React, { useEffect, useState } from 'react';
import { Network, Activity, Trash2, MessageSquare, Play, Pause } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WorkerData {
  id: string;
  role: string;
  task: string;
  status: 'running' | 'idle' | 'error' | 'finished';
  createdAt: number;
}

export function TeamworkPanel() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let interval: any;
    
    const fetchWorkers = async () => {
      try {
        const res = await fetch('/api/workers/status');
        if (res.ok) {
          const data = await res.json();
          setWorkers(data.workers || []);
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    };
    
    fetchWorkers();
    interval = setInterval(fetchWorkers, 3000); // poll every 3s
    
    return () => clearInterval(interval);
  }, []);

  if (workers.length === 0) return null;

  return (
    <div className="bg-slate-900 border-l border-t border-b border-qh-border rounded-l-xl flex flex-col transition-all duration-300 w-80 shadow-2xl z-10">
      <div 
        className="p-3 border-b border-qh-border flex justify-between items-center bg-slate-800 rounded-tl-xl cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-bold text-qh-gold flex items-center gap-2 text-sm">
          <Network size={16} /> Teamwork Preview ({workers.length})
        </h3>
        <Activity size={14} className="text-qh-cyan animate-pulse" />
      </div>

      {expanded && (
        <div className="p-3 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
          {workers.map(w => (
            <div key={w.id} className="bg-black/50 border border-slate-700 p-3 rounded-lg relative overflow-hidden group">
               {/* Status indicator line */}
               <div className={cn(
                 "absolute left-0 top-0 bottom-0 w-1",
                 w.status === 'running' ? "bg-qh-cyan" :
                 w.status === 'error' ? "bg-red-500" :
                 w.status === 'finished' ? "bg-emerald-500" : "bg-qh-amber"
               )} />
               
               <div className="pl-2">
                 <div className="flex justify-between items-start mb-1">
                   <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{w.role}</h4>
                   <span className={cn(
                     "text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded",
                     w.status === 'running' ? "bg-qh-cyan/20 text-qh-cyan animate-pulse" :
                     w.status === 'error' ? "bg-red-500/20 text-red-400" :
                     w.status === 'finished' ? "bg-emerald-500/20 text-emerald-400" : "bg-qh-amber/20 text-qh-amber"
                   )}>
                     {w.status}
                   </span>
                 </div>
                 
                 <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-2" title={w.task}>
                   {w.task}
                 </p>
                 
                 <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                   <button className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors" title="Kill Worker">
                     <Trash2 size={12} />
                   </button>
                   <button className="text-slate-500 hover:text-qh-cyan p-1 rounded hover:bg-qh-cyan/10 transition-colors" title="Message Worker">
                     <MessageSquare size={12} />
                   </button>
                   <div className="flex-1"></div>
                   <span className="text-[9px] text-slate-600 font-mono">
                     {new Date(w.createdAt).toLocaleTimeString()}
                   </span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
