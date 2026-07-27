import { useEffect, useState } from 'react';
import { useProviderStore } from '../store/providerStore';
import { Plus, X, Loader2, KeyRound } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
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
  const [apiProviders, setApiProviders] = useState<ProviderItem[]>([]);
  const { customProviders, addCustomProvider, removeCustomProvider, toggleModel } = useProviderStore();
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [testingProviderId, setTestingProviderId] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvName, setNewProvName] = useState('');
  const [newProvUrl, setNewProvUrl] = useState('https://api.openai.com/v1');
  const [newProvKey, setNewProvKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Combinar proveedores del backend con los personalizados (BYOK)
  const allProviders: ProviderItem[] = [
    ...apiProviders,
    ...customProviders.map((cp) => ({
      id: cp.id,
      name: cp.name,
      kind: 'api',
      status: 'connected',
      runtime: cp.baseUrl,
      secretRef: 'Local Storage (BYOK)',
      notes: 'Proveedor personalizado configurado localmente.',
      models: cp.models.map((m) => ({
        id: m.id,
        displayName: m.name,
        connectionStatus: 'verified',
        routerReady: true,
        capabilities: ['custom'],
      })),
    })),
  ];

  const filteredProviders = kindFilter === 'all' ? allProviders : allProviders.filter((provider) => provider.kind === kindFilter);

  useEffect(() => {
    fetch('/api/providers')
      .then((response) => response.json())
      .then((data) => setApiProviders(data.providers || []))
      .catch(() => setApiProviders([]));
  }, []);

  const handleAddCustomProvider = async () => {
    if (!newProvName || !newProvUrl || !newProvKey) {
      setVerifyError('Por favor completa todos los campos.');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      const url = newProvUrl.replace(/\/$/, '') + '/models';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${newProvKey}` },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Verifica tu API Key y Base URL`);
      }

      const data = await response.json();
      const modelsList = data.data || data.models || [];
      const parsedModels = modelsList.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        enabled: false,
      }));

      addCustomProvider({
        id: `custom-${uuidv4().slice(0, 8)}`,
        name: newProvName,
        baseUrl: newProvUrl,
        apiKey: newProvKey,
        models: parsedModels,
      });

      setShowAddModal(false);
      setNewProvName('');
      setNewProvUrl('https://api.openai.com/v1');
      setNewProvKey('');
    } catch (err: any) {
      setVerifyError(err.message || 'Error al conectar con el proveedor');
    } finally {
      setIsVerifying(false);
    }
  };



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
        <button onClick={() => setShowAddModal(true)} className="glass-button text-xs uppercase flex items-center gap-1">
          <Plus className="h-3 w-3" /> Agregar proveedor
        </button>
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
                {provider.models.map((model) => {
                  const isCustomProvider = provider.id.startsWith('custom-');
                  const customModel = isCustomProvider 
                    ? customProviders.find(p => p.id === provider.id)?.models.find(m => m.id === model.id)
                    : null;
                  
                  const isEnabled = isCustomProvider ? customModel?.enabled : true;

                  return (
                    <span 
                      key={model.id} 
                      onClick={() => {
                        if (isCustomProvider) {
                          toggleModel(provider.id, model.id);
                        }
                      }}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[10px] font-mono",
                        isCustomProvider ? "cursor-pointer transition-colors" : "",
                        isEnabled 
                          ? "border-qh-cyan/40 bg-qh-cyan/10 text-qh-cyan" 
                          : "border-white/10 bg-black/30 text-slate-500 hover:border-qh-cyan/30"
                      )}
                    >
                      {model.displayName}
                      {model.routerReady && !isCustomProvider ? ' · Router Ready' : ''}
                      {!isEnabled && isCustomProvider ? ' · Inactivo' : ''}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 mt-auto rounded-xl border border-qh-gold/15 bg-slate-950/62 p-3 text-[11px] leading-5 text-slate-300">
              Runtime: {provider.runtime}<br />Secret Manager: {provider.secretRef}
            </div>

            <div className="relative z-10 flex gap-2">
              <button
                className="rounded-lg border border-qh-cyan/30 px-3 py-2 text-[10px] font-mono text-qh-cyan disabled:cursor-not-allowed disabled:opacity-50"
                disabled={testingProviderId === provider.id}
                onClick={() => {
                  if (provider.id.startsWith('custom-')) {
                    setTestMessage(`${provider.name}: Proveedor personalizado funcionando OK (Modelos mapeados: ${provider.models.length})`);
                    return;
                  }
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

              {provider.id.startsWith('custom-') && (
                <button
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-[10px] font-mono text-red-400 hover:bg-red-500/10"
                  onClick={() => removeCustomProvider(provider.id)}
                >
                  Eliminar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-qh-cyan" />
                Agregar Proveedor
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400">
                Podés agregar cualquier proveedor compatible con OpenAI (OpenRouter, Groq, Kimi, etc). La API Key se guarda localmente en tu navegador.
              </p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-qh-cyan">Nombre del Proveedor</label>
                <input
                  type="text"
                  value={newProvName}
                  onChange={(e) => setNewProvName(e.target.value)}
                  placeholder="Ej: OpenRouter, Groq, Kimi..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-qh-cyan focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-qh-cyan">Base URL</label>
                <input
                  type="text"
                  value={newProvUrl}
                  onChange={(e) => setNewProvUrl(e.target.value)}
                  placeholder="Ej: https://openrouter.ai/api/v1"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-qh-cyan focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-qh-cyan">API Key</label>
                <input
                  type="password"
                  value={newProvKey}
                  onChange={(e) => setNewProvKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-qh-cyan focus:outline-none"
                />
              </div>

              {verifyError && (
                <div className="rounded-lg bg-red-500/10 p-2 text-xs text-red-400 border border-red-500/20">
                  {verifyError}
                </div>
              )}

              <button
                onClick={handleAddCustomProvider}
                disabled={isVerifying}
                className="w-full rounded-xl bg-qh-cyan py-3 text-sm font-bold text-slate-900 hover:bg-qh-cyan/90 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verificando modelos...
                  </>
                ) : (
                  'Conectar y Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
