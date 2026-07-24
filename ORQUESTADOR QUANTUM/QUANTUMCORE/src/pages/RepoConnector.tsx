import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { FolderGit2, Plus, Github, RefreshCw, Box, Send, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { tStatus } from '../lib/utils';
import { RepoConnection } from '../types';

function mapBackendRepo(repo: {
  id: string;
  name: string;
  fullName: string;
  url: string;
  active: boolean;
  lastIndexedAt: string;
}): RepoConnection {
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
  };
}

export function RepoConnector() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github/repos')
      .then(res => res.json())
      .then((data: { repos: Array<{
        id: string;
        owner: string;
        name: string;
        fullName: string;
        title: string;
        summary: string;
        url: string;
        active: boolean;
        lastIndexedAt: string;
      }> }) => {
        const mapped = data.repos.map(mapBackendRepo);
        useStore.setState({ repoConnections: mapped });
      })
      .catch(() => {
        // silently ignore fetch errors on mount
      });
  }, []);

  const handleAdd = async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar repositorio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FolderGit2 className="text-qh-cyan" /> Conector de Repos
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta repositorios GitHub para dar contexto a los agentes.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="glass-button flex items-center gap-2">
          <Plus size={16} /> Añadir Repo
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-white mb-4">Añadir Repositorio</h3>
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <Github size={16} /> GitHub
          </div>
          <input
            type="text"
            placeholder="https://github.com/org/repo"
            className="glass-input w-full mb-4"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button
              className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded disabled:opacity-50"
              onClick={handleAdd}
              disabled={loading || !url.trim()}
            >
              {loading ? 'Conectando...' : 'Conectar'}
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
          store.repoConnections?.map(repo => (
            <div key={repo.id} className="glass-panel p-5 flex flex-col md:flex-row gap-6">
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
              </div>

              <div className="flex flex-col gap-2 md:w-48">
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Función próximamente')}>
                  <Box size={14} /> Crear Context Pack
                </button>
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Función próximamente')}>
                  <Send size={14} /> Enviar a Agente
                </button>
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Función próximamente')}>
                  <FileText size={14} /> Crear Tarea
                </button>
                <div className="text-[9px] text-gray-500 mt-2 text-center">
                  Funciones adicionales próximamente.
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
