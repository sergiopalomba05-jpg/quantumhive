import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ServerCog, Plus, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { WorkerDefinition } from '../types';

export function WorkerRegistry() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  
  const handleAdd = () => {
    const newWorker: WorkerDefinition = {
      id: `worker_${Date.now()}`,
      name: name || 'New Worker',
      type: 'internal_mock',
      runtime: 'local',
      status: 'simulado',
      capabilities: ['read_repo', 'run_cli'],
      allowedProjects: [],
      requiresApproval: true,
      riskLevel: 'medium',
      notes: 'Mock worker'
    };
    useStore.setState(state => ({ workerDefinitions: [...state.workerDefinitions, newWorker] }));
    setShowAdd(false);
    setName('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <ServerCog className="text-purple-400" /> Registro de Workers
          </h2>
          <p className="text-sm text-gray-400 mt-1">Registra cuerpos ejecutores que pueden realizar tareas para agentes.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="glass-button flex items-center gap-2">
          <Plus size={16} /> Añadir Worker
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-white mb-4">Añadir Worker (Mock)</h3>
          <input className="glass-input w-full mb-4" placeholder="Nombre (ej. OpenCode Worker, Local Desktop)" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded" onClick={handleAdd}>Guardar Simulado</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.workerDefinitions?.length === 0 ? (
          <div className="text-center py-12 text-gray-500 glass-panel md:col-span-2">No hay workers registrados.</div>
        ) : (
          store.workerDefinitions?.map(w => (
            <div key={w.id} className="glass-panel p-5 border-l-2 border-purple-500">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">{w.name}</h3>
                  <div className="text-xs text-gray-500 font-mono mt-1">Tipo: {w.type} | Runtime: {w.runtime}</div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {tStatus(w.status)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {w.capabilities.map(cap => (
                  <span key={cap} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
                    {cap}
                  </span>
                ))}
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Requiere Aprobación:</span>
                  <span className={w.requiresApproval ? "text-qh-cyan flex items-center gap-1" : "text-qh-amber flex items-center gap-1"}>
                    {w.requiresApproval ? <><ShieldCheck size={12}/> Sí</> : <><AlertTriangle size={12}/> No</>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Risk Level:</span>
                  <span className={
                    w.riskLevel === 'critical' ? 'text-red-400' :
                    w.riskLevel === 'high' ? 'text-orange-400' :
                    w.riskLevel === 'medium' ? 'text-qh-gold' : 'text-emerald-400'
                  }>{w.riskLevel.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
