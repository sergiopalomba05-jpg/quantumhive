import React, { useState } from "react";
import { Contact } from "../types";
import { 
  Cpu, Sparkles, UserPlus, Sliders, ShieldCheck, 
  HelpCircle, Check, Compass, Radio, Users, Eye 
} from "lucide-react";

interface AgentCreatorProps {
  onAddAgent: (newAgent: Contact) => void;
}

const PREBUILT_AVATARS = [
  { name: "Executive Core (Ares)", url: "/src/assets/images/ares_avatar_1784422343159.jpg" },
  { name: "Engineering Mentor (Sophia)", url: "/src/assets/images/sophia_avatar_1784421072262.jpg" },
  { name: "Mindfulness Coach (Eva)", url: "/src/assets/images/eva_avatar_1784421081920.jpg" },
  { name: "Language Partner (Liam)", url: "/src/assets/images/liam_avatar_1784421092551.jpg" },
  { name: "Trivia Host (Oliver)", url: "/src/assets/images/oliver_avatar_1784421103480.jpg" }
];

const CATEGORIES = [
  { id: "psicologia", label: "Psicología & Terapia" },
  { id: "astrologia", label: "Astrología & Tarotista" },
  { id: "legal", label: "Consultor de Derechos Legales" },
  { id: "matematicas", label: "Profesor de Matemáticas" },
  { id: "creacion_contenido", label: "Creador de Contenido & Redes" },
  { id: "ventas", label: "Tácticas de Venta & Negocios" },
  { id: "yoga", label: "Instructor de Yoga & Bienestar" }
];

const PERSONALITY_STYLES = [
  { id: "empathic", label: "Empático", desc: "Escucha activa, cálido y comprensivo" },
  { id: "analytical", label: "Analítico", desc: "Lógico, pragmático y basado en datos" },
  { id: "mystical", label: "Místico / Intuitivo", desc: "Conexión cósmica, reflexiones profundas" },
  { id: "assertive", label: "Asertivo / Dinámico", desc: "Directo, enérgico y motivador" }
];

const ASPECT_STYLES = [
  { id: "classic", label: "Traje Ejecutivo Clásico", desc: "Elegancia formal y pulcritud corporativa" },
  { id: "cyborg", label: "Malla de Circuitos Cyborg", desc: "Líneas doradas cibernéticas futuristas" },
  { id: "neon", label: "Holograma de Neón", desc: "Resplandor flotante de alta tecnología" },
  { id: "monochrome", label: "Pizarra Monocromática", desc: "Aesthetic minimalista de alto contraste" }
];

export default function AgentCreator({ onAddAgent }: AgentCreatorProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("psicologia");
  const [personalityStyle, setPersonalityStyle] = useState("empathic");
  const [aspectStyle, setAspectStyle] = useState("cyborg");
  const [voiceTone, setVoiceTone] = useState("medium");
  const [avatarIndex, setAvatarIndex] = useState(0);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) {
      alert("Por favor completa el nombre y el rol del avatar.");
      return;
    }

    const newContact: Contact = {
      id: `custom-${Date.now()}`,
      name,
      avatar: PREBUILT_AVATARS[avatarIndex].url,
      role,
      tagline: tagline || `Especialista en ${CATEGORIES.find(c => c.id === category)?.label}. Conexión de voz de baja latencia.`,
      statusText: "Operational",
      isActive: true,
      category,
      personalityStyle,
      voiceTone,
      avatarStyle: aspectStyle,
      lastMessage: "Configuración inicial de avatar exitosa. Estoy listo para nuestra videollamada.",
      lastMessageTime: "Just Now"
    };

    onAddAgent(newContact);
    setSuccessMessage(`¡Avatar "${name}" configurado con éxito en el Mother Intelligence Core!`);
    
    // Reset form fields
    setName("");
    setRole("");
    setTagline("");
    
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="p-5 space-y-6 text-white animate-fade-in pb-12">
      
      {/* Title Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
          <Cpu className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-md font-bold tracking-wide">Creador de Avatares Core</h2>
          <p className="text-[11px] text-white/50">Modela la personalidad, aspectos físicos y tono de voz de tus asesores</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-brand-primary/15 border border-brand-primary/40 rounded-xl flex items-start gap-3 animate-bounce-short">
          <Sparkles className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Sincronización Exitosa</h4>
            <p className="text-[11px] text-white/80 leading-relaxed mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleCreateAgent} className="space-y-5">
        
        {/* Step 1: Basic Bio */}
        <div className="space-y-3.5">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block pl-1">
            1. Atributos Básicos de Identidad
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-white/50 pl-1 block mb-1.5">Nombre del Avatar</span>
              <input 
                type="text" 
                placeholder="Ej. Dr. Caelum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-primary/50 font-sans"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-white/50 pl-1 block mb-1.5">Rol / Sub-Especialidad</span>
              <input 
                type="text" 
                placeholder="Ej. Psicólogo Cognitivo"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-primary/50 font-sans"
                required
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-white/50 pl-1 block mb-1.5">Frase de Bienvenida / Tagline</span>
            <input 
              type="text" 
              placeholder="Ej. Encuentra respuestas y equilibrio en nuestro espacio de diálogo guiado."
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>

        {/* Step 2: Category */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block pl-1">
            2. Especialidad de Servicio Profesional
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Avatar visual selector */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block pl-1">
            3. Selección de Rostro Base
          </label>
          
          <div className="grid grid-cols-5 gap-2">
            {PREBUILT_AVATARS.map((av, index) => (
              <button
                key={av.url}
                type="button"
                onClick={() => setAvatarIndex(index)}
                className={`relative rounded-xl overflow-hidden border aspect-square transition-all cursor-pointer ${
                  avatarIndex === index ? "border-brand-primary ring-2 ring-brand-primary/35 scale-105" : "border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                {avatarIndex === index && (
                  <span className="absolute inset-0 bg-brand-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-brand-primary stroke-[3px]" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Aspects & Appearance Style */}
        <div className="p-4 bg-brand-surface/60 rounded-2xl border border-white/5 space-y-3">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block">
            4. Aspecto Físico y Filtro de Imagen
          </label>

          <div className="space-y-2">
            {ASPECT_STYLES.map(asp => (
              <label 
                key={asp.id}
                onClick={() => setAspectStyle(asp.id)}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                  aspectStyle === asp.id 
                    ? "bg-brand-primary/10 border-brand-primary text-white" 
                    : "bg-black/20 border-white/5 text-white/70 hover:bg-white/5"
                }`}
              >
                <input 
                  type="radio" 
                  name="aspect-style" 
                  checked={aspectStyle === asp.id}
                  onChange={() => {}}
                  className="mt-1 accent-brand-primary"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">{asp.label}</p>
                  <p className="text-[9.5px] opacity-70 leading-normal">{asp.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Step 5: Personalities Selection */}
        <div className="p-4 bg-brand-surface/60 rounded-2xl border border-white/5 space-y-3">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block">
            5. Protocolo de Personalidad / Diálogo
          </label>

          <div className="space-y-2">
            {PERSONALITY_STYLES.map(style => (
              <label 
                key={style.id}
                onClick={() => setPersonalityStyle(style.id)}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                  personalityStyle === style.id 
                    ? "bg-brand-primary/10 border-brand-primary text-white" 
                    : "bg-black/20 border-white/5 text-white/70 hover:bg-white/5"
                }`}
              >
                <input 
                  type="radio" 
                  name="personality-style" 
                  checked={personalityStyle === style.id}
                  onChange={() => {}}
                  className="mt-1 accent-brand-primary"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold">{style.label}</p>
                  <p className="text-[9.5px] opacity-70 leading-normal">{style.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Step 6: Voice tone pitch */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-brand-primary font-bold uppercase tracking-widest block pl-1">
            6. Modulación de Tono de Voz
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "soft", label: "Suave / Cálida" },
              { id: "medium", label: "Barítono / Neutro" },
              { id: "deep", label: "Grave / Profundo" },
              { id: "energetic", label: "Enérgico" }
            ].map(voice => (
              <button
                key={voice.id}
                type="button"
                onClick={() => setVoiceTone(voice.id)}
                className={`p-2 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer ${
                  voiceTone === voice.id 
                    ? "bg-brand-primary/15 border-brand-primary text-white" 
                    : "bg-black/20 border-white/5 text-white/60 hover:bg-white/5"
                }`}
              >
                {voice.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit action buttons */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Sincronizar Avatar con Mother Intelligence Core</span>
          </button>
        </div>

      </form>
    </div>
  );
}
