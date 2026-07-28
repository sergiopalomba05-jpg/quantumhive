import React from "react";
import { Contact } from "../types";
import { Phone, Video, MessageCircle } from "lucide-react";

interface ContactCardProps {
  key?: React.Key;
  contact: Contact;
  onStartCall: (contact: Contact) => void;
  onOpenChat: (contact: Contact) => void;
  onToggleMemory: (id: string) => void;
}

export default function ContactCard({ contact, onStartCall, onOpenChat, onToggleMemory }: ContactCardProps) {
  return (
    <div 
      className="flex items-center justify-between p-4 bg-brand-surface/40 hover:bg-brand-surface/90 border-b border-white/5 transition-all duration-200 cursor-pointer group"
      onClick={() => onOpenChat(contact)}
    >
      {/* Avatar & Online status */}
      <div className="flex items-center gap-4.5 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <img 
            src={contact.avatar} 
            alt={contact.name} 
            referrerPolicy="no-referrer"
            className="w-13 h-13 rounded-full object-cover border-2 border-white/10 group-hover:border-brand-primary/40 transition-colors"
          />
          {contact.isActive && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-primary border-2 border-brand-bg rounded-full animate-pulse" />
          )}
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white truncate font-sans tracking-wide">
              {contact.name}
            </h3>
            {contact.lastMessageTime && (
              <span className="text-[11px] text-white/40 font-mono">
                {contact.lastMessageTime}
              </span>
            )}
          </div>
          <p className="text-sm text-brand-primary/80 font-medium truncate mt-0.5">
            {contact.role}
          </p>
          <p className="text-xs text-white/50 truncate mt-1">
            {contact.lastMessage || contact.tagline}
          </p>
          
          {/* Memory toggle choice badge */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMemory(contact.id);
              }}
              className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold flex items-center gap-1 transition-all ${
                contact.hasMemory 
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25" 
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
              }`}
              title="Sincronizar memoria compartida con este asistente"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${contact.hasMemory ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
              <span>🧠 MEMORIA: {contact.hasMemory ? "CONECTADA" : "DESCONECTADA"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenChat(contact)}
          className="p-2.5 rounded-full hover:bg-white/5 text-white/70 hover:text-brand-primary transition-all duration-150"
          title="Send message"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => onStartCall(contact)}
          className="p-2.5 rounded-full hover:bg-white/5 text-brand-primary hover:bg-brand-primary/10 transition-all duration-150"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
