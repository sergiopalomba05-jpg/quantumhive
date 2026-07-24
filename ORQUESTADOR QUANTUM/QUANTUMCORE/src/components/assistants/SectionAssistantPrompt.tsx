import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSectionAssistantPrompt } from './sectionPromptModel';

export function SectionAssistantPrompt() {
  const location = useLocation();
  const store = useStore();
  const [visible, setVisible] = useState(false);
  const prompt = getSectionAssistantPrompt(location.pathname, 'Asistente Global');

  useEffect(() => {
    const shouldShow = ['/agent-builder', '/planner', '/mcp-hub'].includes(location.pathname);
    setVisible(shouldShow && !store.dismissedTips.includes(prompt.tipId));
  }, [location.pathname, prompt.tipId, store.dismissedTips]);

  if (!visible) return null;

  const openAssistant = () => {
    window.dispatchEvent(new Event('qh:open-contextual-assistant'));
    store.dismissTip(prompt.tipId);
    setVisible(false);
  };

  const dismiss = () => {
    store.dismissTip(prompt.tipId);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 right-20 z-50 max-w-sm rounded-xl border border-qh-cyan/30 bg-slate-950 p-4 shadow-2xl shadow-black/40 md:bottom-4">
      <button onClick={dismiss} className="absolute right-2 top-2 text-slate-500 hover:text-white" aria-label="Cerrar ayuda">
        <X size={16} />
      </button>
      <div className="mb-2 flex items-center gap-2 text-qh-cyan">
        <Sparkles size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Asistente disponible</span>
      </div>
      <h3 className="pr-6 text-sm font-bold text-white">{prompt.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{prompt.body}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={openAssistant} className="rounded-lg border border-qh-cyan/30 bg-qh-cyan/10 px-3 py-2 text-xs font-bold text-qh-cyan hover:bg-qh-cyan/20">
          Abrir asistente
        </button>
        <button onClick={dismiss} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white">
          No mostrar de nuevo
        </button>
      </div>
    </div>
  );
}
