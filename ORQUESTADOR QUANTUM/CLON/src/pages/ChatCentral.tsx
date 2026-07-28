import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Bot, Lightbulb, CheckSquare, Database, Play, Search, BrainCircuit, Loader2, MessageSquare, Search as SearchIcon, Code, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { TourButton } from '../components/onboarding/TourButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';

const ThoughtBlock = ({ content }: { content: string }) => {
   const [open, setOpen] = useState(false);
   return (
      <div className="border border-slate-700/50 rounded bg-slate-900/40 my-2 overflow-hidden text-[11px]">
         <button 
           onClick={() => setOpen(!open)}
           className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-400 hover:text-qh-gold hover:bg-slate-800/50 transition-colors"
         >
           {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
           <BrainCircuit size={12} />
           <span className="uppercase tracking-widest font-bold">Agent Worklog</span>
         </button>
         {open && (
           <div className="p-3 border-t border-slate-700/50 text-slate-400 font-mono whitespace-pre-wrap bg-slate-900/80">
             {content.trim()}
           </div>
         )}
      </div>
   );
};

const MessageContent = ({ text }: { text: string }) => {
  const parts = [];
  let remainingText = text;
  
  while (remainingText) {
     const match = remainingText.match(/<think>([\s\S]*?)<\/think>/);
     if (match) {
        const preText = remainingText.substring(0, match.index);
        if (preText) parts.push({ type: 'text', content: preText });
        parts.push({ type: 'thought', content: match[1] });
        remainingText = remainingText.substring(match.index! + match[0].length);
     } else {
        parts.push({ type: 'text', content: remainingText });
        break;
     }
  }

  return (
     <div className="space-y-1">
        {parts.map((part, i) => (
           part.type === 'thought' ? (
              <ThoughtBlock key={i} content={part.content} />
           ) : (
              <div key={i} className="markdown-body font-sans text-xs">
                 <ReactMarkdown
                   remarkPlugins={[remarkGfm]}
                   components={{
                     code({node, inline, className, children, ...props}: any) {
                       const match = /language-(\w+)/.exec(className || '');
                       return !inline && match ? (
                         <SyntaxHighlighter
                           {...props}
                           children={String(children).replace(/\n$/, '')}
                           style={vscDarkPlus}
                           language={match[1]}
                           PreTag="div"
                           className="!rounded-md border border-slate-700 !bg-slate-900/80 my-2 !text-[10px]"
                         />
                       ) : (
                         <code {...props} className={cn(className, "bg-slate-800 text-qh-gold px-1.5 py-0.5 rounded text-[10px] font-mono")}>
                           {children}
                         </code>
                       )
                     }
                   }}
                 >
                   {part.content}
                 </ReactMarkdown>
              </div>
           )
        ))}
     </div>
  );
};

export function ChatCentral() {
  const store = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState(store.agents[0]?.id || '');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useHighThinking, setUseHighThinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgent = store.agents.find(a => a.id === selectedAgentId);
  const agentMessages = store.chatMessages.filter(m => m.agentId === selectedAgentId);
  const filteredAgents = store.agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, isThinking, selectedAgentId]);

  const handleSend = async () => {
    if (!input.trim() || !activeAgent || isThinking) return;
    
    const userMsg = input;
    setInput('');
    
    store.addChatMessage({
      agentId: selectedAgentId,
      sender: 'user',
      text: userMsg,
    });

    setIsThinking(true);

    const lowerInput = userMsg.toLowerCase();
    const isIntent = lowerInput.includes('quiero') || lowerInput.includes('necesito') || lowerInput.includes('tengo un bug') || lowerInput.includes('mejorar');
    
    if (isIntent) {
      setTimeout(() => {
        store.addChatMessage({
          agentId: selectedAgentId,
          sender: 'agent',
          text: `Para esto te recomiendo usar las skills del **Skill Advisor**.\n\nPuedes ir a la pestaña "Skill Advisor" para ver recomendaciones detalladas, o probar estas sugeridas:\n1. frontend-design\n2. systematic-debugging\n3. brainstorming`,
        });
        setIsThinking(false);
      }, 1000);
      return;
    }

    
    try {
      const endpoint = useHighThinking ? '/api/think' : '/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      let replyText = data.text;
      
      let thoughtText = '';
      if (data.parts && data.parts.length > 0) {
        data.parts.forEach((p: any) => {
           if (p.thought === true) {
               thoughtText += (p.text || '') + '\n';
           }
        });
      }
      
      if (thoughtText) {
          replyText = `<think>${thoughtText}</think>\n\n${replyText}`;
      }
      
      if (data.chunks && data.chunks.length > 0) {
         replyText += '\n\n[Search Grounding Results Applied]';
      }

      store.addChatMessage({
        agentId: selectedAgentId,
        sender: 'agent',
        text: replyText,
      });
      
      store.addEvent({
        type: 'agent.message',
        actor: activeAgent.name,
        payload: `Respondió a: ${userMsg.substring(0, 20)}...`,
        severity: 'info'
      });
    } catch (err) {
      console.error(err);
      store.addChatMessage({
        agentId: selectedAgentId,
        sender: 'agent',
        text: "Error de comunicación con el backend (API Failed).",
      });
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto border border-qh-border rounded-xl bg-qh-card shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
      
      {/* Sidebar (Chats List) */}
      <div className={cn("w-full md:w-80 border-r border-qh-border bg-slate-900/40 flex flex-col shrink-0", mobileView === 'chat' ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-qh-border flex flex-col gap-3">
          <h2 className="text-slate-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <MessageSquare size={14} className="text-qh-gold" />
            Chats
          </h2>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-slate-800 border border-slate-700 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-qh-gold transition-colors placeholder:text-slate-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredAgents.map(a => {
            const lastMsg = store.chatMessages.filter(m => m.agentId === a.id).pop();
            return (
              <div 
                key={a.id} 
                onClick={() => { setSelectedAgentId(a.id); setMobileView('chat'); }}
                className={cn(
                  "p-3 border-b border-qh-border/50 cursor-pointer hover:bg-slate-800/50 transition-colors flex gap-3 items-center",
                  selectedAgentId === a.id ? "bg-slate-800/80 border-l-2 border-l-qh-gold" : "border-l-2 border-l-transparent"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 text-qh-gold">
                  <Bot size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className="text-xs font-bold text-slate-200 truncate">{a.name}</div>
                    {lastMsg && <div className="text-[9px] text-slate-500 ml-2">{new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    {lastMsg ? (lastMsg.sender === 'user' ? `You: ${lastMsg.text}` : lastMsg.text) : a.role}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 bg-qh-bg/30 relative", mobileView === 'list' ? "hidden md:flex" : "flex")}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 border-b border-qh-border bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 text-qh-gold">
              <Bot size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">{activeAgent?.name}</div>
              <div className="text-[10px] text-qh-emerald uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-qh-emerald animate-pulse"></span> Online
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className={cn("glass-button text-[9px] py-1 transition-all", useHighThinking ? "border-qh-gold text-qh-gold bg-qh-gold/10" : "")} 
              onClick={() => setUseHighThinking(!useHighThinking)}
              title="Toggle High Thinking Mode (gemini-3.1-pro-preview)"
            >
              <BrainCircuit size={12}/> Thinking Mode
            </button>
            <div className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
              <Search size={10} /> Grounding: {useHighThinking ? 'OFF' : 'ON'}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {agentMessages.length === 0 ? (
            <div className="text-center text-slate-600 mt-10 text-xs uppercase tracking-widest leading-loose">
              Start a conversation with {activeAgent?.name}.<br/>
              <span className="text-[10px] lowercase text-slate-500">{activeAgent?.role}</span>
            </div>
          ) : (
            agentMessages.map(m => (
              <div key={m.id} className={cn("flex", m.sender === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2 border shadow-sm relative",
                  m.sender === 'user' ? "bg-qh-gold/10 border-qh-gold/30 text-qh-gold rounded-tr-sm" : "bg-slate-900/90 border-slate-700 text-slate-300 rounded-tl-sm"
                )}>
                  {m.sender === 'agent' && <div className="text-[9px] font-bold text-qh-gold mb-1 uppercase tracking-widest">{activeAgent?.name}</div>}
                  <MessageContent text={m.text} />
                  <div className="text-[8px] text-slate-500 text-right mt-1 font-sans">
                    {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))
          )}
          {isThinking && (
            <div className="flex justify-start">
               <div className="max-w-[80%] rounded-xl rounded-tl-sm px-4 py-3 bg-slate-900/90 border border-slate-700 text-qh-gold flex items-center gap-3 shadow-sm text-xs uppercase tracking-widest">
                 <Loader2 size={14} className="animate-spin" /> Procesando respuesta...
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-slate-900/60 border-t border-qh-border">
          <div className="flex gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 focus-within:border-qh-gold/50 transition-colors shadow-inner">
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none text-xs text-slate-200 px-3 py-1.5 focus:outline-none placeholder:text-slate-500 font-mono" 
              placeholder="Type a message..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={isThinking}
            />
            <button 
              className={cn(
                "p-2 rounded-md flex items-center justify-center transition-all",
                input.trim() 
                  ? "bg-qh-gold/20 text-qh-gold hover:bg-qh-gold/30" 
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              )}
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--color-qh-gold) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      </div>
    </div>
  );
}
