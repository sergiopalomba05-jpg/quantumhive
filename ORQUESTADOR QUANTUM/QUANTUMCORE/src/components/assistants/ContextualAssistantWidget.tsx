import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X, Send } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function ContextualAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const store = useStore();

  // Listen for external open events
  useEffect(() => {
    const openAssistant = () => setIsOpen(true);
    window.addEventListener('qh:open-contextual-assistant', openAssistant);
    return () => window.removeEventListener('qh:open-contextual-assistant', openAssistant);
  }, []);

  // Clear messages on route change
  useEffect(() => {
    setMessages([]);
  }, [location.pathname]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const contextSummary = `Seccion actual: ${location.pathname}. Proyectos activos: ${store.projects?.filter(p => p.status === 'active').length || 0}. Agentes: ${store.agents?.length || 0}. Workflows: ${store.workflowDefinitions?.length || 0}.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Contexto QuantumHive] ${contextSummary}\n\nPregunta del usuario: ${userMessage}`,
        }),
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.text || 'Sin respuesta.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'No se pudo conectar con el asistente. Verifica que el servidor este corriendo.' }]);
    } finally {
      setLoading(false);
    }

    store.addAuditLog({
      action: 'model_call',
      actor: 'contextual-assistant',
      module: 'system',
      summary: `Consulta del asistente contextual en ${location.pathname}`,
      severity: 'info',
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-qh-cyan/30 bg-slate-950/90 text-qh-cyan shadow-lg shadow-black/40 hover:bg-qh-cyan/10 hover:shadow-qh-cyan/20 transition-all md:bottom-4"
        aria-label="Abrir asistente contextual"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex h-[480px] w-[360px] flex-col rounded-2xl border border-qh-cyan/20 bg-slate-950/95 shadow-2xl shadow-black/50 md:bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-qh-cyan" />
          <span className="text-xs font-bold uppercase tracking-widest text-qh-cyan">Asistente Contextual</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white" aria-label="Cerrar asistente">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <Sparkles size={28} className="mb-3 text-qh-cyan/40" />
            <p className="text-xs">Preguntame sobre esta seccion, tus proyectos, o que hacer a continuacion.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl px-3 py-2 text-xs leading-relaxed',
              msg.role === 'user'
                ? 'ml-8 bg-qh-cyan/10 text-slate-200 border border-qh-cyan/20'
                : 'mr-8 bg-slate-900 text-slate-300 border border-white/5'
            )}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="mr-8 rounded-xl bg-slate-900 border border-white/5 px-3 py-2 text-xs text-slate-500">
            Pensando...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribi tu consulta..."
            className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-qh-cyan/40"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-lg border border-qh-cyan/30 bg-qh-cyan/10 px-3 py-2 text-qh-cyan hover:bg-qh-cyan/20 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
