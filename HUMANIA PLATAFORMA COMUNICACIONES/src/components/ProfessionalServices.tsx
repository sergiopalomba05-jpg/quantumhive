import React from "react";
import { Contact } from "../types";
import { 
  Compass, Heart, BookOpen, Scale, Sparkles, 
  Lightbulb, TrendingUp, HelpCircle, Eye, Video, ShieldAlert, Check, Plus, MessageSquare, ArrowLeft 
} from "lucide-react";

interface ProfessionalServicesProps {
  allServices: Contact[];
  hiredContacts: Contact[];
  onHireService: (contact: Contact) => void;
  onStartCall: (contact: Contact) => void;
  onOpenChat: (contact: Contact) => void;
  onGoBack: () => void;
}

const CATEGORY_META = [
  { 
    id: "psicologia", 
    name: "Psicología & Terapia", 
    icon: Heart, 
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    description: "Espacio seguro de contención emocional, terapia cognitivo-conductual y bienestar personal." 
  },
  { 
    id: "astrologia", 
    name: "Astrología & Tarotista", 
    icon: Sparkles, 
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    description: "Lectura de carta natal, tarot interactivo y guía intuitiva de constelaciones cósmicas." 
  },
  { 
    id: "legal", 
    name: "Derechos Legales", 
    icon: Scale, 
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    description: "Consultas exprés sobre derechos del consumidor, civil, penal, contratos y leyes vigentes." 
  },
  { 
    id: "matematicas", 
    name: "Tutor de Matemáticas", 
    icon: BookOpen, 
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    description: "Resolución interactiva de ecuaciones, cálculo diferencial, álgebra y física teórica." 
  },
  { 
    id: "creacion_contenido", 
    name: "Creación de Contenido", 
    icon: Lightbulb, 
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    description: "Estrategias virales de TikTok/Instagram, redacción creativa de copys y diseño de grilla." 
  },
  { 
    id: "ventas", 
    name: "Tácticas de Venta", 
    icon: TrendingUp, 
    color: "text-brand-primary bg-brand-primary/10 border-brand-primary/20",
    description: "Técnicas avanzadas de pitch de negocios, manejo de objeciones y cierres de venta complejos." 
  },
  { 
    id: "yoga", 
    name: "Yoga & Bienestar", 
    icon: Compass, 
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    description: "Clases guiadas paso a paso de asanas, técnicas de respiración pranayama y estiramiento activo." 
  }
];

export default function ProfessionalServices({ 
  allServices, 
  hiredContacts, 
  onHireService, 
  onStartCall, 
  onOpenChat, 
  onGoBack 
}: ProfessionalServicesProps) {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const getFilteredAvatars = () => {
    if (!activeCategory) return allServices;
    return allServices.filter(c => c.category === activeCategory);
  };

  const filteredAvatars = getFilteredAvatars();

  return (
    <div className="p-5 space-y-6 text-white animate-fade-in pb-12">
      
      {/* Back Button */}
      <button
        onClick={onGoBack}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer font-mono"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Volver al Portal de Chats</span>
      </button>

      {/* Title Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
          <Compass className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-md font-bold tracking-wide">Servicios Profesionales de Voz</h2>
          <p className="text-[11px] text-white/50">Elige asesorías y clases interactivas por videollamada</p>
        </div>
      </div>

      {/* Grid of professional Categories based on research */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest pl-1 block">
          Categorías de Servicio Más Utilizadas
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORY_META.map(cat => {
            const IconComponent = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(isSelected ? null : cat.id)}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-brand-primary/15 border-brand-primary" 
                    : "bg-brand-surface/70 border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${cat.color} flex-shrink-0`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{cat.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />}
                  </h3>
                  <p className="text-[10px] text-white/50 leading-relaxed pr-1">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter results list */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest pl-1">
            {activeCategory 
              ? `Especialistas de ${CATEGORY_META.find(c => c.id === activeCategory)?.name}`
              : "Todos los Avatares Profesionales"
            }
          </h3>
          {activeCategory && (
            <button 
              onClick={() => setActiveCategory(null)}
              className="text-[10px] text-white/50 hover:text-white underline font-mono"
            >
              Ver todos
            </button>
          )}
        </div>

        {filteredAvatars.length === 0 ? (
          <div className="p-6 bg-brand-surface/40 border border-white/5 rounded-2xl text-center">
            <ShieldAlert className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-xs text-white/80 font-medium">Ningún avatar configurado en esta especialidad.</p>
            <p className="text-[10px] text-white/40 mt-1">Crea tu propio especialista en la pestaña de 'Diseño Core'.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAvatars.map(av => {
              const isHired = hiredContacts.some(c => c.id === av.id);
              return (
                <div 
                  key={av.id}
                  className="p-4 bg-brand-surface/80 border border-white/10 hover:border-brand-primary/30 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={av.avatar} 
                      alt={av.name} 
                      referrerPolicy="no-referrer" 
                      className="w-11 h-11 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-white">
                          {av.name}
                        </h4>
                        {isHired ? (
                          <span className="text-[8px] bg-brand-primary/10 border border-brand-primary/30 text-brand-primary px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider">
                            Contratado
                          </span>
                        ) : (
                          <span className="text-[8px] bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                            Disponible
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-brand-primary font-mono tracking-wider">{av.role}</p>
                      <p className="text-[10.5px] text-white/50 mt-1 leading-normal max-w-[190px]">
                        {av.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 items-end">
                    {isHired ? (
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          onClick={() => onStartCall(av)}
                          className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer"
                          title="Iniciar Videollamada"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Llamar</span>
                        </button>
                        <button
                          onClick={() => onOpenChat(av)}
                          className="text-[9px] font-mono text-white/50 hover:text-white text-center"
                        >
                          Chat Directo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onHireService(av)}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[10.5px] font-black rounded-xl flex items-center gap-1 transition-all cursor-pointer font-sans uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Contratar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
