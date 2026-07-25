import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useStore } from '../store/useStore';
import { Send, Bot, BrainCircuit, Loader2, MessageSquare, Search as SearchIcon, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';
import { BRAIN_MODELS, type BrainMode, type BrainModelStatus } from '../core/brainRouter';

type ReasoningLevel = 'normal' | 'high';

type ChatProviderModel = {
  id: string;
  displayName: string;
};

type ChatProvider = {
  id: string;
  name: string;
  models: ChatProviderModel[];
};

type ChatRepo = {
  id: string;
  owner?: string;
  name: string;
  active?: boolean;
};

const getBrainCardStyle = (status: BrainModelStatus): CSSProperties => {
  const accent = status === 'available' ? '16, 185, 129' : '245, 158, 11';
  const accentStrong = status === 'available' ? '52, 211, 153' : '251, 191, 36';

  return {
    '--brain-accent': accent,
    '--brain-accent-strong': accentStrong,
  } as CSSProperties;
};

function ProviderLogo({ provider }: { provider: string }) {
  if (provider === 'openai') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path fill="currentColor" d="M12 2.2a4.3 4.3 0 0 0-3.74 2.18 4.3 4.3 0 0 0-4.05 6.62 4.3 4.3 0 0 0 1.46 6.95 4.3 4.3 0 0 0 6.07 3.56 4.3 4.3 0 0 0 6.72-3.17 4.3 4.3 0 0 0 1.34-7.03 4.3 4.3 0 0 0-4.09-6.94A4.3 4.3 0 0 0 12 2.2Zm0 2.1c.68 0 1.3.33 1.7.87l-4.07 2.35a4.2 4.2 0 0 0-1.62-.21A2.2 2.2 0 0 1 12 4.3Zm4.99 2.16a2.2 2.2 0 0 1 1.08 3.63l-4.07-2.35a4.3 4.3 0 0 0-.63-1.5c.92-.53 2.08-.44 3.62.22ZM6.48 8.83c.27-.47.71-.8 1.22-.95v4.7c-.4.43-.68.94-.86 1.5a2.2 2.2 0 0 1-.36-5.25Zm11.05 2.59a2.2 2.2 0 0 1-.35 5.24l-4.07-2.35c.06-.27.1-.55.1-.84 0-.28-.04-.56-.1-.83l4.42-1.22Zm-7.6-1.6 2.07-1.2 2.07 1.2v2.4L12 13.42l-2.07-1.2v-2.4Zm.07 4.88c.47.33.99.56 1.56.66v4.7a2.2 2.2 0 0 1-3.71-2.64L10 14.7Zm3.99.01 2.16 1.25a2.2 2.2 0 0 1-3.71 2.64v-4.7c.56-.1 1.09-.33 1.55-.66Z" />
      </svg>
    );
  }

  if (provider === 'anthropic') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path fill="currentColor" d="M13.7 3 21 20h-3.1l-1.5-3.6H7.6L6.1 20H3L10.3 3h3.4Zm1.6 10.7L12 5.9l-3.3 7.8h6.6Z" />
      </svg>
    );
  }

  if (provider === 'kimi') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path fill="currentColor" d="M17.8 18.9A8.7 8.7 0 0 1 5.1 6.2a7.7 7.7 0 1 0 12.7 12.7Z" />
        <path fill="currentColor" d="M15.9 4.2 17 6.6l2.6.4-1.9 1.8.5 2.6-2.3-1.2-2.3 1.2.4-2.6L12.2 7l2.6-.4 1.1-2.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M12 3.5 13.4 9l5.1 1.5-5.1 1.5L12 17.5 10.6 12l-5.1-1.5L10.6 9 12 3.5Z" />
      <path fill="#34A853" d="M18.5 14.5 19 17l2.5.5-2.5.5-.5 2.5-.5-2.5-2.5-.5 2.5-.5.5-2.5Z" />
      <path fill="#FBBC04" d="M5.7 15.2 6.2 17l1.8.5-1.8.5-.5 1.8-.5-1.8-1.8-.5 1.8-.5.5-1.8Z" />
    </svg>
  );
}

const ActiveBrainBadge = ({
  modelId,
  providerId,
  providers,
}: {
  modelId: string;
  providerId: string;
  providers: ChatProvider[];
}) => {
  const model = BRAIN_MODELS.find(m => m.id === modelId);
  const provider = providers.find(p => p.id === providerId);
  const providerLabel = provider?.name || providerId;
  const modelLabel = model?.displayName || modelId;
  const isAvailable = model?.status === 'available';

  return (
    <div className="active-brain-badge flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-slate-950/55 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5">
          <ProviderLogo provider={model?.provider || 'vertex'} />
          <span className="text-[11px] font-extrabold tracking-wide text-slate-100 truncate">{modelLabel}</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">/</span>
        <span className="text-[10px] text-slate-400 font-mono">{providerLabel}</span>
      </div>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full shrink-0',
          isAvailable ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
        )}
      />
    </div>
  );
};

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
      <div className="space-y-3">
         {parts.map((part, i) => (
            part.type === 'thought' ? (
               <ThoughtBlock key={i} content={part.content} />
            ) : (
               <div key={i} className="markdown-body dominus-response font-sans">
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
                            className="!rounded-xl border border-white/10 !bg-slate-950/85 my-3 !text-[12px]"
                         />
                       ) : (
                          <code {...props} className={cn(className, "rounded-md border border-white/10 bg-slate-950/80 px-1.5 py-0.5 text-[0.8em] font-mono text-qh-gold")}>
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
  const [brainMode, setBrainMode] = useState<BrainMode>('auto');
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>('normal');
  const [selectedModelId, setSelectedModelId] = useState('gemini-2.5-flash');
  const [selectedProviderId, setSelectedProviderId] = useState('gcp-vertex-ai');
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [providers, setProviders] = useState<ChatProvider[]>([]);
  const [repos, setRepos] = useState<ChatRepo[]>([]);
  const [vsModelIds, setVsModelIds] = useState(['gemini-2.5-flash', 'gemini-2.5-pro']);
  const [lastBrainMeta, setLastBrainMeta] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeAgent = store.agents.find(a => a.id === selectedAgentId);
  const agentMessages = store.chatMessages.filter(m => m.agentId === selectedAgentId);
  const filteredAgents = store.agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const maxVsBrains = 2;
  const selectedProvider = providers.find(provider => provider.id === selectedProviderId);
  const selectedProviderModels = selectedProvider?.models || [];

  const selectBrainModel = (modelId: string) => {
    const providerForModel = providers.find(provider => provider.models.some(model => model.id === modelId));

    if (providerForModel) {
      setSelectedProviderId(providerForModel.id);
    }

    setSelectedModelId(modelId);

    if (brainMode === 'auto') {
      setBrainMode('manual');
    }

    if (brainMode !== 'vs_2') return;

    setVsModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.length === 1 ? prev : prev.filter(id => id !== modelId);
      }

      return [...prev, modelId].slice(-maxVsBrains);
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, isThinking, selectedAgentId]);

  useEffect(() => {
    fetch('/api/providers')
      .then((response) => response.json())
      .then((data) => {
        const nextProviders = data.providers || [];
        setProviders(nextProviders);
        const currentProvider = nextProviders.find((provider: ChatProvider) => provider.id === selectedProviderId);
        if (!currentProvider && nextProviders[0]) {
          setSelectedProviderId(nextProviders[0].id);
          setSelectedModelId(nextProviders[0].models[0]?.id || selectedModelId);
        }
      })
      .catch(() => setProviders([]));

    fetch('/api/github/repos')
      .then((response) => response.json())
      .then((data) => {
        const nextRepos = data.repos || [];
        setRepos(nextRepos);
        const activeRepo = nextRepos.find((repo: ChatRepo) => repo.active) || nextRepos[0];
        if (activeRepo) setSelectedRepoId(activeRepo.id);
      })
      .catch(() => setRepos([]));
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 118)}px`;
  }, [input]);

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

    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          brainMode,
          reasoningLevel,
          modelId: reasoningLevel === 'high' ? 'gemini-2.5-pro' : selectedModelId,
          providerId: selectedProviderId,
          repoId: selectedRepoId || undefined,
          vsModelIds: brainMode === 'vs_2' ? vsModelIds : undefined,
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      setLastBrainMeta(data.brain || null);
      let replyText = data.text || '';

      if (data.brain?.fallbackUsed) {
        replyText = `> Brain Router: ${data.brain.fallbackReason}\n\n${replyText}`;
      }

      if (data.memoryProposal) {
        replyText += `\n\n---\n**Memoria sugerida:** ${data.memoryProposal.title}\n\n${data.memoryProposal.content}\n\n_Tipo: ${data.memoryProposal.type} · Importancia: ${data.memoryProposal.importance}_`;
      }

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

      const respondingModelId = data.brain?.usedModelId || selectedModelId;
      const respondingModel = BRAIN_MODELS.find(m => m.id === respondingModelId);

      store.addChatMessage({
        agentId: selectedAgentId,
        sender: 'agent',
        text: replyText,
        modelId: respondingModelId,
        modelName: respondingModel?.displayName || respondingModelId,
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
    <div data-chat-shell="fullscreen" className="chat-command-shell flex h-full min-h-0 w-full overflow-hidden">

      {/* Sidebar (Chats List) */}
      <div className={cn("chat-glass-panel w-full md:w-[18rem] border-r border-white/10 flex flex-col shrink-0", mobileView === 'chat' ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <h2 className="text-slate-300 font-bold uppercase tracking-[0.22em] text-[11px] flex items-center gap-2">
            <MessageSquare size={14} className="text-qh-gold" />
            Chats
          </h2>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/45 py-2 pl-9 pr-3 font-mono text-xs text-slate-300 outline-none transition-colors placeholder:text-slate-600 focus:border-qh-cyan/60"
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
                  "cursor-pointer border-b border-white/5 border-l-2 p-3 transition-all duration-300 flex gap-3 items-center hover:bg-white/[0.03]",
                  selectedAgentId === a.id ? "border-l-qh-cyan bg-transparent text-qh-cyan" : "border-l-transparent"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950/55 flex items-center justify-center shrink-0 border border-white/10 text-qh-gold shadow-[0_0_24px_rgba(66,232,255,0.08)]">
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
      <div className={cn("chat-glass-panel chat-conversation-panel flex-1 flex flex-col min-w-0 relative", mobileView === 'list' ? "hidden md:flex" : "flex")}>
        {/* Chat Header */}
        <div className="chat-header-controls flex items-center justify-end gap-3 p-3 border-b border-white/10 bg-slate-950/30 shrink-0">
          <div className="mr-auto flex items-center md:hidden">
            <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <ArrowLeft size={18} />
            </button>
          </div>
          <div className="dominus-header-router min-w-0 justify-end">
            <label className="brain-mode-toggle" aria-label="Modo de inteligencia">
              <select
                className="brain-mode-dropdown"
                value={brainMode}
                onChange={(event) => setBrainMode(event.target.value as BrainMode)}
              >
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
                <option value="vs_2">V.S 2 Cerebros</option>
              </select>
            </label>
            <label className="brain-mode-toggle" aria-label="Esfuerzo de pensamiento">
              <select
                className="reasoning-level-dropdown"
                value={reasoningLevel}
                onChange={(event) => {
                  const nextLevel = event.target.value as ReasoningLevel;
                  setReasoningLevel(nextLevel);
                  setSelectedModelId(nextLevel === 'high' ? 'gemini-2.5-pro' : 'gemini-2.5-flash');
                  setVsModelIds(nextLevel === 'high' ? ['gemini-2.5-pro', 'gemini-2.5-flash'].slice(0, maxVsBrains) : ['gemini-2.5-flash', 'gemini-2.5-pro'].slice(0, maxVsBrains));
                }}
              >
                <option value="normal">Esfuerzo de pensamiento: Normal</option>
                <option value="high">Esfuerzo de pensamiento: Alto</option>
              </select>
            </label>
            <label className="brain-mode-toggle" aria-label="Proveedor">
              <select
                className="brain-mode-dropdown"
                value={selectedProviderId}
                onChange={(event) => {
                  const nextProviderId = event.target.value;
                  const nextProvider = providers.find(provider => provider.id === nextProviderId);
                  setSelectedProviderId(nextProviderId);
                  setSelectedModelId(nextProvider?.models[0]?.id || selectedModelId);
                  if (brainMode === 'auto') setBrainMode('manual');
                }}
              >
                {providers.length === 0 && <option value="gcp-vertex-ai">Vertex AI</option>}
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </label>
            <label className="brain-mode-toggle" aria-label="Modelo">
              <select
                className="reasoning-level-dropdown"
                value={selectedModelId}
                onChange={(event) => {
                  setSelectedModelId(event.target.value);
                  if (brainMode === 'auto') setBrainMode('manual');
                }}
              >
                {selectedProviderModels.length === 0 && <option value={selectedModelId}>{selectedModelId}</option>}
                {selectedProviderModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.displayName}</option>
                ))}
              </select>
            </label>
            <label className="brain-mode-toggle" aria-label="Repo GitHub">
              <select
                className="reasoning-level-dropdown"
                value={selectedRepoId}
                onChange={(event) => setSelectedRepoId(event.target.value)}
              >
                <option value="">Sin repo</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>{repo.owner ? `${repo.owner}/${repo.name}` : repo.name}</option>
                ))}
              </select>
            </label>
            <div className="brain-model-row header-brain-model-row flex gap-2 overflow-x-auto">
              {BRAIN_MODELS.map((model, index) => {
                const selectedInVs = brainMode === 'vs_2' && vsModelIds.includes(model.id);
                const selectedSingle = brainMode !== 'vs_2' && selectedModelId === model.id;

                return (
                  <button
                    key={model.id}
                    style={{ ...getBrainCardStyle(model.status), animationDelay: `${index * 38}ms` }}
                    onClick={() => selectBrainModel(model.id)}
                    className={cn(
                      'brain-router-card brain-router-card-header text-left',
                      (selectedSingle || selectedInVs) && 'brain-router-card-selected'
                    )}
                    title={`${model.logoLabel} ${model.shortLabel}`}
                  >
                    <div className="brain-model-icon" aria-label={`${model.logoLabel} logo`}>
                      <ProviderLogo provider={model.provider} />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="truncate text-[11px] font-extrabold tracking-[0.01em] text-slate-100">
                        {model.shortLabel}
                      </div>
                    </div>
                    <span className={cn('relative z-10 h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]', model.status === 'available' ? 'bg-emerald-400 text-emerald-400' : 'bg-amber-400 text-amber-400')} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {lastBrainMeta?.fallbackUsed && <div className="border-b border-white/10 bg-amber-500/5 px-4 py-1.5 text-[11px] text-amber-300">{lastBrainMeta.fallbackReason}</div>}

        {/* Active Brain Indicator */}
        <div className="px-4 py-2 border-b border-white/[0.05] flex items-center justify-between">
          <ActiveBrainBadge
            modelId={reasoningLevel === 'high' ? 'gemini-2.5-pro' : selectedModelId}
            providerId={selectedProviderId}
            providers={providers}
          />
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {agentMessages.length === 0 ? (
            <div className="text-center text-slate-600 mt-10 text-xs uppercase tracking-widest leading-loose">
              Iniciar conversación.<br/>
              <span className="text-[10px] lowercase text-slate-500">{activeAgent?.role}</span>
            </div>
          ) : (
            agentMessages.map(m => (
              <div key={m.id} className={cn("chat-message-reveal flex", m.sender === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "relative border px-4 py-3 shadow-sm",
                  m.sender === 'user'
                    ? "max-w-[min(720px,86%)] rounded-2xl rounded-tr-sm border-qh-gold/25 bg-qh-gold/10 text-qh-gold"
                    : "dominus-message-surface max-w-[min(920px,94%)] rounded-2xl rounded-tl-sm border-white/10 text-slate-200"
                )}>
                  <MessageContent text={m.text} />
                  <div className="flex items-center justify-between mt-1.5">
                    {m.sender === 'agent' && m.modelName && (
                      <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">
                        {m.modelName}
                      </span>
                    )}
                    <div className={cn("text-[8px] text-slate-500 font-sans", m.sender === 'agent' && m.modelName ? "" : "text-right w-full")}>
                      {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isThinking && (
            <div className="flex justify-start">
               <div className="chat-message-reveal max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-slate-950/75 border border-white/10 text-qh-gold flex items-center gap-3 shadow-sm text-xs uppercase tracking-widest">
                 <Loader2 size={14} className="animate-spin" />
                 {(() => {
                   const activeModelId = reasoningLevel === 'high' ? 'gemini-2.5-pro' : selectedModelId;
                   const activeModel = BRAIN_MODELS.find(m => m.id === activeModelId);
                   return `${activeModel?.displayName || activeModelId} procesando...`;
                 })()}
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-slate-950/30 border-t border-white/10">
          <div className="flex gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10 focus-within:border-qh-cyan/50 transition-colors shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              className="chat-composer-input flex-1 bg-transparent border-none text-sm text-slate-100 px-3 py-2 focus:outline-none placeholder:text-slate-600 font-mono"
              placeholder="Transmitir instrucción..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
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
        <div className="chat-bg-pattern-disabled absolute inset-0 z-[-1] pointer-events-none" />
      </div>
    </div>
  );
}
