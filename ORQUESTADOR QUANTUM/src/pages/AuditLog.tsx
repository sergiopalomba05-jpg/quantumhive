import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ScrollText, Search, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuditLog } from '../types';

export function AuditLogView() {
  const store = useStore();
  const [filter, setFilter] = useState('');
  
  const mockLogs: AuditLog[] = [
    { id: '1', action: 'login', actor: 'sergio', module: 'auth', summary: 'User logged in via Google', timestamp: Date.now() - 1000 * 60 * 120, severity: 'info' },
    { id: '2', action: 'create', actor: 'user', module: 'ideas', summary: 'Created idea: New Mobile App', timestamp: Date.now() - 1000 * 60 * 60, severity: 'info' },
    { id: '3', action: 'model_call', actor: 'HumanIA Agent', module: 'models', summary: 'Called Vertex AI for Idea analysis', timestamp: Date.now() - 1000 * 60 * 59, severity: 'info' },
    { id: '4', action: 'workspace_action', actor: 'system', module: 'system', summary: 'Requested approval for: Send email', timestamp: Date.now() - 1000 * 60 * 30, severity: 'warning' },
  ];

  const logs = store.auditLogs.length > 0 ? store.auditLogs : mockLogs;
  
  const filteredLogs = logs.filter(l => 
    l.summary.toLowerCase().includes(filter.toLowerCase()) || 
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.actor.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <ScrollText className="text-qh-cyan" size={28} /> Audit Log
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Immutable record of all system events and actions</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-qh-card border border-qh-border p-3 rounded-lg">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search logs by actor, action, or summary..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-qh-gold transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="bg-black/40 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-900/60 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
          <div className="col-span-2">Time</div>
          <div className="col-span-1">Severity</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-2">Action / Module</div>
          <div className="col-span-5">Summary</div>
        </div>
        
        <div className="divide-y divide-slate-800/50">
          {filteredLogs.map(log => (
            <div key={log.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-800/30 transition-colors">
              <div className="col-span-2 text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
              <div className="col-span-1">
                 <span className={cn(
                   "px-2 py-0.5 rounded text-[9px] uppercase tracking-widest",
                   log.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                   log.severity === 'warning' ? 'bg-qh-amber/20 text-qh-amber' :
                   'bg-slate-800 text-slate-400'
                 )}>{log.severity}</span>
              </div>
              <div className="col-span-2 text-qh-gold">{log.actor}</div>
              <div className="col-span-2 text-slate-400">{log.action} <span className="opacity-50">/ {log.module}</span></div>
              <div className="col-span-5 text-slate-300">{log.summary}</div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-sans">No logs found matching your criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}
