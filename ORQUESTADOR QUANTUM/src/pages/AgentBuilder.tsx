import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Bot, Plus, ArrowRight, Brain, Database, FolderGit2, ServerCog, Plug2, MessageSquare, Shield, CheckCircle2, Maximize2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Agent } from '../types';

export function AgentBuilder() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  const [primaryWorker, setPrimaryWorker] = useState('');
  const [approvalPolicy, setApprovalPolicy] = useState('solo_modo_lectura');
  
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [selectedMcpServers, setSelectedMcpServers] = useState<string[]>([]);

  const handleSave = () => {
    const newAgent: Agent = {
      id: `agent_${Date.now()}`,
      name: name || 'New Agent',
      role: role || 'Assistant',
      macroDivision: 'General',
      status: 'active',
      preferredModel: 'vertex',
      workerIds: primaryWorker && primaryWorker !== 'none' ? [primaryWorker] : [],
      approvalPolicy: approvalPolicy,
      mcpServerIds: selectedMcpServers
    };
    useStore.setState(state => ({ agents: [...state.agents, newAgent] }));
    
    // Si queremos bindear las bases de datos al agente:
    if (selectedDatabases.length > 0) {
      const dbBindings = selectedDatabases.map(dbId => ({
        id: `adb_${Date.now()}_${dbId}`,
        agentId: newAgent.id,
        databaseId: dbId,
        permissions: ['read', 'write']
      }));
      useStore.setState(state => ({ agentDatabaseBindings: [...state.agentDatabaseBindings, ...dbBindings] }));
    }

    setShowAdd(false);
    setStep(1);
    setName('');
    setRole('');
    setPrimaryWorker('');
    setSelectedDatabases([]);
    setSelectedMcpServers([]);
  };

  const toggleSelection = (list: string[], setList: (l: string[]) => void, id: string) => {
    if (list.includes(id)) {
      setList(list.filter(item => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Expanded Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-white flex items-center gap-2"><Brain className="text-qh-amber" size={18}/> Editor de System Prompt</h3>
              <button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1">
              <textarea 
                className="w-full h-[400px] bg-black/40 border border-slate-700 rounded-lg p-4 text-sm text-slate-200 font-mono focus:border-qh-cyan focus:ring-1 focus:ring-qh-cyan resize-none outline-none"
                placeholder="Escribe las instrucciones detalladas, el comportamiento, el formato de salida y cualquier otra restricción para este agente..."
                value={role}
                onChange={e => setRole(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/50">
              <button className="px-4 py-2 text-sm text-slate-400 hover:text-white" onClick={() => setShowPromptModal(false)}>Cerrar</button>
              <button className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded" onClick={() => setShowPromptModal(false)}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Bot className="text-qh-cyan" /> Creador de Agentes
          </h2>
          <p className="text-sm text-gray-400 mt-1">Orquesta agentes conectando cerebros, memoria, repos, workers y skills.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="glass-button flex items-center gap-2">
          {showAdd ? 'Cancelar' : <><Plus size={16} /> Crear Agente</>}
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-8 text-xs sm:text-sm overflow-x-auto pb-2">
            <div className={cn("flex items-center gap-2 whitespace-nowrap", step >= 1 ? "text-qh-cyan font-bold" : "text-gray-500")}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0", step >= 1 ? "bg-qh-cyan/20 border border-qh-cyan" : "bg-black/30 border border-white/10")}>1</div>
              <span>Identidad</span>
            </div>
            <div className="h-[1px] bg-white/10 w-8 sm:w-12 shrink-0"></div>
            <div className={cn("flex items-center gap-2 whitespace-nowrap", step >= 2 ? "text-purple-400 font-bold" : "text-gray-500")}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0", step >= 2 ? "bg-purple-400/20 border border-purple-400" : "bg-black/30 border border-white/10")}>2</div>
              <span>Worker</span>
            </div>
            <div className="h-[1px] bg-white/10 w-8 sm:w-12 shrink-0"></div>
            <div className={cn("flex items-center gap-2 whitespace-nowrap", step >= 3 ? "text-emerald-400 font-bold" : "text-gray-500")}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0", step >= 3 ? "bg-emerald-400/20 border border-emerald-400" : "bg-black/30 border border-white/10")}>3</div>
              <span>Herramientas</span>
            </div>
            <div className="h-[1px] bg-white/10 w-8 sm:w-12 shrink-0"></div>
            <div className={cn("flex items-center gap-2 whitespace-nowrap", step >= 4 ? "text-qh-gold font-bold" : "text-gray-500")}>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0", step >= 4 ? "bg-qh-gold/20 border border-qh-gold" : "bg-black/30 border border-white/10")}>4</div>
              <span>Confirmar</span>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-white text-lg flex items-center gap-2"><Brain className="text-qh-amber"/> Identidad y Rol</h3>
              <p className="text-sm text-gray-400 mb-4">Define quién es tu agente y qué cerebro (LLM) utilizará para pensar.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre del Agente</label>
                  <input className="glass-input w-full" placeholder="Ej: DevNinja, Lead Generator..." value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs text-gray-500 block">System Prompt / Rol Principal</label>
                    <button onClick={() => setShowPromptModal(true)} className="text-[10px] uppercase tracking-wider text-qh-cyan hover:text-white flex items-center gap-1">
                      <Maximize2 size={12}/> Expandir Editor
                    </button>
                  </div>
                  <textarea 
                    className="glass-input w-full h-24 resize-none" 
                    placeholder="Ej: Eres un experto en Typescript. Tu tarea es..." 
                    value={role} 
                    onChange={e => setRole(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="glass-button flex items-center gap-2" onClick={() => setStep(2)}>Siguiente <ArrowRight size={16}/></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-white text-lg flex items-center gap-2"><ServerCog className="text-purple-400"/> Asignación de Worker</h3>
              <p className="text-sm text-gray-400 mb-4">Un agente necesita un "Cuerpo" para actuar en el mundo (ejecutar código, usar navegador, consola). Selecciona uno de tus workers disponibles.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Worker Principal</label>
                    <select className="glass-input w-full" value={primaryWorker} onChange={e => setPrimaryWorker(e.target.value)}>
                      <option value="">-- Seleccionar Worker --</option>
                      <option value="none">Solo chat (Sin Worker)</option>
                      {store.workerDefinitions?.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.type})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <h4 className="text-purple-300 text-xs font-bold mb-2">Workers Disponibles Recomendados:</h4>
                    <ul className="text-xs text-purple-200/70 space-y-1 list-disc pl-4">
                      <li><strong>OpenClaw / OpenHands:</strong> Agentes autónomos para ingeniería de software.</li>
                      <li><strong>Claude Code / Codex:</strong> Asistentes de terminal y CLI.</li>
                      <li><strong>Hermes / Antigravity:</strong> Procesamiento rápido de rutinas y flujos full-stack.</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Política de Aprobación de Acciones</label>
                    <select className="glass-input w-full" value={approvalPolicy} onChange={e => setApprovalPolicy(e.target.value)}>
                      <option value="solo_modo_lectura">Solo Modo Lectura (Seguro)</option>
                      <option value="aprobar_acciones_medias">Requiere Aprobación (Media/Alta)</option>
                      <option value="sin_aprobacion_para_acciones_bajas">Automático para Riesgo Bajo</option>
                      <option value="aprobar_todo">Modo Dios (Bypass de Aprobación)</option>
                    </select>
                  </div>
                  
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200 flex gap-2 items-start">
                    <Shield size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div><strong>Seguridad Zero-Trust:</strong> Asigna los mínimos permisos necesarios. Las acciones destructivas o de red siempre generarán un Audit Log y requerirán supervisión humana por defecto.</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button className="text-sm text-gray-400 hover:text-white" onClick={() => setStep(1)}>Atrás</button>
                <button className="glass-button flex items-center gap-2" onClick={() => setStep(3)}>Siguiente <ArrowRight size={16}/></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-white text-lg flex items-center gap-2"><Plug2 className="text-emerald-400"/> Memoria y Herramientas</h3>
              <p className="text-sm text-gray-400 mb-4">Conecta bases de datos (Memoria) y servidores MCP (Skills) al agente.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                    <Database size={14} className="text-qh-cyan"/> Memoria (Bases de Datos)
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {store.databaseConnections?.map(db => (
                      <label key={db.id} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", selectedDatabases.includes(db.id) ? "border-qh-cyan bg-qh-cyan/10" : "border-white/10 bg-black/20 hover:bg-black/40")}>
                        <div className="mt-0.5">
                          <input type="checkbox" className="rounded border-gray-600 text-qh-cyan focus:ring-qh-cyan bg-black/50" checked={selectedDatabases.includes(db.id)} onChange={() => toggleSelection(selectedDatabases, setSelectedDatabases, db.id)} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{db.name}</div>
                          <div className="text-[10px] text-gray-400 mt-1">{db.purpose}</div>
                        </div>
                      </label>
                    ))}
                    {(!store.databaseConnections || store.databaseConnections.length === 0) && (
                      <div className="text-sm text-gray-500 italic p-2">No hay bases de datos configuradas.</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                    <Plug2 size={14} className="text-emerald-400"/> Herramientas (MCP Servers)
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {store.mcpServerDefinitions?.map(mcp => (
                      <label key={mcp.id} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", selectedMcpServers.includes(mcp.id) ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-black/20 hover:bg-black/40")}>
                        <div className="mt-0.5">
                          <input type="checkbox" className="rounded border-gray-600 text-emerald-400 focus:ring-emerald-400 bg-black/50" checked={selectedMcpServers.includes(mcp.id)} onChange={() => toggleSelection(selectedMcpServers, setSelectedMcpServers, mcp.id)} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{mcp.name}</div>
                          <div className="text-[10px] text-gray-400 mt-1">{mcp.capabilities?.join(', ')}</div>
                        </div>
                      </label>
                    ))}
                    {(!store.mcpServerDefinitions || store.mcpServerDefinitions.length === 0) && (
                      <div className="text-sm text-gray-500 italic p-2">No hay servidores MCP configurados.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button className="text-sm text-gray-400 hover:text-white" onClick={() => setStep(2)}>Atrás</button>
                <button className="glass-button flex items-center gap-2" onClick={() => setStep(4)}>Siguiente <ArrowRight size={16}/></button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-white text-lg flex items-center gap-2"><CheckCircle2 className="text-qh-gold"/> Listo para Iniciar</h3>
              
              <div className="bg-black/30 border border-white/10 p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Agente</div>
                    <div className="text-lg text-white font-bold">{name || 'Agente sin nombre'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Rol / System Prompt</div>
                    <div className="text-sm text-qh-cyan line-clamp-3 italic">"{role || 'Sin rol específico'}"</div>
                  </div>
                </div>
                <div className="space-y-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Worker Activo</div>
                    <div className="text-sm text-purple-300 font-mono">
                      {primaryWorker && primaryWorker !== 'none' ? store.workerDefinitions.find(w => w.id === primaryWorker)?.name || primaryWorker : 'Solo Chat (Sin worker)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Conexiones</div>
                    <div className="text-sm text-slate-300">
                      {selectedDatabases.length} Bases de Datos<br/>
                      {selectedMcpServers.length} MCP Servers
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Aprobación</div>
                    <div className="text-xs text-red-300 capitalize">{approvalPolicy.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button className="text-sm text-gray-400 hover:text-white" onClick={() => setStep(3)}>Atrás</button>
                <button className="px-6 py-2 bg-qh-cyan/20 text-qh-cyan font-bold border border-qh-cyan/30 rounded shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:bg-qh-cyan/30 transition-all" onClick={handleSave}>Crear Agente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Orchestration Overview */}
      <div className="glass-panel p-6 border-l-2 border-qh-cyan mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Arquitectura del Agente</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <div className="flex flex-col items-center gap-2 p-3 bg-black/30 rounded-lg w-full md:w-auto">
            <Brain className="text-qh-amber" size={24}/>
            <span className="text-xs font-bold text-slate-300">Cerebro</span>
            <span className="text-[10px] text-gray-500">LLM, Piensa</span>
          </div>
          <ArrowRight className="hidden md:block text-slate-600" />
          <div className="flex flex-col items-center gap-2 p-3 bg-black/30 rounded-lg w-full md:w-auto">
            <Database className="text-qh-cyan" size={24}/>
            <span className="text-xs font-bold text-slate-300">Memoria</span>
            <span className="text-[10px] text-gray-500">Contexto</span>
          </div>
          <ArrowRight className="hidden md:block text-slate-600" />
          <div className="flex flex-col items-center gap-2 p-3 bg-black/30 rounded-lg w-full md:w-auto">
            <FolderGit2 className="text-emerald-400" size={24}/>
            <span className="text-xs font-bold text-slate-300">Repo</span>
            <span className="text-[10px] text-gray-500">Código Base</span>
          </div>
          <ArrowRight className="hidden md:block text-slate-600" />
          <div className="flex flex-col items-center gap-2 p-3 bg-black/30 rounded-lg w-full md:w-auto">
            <ServerCog className="text-purple-400" size={24}/>
            <span className="text-xs font-bold text-slate-300">Worker</span>
            <span className="text-[10px] text-gray-500">Actúa</span>
          </div>
          <ArrowRight className="hidden md:block text-slate-600" />
          <div className="flex flex-col items-center gap-2 p-3 bg-black/30 rounded-lg w-full md:w-auto">
            <Plug2 className="text-pink-400" size={24}/>
            <span className="text-xs font-bold text-slate-300">Skills/MCP</span>
            <span className="text-[10px] text-gray-500">Herramientas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.agents.map(a => (
          <div key={a.id} className="glass-panel p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-qh-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  {a.name}
                </h3>
                <div className="text-xs text-qh-cyan line-clamp-2 mt-1">{a.role}</div>
              </div>
              <span className="px-2 py-1 bg-white/10 text-[10px] rounded uppercase font-mono border border-white/5">{a.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-4 relative z-10">
              <div className="bg-black/30 p-2 rounded flex items-center gap-2 border border-white/5">
                <Brain size={14} className="text-qh-amber"/>
                <span className="text-gray-400">{a.preferredModel}</span>
              </div>
              <div className="bg-black/30 p-2 rounded flex items-center gap-2 border border-white/5">
                <ServerCog size={14} className="text-purple-400"/>
                <span className="text-gray-400 truncate" title={a.workerIds?.length ? store.workerDefinitions.find(w => w.id === a.workerIds[0])?.name || 'Worker 1' : 'Sin Worker'}>
                  {a.workerIds?.length ? store.workerDefinitions.find(w => w.id === a.workerIds[0])?.name || 'Worker Activo' : 'Sin Worker'}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded flex items-center gap-2 border border-white/5">
                <Plug2 size={14} className="text-emerald-400"/>
                <span className="text-gray-400">
                  {a.mcpServerIds?.length ? `${a.mcpServerIds.length} MCPs` : 'Sin Skills'}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded flex items-center gap-2 border border-white/5">
                <Database size={14} className="text-qh-cyan"/>
                <span className="text-gray-400">
                  {store.agentDatabaseBindings?.filter(b => b.agentId === a.id).length ? `${store.agentDatabaseBindings.filter(b => b.agentId === a.id).length} DBs` : 'Sin DB'}
                </span>
              </div>
            </div>
            
            <button className="w-full relative z-10 text-xs py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 transition-colors flex items-center justify-center gap-2">
               Configurar Instancia
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
