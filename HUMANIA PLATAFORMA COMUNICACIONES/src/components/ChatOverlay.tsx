import React, { useRef, useEffect, useState } from "react";
import { Message, Contact } from "../types";
import { Send, X, MessageCircle, Sparkles } from "lucide-react";

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  onToggleMemory: (id: string) => void;
}

export default function ChatOverlay({ 
  isOpen, 
  onClose, 
  contact, 
  messages, 
  onSendMessage, 
  isThinking,
  onToggleMemory
}: ChatOverlayProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chats
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleQuickAction = (text: string) => {
    if (isThinking) return;
    onSendMessage(text);
  };

  // Generate helper suggestion queries depending on which AI is active
  const getSuggestions = () => {
    switch (contact.id) {
      case "sophia":
        return [
          "Explain React 19 features",
          "What is HMR and why is it disabled?",
          "Give me a coding joke!"
        ];
      case "liam":
        return [
          "Tell me a story in Spanglish",
          "Correct this: 'I have 20 years'",
          "Ask me a question in Spanish!"
        ];
      case "eva":
        return [
          "I feel anxious right now",
          "Guide me through a breathing exercise",
          "Give me a positive quote"
        ];
      case "oliver":
        return [
          "Ask me a trivia question!",
          "I am ready for the game!",
          "Tell me a fun fact"
        ];
      default:
        return ["Hello!", "How is your day?", "Introduce yourself!"];
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-16 sm:top-20 sm:right-0 sm:left-auto sm:w-100 z-40 flex flex-col glass-panel rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageCircle className="w-5 h-5 text-brand-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">Chat con {contact.name}</h3>
            <p className="text-[10px] text-white/50 truncate font-mono">{contact.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Memory toggle inside Chat */}
          <button
            onClick={() => onToggleMemory(contact.id)}
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              contact.hasMemory 
                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400" 
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            }`}
            title="Sincronizar memoria compartida"
          >
            <span>🧠 {contact.hasMemory ? "On" : "Off"}</span>
          </button>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
            <Sparkles className="w-8 h-8 text-brand-primary/80 mb-2 animate-pulse" />
            <p className="text-xs text-white">No text messages yet.</p>
            <p className="text-[10px] text-white/50 mt-1">Send a text or ask a question to start. The AI will respond in real time.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === "user";
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                      ? "bg-brand-primary text-brand-bg rounded-tr-none font-medium" 
                      : "bg-white/10 text-white rounded-tl-none border border-white/5"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-white/40 mt-1 font-mono px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}

        {isThinking && (
          <div className="flex items-center gap-2.5 text-white/60 pl-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs font-mono tracking-wide">{contact.name} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Triggers */}
      <div className="p-3 bg-black/20 border-t border-white/5 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
        {getSuggestions().map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickAction(s)}
            className="inline-block px-3 py-1.5 rounded-full bg-white/5 hover:bg-brand-primary/15 border border-white/5 text-[11px] text-white/80 hover:text-brand-primary active:scale-95 transition-all cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Send Input Panel */}
      <form onSubmit={handleSubmit} className="p-4 bg-brand-surface/90 border-t border-white/10 flex items-center gap-2.5">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a message to ${contact.name}...`}
          disabled={isThinking}
          className="flex-1 bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand-primary/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isThinking}
          className="p-2.5 rounded-full bg-brand-primary hover:bg-brand-primary-hover text-brand-bg disabled:bg-white/10 disabled:text-white/40 transition-colors cursor-pointer"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
