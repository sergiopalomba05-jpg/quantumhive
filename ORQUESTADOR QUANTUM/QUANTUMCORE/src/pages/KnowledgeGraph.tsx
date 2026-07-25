import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraphNode, KnowledgeGraphEdge } from '../types';
import { Search, Share2, Info, MessageSquare, Plus, FileText, Bot, Box, Code, Filter, Terminal, Copy, Cloud, BrainCircuit, Database, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TourButton } from '../components/onboarding/TourButton';

const TYPE_COLORS: Record<string, string> = {
  file: '#64748B',
  function: '#06B6D4',
  class: '#EAB308',
  module: '#10B981',
  project: '#A855F7',
  interface: '#F43F5E',
  code: '#64748B',
  default: '#64748B',
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'project': return <Box size={14} />;
    case 'module': return <Code size={14} />;
    case 'function': return <Code size={14} />;
    case 'class': return <Box size={14} />;
    case 'cloud_resource': return <Cloud size={14} />;
    case 'agent': return <Bot size={14} />;
    case 'skill': return <Terminal size={14} />;
    case 'memory': return <Database size={14} />;
    case 'interface': return <Code size={14} />;
    default: return <FileText size={14} />;
  }
};

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  communities: number;
  nodeTypes: Record<string, number>;
  topCommunities: Array<{ id: number; count: number }>;
}

export function KnowledgeGraph() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeCommunity, setActiveCommunity] = useState<number | null>(null);

  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeGraphEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGraph();
  }, [activeCommunity]);

  async function fetchGraph() {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/graph';
      const params: string[] = [];
      if (activeCommunity !== null) {
        params.push(`community=${activeCommunity}`);
      }
      if (params.length) url += '?' + params.join('&');

      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar grafo');
      const data = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/graph/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

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
    if (!svgRef.current || filteredNodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const d3Nodes = filteredNodes.map(d => ({ ...d })) as any[];
    const d3Edges = filteredEdges.map(d => ({ ...d })) as any[];

    const chargeStrength = d3Nodes.length > 500 ? -100 : d3Nodes.length > 200 ? -200 : -300;
    const collideRadius = d3Nodes.length > 500 ? 15 : d3Nodes.length > 200 ? 25 : 40;

    const simulation = d3.forceSimulation(d3Nodes)
      .force("link", d3.forceLink(d3Edges).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(collideRadius));

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
      .attr("stroke-width", 1)
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

    const maxImportance = Math.max(...d3Nodes.map((d: any) => d.importance || 0), 1);

    node.append("circle")
      .attr("r", (d: any) => {
        const norm = (d.importance || 0.5) / maxImportance;
        const baseR = d3Nodes.length > 500 ? 3 : d3Nodes.length > 200 ? 5 : 10;
        return baseR + norm * (d3Nodes.length > 500 ? 5 : d3Nodes.length > 200 ? 8 : 10);
      })
      .attr("fill", (d: any) => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr("stroke", (d: any) => d.id === selectedNodeId ? "#ffffff" : "#1e293b")
      .attr("stroke-width", (d: any) => d.id === selectedNodeId ? 3 : 1);

    if (d3Nodes.length <= 500) {
      node.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .attr("fill", "#cbd5e1")
        .attr("font-size", "8px")
        .attr("font-family", "monospace")
        .text((d: any) => d.label.length > 25 ? d.label.slice(0, 22) + '...' : d.label);
    }

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
    alert(`Enviando nodo ${selectedNode.label} a un Agente.`);
  };

  const handleExplainNode = () => {
    alert(`Generando explicación para ${selectedNode?.label}...`);
  };

  const types = ['all', ...Array.from(new Set(nodes.map(n => n.type)))];
  const communities = stats?.topCommunities?.slice(0, 10) || [];

  return (
    <div className="flex h-[calc(100vh-6rem)] -mx-6 -mt-6">
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
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
            {stats && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                <span>{stats.totalNodes.toLocaleString()} nodos</span>
                <span>·</span>
                <span>{stats.totalEdges.toLocaleString()} aristas</span>
                <span>·</span>
                <span>{stats.communities} comunidades</span>
                <button onClick={fetchGraph} className="ml-2 text-slate-500 hover:text-slate-300">
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex gap-2">
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
            {communities.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end max-w-lg">
                <button
                  onClick={() => setActiveCommunity(null)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold transition-colors border",
                    activeCommunity === null
                      ? "bg-slate-800 text-white border-slate-600"
                      : "bg-slate-900/50 text-slate-500 border-slate-800 hover:bg-slate-800"
                  )}
                >
                  todas
                </button>
                {communities.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCommunity(c.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold transition-colors border",
                      activeCommunity === c.id
                        ? "bg-slate-800 text-white border-slate-600"
                        : "bg-slate-900/50 text-slate-500 border-slate-800 hover:bg-slate-800"
                    )}
                  >
                    C{c.id} ({c.count})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 cursor-grab active:cursor-grabbing">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={32} className="text-qh-cyan animate-spin" />
                <span className="text-sm text-slate-400">Cargando grafo de conocimiento...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <span className="text-sm text-red-400">{error}</span>
                <button onClick={fetchGraph} className="text-xs text-slate-400 hover:text-white">Reintentar</button>
              </div>
            </div>
          ) : (
            <svg ref={svgRef} className="w-full h-full" />
          )}
        </div>

        <div className="absolute bottom-4 left-4 p-4 bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl pointer-events-auto">
          <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Leyenda</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-slate-300 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <p className="text-sm text-slate-400 leading-relaxed">{selectedNode.summary || 'Sin descripción'}</p>

              {selectedNode.community !== undefined && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Comunidad: {selectedNode.community}
                </div>
              )}

              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedNode.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
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
                    {outgoingEdges.slice(0, 20).map(e => {
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
                    {incomingEdges.slice(0, 20).map(e => {
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
          </div>
        )}
      </div>
    </div>
  );
}
