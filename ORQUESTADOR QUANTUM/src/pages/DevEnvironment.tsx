import { useState } from 'react';
import { useStore } from '../store/useStore';
import { TerminalSquare, Server, Code, Play, Plus, Search, Terminal } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

export function DevEnvironment() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'skills' | 'mcp' | 'cli' | 'plugins'>('skills');

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-200">Entorno de Desarrollo Central</h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Gestionar Habilidades, Servidores MCP y Acciones CLI</p>
        </div>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col flex-1 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-qh-border bg-slate-900/50 p-2 gap-2">
          <button 
            onClick={() => setActiveTab('skills')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'skills' ? "bg-qh-gold/20 text-qh-gold border border-qh-gold/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <Code size={14} /> Skills
          </button>
          <button 
            onClick={() => setActiveTab('mcp')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'mcp' ? "bg-qh-gold/20 text-qh-gold border border-qh-gold/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <Server size={14} /> MCP Servers
          </button>
          <button 
            onClick={() => setActiveTab('cli')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'cli' ? "bg-qh-gold/20 text-qh-gold border border-qh-gold/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <Terminal size={14} /> CLI
          </button>
          <button 
            onClick={() => setActiveTab('plugins')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'plugins' ? "bg-qh-gold/20 text-qh-gold border border-qh-gold/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <Code size={14} /> Plugins & Tools
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900/30 p-6 relative">
          
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search skills..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded pl-9 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-qh-gold transition-colors"
                  />
                </div>
                <button className="glass-button bg-qh-gold/10 text-qh-gold hover:bg-qh-gold/20 border-qh-gold/30">
                  <Plus size={14} /> Add Skill
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {store.skillDefinitions.map((skill, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col hover:border-qh-gold/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-slate-200 font-bold text-sm">{skill.name}</h3>
                      <span className={cn("text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border", skill.installStatus === 'installed' ? "bg-qh-emerald/10 text-qh-emerald border-qh-emerald/20" : "bg-slate-700 text-slate-400 border-slate-600")}>
                        {skill.installStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 flex-1">{skill.description}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>vv1.0.0</span>
                      <button className="text-qh-gold hover:underline">Configure</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-slate-400 text-xs">Connected Model Context Protocol servers</div>
                <button className="glass-button bg-qh-gold/10 text-qh-gold hover:bg-qh-gold/20 border-qh-gold/30">
                  <Plus size={14} /> Connect Server
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Simulado MCP Servers */}
                {[
                  { name: 'Local File System', url: 'stdio://local-fs', status: 'connected', tools: 12 },
                  { name: 'GitHub Integration', url: 'https://mcp.github.com/v1', status: 'disconnected', tools: 45 },
                  { name: 'Notion Workspace', url: 'https://mcp.notion.so/api', status: 'connected', tools: 8 }
                ].map((mcp, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-qh-gold">
                        <Server size={20} />
                      </div>
                      <div>
                        <h3 className="text-slate-200 font-bold text-sm flex items-center gap-2">
                          {mcp.name}
                          <span className={cn("w-2 h-2 rounded-full", mcp.status === 'connected' ? "bg-qh-emerald" : "bg-slate-600")}></span>
                        </h3>
                        <div className="text-xs text-slate-500 font-mono mt-1">{mcp.url}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center hidden sm:block">
                        <div className="text-lg font-bold text-slate-300">{mcp.tools}</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500">Tools Exps</div>
                      </div>
                      <button className="glass-button text-xs py-1">Manage</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="text-slate-400 text-xs">Execute terminal commands directly in the centralized context</div>
              </div>
              <div className="flex-1 bg-black rounded-lg border border-slate-700 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                <div className="flex-1 overflow-y-auto space-y-2 text-slate-300">
                  <div className="text-slate-500">QuantumHive OS v1.0.4 - CLI Environment Initialized.</div>
                  <div><span className="text-qh-gold">ceo@quantumhive:~$</span> mcp status</div>
                  <div>[OK] Local File System - Connected</div>
                  <div>[WARN] GitHub Integration - Disconnected</div>
                  <div><span className="text-qh-gold">ceo@quantumhive:~$</span> npm run lint</div>
                  <div>&gt; qh-control-plane@0.0.0 lint</div>
                  <div>&gt; tsc --noEmit</div>
                  <div className="text-qh-emerald">Completed successfully.</div>
                  <div className="flex items-center gap-2">
                    <span className="text-qh-gold">ceo@quantumhive:~$</span> 
                    <span className="w-2 h-3 bg-slate-300 animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plugins' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-slate-400 text-xs">Install and manage core plugins for an optimal development experience</div>
                <button className="glass-button bg-qh-gold/10 text-qh-gold hover:bg-qh-gold/20 border-qh-gold/30">
                  <Plus size={14} /> Install Plugin
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'VS Code Sync', desc: 'Syncs environment settings and snippets with VS Code', version: '1.4.2', status: 'installed' },
                  { name: 'Docker Compose Manager', desc: 'UI for managing multi-container local environments', version: '0.8.0', status: 'installed' },
                  { name: 'ESLint & Prettier Strict', desc: 'Auto-format on save with custom team rules', version: '2.1.0', status: 'installed' },
                  { name: 'GraphQL Playground', desc: 'In-app GraphQL schema explorer and tester', version: '1.0.5', status: 'available' },
                  { name: 'Tailwind Config UI', desc: 'Visual editor for tailwind.config.ts', version: '3.0.0', status: 'available' }
                ].map((plugin, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col hover:border-qh-gold/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-slate-200 font-bold text-sm">{plugin.name}</h3>
                      <span className={cn("text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border", plugin.status === 'installed' ? "bg-qh-cyan/10 text-qh-cyan border-qh-cyan/20" : "bg-slate-700 text-slate-400 border-slate-600")}>
                        {tStatus(plugin.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 flex-1">{plugin.desc}</p>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500">v{plugin.version}</span>
                      {plugin.status === 'installed' ? (
                        <button className="text-qh-gold hover:underline">Settings</button>
                      ) : (
                        <button className="text-qh-emerald hover:underline">Install</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
