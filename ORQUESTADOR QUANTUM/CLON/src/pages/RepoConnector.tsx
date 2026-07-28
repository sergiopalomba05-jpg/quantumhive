import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { FolderGit2, Plus, Github, Folder, RefreshCw, Box, Send, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { RepoConnection } from '../types';

export function RepoConnector() {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [repoType, setRepoType] = useState<'github' | 'local'>('github');
  const [url, setUrl] = useState('');
  
  const handleAdd = () => {
    // Add mock repo
    const newRepo: RepoConnection = {
      id: `repo_${Date.now()}`,
      name: url.split('/').pop() || 'new-repo',
      provider: repoType,
      repoUrl: repoType === 'github' ? url : '',
      localPath: repoType === 'local' ? url : '',
      defaultBranch: 'main',
      activeBranch: 'main',
      status: 'simulado',
      graphifyStatus: 'imported',
      lastIndexedAt: Date.now(),
      notes: 'Repo mock added manually'
    };
    useStore.setState(state => ({ repoConnections: [...state.repoConnections, newRepo] }));
    setShowAdd(false);
    setUrl('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FolderGit2 className="text-qh-cyan" /> Conector de Repos
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta repositorios (GitHub o locales) para dar contexto a los agentes. (Modo Simulado)</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="glass-button flex items-center gap-2">
          <Plus size={16} /> Añadir Repo
        </button>
      </div>

      {showAdd && (
        <div className="glass-panel p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-white mb-4">Añadir Repositorio (Mock)</h3>
          <div className="flex gap-4 mb-4">
            <button 
              className={cn("px-4 py-2 rounded-lg border", repoType === 'github' ? "border-qh-cyan bg-qh-cyan/10 text-qh-cyan" : "border-slate-700 text-gray-400 hover:bg-white/5")}
              onClick={() => setRepoType('github')}
            >
              <Github size={16} className="inline mr-2"/> GitHub
            </button>
            <button 
              className={cn("px-4 py-2 rounded-lg border", repoType === 'local' ? "border-qh-cyan bg-qh-cyan/10 text-qh-cyan" : "border-slate-700 text-gray-400 hover:bg-white/5")}
              onClick={() => setRepoType('local')}
            >
              <Folder size={16} className="inline mr-2"/> Local Path
            </button>
          </div>
          <input 
            type="text" 
            placeholder={repoType === 'github' ? "https://github.com/org/repo" : "/Users/user/projects/repo"}
            className="glass-input w-full mb-4"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm text-gray-400 hover:text-white" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="px-4 py-2 text-sm bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded" onClick={handleAdd}>Conectar Simulado</button>
          </div>
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
                    {repo.provider === 'github' ? <Github size={18}/> : <Folder size={18}/>}
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
                  {repo.provider === 'github' ? repo.repoUrl : repo.localPath}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <span className="text-gray-500 text-xs mr-2">Branch Active:</span>
                    <span className="text-qh-cyan font-mono">{repo.activeBranch}</span>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <span className="text-gray-500 text-xs mr-2">Worktrees (Mock):</span>
                    <span className="text-white">2</span>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-white/5">
                    <span className="text-gray-500 text-xs mr-2">Last Indexed:</span>
                    <span className="text-white">{repo.lastIndexedAt ? new Date(repo.lastIndexedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:w-48">
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Generando Context Pack mock...')}>
                  <Box size={14} /> Crear Context Pack
                </button>
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Enviando contexto al agente mock...')}>
                  <Send size={14} /> Enviar a Agente
                </button>
                <button className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 flex items-center gap-2 justify-center" onClick={() => alert('Creando tarea vinculada mock...')}>
                  <FileText size={14} /> Crear Tarea
                </button>
                <div className="text-[9px] text-gray-500 mt-2 text-center">
                  Las funciones reales requieren un Worker Local / Backend.
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
