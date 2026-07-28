import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Sparkles, Send, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { ContextualAssistant } from '../../types';

export function ContextualAssistantWidget() {
  const location = useLocation();
  const store = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentAssistant, setCurrentAssistant] = useState<ContextualAssistant | null>(null);
  
  const [messages, setMessages] = useState<{role: 'system' | 'user' | 'assistant', content: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Determine the active assistant based on the route
    const assistant = store.contextualAssistants?.find(a => 
      a.sectionId === location.pathname || 
      (a.sectionId !== '/' && location.pathname.startsWith(a.sectionId))
    ) || store.contextualAssistants?.find(a => a.sectionId === '/'); // fallback to global
    
    setCurrentAssistant(assistant || null);
    
    // Reset state on route change if modal is closed
    if (!isOpen) {
      setMessages([]);
      setUserInput('');
    }
  }, [location.pathname, store.contextualAssistants, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0 && currentAssistant) {
      setMessages([
        {
          role: 'assistant',
          content: `¡Hola! Soy tu ${currentAssistant.name}. Mi objetivo es: ${currentAssistant.purpose}. ¿Qué te gustaría lograr en esta sección?`
        }
      ]);
    }
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    
    const newMessages = [...messages, { role: 'user' as const, content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsProcessing(true);
    
    // Mock processing
    setTimeout(() => {
      setIsProcessing(false);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Entendido. En modo MVP, puedo simular la creación de esto por ti o explicarte cómo hacerlo.'
        }
      ]);
    }, 1000);
  };

  const handleActionClick = (action: string) => {
    setUserInput(action);
  };

  const handleSimulateCreate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content: '¡Hecho! He creado los registros de forma automática en modo simulado. Puedes ver los cambios reflejados en la interfaz.'
        }
      ]);
    }, 1500);
  };

  if (!currentAssistant) return null;

  return (
    <>
      <button 
        onClick={handleOpen}
        className="glass-button py-1.5 bg-qh-cyan/20 text-qh-cyan border-qh-cyan/30 hover:bg-qh-cyan/30 flex items-center gap-2 relative group"
        title="Ayuda de IA contextual"
      >
        <Sparkles size={14} className="group-hover:animate-pulse" />
        <span className="hidden sm:inline">Asistente</span>
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-900 border-l border-qh-cyan/20 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-qh-cyan/20 border border-qh-cyan/40 flex items-center justify-center text-qh-cyan">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm leading-tight">{currentAssistant.name}</h3>
                <div className="text-[10px] text-qh-cyan font-mono uppercase">{currentAssistant.macroArea}</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2">
              <X size={18} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-qh-bg">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-200 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 text-blue-400" />
              <div>Este asistente contextual puede crear configuraciones simuladas en esta sección o explicarte paso a paso cómo usarla. Ninguna acción destructiva ocurrirá sin tu aprobación.</div>
            </div>

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-lg p-3 text-sm",
                  msg.role === 'user' ? "bg-slate-700 text-white" : "bg-black/40 border border-qh-cyan/20 text-slate-200"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-black/40 border border-qh-cyan/20 rounded-lg p-3 text-sm text-qh-cyan flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-75">●</span>
                  <span className="animate-pulse delay-150">●</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Suggestions */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex flex-wrap gap-2">
              {currentAssistant.suggestedActions?.map(action => (
                <button 
                  key={action}
                  onClick={() => handleActionClick(action)}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-qh-cyan/20 border border-white/10 hover:border-qh-cyan/30 rounded-full text-slate-300 transition-colors"
                >
                  {action}
                </button>
              ))}
              <button 
                onClick={handleSimulateCreate}
                className="text-xs px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full transition-colors flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Crear Mock Automático
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-slate-900 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Decime qué querés lograr..."
                className="w-full bg-black/50 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-qh-cyan focus:ring-1 focus:ring-qh-cyan"
              />
              <button 
                onClick={handleSend}
                disabled={!userInput.trim() || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-qh-cyan hover:text-white disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
