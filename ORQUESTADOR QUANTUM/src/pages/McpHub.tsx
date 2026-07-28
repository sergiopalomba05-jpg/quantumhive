import React from 'react';
import { useStore } from '../store/useStore';
import { Plug2, Terminal, Globe } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

export function McpHub() {
  const store = useStore();
  
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
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Plug2 size={18} className="text-emerald-400" /> MCP Servers
          </h3>
          <div className="space-y-3">
            {store.mcpServerDefinitions?.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No hay MCP Servers registrados.</div>
            ) : (
              store.mcpServerDefinitions?.map(m => (
                <div key={m.id} className="bg-black/30 p-3 rounded border border-white/5">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{tStatus(m.status)}</span>
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

      </div>
    </div>
  );
}
