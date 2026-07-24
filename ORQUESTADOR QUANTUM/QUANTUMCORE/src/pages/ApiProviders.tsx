import { useEffect, useState } from 'react';

type ProviderModel = {
  id: string;
  displayName: string;
  connectionStatus: string;
  routerReady: boolean;
  capabilities: string[];
};

type ProviderItem = {
  id: string;
  name: string;
  status: string;
  runtime: string;
  secretRef: string;
  notes: string;
  models: ProviderModel[];
};

export function ApiProviders() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);

  useEffect(() => {
    fetch('/api/providers')
      .then((response) => response.json())
      .then((data) => setProviders(data.providers || []))
      .catch(() => setProviders([]));
  }, []);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <section className="qh-hero-card mb-5">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-qh-cyan">AI Providers / API Providers</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-50 md:text-4xl">Mapa inicial de proveedores de inteligencia</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Registro operativo para ver que cerebros estan conectados, cuales quedan pendientes y donde se van a proteger las credenciales. Esta pantalla es solo metadata: no captura claves ni valores sensibles.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Roadmap controlado: Vertex AI, OpenAI API, Azure OpenAI, Claude via Vertex Garden y NVIDIA NIM.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {providers.map((provider) => (
          <article key={provider.name} className="qh-stat-card flex min-h-[15rem] flex-col gap-4">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-50">{provider.name}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">{provider.notes}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-qh-gold">
                {provider.status}
              </span>
            </div>

            <div className="relative z-10 space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-qh-cyan/80">Modelos</div>
              <div className="flex flex-wrap gap-2">
                {provider.models.map((model) => (
                  <span key={model.id} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-mono text-slate-300">
                    {model.displayName}
                    {model.routerReady ? ' · Router Ready' : ` · ${model.connectionStatus}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-auto rounded-xl border border-qh-gold/15 bg-slate-950/62 p-3 text-[11px] leading-5 text-slate-300">
              Runtime: {provider.runtime}<br />Secret Manager: {provider.secretRef}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
