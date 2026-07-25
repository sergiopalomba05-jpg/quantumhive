import React, { useEffect, useState } from 'react';
import { Search, Database, BrainCircuit, Bot, Copy, Plus, Loader2, RefreshCw, Network, FileText, Code, Box, ChevronRight, ExternalLink, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  communities: number;
  nodeTypes: Record<string, number>;
  topCommunities: Array<{ id: number; count: number }>;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  summary: string;
  importance: number;
  tags: string[];
  sourceLocation: string;
  community: number;
  sourceFile: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  code: <Code size={14} />,
  document: <FileText size={14} />,
  concept: <BrainCircuit size={14} />,
  rationale: <Box size={14} />,
  image: <Database size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  code: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  document: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  concept: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rationale: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  image: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export function KnowledgeGraph() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(null);
  const [communityNodes, setCommunityNodes] = useState<GraphNode[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'communities'>('overview');

  useEffect(() => {
    fetch('/api/graph/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setActiveTab('search');
    try {
      const res = await fetch(`/api/graph/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleCommunityClick(id: number) {
    setSelectedCommunity(id);
    setActiveTab('communities');
    setLoadingCommunity(true);
    try {
      const res = await fetch(`/api/graph?community=${id}&limit=100`);
      const data = await res.json();
      setCommunityNodes(data.nodes || []);
    } catch {
      setCommunityNodes([]);
    } finally {
      setLoadingCommunity(false);
    }
  }

  const displayNodes = activeTab === 'search' ? searchResults : communityNodes;

  return (
    <div className="flex h-[calc(100vh-6rem)] -mx-6 -mt-6">
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Network className="text-qh-cyan" size={20} />
              <h1 className="text-lg font-bold text-white">Grafo de Conocimiento</h1>
            </div>
            <TourButton tourId="knowledgeGraph" />
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar nodos, funciones, módulos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-qh-cyan"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 bg-qh-cyan/20 hover:bg-qh-cyan/30 border border-qh-cyan/30 rounded-lg text-sm text-qh-cyan font-medium transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
            </button>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1"><Database size={10} /> {stats.totalNodes.toLocaleString()} nodos</span>
              <span>·</span>
              <span>{stats.totalEdges.toLocaleString()} aristas</span>
              <span>·</span>
              <span>{stats.communities} comunidades</span>
              <span>·</span>
              {Object.entries(stats.nodeTypes).map(([type, count]) => (
                <span key={type} className={cn('px-1.5 py-0.5 rounded border text-[9px]', TYPE_COLORS[type] || 'text-slate-400 bg-slate-800 border-slate-700')}>
                  {type}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/50">
          {[
            { id: 'overview' as const, label: 'Vista General' },
            { id: 'search' as const, label: `Búsqueda${searchResults.length ? ` (${searchResults.length})` : ''}` },
            { id: 'communities' as const, label: 'Comunidades' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-xs font-medium transition-colors border-b-2",
                activeTab === tab.id
                  ? "text-qh-cyan border-qh-cyan"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && stats && (
            <div className="p-6 space-y-6">
              {/* Type breakdown */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Tipos de Nodo</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(stats.nodeTypes).map(([type, count]) => (
                    <div key={type} className={cn('p-3 rounded-lg border', TYPE_COLORS[type] || 'text-slate-400 bg-slate-900 border-slate-800')}>
                      <div className="flex items-center gap-2 mb-1">
                        {TYPE_ICONS[type] || <Box size={14} />}
                        <span className="text-xs font-bold capitalize">{type}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top communities */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Top Comunidades</h3>
                <div className="space-y-2">
                  {stats.topCommunities.slice(0, 15).map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCommunityClick(c.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500">C{c.id}</span>
                        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-qh-cyan rounded-full"
                            style={{ width: `${(c.count / (stats.topCommunities[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{c.count} nodos</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent context info */}
              <div className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl">
                <h3 className="text-xs uppercase tracking-widest text-qh-cyan font-bold mb-2">Grafo Externo (Graphify)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  El grafo completo con visualización force-directed está en <span className="text-white font-mono">graphify-out/graph.json</span>.
                  Ejecutá <span className="text-qh-cyan font-mono">graphify</span> localmente para ver la visualización interactiva con comunidades y aristas.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Este explorador es interno: busca nodos, navega comunidades, y consulta el agente.
                  El agente Dominus ya consulta el grafo via API en cada mensaje.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="p-4">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="text-qh-cyan animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {searchQuery ? 'Sin resultados para esta búsqueda' : 'Escribe algo para buscar en el grafo'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(node => (
                    <NodeCard key={node.id} node={node} selected={selectedNode?.id === node.id} onClick={() => setSelectedNode(node)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'communities' && (
            <div className="p-4">
              {selectedCommunity === null ? (
                <div className="space-y-2">
                  {stats?.topCommunities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCommunityClick(c.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-qh-cyan font-bold">C{c.id}</span>
                        <span className="text-xs text-slate-400">{c.count} nodos</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-600" />
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => { setSelectedCommunity(null); setCommunityNodes([]); }}
                    className="mb-3 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    ← Volver a comunidades
                  </button>
                  <h3 className="text-sm font-bold text-white mb-3">Comunidad C{selectedCommunity}</h3>
                  {loadingCommunity ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="text-qh-cyan animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {communityNodes.map(node => (
                        <NodeCard key={node.id} node={node} selected={selectedNode?.id === node.id} onClick={() => setSelectedNode(node)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Node detail sidebar */}
      <div className={cn(
        "w-80 bg-qh-card border-l border-qh-border overflow-y-auto transition-all duration-300",
        selectedNode ? "translate-x-0" : "translate-x-full hidden"
      )}>
        {selectedNode && (
          <div className="p-6 space-y-6">
            <div>
              <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest mb-3', TYPE_COLORS[selectedNode.type] || 'text-slate-400 bg-slate-800 border-slate-700')}>
                {TYPE_ICONS[selectedNode.type] || <Box size={12} />}
                {selectedNode.type}
              </div>
              <h3 className="text-lg font-bold text-white">{selectedNode.label}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{selectedNode.summary || 'Sin descripción'}</p>
            </div>

            <div className="space-y-2 text-xs">
              {selectedNode.sourceFile && (
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText size={12} />
                  <span className="font-mono truncate">{selectedNode.sourceFile}</span>
                </div>
              )}
              {selectedNode.community !== undefined && selectedNode.community !== -1 && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Network size={12} />
                  <span>Comunidad: <span className="text-qh-cyan font-mono">C{selectedNode.community}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500">
                <BrainCircuit size={12} />
                <span>Importancia: <span className="text-white font-mono">{(selectedNode.importance * 100).toFixed(0)}%</span></span>
              </div>
            </div>

            {selectedNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Acciones</h4>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <BrainCircuit size={16} className="text-qh-cyan" /> Explicar con IA
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Bot size={16} className="text-emerald-400" /> Enviar a Agente
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <Copy size={16} className="text-slate-400" /> Copiar Contexto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeCard({ node, selected, onClick }: { node: GraphNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg border transition-colors",
        selected
          ? "bg-qh-cyan/10 border-qh-cyan/30"
          : "bg-slate-900/30 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 p-1 rounded', TYPE_COLORS[node.type] || 'text-slate-400 bg-slate-800')}>
          {TYPE_ICONS[node.type] || <Box size={12} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{node.label}</div>
          <div className="text-xs text-slate-500 truncate mt-0.5">{node.summary || 'Sin descripción'}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold', TYPE_COLORS[node.type] || 'text-slate-400 bg-slate-800 border-slate-700')}>
              {node.type}
            </span>
            {node.community !== undefined && node.community !== -1 && (
              <span className="text-[9px] text-slate-600 font-mono">C{node.community}</span>
            )}
            <span className="text-[9px] text-slate-600">{(node.importance * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}
