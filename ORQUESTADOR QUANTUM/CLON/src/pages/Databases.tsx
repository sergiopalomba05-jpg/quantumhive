import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Database, Plus, Search, CheckCircle2, AlertTriangle, ShieldAlert, KeyRound, Lock, ExternalLink } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { DatabaseConnection } from '../types';

export function Databases() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');

  const handleAdd = () => {
    const newDb: DatabaseConnection = {
      id: `db_${Date.now()}`,
      name: name || 'New Database',
      provider: 'Custom',
      dbType: 'relational',
      status: 'simulada',
      purpose: 'memoria, custom',
      hostLabel: 'localhost',
      databaseName: 'db',
      schemaName: 'public',
      whereSecretLives: 'not_configured',
      readOnly: true,
      allowedAgents: [],
      allowedWorkers: [],
      riskLevel: 'medium',
      relatedProjectIds: [],
      notes: 'Added manually'
    };
    useStore.setState(state => ({ databaseConnections: [...state.databaseConnections, newDb] }));
    setShowAdd(false);
    setName('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Database className="text-qh-cyan" /> Bases de Datos
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta bases de datos documentales, relacionales y vectoriales para la memoria de tus agentes y proyectos.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="glass-button flex items-center gap-2">
          <Plus size={16} /> Añadir Base de Datos
        </button>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 text-sm text-red-200">
        <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={16}/>
        <div>
          <strong>Política de Seguridad Zero-Trust:</strong> Las cadenas de conexión (connection strings) y contraseñas NUNCA se solicitan ni almacenan en el frontend. Los agentes y workers deben acceder a través del backend, el cual inyecta credenciales mediante Secret Manager para conexiones marcadas como <em>requiere_secret</em> o <em>requiere_backend</em>.
        </div>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-white mb-4">Añadir Conexión (Mock)</h3>
          <input className="glass-input w-full mb-4" placeholder="Nombre (ej. Production MongoDB, Legacy SQL)" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded" onClick={handleAdd}>Guardar Simulado</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {store.databaseConnections?.length === 0 ? (
          <div className="text-center py-12 text-gray-500 glass-panel md:col-span-3">No hay bases de datos registradas.</div>
        ) : (
          store.databaseConnections?.map(db => (
            <div key={db.id} className="glass-panel p-5 border-l-2 border-qh-cyan flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    {db.name}
                  </h3>
                  <div className="text-xs text-qh-cyan font-mono mt-1">{db.provider} • {db.dbType}</div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 ml-2">
                  {tStatus(db.status)}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2"><strong>Propósito:</strong> {db.purpose}</p>
                <div className="bg-black/30 p-2 rounded border border-white/5 font-mono text-[10px] text-gray-500 break-all">
                  {db.hostLabel} / {db.databaseName}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-black/20 p-2 rounded">
                  <span className="text-gray-500 block mb-1">Acceso:</span>
                  <span className={db.readOnly ? "text-emerald-400 flex items-center gap-1" : "text-qh-gold flex items-center gap-1"}>
                    <Lock size={12}/> {db.readOnly ? 'Solo Lectura' : 'Lectura/Escritura'}
                  </span>
                </div>
                <div className="bg-black/20 p-2 rounded">
                  <span className="text-gray-500 block mb-1">Secretos:</span>
                  <span className={db.whereSecretLives === 'secret_manager' ? "text-qh-cyan flex items-center gap-1" : "text-gray-400 flex items-center gap-1"}>
                    <KeyRound size={12}/> {db.whereSecretLives.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center transition-colors">
                  <ExternalLink size={14} /> Asignar a Agente
                </button>
                {db.status === 'requiere_secret' || db.status === 'requiere_backend' ? (
                  <button className="text-xs px-3 py-2 bg-qh-amber/10 hover:bg-qh-amber/20 text-qh-amber border border-qh-amber/30 rounded flex items-center gap-2 justify-center transition-colors">
                    <AlertTriangle size={14} /> Solicitar Integración Real
                  </button>
                ) : (
                  <button className="text-xs px-3 py-2 bg-qh-cyan/10 hover:bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded flex items-center gap-2 justify-center transition-colors">
                    <Search size={14} /> Probar Conexión (Mock)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
