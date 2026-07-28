import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import * as d3 from 'd3';
import { KnowledgeGraphNode, KnowledgeGraphEdge } from '../types';
import { Search, Share2, Info, MessageSquare, Plus, FileText, Bot, Box, Code, Filter, Terminal, Copy, Cloud, BrainCircuit, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TourButton } from '../components/onboarding/TourButton';

const TYPE_COLORS: Record<string, string> = {
  project: '#EAB308', // qh-gold
  module: '#06B6D4', // qh-cyan
  cloud_resource: '#A855F7', // purple
  agent: '#10B981', // emerald
  skill: '#F43F5E', // rose
  default: '#64748B' // slate
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'project': return <Box size={14} />;
    case 'module': return <Code size={14} />;
    case 'cloud_resource': return <Cloud size={14} />;
    case 'agent': return <Bot size={14} />;
    case 'skill': return <Terminal size={14} />;
    case 'memory': return <Database size={14} />;
    default: return <FileText size={14} />;
  }
};

export function KnowledgeGraph() {
  const store = useStore();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  const nodes = store.knowledgeGraphNodes || [];
  const edges = store.knowledgeGraphEdges || [];
  
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => 
      (activeFilter === 'all' || n.type === activeFilter) &&
      (n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.summary.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [nodes, searchQuery, activeFilter]);
  
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [edges, filteredNodes]);
  
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const incomingEdges = edges.filter(e => e.target === selectedNodeId);
  const outgoingEdges = edges.filter(e => e.source === selectedNodeId);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create a container for zooming
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
      
    svg.call(zoom as any);
    
    // Prepare data for D3 (needs copies because D3 mutates)
    const d3Nodes = filteredNodes.map(d => ({ ...d })) as any[];
    const d3Edges = filteredEdges.map(d => ({ ...d })) as any[];
    
    const simulation = d3.forceSimulation(d3Nodes)
      .force("link", d3.forceLink(d3Edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));
      
    // Defs for arrowheads
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#475569");
        
    const link = g.append("g")
      .selectAll("line")
      .data(d3Edges)
      .enter().append("line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");
      
    const node = g.append("g")
      .selectAll("g")
      .data(d3Nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNodeId(d.id);
        event.stopPropagation();
      })
      .call(d3.drag<SVGGElement, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));
        
    node.append("circle")
      .attr("r", (d) => 10 + (d.importance * 10))
      .attr("fill", (d) => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr("stroke", (d) => d.id === selectedNodeId ? "#ffffff" : "#1e293b")
      .attr("stroke-width", (d) => d.id === selectedNodeId ? 3 : 2);
      
    node.append("text")
      .attr("dx", 15)
      .attr("dy", ".35em")
      .attr("fill", "#cbd5e1")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .text(d => d.label);
      
    svg.on("click", () => {
      setSelectedNodeId(null);
    });
      
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
        
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
    
    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredEdges, selectedNodeId]);

  const handleSendToAgent = () => {
    if (!selectedNode) return;
    store.addEvent({
      type: 'graph.node.sent_to_agent',
      actor: 'system',
      payload: `Nodo "${selectedNode.label}" enviado a agente.`,
      severity: 'info'
    });
    alert(`Enviando nodo ${selectedNode.label} a un Agente y evento registrado.`);
  };

  const handleExplainNode = () => {
    alert(`Generando explicación para ${selectedNode?.label}...`);
  };

  const types = ['all', ...Array.from(new Set(nodes.map(n => n.type)))];

  return (
    <div className="flex h-[calc(100vh-6rem)] -mx-6 -mt-6">
      {/* Graph Area */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
        {/* Top bar over graph */}
        <div className="absolute top-0 left-0 right-0 p-4 flex gap-4 z-10 pointer-events-none">
          <div className="flex-1 pointer-events-auto">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar nodos, funciones, módulos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 backdrop-blur-md rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-qh-cyan"
              />
            </div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <TourButton tourId="knowledgeGraph" />
            {types.map(t => (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border backdrop-blur-md",
                  activeFilter === t 
                    ? "bg-slate-800 text-white border-slate-600" 
                    : "bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        
        {/* SVG Container */}
        <div className="flex-1 cursor-grab active:cursor-grabbing">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-4 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl pointer-events-auto">
          <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Leyenda</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-slate-300 capitalize">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Details */}
      <div className={cn(
        "w-80 bg-qh-card border-l border-qh-border overflow-y-auto transition-all duration-300",
        selectedNode ? "translate-x-0" : "translate-x-full hidden"
      )}>
        {selectedNode && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-qh-cyan mb-2">
                {getIconForType(selectedNode.type)}
                <span className="text-[10px] uppercase tracking-widest font-bold">{selectedNode.type}</span>
              </div>
              <h3 className="text-xl font-bold text-white">{selectedNode.label}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{selectedNode.summary}</p>
              
              <div className="flex flex-wrap gap-2">
                {selectedNode.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Acciones Inteligentes</h4>
              <button onClick={handleExplainNode} className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <BrainCircuit size={16} className="text-qh-cyan" /> Explicar Nodo
              </button>
              <button onClick={handleSendToAgent} className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Bot size={16} className="text-emerald-400" /> Enviar a Agente
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Plus size={16} className="text-qh-gold" /> Crear Tarea/Memoria
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Copy size={16} className="text-slate-400" /> Copiar Contexto
              </button>
            </div>

            {(incomingEdges.length > 0 || outgoingEdges.length > 0) && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Relaciones</h4>
                
                {outgoingEdges.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-600 uppercase">Salientes</div>
                    {outgoingEdges.map(e => {
                      const target = nodes.find(n => n.id === e.target);
                      if (!target) return null;
                      return (
                        <div key={e.id} className="text-xs bg-slate-900/50 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 italic">{e.relation}</span> <span className="text-slate-300 font-bold">{target.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {incomingEdges.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="text-[10px] text-slate-600 uppercase">Entrantes</div>
                    {incomingEdges.map(e => {
                      const source = nodes.find(n => n.id === e.source);
                      if (!source) return null;
                      return (
                        <div key={e.id} className="text-xs bg-slate-900/50 p-2 rounded border border-slate-800">
                          <span className="text-slate-300 font-bold">{source.label}</span> <span className="text-slate-500 italic">{e.relation}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-800">
              <div className="p-3 bg-qh-gold/10 border border-qh-gold/20 rounded-lg">
                 <p className="text-[10px] text-qh-gold uppercase tracking-widest font-bold mb-1">Graphify Integration</p>
                 <p className="text-xs text-qh-gold/80 leading-relaxed">
                   En la versión final, este nodo se conectará con <code>graphify-out/graph.json</code> para reflejar AST real del repositorio.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
