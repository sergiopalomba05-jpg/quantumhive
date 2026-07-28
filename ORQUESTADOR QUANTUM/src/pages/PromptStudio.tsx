import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Wand2, Lightbulb, CheckSquare, Settings2, PlayCircle, GitMerge, FileText, Download, Target, Zap, Bot, Box, AlertTriangle, Layers, Save, Share2 } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';

export function PromptStudio() {
  const store = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'master' | 'pack' | 'workflow' | 'loop'>('raw');
  
  const projects = store.promptProjects || [];
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const promptPackItems = store.promptPackItems?.filter(p => p.promptProjectId === selectedProjectId) || [];
  const loop = store.promptLoops?.find(l => l.promptProjectId === selectedProjectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      case 'prompt_ready': return 'text-qh-cyan bg-qh-cyan/10 border-qh-cyan/20';
      case 'workflow_ready': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const tabs = [
    { id: 'raw', icon: Lightbulb, label: 'Idea Cruda' },
    { id: 'master', icon: Wand2, label: 'Prompt Maestro' },
    { id: 'pack', icon: Layers, label: 'Prompt Pack' },
    { id: 'workflow', icon: GitMerge, label: 'Generador de Workflow' },
    { id: 'loop', icon: PlayCircle, label: 'Constructor de Loop' }
  ] as const;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Wand2 className="text-qh-cyan" size={28} /> Estudio de Prompts
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Transformador de Ideas a Prompts, Workflows y Loops</p>
        </div>
        <TourButton tourId="promptStudio" />
      </div>

      <div className="bg-qh-card border border-qh-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-1 overflow-hidden">
        {/* Projects List Sidebar */}
        <div className="w-72 border-r border-qh-border bg-slate-900/30 flex flex-col">
          <div className="p-4 border-b border-qh-border flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Proyectos de Prompt</h3>
            <button className="text-qh-cyan hover:text-white transition-colors">
              <Lightbulb size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors border",
                  selectedProjectId === project.id
                    ? "bg-slate-800 border-slate-600 text-white"
                    : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                )}
              >
                <div className="text-sm font-bold truncate">{project.title}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1 truncate">{project.outputType}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {selectedProject ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-qh-border bg-slate-900/50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{selectedProject.title}</h2>
                    <span className={cn("inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded border", getStatusColor(selectedProject.status))}>
                      {tStatus(selectedProject.status)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors flex items-center gap-2">
                      <Save size={14} /> Guardar en Biblioteca
                    </button>
                    <button className="px-3 py-1.5 bg-qh-cyan/20 hover:bg-qh-cyan/30 text-qh-cyan rounded text-xs font-bold transition-colors border border-qh-cyan/30 flex items-center gap-2">
                      <Share2 size={14} /> Enviar a Agente
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        activeTab === tab.id ? "bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content by Tab */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* Tab: Idea Cruda */}
                {activeTab === 'raw' && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-qh-cyan font-bold mb-2">Escribe tu idea (Input Crudo)</label>
                      <textarea 
                        className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 font-mono text-sm resize-none focus:outline-none focus:border-qh-cyan/50"
                        defaultValue={selectedProject.rawInput}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Tipo de Resultado</label>
                        <select className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-300 text-xs" defaultValue={selectedProject.outputType}>
                          <option value="spec">Spec (Especificación)</option>
                          <option value="design">Diseño Visual</option>
                          <option value="code">Código</option>
                          <option value="workflow">Workflow</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Nivel de Detalle</label>
                        <select className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-slate-300 text-xs" defaultValue={selectedProject.detailLevel}>
                          <option value="fast">Rápido / Resumen</option>
                          <option value="normal">Normal</option>
                          <option value="deep">Profundo / Extenso</option>
                        </select>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-qh-cyan/20 hover:bg-qh-cyan/30 text-qh-cyan rounded-lg text-sm font-bold uppercase tracking-widest border border-qh-cyan/30 transition-colors flex items-center justify-center gap-2">
                      <Wand2 size={16} /> Transformar en Prompt Maestro
                    </button>
                  </div>
                )}

                {/* Tab: Prompt Maestro */}
                {activeTab === 'master' && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs uppercase tracking-widest text-qh-cyan font-bold flex items-center gap-2"><Target size={14}/> Prompt Maestro Generado</h3>
                        <button className="text-slate-400 hover:text-white"><Download size={14}/></button>
                      </div>
                      <p className="text-slate-200 text-sm leading-relaxed font-mono">
                        "Actuá como diseñador frontend senior y CRO strategist. Analizá esta landing de Carta Viva manteniendo la estructura funcional actual, proponé mejoras visuales premium, detectá fricción de conversión y devolvé un plan por secciones con prioridad."
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Contexto y Restricciones</h4>
                        <ul className="text-xs text-slate-400 list-disc pl-4 space-y-1">
                          <li>Mantener estructura funcional.</li>
                          <li>Foco en diseño premium.</li>
                          <li>No modificar el backend.</li>
                        </ul>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Formato de Salida Esperado</h4>
                        <ul className="text-xs text-slate-400 list-disc pl-4 space-y-1">
                          <li>Plan por secciones.</li>
                          <li>Priorizado (Alta, Media, Baja).</li>
                          <li>Markdown con checklist.</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button className="flex-1 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-bold uppercase tracking-widest border border-purple-500/30 transition-colors flex items-center justify-center gap-2">
                        <Layers size={16} /> Generar Prompt Pack (Por Etapas)
                      </button>
                      <button className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold uppercase tracking-widest border border-slate-600 transition-colors flex items-center justify-center gap-2">
                        <GitMerge size={16} /> Crear Workflow Visual
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Prompt Pack */}
                {activeTab === 'pack' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Layers className="text-purple-400" size={18} /> Prompts por Etapas
                      </h3>
                      <button className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-2">
                        <CheckSquare size={14} /> Convertir a Tareas
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {promptPackItems.map((item, idx) => (
                        <div key={item.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex gap-4 items-start hover:border-slate-500 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-bold text-white">{item.title}</h4>
                              <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border", 
                                item.status === 'ready' ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-slate-400 bg-slate-800 border-slate-700"
                              )}>{tStatus(item.status)}</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">{item.purpose}</p>
                            <div className="bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-slate-300 mb-3">
                              {item.promptText}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.recommendedSkillIds.map(skill => (
                                <span key={skill} className="text-[10px] bg-qh-cyan/10 text-qh-cyan px-2 py-1 rounded border border-qh-cyan/20">
                                  #{skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase transition-colors">Usar</button>
                            <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase transition-colors">Editar</button>
                          </div>
                        </div>
                      ))}
                      {promptPackItems.length === 0 && (
                        <div className="text-center p-8 text-slate-500 text-sm">No hay prompts generados. Ve a la pestaña "Prompt Maestro".</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Workflow Generator */}
                {activeTab === 'workflow' && (
                  <div className="flex flex-col items-center justify-center h-full space-y-6 text-center max-w-lg mx-auto">
                    <GitMerge size={48} className="text-slate-600 mb-2" />
                    <h3 className="text-lg font-bold text-slate-200">Generar Workflow Visual</h3>
                    <p className="text-sm text-slate-400">
                      Convierte este Prompt Project en un mapa de nodos interactivo en el Visual Node Planner. 
                      El sistema creará los nodos correspondientes a cada etapa del Prompt Pack.
                    </p>
                    <div className="flex gap-4">
                      <button className="px-4 py-2 bg-qh-cyan/20 text-qh-cyan hover:bg-qh-cyan/30 border border-qh-cyan/30 rounded text-sm font-bold transition-colors">
                        Crear Workflow Map
                      </button>
                      <button className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 rounded text-sm font-bold transition-colors">
                        Crear Roadmap
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Loop Builder */}
                {activeTab === 'loop' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <PlayCircle className="text-emerald-400" size={18} /> Ejecución de Loop
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Automatiza la ejecución de los prompts paso a paso.</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-bold uppercase border border-slate-700">
                          Bloques Manuales
                        </button>
                        <button className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-xs font-bold uppercase border border-emerald-500/30">
                          Iniciar Loop Asistido (Simulado)
                        </button>
                      </div>
                    </div>

                    {loop ? (
                      <div className="relative">
                        {/* Connecting line */}
                        <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-700 z-0"></div>
                        
                        <div className="space-y-4 relative z-10">
                          {loop.steps.map((step) => (
                            <div key={step.id} className={cn(
                              "flex gap-4 items-center bg-slate-900/80 backdrop-blur border rounded-lg p-4 transition-all",
                              step.status === 'active' ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-slate-800",
                              step.status === 'done' ? "opacity-70" : ""
                            )}>
                              <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2",
                                step.status === 'done' ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" :
                                step.status === 'active' ? "bg-slate-800 border-emerald-500 text-white" :
                                "bg-slate-900 border-slate-700 text-slate-500"
                              )}>
                                {step.status === 'done' ? <CheckSquare size={18} /> : step.order}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{step.actionType}</span>
                                  {step.status === 'active' && <span className="text-[9px] uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-1.5 rounded animate-pulse">Running</span>}
                                </div>
                                <h4 className={cn("text-sm font-bold", step.status === 'active' ? "text-white" : "text-slate-300")}>{step.title}</h4>
                                {step.outputSummary && (
                                  <p className="text-xs text-slate-400 mt-1">{step.outputSummary}</p>
                                )}
                              </div>
                              {step.status === 'active' && (
                                <button className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors">
                                  Aprobar Siguiente
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 bg-slate-900/30 rounded-lg border border-slate-800 border-dashed">
                        <AlertTriangle size={32} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-sm text-slate-400 mb-4">No se ha generado un loop para este proyecto.</p>
                        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-bold transition-colors">
                          Generar Loop Mock
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Wand2 size={48} className="text-slate-700" opacity={0.5} />
              <p>Selecciona un proyecto a la izquierda o crea uno nuevo.</p>
              <button className="px-4 py-2 bg-qh-cyan/20 text-qh-cyan hover:bg-qh-cyan/30 rounded-lg text-sm font-bold transition-colors border border-qh-cyan/30 flex items-center gap-2">
                <Lightbulb size={16} /> Nuevo Prompt Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
