import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { FolderGit2, Plus, Github, RefreshCw, Box, Send, FileText, CheckCircle2, AlertCircle, X, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { tStatus } from '../lib/utils';
import { RepoConnection } from '../types';

type GitHubAvailableRepo = {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  updatedAt: string;
};

type ConnectedBackendRepo = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  title: string;
  summary: string;
  url: string;
  active: boolean;
  lastIndexedAt: string;
  assignedAgentIds: string[];
};

function mapBackendRepo(repo: ConnectedBackendRepo): RepoConnection & { assignedAgentIds: string[] } {
  return {
    id: repo.id,
    name: repo.name,
    provider: 'github' as const,
    repoUrl: repo.url,
    localPath: '',
    defaultBranch: 'main',
    activeBranch: repo.active ? 'main' : '',
    status: repo.active ? 'conectado' : 'conectado',
    graphifyStatus: 'imported',
    lastIndexedAt: new Date(repo.lastIndexedAt).getTime(),
    notes: repo.fullName,
    assignedAgentIds: repo.assignedAgentIds || [],
  };
}

export function RepoConnector() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [connectionType, setConnectionType] = useState<'choose' | 'github' | 'local'>('choose');
  const [url, setUrl] = useState('');
  const [availableRepos, setAvailableRepos] = useState<GitHubAvailableRepo[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github/repos')
      .then(res => res.json())
      .then((data: { repos: ConnectedBackendRepo[] }) => {
        const mapped = data.repos.map(mapBackendRepo);
        useStore.setState({ repoConnections: mapped });
      })
      .catch(() => {
        // silently ignore fetch errors on mount
      });
  }, []);

  const fetchAvailableRepos = async () => {
    setLoadingAvailable(true);
    setError(null);
    try {
      const res = await fetch('/api/github/repos/available');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener repositorios');
      }
      setAvailableRepos(data.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener repositorios de GitHub');
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (connectionType === 'github') {
      fetchAvailableRepos();
    }
  }, [connectionType]);

  const handleAddFromUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar repositorio');
      }
      const mapped = mapBackendRepo(data.repo);
      useStore.setState(state => ({ repoConnections: [...state.repoConnections, mapped] }));
      setShowAdd(false);
      setUrl('');
      setConnectionType('choose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar repositorio');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFromList = async (repo: GitHubAvailableRepo) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: repo.fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar repositorio');
      }
      const mapped = mapBackendRepo(data.repo);
      useStore.setState(state => ({ repoConnections: [...state.repoConnections, mapped] }));
      setAvailableRepos(prev => prev.filter(r => r.fullName !== repo.fullName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar repositorio');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (repoId: string) => {
    try {
      await fetch(`/api/github/repos/${repoId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    useStore.setState(state => ({
      repoConnections: state.repoConnections.filter(r => r.id !== repoId),
    }));
  };

  const handleAgentAssignment = async (repoId: string, agentIds: string[]) => {
    try {
      const res = await fetch(`/api/github/repos/${repoId}/agents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedAgentIds: agentIds }),
      });
      if (res.ok) {
        useStore.setState(state => ({
          repoConnections: state.repoConnections.map(r =>
            r.id === repoId ? { ...r, assignedAgentIds: agentIds } : r
          ),
        }));
      }
    } catch {
      // ignore
    }
  };

  const agents = store.agents || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FolderGit2 className="text-qh-cyan" /> Conector de Repos
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta repositorios GitHub para dar contexto a los agentes.</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setConnectionType('choose'); }} className="glass-button flex items-center gap-2">
          <Plus size={16} /> Conectar Repo
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-white mb-4">Conectar Repositorio</h3>

          {connectionType === 'choose' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConnectionType('github')}
                className="glass-panel p-4 flex flex-col items-center gap-3 hover:border-qh-cyan/50 transition-colors cursor-pointer"
              >
                <Github size={28} className="text-white" />
                <span className="text-sm text-white font-medium">GitHub</span>
                <span className="text-xs text-gray-500">Seleccionar de tus repos</span>
              </button>
              <button
                onClick={() => setConnectionType('local')}
                className="glass-panel p-4 flex flex-col items-center gap-3 hover:border-qh-cyan/50 transition-colors cursor-pointer"
              >
                <FolderGit2 size={28} className="text-white" />
                <span className="text-sm text-white font-medium">Local</span>
                <span className="text-xs text-gray-500">Carpeta del sistema (próximamente)</span>
              </button>
            </div>
          )}

          {connectionType === 'github' && (
            <div>
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                <Github size={16} /> Selecciona un repositorio de GitHub
              </div>

              {loadingAvailable ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <RefreshCw size={16} className="animate-spin inline mr-2" /> Cargando repositorios...
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                    {availableRepos.map(repo => (
                      <div
                        key={repo.fullName}
                        className="flex items-center justify-between p-3 rounded border border-white/10 bg-black/20 hover:border-qh-cyan/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium truncate">{repo.name}</div>
                          <div className="text-xs text-gray-500 truncate">{repo.description || 'Sin descripción'}</div>
                        </div>
                        <button
                          onClick={() => handleConnectFromList(repo)}
                          disabled={loading}
                          className="ml-3 px-3 py-1 text-xs bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded disabled:opacity-50 shrink-0"
                        >
                          {loading ? '...' : 'Conectar'}
                        </button>
                      </div>
                    ))}
                    {availableRepos.length === 0 && !error && (
                      <div className="text-center py-4 text-gray-500 text-sm">No hay repositorios disponibles</div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-2">¿No lo ves? Conecta por URL:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://github.com/org/repo"
                        className="glass-input flex-1"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                      />
                      <button
                        className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded disabled:opacity-50"
                        onClick={handleAddFromUrl}
                        disabled={loading || !url.trim()}
                      >
                        {loading ? '...' : 'Conectar'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {connectionType === 'local' && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <FolderGit2 size={32} className="mx-auto mb-3 text-gray-600" />
              La conexión local estará disponible próximamente.
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              onClick={() => { setShowAdd(false); setConnectionType('choose'); setUrl(''); setError(null); }}
            >
              Cerrar
            </button>
          </div>
          {error && (
            <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {store.repoConnections?.length === 0 ? (
          <div className="text-center py-12 text-gray-500 glass-panel">No hay repositorios conectados.</div>
        ) : (
          store.repoConnections?.map(repo => {
            const isExpanded = expandedRepoId === repo.id;
            const assignedAgentIds = (repo as RepoConnection & { assignedAgentIds?: string[] }).assignedAgentIds || [];
            const assignedAgents = agents.filter(a => assignedAgentIds.includes(a.id));

            return (
              <div key={repo.id} className="glass-panel p-5">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Github size={18}/>
                        {repo.name}
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-600">
                        {tStatus(repo.status)}
                      </span>
                      {repo.graphifyStatus === 'imported' ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Indexado</span>
                      ) : (
                        <span className="text-[10px] text-qh-amber flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> {repo.graphifyStatus}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mb-4">
                      {repo.repoUrl}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="bg-black/30 p-2 rounded border border-white/5">
                        <span className="text-gray-500 text-xs mr-2">Rama activa:</span>
                        <span className="text-qh-cyan font-mono">{repo.activeBranch || 'N/A'}</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-white/5">
                        <span className="text-gray-500 text-xs mr-2">Última indexación:</span>
                        <span className="text-white">{repo.lastIndexedAt ? new Date(repo.lastIndexedAt).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>

                    {assignedAgents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {assignedAgents.map(a => (
                          <span key={a.id} className="text-[10px] px-2 py-0.5 rounded bg-qh-cyan/10 text-qh-cyan border border-qh-cyan/20">
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:w-48">
                    <button
                      className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center"
                      onClick={() => setExpandedRepoId(isExpanded ? null : repo.id)}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Ocultar' : 'Agentes'}
                    </button>
                    <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Función próximamente')}>
                      <Box size={14} /> Crear Context Pack
                    </button>
                    <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Función próximamente')}>
                      <Send size={14} /> Enviar a Agente
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-500/20 flex items-center gap-2 justify-center"
                      onClick={() => handleDisconnect(repo.id)}
                    >
                      <X size={14} /> Desconectar
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-sm text-gray-400 mb-3">Asignar agentes a este repositorio:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {agents.map(agent => {
                        const isSelected = assignedAgentIds.includes(agent.id);
                        return (
                          <button
                            key={agent.id}
                            onClick={() => {
                              const next = isSelected
                                ? assignedAgentIds.filter(id => id !== agent.id)
                                : [...assignedAgentIds, agent.id];
                              handleAgentAssignment(repo.id, next);
                            }}
                            className={`text-xs px-3 py-2 rounded border text-left transition-colors ${
                              isSelected
                                ? 'bg-qh-cyan/20 border-qh-cyan/40 text-qh-cyan'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            {agent.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-2">
                      Los agentes asignados recibirán contexto de este repositorio.
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
