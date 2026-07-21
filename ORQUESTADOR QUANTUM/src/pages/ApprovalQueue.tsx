import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ShieldCheck, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { SystemService } from '../services/system';
import { ApprovalRequest } from '../types';

export function ApprovalQueue() {
  const store = useStore();
  
  const mockApprovals: ApprovalRequest[] = [
    { id: '1', actionType: 'send_email', description: 'Send daily brief to investors', requester: 'HumanIA Agent', status: 'pending', timestamp: Date.now() - 1000 * 60 * 5, riskLevel: 'high' },
    { id: '2', actionType: 'delete_entity', description: 'Delete 14 stale projects', requester: 'System Monitor', status: 'pending', timestamp: Date.now() - 1000 * 60 * 30, riskLevel: 'critical' },
    { id: '3', actionType: 'paid_api', description: 'Run bulk processing on 50 videos (est $5.00)', requester: 'Video Analysis Pipeline', status: 'pending', timestamp: Date.now() - 1000 * 60 * 60, riskLevel: 'medium' }
  ];

  const approvals = store.approvals.length > 0 ? store.approvals : mockApprovals;
  const pending = approvals.filter(a => a.status === 'pending');
  const past = approvals.filter(a => a.status !== 'pending');

  const handleApprove = (id: string) => {
    // if using mock, just update local state visually if we want, but store is better
    if (store.approvals.find(a => a.id === id)) {
      SystemService.approveAction(id);
    } else {
      alert("Simulado approval approved (in real app, this executes the action)");
    }
  };

  const handleReject = (id: string) => {
    if (store.approvals.find(a => a.id === id)) {
      SystemService.rejectAction(id);
    } else {
      alert("Simulado approval rejected");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <ShieldCheck className="text-qh-cyan" size={28} /> Cola de Aprobación
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Human-in-the-loop authorization for sensitive agent actions</p>
        </div>
      </div>

      <div className="p-4 bg-slate-900/60 border border-qh-border rounded-xl text-xs text-slate-400 font-mono space-y-2 mb-6">
         <div className="flex items-start gap-2">
            <ShieldAlert className="text-qh-amber shrink-0 mt-0.5" size={14} />
            <div>
               <strong className="text-slate-300">Safety Rule Active:</strong> Agents cannot execute destructive actions, send emails, or incur high costs without explicit human approval.
            </div>
         </div>
      </div>

      <h3 className="text-lg font-bold text-slate-300 mb-2">Pending Authorizations ({pending.length})</h3>
      
      {pending.length === 0 && (
        <div className="text-center p-10 bg-slate-900/30 border border-slate-800 rounded-xl text-slate-500 text-sm">
          No pending approvals.
        </div>
      )}

      <div className="space-y-4">
        {pending.map(a => (
          <div key={a.id} className={cn(
            "bg-qh-card border rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4",
            a.riskLevel === 'critical' ? 'border-red-500/50' : 'border-qh-border'
          )}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={cn(
                  "text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border",
                  a.riskLevel === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                  a.riskLevel === 'high' ? 'bg-qh-amber/10 text-qh-amber border-qh-amber/20' :
                  'bg-qh-cyan/10 text-qh-cyan border-qh-cyan/20'
                )}>{a.riskLevel} Risk</span>
                <span className="text-xs text-slate-500 font-mono">{a.actionType}</span>
              </div>
              <h4 className="text-slate-200 font-bold text-base">{a.description}</h4>
              <div className="text-xs text-slate-400 mt-1">Requested by: <span className="text-qh-gold font-mono">{a.requester}</span> • {new Date(a.timestamp).toLocaleTimeString()}</div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
               <button onClick={() => handleReject(a.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                  <X size={14} /> Reject
               </button>
               <button onClick={() => handleApprove(a.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-qh-emerald/10 text-qh-emerald border border-qh-emerald/30 hover:bg-qh-emerald/20 transition-colors">
                  <Check size={14} /> Approve
               </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-slate-300 mt-10 mb-2">Past Approvals</h3>
      <div className="space-y-3">
        {past.slice(0, 5).map(a => (
          <div key={a.id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 flex justify-between items-center opacity-70">
            <div>
              <div className="text-slate-300 text-sm font-medium">{a.description}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">{a.actionType} • {new Date(a.timestamp).toLocaleTimeString()}</div>
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-widest font-bold",
              a.status === 'approved' ? 'text-qh-emerald' : 'text-red-400'
            )}>{tStatus(a.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
