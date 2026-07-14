import { useEffect, useRef } from 'react';
import { SubtitleItem } from '../types';
import { MessageSquare, Languages, Cpu } from 'lucide-react';

interface TranslationPanelProps {
  subtitles: SubtitleItem[];
  enableTranslation: boolean;
  targetLanguage: string;
}

export default function TranslationPanel({
  subtitles,
  enableTranslation,
  targetLanguage,
}: TranslationPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll subtitles container
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles]);

  // Display the last 3 subtitle exchanges for high-readability overlay
  const recentSubtitles = subtitles.slice(-3);

  return (
    <div id="subtitles-panel-root" className="w-full bg-[#050505]/95 backdrop-blur-md rounded-2xl p-4 border border-quantum-gold/20 flex flex-col h-[190px] justify-between shadow-[0_0_15px_rgba(212,175,55,0.05)]">
      
      {/* Subtitles Title & Indicators */}
      <div className="flex items-center justify-between border-b border-quantum-gold/10 pb-2 mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-quantum-gold font-display uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-quantum-gold" />
          <span>Conversación con Human-IA</span>
        </div>
        
        {enableTranslation && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-quantum-gold/10 border border-quantum-gold/30 rounded-full text-[9px] text-quantum-gold font-mono font-bold uppercase tracking-widest">
            <Languages className="w-3 h-3" />
            <span>TRADUCCIÓN ACTIVA ({targetLanguage === 'es' ? 'EN ➜ ES' : 'ES ➜ EN'})</span>
          </div>
        )}
      </div>

      {/* Main Subtitle Scroller */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1"
      >
        {recentSubtitles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-2">
            <p className="text-xs text-zinc-500 max-w-sm font-mono tracking-wider">
              Inicia la llamada de acompañamiento y di algo como <span className="text-quantum-gold italic">"Hola, ¿cómo estás hoy?"</span> o cuéntame sobre tu día para iniciar nuestra charla...
            </p>
          </div>
        ) : (
          recentSubtitles.map((sub) => {
            const isAI = sub.sender === 'ai';
            return (
              <div 
                key={sub.id} 
                className={`flex flex-col space-y-1 animate-fadeIn ${
                  isAI ? 'items-start' : 'items-end'
                }`}
              >
                {/* Speaker bubble indicator */}
                <div className={`text-[9px] uppercase tracking-widest font-black font-display flex items-center gap-1 ${
                  isAI ? 'text-quantum-gold' : 'text-zinc-400'
                }`}>
                  {isAI ? (
                    <>
                      <Cpu className="w-3 h-3 animate-pulse" />
                      <span>HUMAN-IA (ACOMPAÑANTE)</span>
                    </>
                  ) : (
                    <span>TÚ (CONVERSACIÓN)</span>
                  )}
                </div>

                {/* Subtitle speech frame - Dark premium futuristic capsules */}
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm shadow-md transition-all ${
                  isAI 
                    ? 'bg-[#0c0c0c] text-white border-l-2 border-quantum-gold border-y border-r border-quantum-gold/20 rounded-tl-none' 
                    : 'bg-zinc-900 text-zinc-100 border-r-2 border-quantum-gold-light border-y border-l border-zinc-800 rounded-tr-none'
                }`}>
                  {/* Original Spoken Text */}
                  <p className="font-medium leading-relaxed font-sans text-xs sm:text-sm">{sub.text}</p>
                  
                  {/* Real-time translated overlay */}
                  {enableTranslation && sub.translation && (
                    <div className="mt-1 pt-1.5 border-t border-quantum-gold/10 flex items-start gap-1">
                      <span className="text-[8px] bg-quantum-gold/10 text-quantum-gold px-1 rounded font-mono font-bold tracking-widest uppercase select-none">TRADUCCIÓN</span>
                      <p className="text-xs text-quantum-gold-light/90 italic leading-snug">{sub.translation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
