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
  kind: string;
  status: string;
  runtime: string;
  secretRef: string;
  notes: string;
  models: ProviderModel[];
};

export function ApiProviders() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [testingProviderId, setTestingProviderId] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const filteredProviders = kindFilter === 'all' ? providers : providers.filter((provider) => provider.kind === kindFilter);

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
          <div className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-qh-cyan">Proveedores de IA</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-50 md:text-4xl">Mapa inicial de proveedores de inteligencia</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Registro operativo para ver que cerebros estan conectados, cuales quedan pendientes y donde se van a proteger las credenciales. Esta pantalla es solo metadata: no captura claves ni valores sensibles.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Roadmap controlado: Vertex AI, OpenAI API, Azure OpenAI, Claude via Vertex Garden y NVIDIA NIM.
          </p>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {['all', 'api', 'cloud', 'browser', 'headless', 'local'].map((kind) => (
          <button
            key={kind}
            onClick={() => setKindFilter(kind)}
            className={`glass-button text-xs uppercase ${kindFilter === kind ? 'border-qh-cyan/60 text-qh-cyan' : ''}`}
          >
            {kind === 'all' ? 'Todos' : kind === 'browser' ? 'Browser' : kind === 'headless' ? 'Headless' : kind === 'local' ? 'Local/VM' : kind}
          </button>
        ))}
        <button className="glass-button text-xs uppercase">Agregar proveedor</button>
      </div>

      {testMessage && (
        <div className="mb-4 rounded-xl border border-qh-cyan/20 bg-slate-950/60 px-3 py-2 text-[11px] font-mono text-qh-cyan">
          {testMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredProviders.map((provider) => (
          <article key={provider.name} className="qh-stat-card flex min-h-[15rem] flex-col gap-4">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-50">{provider.name}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">{provider.notes}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
                  <span>{provider.kind}</span>
                  <span>{provider.models.length} modelos</span>
                </div>
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

            <button
              className="relative z-10 rounded-lg border border-qh-cyan/30 px-3 py-2 text-[10px] font-mono text-qh-cyan disabled:cursor-not-allowed disabled:opacity-50"
              disabled={testingProviderId === provider.id}
              onClick={() => {
                setTestingProviderId(provider.id);
                fetch(`/api/providers/${provider.id}/test`, { method: 'POST' })
                  .then((response) => response.json())
                  .then((data) => setTestMessage(`${provider.name}: ${data.message || data.status}`))
                  .catch((error) => setTestMessage(`${provider.name}: ${error.message}`))
                  .finally(() => setTestingProviderId(''));
              }}
            >
              {testingProviderId === provider.id ? 'Probando...' : 'Probar'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
