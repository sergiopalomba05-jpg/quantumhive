import { useStore } from '../store/useStore';
import { Cloud, Lock, Server, Link, AlertTriangle } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { Connection } from '../types';

export function ConnectionsRegistry() {
  const store = useStore();
  
  // Create mock connections if empty
  const mockConnections: Connection[] = [
    { id: 'vertex', name: 'Vertex AI', provider: 'Google Cloud', status: 'connected', whereStored: 'Secret Manager', requiredScopes: 'aiplatform.googleapis.com', riskLevel: 'high', notes: 'Main production model routing', lastChecked: Date.now() },
    { id: 'azure', name: 'Azure Foundry', provider: 'Microsoft', status: 'connected', whereStored: 'Secret Manager', requiredScopes: 'Cognitive Services', riskLevel: 'high', notes: 'Fallback models', lastChecked: Date.now() },
    { id: 'firestore', name: 'Firestore / Auth', provider: 'Firebase', status: 'connected', whereStored: 'Service Account', requiredScopes: 'datastore, auth', riskLevel: 'critical', notes: 'Core persistent state', lastChecked: Date.now() },
    { id: 'gmail', name: 'Gmail API', provider: 'Google Workspace', status: 'mock', whereStored: 'OAuth', requiredScopes: 'mail.readonly, mail.send', riskLevel: 'high', notes: 'Reading important emails', lastChecked: Date.now() },
    { id: 'calendar', name: 'Calendar API', provider: 'Google Workspace', status: 'mock', whereStored: 'OAuth', requiredScopes: 'calendar.events', riskLevel: 'medium', notes: 'Scheduling block times', lastChecked: Date.now() },
    { id: 'mcp-local', name: 'Local FS MCP', provider: 'Custom', status: 'disconnected', whereStored: 'Local', requiredScopes: 'fs.read, fs.write', riskLevel: 'critical', notes: 'Requiere inicio manual', lastChecked: Date.now() }
  ];

  const connections = store.connections.length > 0 ? store.connections : mockConnections;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Lock className="text-qh-cyan" size={28} /> Connections & Secrets
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Registry of internal endpoints, API keys, and OAuth connections</p>
        </div>
      </div>
      
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200 font-mono space-y-2 mb-6">
         <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={14} />
            <div>
               <strong className="text-red-300">Safety Rule Active:</strong> Secrets are NEVER stored in localStorage or exposed to the client. Real keys are managed server-side via Secret Manager.
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => (
          <div key={conn.id} className="bg-qh-card border border-qh-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-qh-gold">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-slate-200 font-bold">{conn.name}</h3>
                  <div className="text-[10px] text-slate-400 font-mono">{conn.provider}</div>
                </div>
              </div>
              <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold border",
                  conn.status === 'connected' ? 'bg-qh-emerald/10 text-qh-emerald border-qh-emerald/20' : 
                  conn.status === 'mock' ? 'bg-qh-gold/10 text-qh-gold border-qh-gold/20' : 
                  'bg-slate-800 text-slate-400 border-slate-600'
                )}>
                  {tStatus(conn.status)}
              </span>
            </div>

            <div className="space-y-3 mt-4 pt-4 border-t border-qh-border/50 text-xs font-mono">
               <div className="flex justify-between">
                  <span className="text-slate-500">Stored In:</span>
                  <span className="text-slate-300">{conn.whereStored}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level:</span>
                  <span className={cn(
                    "font-bold uppercase tracking-widest text-[9px]",
                    conn.riskLevel === 'critical' ? 'text-red-400' :
                    conn.riskLevel === 'high' ? 'text-qh-amber' :
                    'text-qh-cyan'
                  )}>{conn.riskLevel}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500">Scopes:</span>
                  <span className="text-slate-300 max-w-[200px] truncate" title={conn.requiredScopes}>{conn.requiredScopes}</span>
               </div>
               <div className="pt-2 text-slate-400 font-sans text-xs italic">
                 {conn.notes}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
