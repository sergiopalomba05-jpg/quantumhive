import { useState } from 'react';
import { Package, Download, Code, Layers } from 'lucide-react';

export function ContextPacks() {
  
  const packs = [
    { id: 'master', name: 'Master Context', desc: 'Contexto global de todos los proyectos y el estado general.', modules: 'All' },
    { id: 'carta-viva', name: 'Carta Viva', desc: 'Contexto específico de la división de productos core y diseño.', modules: 'Ideas, Projects, Tasks' },
    { id: 'humania', name: 'HumanIA', desc: 'Agentes conversacionales, asistentes y bots.', modules: 'Agents, Videos, Memories' },
    { id: 'infra', name: 'Infraestructura', desc: 'DevOps, Cloud, Seguridad y Pipelines.', modules: 'Cloud, Decisions, Audit' },
    { id: 'avatar', name: 'Avatar Engine', desc: 'Generación multimodal de avatares.', modules: 'Videos, Agents, Tasks' },
    { id: 'trading', name: 'Trading', desc: 'Algoritmos, APIs financieras y backtesting.', modules: 'Projects, Decisions, Cloud' },
  ];

  const handleExportJson = (name: string) => {
    alert(`Exportando ${name} como JSON...`);
  };

  const handleExportMd = (name: string) => {
    alert(`Exportando ${name} como Markdown...`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Package className="text-qh-cyan" size={28} /> Context Packs
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Paquetes de contexto filtrados para inyectar en agentes externos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map(pack => (
          <div key={pack.id} className="bg-qh-card border border-qh-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col hover:border-qh-gold/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-qh-gold">
                <Layers size={20} />
              </div>
              <h3 className="text-slate-200 font-bold">{pack.name}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 flex-1">{pack.desc}</p>
            
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">
              Incluye: <span className="text-qh-cyan font-mono">{pack.modules}</span>
            </div>

            <div className="flex gap-2 border-t border-qh-border pt-4">
              <button 
                onClick={() => handleExportJson(pack.name)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Code size={14} /> JSON
              </button>
              <button 
                onClick={() => handleExportMd(pack.name)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-qh-cyan/10 text-qh-cyan hover:bg-qh-cyan/20 border border-qh-cyan/30 transition-colors"
              >
                <Download size={14} /> Markdown
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
