import React from "react";
import { Contact } from "../types";
import { ChevronLeft, ShieldAlert, Lock, UserPlus, Info, Clock } from "lucide-react";

interface ActiveCallHeaderProps {
  contact: Contact;
  duration: number;
  remainingSeconds: number;
  onLeave: () => void;
  onToggleAddParticipant: () => void;
}

export default function ActiveCallHeader({ contact, duration, remainingSeconds, onLeave, onToggleAddParticipant }: ActiveCallHeaderProps) {
  // Format duration into mm:ss
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = remainingSeconds < 60;

  return (
    <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-10 flex items-center justify-between bg-gradient-to-b from-brand-bg/95 via-brand-bg/75 to-transparent border-b border-white/5">
      {/* Back and Contact Info */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onLeave}
          className="p-2 rounded-full hover:bg-white/10 text-white/90 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-2.5">
          <img 
            src={contact.avatar} 
            alt={contact.name} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg"
          />
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">{contact.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-white/50 tracking-wider">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown remaining limits clock */}
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold tracking-wider transition-all ${
          isLowTime 
            ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse" 
            : "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
        }`}>
          <Clock className={`w-3.5 h-3.5 ${isLowTime ? "text-red-400 animate-spin" : "text-brand-primary"}`} style={{ animationDuration: isLowTime ? "2s" : "10s" }} />
          <span>Restante: {formatDuration(remainingSeconds)}</span>
        </div>
        
        <button 
          onClick={onToggleAddParticipant}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/95 border border-white/5 active:scale-95 transition-all"
          title="Add Participant"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
