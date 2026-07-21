import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Brain, Plus, Zap, Lock } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { BrainProvider } from '../types';

export function BrainRegistry() {
  const store = useStore();
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Brain className="text-qh-amber" /> Registro de Cerebros
          </h2>
          <p className="text-sm text-gray-400 mt-1">Conecta y enruta modelos fundacionales (LLMs) para tus agentes.</p>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 text-sm text-red-200">
        <Lock className="text-red-400 shrink-0 mt-0.5" size={16}/>
        <div>
          <strong>Aviso de Seguridad:</strong> Las API keys reales de OpenAI, Anthropic, Gemini, etc. NUNCA deben configurarse en el frontend. El frontend solo configura los providers "simulados" o marca la intención de uso. El backend real se encarga de inyectar los secretos desde Secret Manager.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.brainProviders?.length === 0 ? (
          <div className="text-center py-12 text-gray-500 glass-panel md:col-span-2">No hay providers registrados.</div>
        ) : (
          store.brainProviders?.map(p => (
            <div key={p.id} className="glass-panel p-5 border-l-2 border-qh-amber">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{p.name}</h3>
                  <div className="text-xs text-gray-500 font-mono mt-1">{p.providerType}</div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {tStatus(p.status)}
                </span>
              </div>
              
              <div className="mb-4">
                <span className="text-xs text-gray-500 block mb-1">Modelos:</span>
                <div className="flex flex-wrap gap-2">
                  {p.availableModels.map(m => (
                    <span key={m} className={cn("text-[10px] px-2 py-0.5 rounded-full border", m === p.defaultModel ? "bg-qh-amber/20 text-qh-amber border-qh-amber/30" : "bg-white/5 text-gray-400 border-white/10")}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-black/30 p-3 rounded-lg border border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Tier:</span>
                  <span className={p.freeTier ? "text-emerald-400" : "text-qh-gold"}>{p.freeTier ? 'Gratis/Freemium' : 'Pago'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Secret Location:</span>
                  <span className="text-white">{p.whereSecretLives.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
