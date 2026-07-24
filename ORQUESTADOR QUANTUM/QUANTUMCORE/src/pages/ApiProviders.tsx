const providers = [
  {
    name: 'Vertex AI',
    status: 'Conectado',
    role: 'Proveedor principal de Dominus y del Brain Router.',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    handling: 'Credenciales por runtime de Google Cloud y Secret Manager.',
  },
  {
    name: 'OpenAI API',
    status: 'Pendiente',
    role: 'Planificacion, producto y estrategia cuando se habilite.',
    models: ['gpt-chat-latest'],
    handling: 'Alta futura desde backend con Secret Manager.',
  },
  {
    name: 'Azure OpenAI',
    status: 'Pendiente',
    role: 'Entrada empresarial compatible con despliegues privados.',
    models: ['GPT deployments administrados'],
    handling: 'Endpoint y credencial protegidos fuera del frontend.',
  },
  {
    name: 'Claude via Vertex Garden',
    status: 'Pendiente',
    role: 'Codigo, arquitectura y revision profunda si se habilita en Vertex.',
    models: ['Claude Sonnet'],
    handling: 'Gobernado como modelo Vertex, no como integracion cliente.',
  },
  {
    name: 'NVIDIA NIM',
    status: 'Pendiente',
    role: 'Ruta futura para modelos acelerados y OpenAI-compatible.',
    models: ['Modelos NIM habilitados por backend'],
    handling: 'Configuracion futura server-side con Secret Manager.',
  },
];

export function ApiProviders() {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <section className="qh-hero-card mb-5">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-qh-cyan">AI Providers / API Providers</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-50 md:text-4xl">Mapa inicial de proveedores de inteligencia</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Registro operativo para ver que cerebros estan conectados, cuales quedan pendientes y donde se van a proteger las credenciales. Esta pantalla es solo metadata: no captura claves ni valores sensibles.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-5">
        {providers.map((provider) => (
          <article key={provider.name} className="qh-stat-card flex min-h-[15rem] flex-col gap-4">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-50">{provider.name}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">{provider.role}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest text-qh-gold">
                {provider.status}
              </span>
            </div>

            <div className="relative z-10 space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-qh-cyan/80">Modelos</div>
              <div className="flex flex-wrap gap-2">
                {provider.models.map((model) => (
                  <span key={model} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-mono text-slate-300">
                    {model}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-auto rounded-xl border border-qh-gold/15 bg-slate-950/62 p-3 text-[11px] leading-5 text-slate-300">
              {provider.handling}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
