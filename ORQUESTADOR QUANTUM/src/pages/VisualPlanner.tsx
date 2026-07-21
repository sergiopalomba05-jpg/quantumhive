import React, { useState, useMemo, useRef } from 'react';
import { VisualNode } from '../types';
import { useStore } from '../store/useStore';
import { GitBranch, Box, GitMerge, ListTree, Search, Plus, Filter, Play, CheckCircle, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';

export function VisualPlanner() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'idea_map' | 'workflow_map' | 'pipeline_map' | 'roadmap'>('idea_map');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  
  const boards = store.visualNodeBoards || [];
  
  const filteredBoards = useMemo(() => {
    return boards.filter(b => b.boardType === activeTab);
  }, [boards, activeTab]);

  // Select first board when tab changes
  React.useEffect(() => {
    if (filteredBoards.length > 0 && (!selectedBoardId || !filteredBoards.find(b => b.id === selectedBoardId))) {
      setSelectedBoardId(filteredBoards[0].id);
    } else if (filteredBoards.length === 0) {
      setSelectedBoardId(null);
    }
  }, [activeTab, filteredBoards]);

  const nodes = store.visualNodes?.filter(n => n.boardId === selectedBoardId) || [];
  const edges = store.visualEdges?.filter(e => e.boardId === selectedBoardId) || [];

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mock': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      case 'real': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'future': return 'text-qh-cyan bg-qh-cyan/10 border-qh-cyan/20';
      case 'blocked': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'done': return 'text-qh-gold bg-qh-gold/10 border-qh-gold/20';
      case 'active': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, node: VisualNode) => {
    if (draggingNodeId === node.id) {
      store.updateVisualNode(node.id, {
        x: node.x + e.movementX,
        y: node.y + e.movementY
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingNodeId(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleAddNode = () => {
    if (!selectedBoardId) return;
    store.addVisualNode({
      boardId: selectedBoardId,
      type: 'Nuevo',
      title: 'Nuevo Nodo',
      description: 'Descripción por defecto',
      x: Math.random() * 200 + 50,
      y: Math.random() * 200 + 50,
      status: 'mock',
      tags: []
    });
  };

  const tabs = [
    { id: 'idea_map', icon: GitBranch, label: 'Mapa de Ideas' },
    { id: 'workflow_map', icon: GitMerge, label: 'Mapa de Flujos' },
    { id: 'pipeline_map', icon: Box, label: 'Mapa de Pipelines' },
    { id: 'roadmap', icon: ListTree, label: 'Constructor de Roadmap' }
  ] as const;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <GitMerge className="text-qh-cyan" size={28} /> Planificador Visual de Nodos
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Planificador visual future-ready de ideas, flujos y pipelines</p>
        </div>
        <TourButton tourId="visualPlanner" />
      </div>

      <div className="bg-qh-card border border-qh-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col flex-1 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-qh-border bg-slate-900/50 p-2 gap-2 overflow-x-auto hide-scrollbar">
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

        <div className="flex flex-1 overflow-hidden">
          {/* Boards List Sidebar */}
          <div className="w-64 border-r border-qh-border bg-slate-900/30 flex flex-col">
            <div className="p-4 border-b border-qh-border flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tableros</h3>
              <button className="text-qh-cyan hover:text-white transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredBoards.map(board => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors border",
                    selectedBoardId === board.id
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                  )}
                >
                  <div className="text-sm font-bold truncate">{board.title}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1 truncate">{tStatus(board.status)}</div>
                </button>
              ))}
              {filteredBoards.length === 0 && (
                <div className="text-center p-4 text-slate-500 text-xs">No hay tableros aquí.</div>
              )}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
            {selectedBoardId ? (
              <>
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <button className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-bold uppercase tracking-wider border border-slate-700">
                    Exportar
                  </button>
                  <button className="px-3 py-1.5 bg-qh-cyan/20 text-qh-cyan hover:bg-qh-cyan/30 rounded text-xs font-bold uppercase tracking-wider border border-qh-cyan/30" onClick={handleAddNode}>
                    Agregar Nodo
                  </button>
                </div>

                {/* SVG for Edges - Simple static lines for this demo */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {edges.map(edge => {
                    const source = nodes.find(n => n.id === edge.sourceNodeId);
                    const target = nodes.find(n => n.id === edge.targetNodeId);
                    if (!source || !target) return null;
                    return (
                      <g key={edge.id}>
                        <line 
                          x1={source.x + 80} y1={source.y + 40} 
                          x2={target.x + 80} y2={target.y + 40} 
                          stroke="#334155" strokeWidth="2"
                        />
                        <text 
                          x={(source.x + target.x) / 2 + 80} 
                          y={(source.y + target.y) / 2 + 35}
                          fill="#64748B"
                          fontSize="10"
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {edge.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes rendering */}
                <div className="relative w-full h-full overflow-auto">
                  {nodes.map(node => (
                    <div 
                      key={node.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                      onPointerDown={(e) => handlePointerDown(e, node.id)}
                      onPointerMove={(e) => handlePointerMove(e, node)}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className={cn(
                        "absolute w-40 p-3 rounded-lg border shadow-lg cursor-pointer transition-all",
                        selectedNodeId === node.id ? "bg-slate-800 border-white z-10 scale-105" : "bg-slate-900 border-slate-700 hover:border-slate-500 z-0",
                        activeTab === 'roadmap' ? "w-64" : "" // roadmaps could be wider
                      )}
                      style={{ left: node.x, top: node.y }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{node.type}</span>
                        <span className={cn("text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border", getStatusColor(node.status))}>
                          {tStatus(node.status)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 leading-tight">{node.title}</h4>
                      {activeTab === 'roadmap' && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Selecciona o crea un tablero para comenzar
              </div>
            )}
          </div>

          {/* Node Details Sidebar */}
          <div className={cn(
            "w-72 border-l border-qh-border bg-slate-900/50 transition-all duration-300",
            selectedNodeId ? "translate-x-0" : "translate-x-full hidden"
          )}>
            {selectedNode && (
              <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-qh-cyan font-bold">{selectedNode.type}</span>
                    <h3 className="text-lg font-bold text-white leading-tight mt-1">{selectedNode.title}</h3>
                  </div>
                  <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white">&times;</button>
                </div>
                
                <span className={cn("inline-block w-fit text-[10px] uppercase font-bold px-2 py-0.5 rounded border mb-4", getStatusColor(selectedNode.status))}>
                  {tStatus(selectedNode.status)}
                </span>

                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-1">Descripción</h4>
                    <p className="text-sm text-slate-300">{selectedNode.description}</p>
                  </div>
                  
                  {selectedNode.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-1">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.tags.map(t => <span key={t} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">#{t}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-auto pt-4 border-t border-slate-800">
                  <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Acciones</h4>
                  <button className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors">
                    Convertir en Tarea
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors">
                    Enviar a Agente
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-colors">
                    Agregar a Context Pack
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
