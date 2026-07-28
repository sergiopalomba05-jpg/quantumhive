import { tStatus } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';
import { useStore } from '../store/useStore';
import { Database, CheckSquare, Activity, Cpu, Cloud, Scale, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MemoryView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Database className="text-qh-cyan" /> Memoria Compartida</h2><TourButton tourId="memory" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.memories.map(m => (
          <div key={m.id} className="glass-panel p-5 border-l-2 border-l-qh-cyan">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white">{m.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10">{m.type}</span>
            </div>
            <p className="text-sm text-gray-300">{m.content}</p>
            <div className="mt-4 flex gap-2 text-xs">
              {m.tags.map(t => <span key={t} className="text-gray-500">#{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksView() {
  const store = useStore();
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><CheckSquare className="text-qh-amber" /> Tareas Activas</h2><TourButton tourId="memory" /></div>
      <div className="space-y-3">
        {store.tasks.map(t => (
          <div key={t.id} className="glass-panel p-4 flex justify-between items-center">
            <div>
              <div className="font-medium text-white">{t.title}</div>
              <div className="text-xs text-gray-400 mt-1">Criterios: {t.acceptanceCriteria}</div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/skill-advisor')}
                className="text-xs px-3 py-1 bg-qh-cyan/10 text-qh-cyan border border-qh-cyan/20 rounded uppercase font-bold hover:bg-qh-cyan/20 transition-colors"
              >
                Recomendar Skill
              </button>
              <span className="text-xs px-2 py-1 bg-white/10 rounded uppercase font-mono">{tStatus(t.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventsView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Activity className="text-purple-400" /> Event Bus</h2><TourButton tourId="memory" /></div>
      <div className="bg-black/40 rounded-xl border border-white/10 p-4 font-mono text-sm space-y-2">
        {store.events.map(e => (
          <div key={e.id} className="flex gap-4 p-2 hover:bg-white/5 rounded">
            <span className="text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span className="text-qh-cyan w-32 shrink-0">{e.type}</span>
            <span className="text-white flex-1">{e.payload}</span>
            <span className="text-gray-500 w-24 shrink-0 text-right">{e.actor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModelsView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Cpu className="text-qh-cyan" /> Model Router</h2><TourButton tourId="memory" /></div>
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm mb-6">
        <strong>Aviso de Seguridad:</strong> Las credenciales reales viven en el backend (Secret Manager). El cliente nunca expone API keys de Vertex o Azure.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.modelProviders.map(m => (
          <div key={m.id} className="glass-panel p-5">
            <h3 className="font-bold text-lg text-white mb-1">{m.name}</h3>
            <div className="text-sm text-qh-amber mb-4">{tStatus(m.status)}</div>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between border-b border-white/5 pb-1"><span>Modelo por Defecto:</span> <span>{m.defaultModel}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1"><span>Uso Est.:</span> <span>{m.estimatedUsage}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1"><span>Costo Est.:</span> <span>{m.estimatedCostMock}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CloudView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Cloud className="text-qh-cyan" /> Cloud Resources</h2><TourButton tourId="memory" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.cloudResources.map(c => (
          <div key={c.id} className="glass-panel p-5">
            <h3 className="font-bold text-white">{c.name}</h3>
            <div className="text-xs text-gray-400 mt-1">{c.notes}</div>
            <div className="mt-4 flex justify-between items-center text-sm">
              <span className="text-qh-cyan font-mono">{c.provider}</span>
              <span className="px-2 py-1 bg-white/10 rounded">{tStatus(c.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionsView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Scale className="text-qh-amber" /> Decisiones Core</h2><TourButton tourId="memory" /></div>
      <div className="space-y-4">
        {store.decisions.map(d => (
          <div key={d.id} className="glass-panel p-5">
            <h3 className="font-bold text-white text-lg">{d.title}</h3>
            <div className="text-qh-amber text-sm font-medium mt-1">{d.decision}</div>
            <div className="text-sm text-gray-300 mt-2 bg-black/20 p-3 rounded-lg border border-white/5">
              <strong>Razón:</strong> {d.reason}
            </div>
            <div className="text-xs text-gray-500 mt-3 text-right">Decidido por: {d.decidedBy}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentsView() {
  const store = useStore();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">Agentes / CEOs</h2><TourButton tourId="agents" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {store.agents.map(a => (
          <div key={a.id} className="glass-panel p-5 border-t-2 border-t-purple-500">
            <h3 className="font-bold text-white">{a.name}</h3>
            <div className="text-xs text-purple-400 mb-3">{a.role}</div>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>{a.macroDivision}</span>
              <span className="uppercase">{a.preferredModel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
