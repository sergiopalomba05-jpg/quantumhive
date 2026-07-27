import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plug2, Terminal, Globe, Plus, Play, Loader2 } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { N8N_TEMPLATE_REFERENCES } from '../workflows/n8nTemplates';
import { v4 as uuidv4 } from 'uuid';

export function McpHub() {
  const store = useStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMcp, setNewMcp] = useState({ name: '', command: '', args: '' });

  const handleConnect = async (mcp: any) => {
    try {
      setLoadingId(mcp.id);
      
      const parts = mcp.command.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);
      
      const res = await fetch('/api/runner/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'manage_mcp_server',
          args: { action: 'connect', id: mcp.id, name: mcp.name, command: cmd, args: args }
        })
      });
      
      if (res.ok) {
         // Optionally update status in store
         alert('Orden de conexión enviada al Quantum Runner. Verifica la terminal local.');
      }
    } catch(e) {
      console.error(e);
      alert('Error conectando al Runner');
    } finally {
      setLoadingId(null);
    }
  };

  const handleAdd = () => {
     if(!newMcp.name || !newMcp.command) return;
     store.addMcpServer({
        id: uuidv4(),
        name: newMcp.name,
        command: `${newMcp.command} ${newMcp.args}`.trim(),
        status: 'simulado',
        capabilities: [],
        requiredSecrets: [],
        linkedAgents: [],
        linkedWorkers: [],
        notes: ''
     });
     setShowAdd(false);
     setNewMcp({ name: '', command: '', args: '' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Plug2 className="text-qh-cyan" /> MCP / API / CLI Hub
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta herramientas y protocolos para expandir las capacidades del sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* MCP Servers */}
        <div className="glass-panel p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Plug2 size={18} className="text-emerald-400" /> MCP Servers Locales
            </h3>
            <button onClick={() => setShowAdd(!showAdd)} className="text-emerald-400 hover:text-emerald-300">
              <Plus size={18} />
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 p-3 bg-black/40 rounded border border-emerald-500/30 space-y-2">
               <input 
                  type="text" 
                  placeholder="Nombre (ej. Filesystem)" 
                  className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs text-white"
                  value={newMcp.name}
                  onChange={e => setNewMcp({...newMcp, name: e.target.value})}
               />
               <div className="flex gap-2">
                 <input 
                    type="text" 
                    placeholder="Comando (ej. npx)" 
                    className="w-1/3 bg-black/50 border border-white/10 rounded p-1.5 text-xs text-white"
                    value={newMcp.command}
                    onChange={e => setNewMcp({...newMcp, command: e.target.value})}
                 />
                 <input 
                    type="text" 
                    placeholder="Args (ej. -y @modelcontextprotocol/server-filesystem C:\\)" 
                    className="w-2/3 bg-black/50 border border-white/10 rounded p-1.5 text-xs text-white"
                    value={newMcp.args}
                    onChange={e => setNewMcp({...newMcp, args: e.target.value})}
                 />
               </div>
               <button onClick={handleAdd} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded font-bold">
                 Agregar MCP
               </button>
            </div>
          )}

          <div className="space-y-3">
            {store.mcpServerDefinitions?.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No hay MCP Servers registrados.</div>
            ) : (
              store.mcpServerDefinitions?.map(m => (
                <div key={m.id} className="bg-black/30 p-3 rounded border border-white/5 flex flex-col group relative">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <button 
                       onClick={() => handleConnect(m)}
                       disabled={loadingId === m.id}
                       className="text-[10px] uppercase px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {loadingId === m.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Conectar
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{m.command}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* API Connectors */}
        <div className="glass-panel p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-400" /> API Connectors
          </h3>
          <div className="space-y-3">
            {store.apiConnectorDefinitions?.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No hay APIs registradas.</div>
            ) : (
              store.apiConnectorDefinitions?.map(a => (
                <div key={a.id} className="bg-black/30 p-3 rounded border border-white/5">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white text-sm">{a.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{tStatus(a.status)}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{a.baseUrl}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CLI Tools */}
        <div className="glass-panel p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Terminal size={18} className="text-purple-400" /> CLI Tools
          </h3>
          <div className="space-y-3">
            {store.cliToolDefinitions?.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No hay CLIs registrados.</div>
            ) : (
              store.cliToolDefinitions?.map(c => (
                <div key={c.id} className="bg-black/30 p-3 rounded border border-white/5">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white text-sm">{c.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{tStatus(c.status)}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{c.commandName}</div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* N8N Template References */}
        <div className="glass-panel p-5 md:col-span-2 lg:col-span-3">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Globe size={18} className="text-orange-400" /> Templates N8N de referencia
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {N8N_TEMPLATE_REFERENCES.map((template) => (
              <a key={template.id} href={template.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 bg-black/30 p-3 hover:border-qh-cyan/40 transition-colors">
                <div className="text-sm font-bold text-slate-100">{template.name}</div>
                <div className="mt-1 text-xs text-slate-400">{template.usefulFor.join(' \u00B7 ')}</div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-qh-gold">n8n.io/workflows/{template.id}</div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Conexion real con N8N queda desactivada hasta crear una instancia nueva con credenciales corporativas.</p>
        </div>

      </div>
    </div>
  );
}
