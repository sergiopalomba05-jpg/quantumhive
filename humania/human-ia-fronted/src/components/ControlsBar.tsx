import { Mic, MicOff, Video, VideoOff, Phone, Languages, Settings, Trash2, Cpu } from 'lucide-react';
import { ConnectionState, CallMode } from '../types';

interface ControlsBarProps {
  connectionState: ConnectionState;
  mode: CallMode;
  isMuted: boolean;
  isVideoOff: boolean;
  enableTranslation: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleTranslation: () => void;
  onHangup: () => void;
  onStartCall: (mode: CallMode) => void;
  onOpenSettings: () => void;
  onClearSubtitles: () => void;
}

export default function ControlsBar({
  connectionState,
  mode,
  isMuted,
  isVideoOff,
  enableTranslation,
  onToggleMute,
  onToggleVideo,
  onToggleTranslation,
  onHangup,
  onStartCall,
  onOpenSettings,
  onClearSubtitles,
}: ControlsBarProps) {
  const isCalling = connectionState === 'connecting' || connectionState === 'connected';

  return (
    <div id="controls-bar-root" className="flex flex-col items-center gap-3.5 w-full max-w-lg mx-auto">
      
      {/* Active Call Floating Interface Controls */}
      {isCalling ? (
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-black/95 backdrop-blur-md border border-quantum-gold/30 rounded-full shadow-[0_0_25px_rgba(212,175,55,0.15)] w-full">
          
          {/* Mute Mic Button */}
          <button
            id="control-btn-mute"
            onClick={onToggleMute}
            className={`p-3.5 rounded-full transition-all duration-300 cursor-pointer ${
              isMuted 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'bg-zinc-900 text-zinc-100 hover:bg-quantum-gold/10 hover:text-quantum-gold border border-zinc-800'
            }`}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video Button */}
          <button
            id="control-btn-video"
            onClick={onToggleVideo}
            className={`p-3.5 rounded-full transition-all duration-300 cursor-pointer ${
              isVideoOff 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'bg-zinc-900 text-zinc-100 hover:bg-quantum-gold/10 hover:text-quantum-gold border border-zinc-800'
            }`}
            title={isVideoOff ? 'Encender cámara' : 'Apagar cámara'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Hang Up Red Button with Golden Pulse Ring */}
          <button
            id="control-btn-hangup"
            onClick={onHangup}
            className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 active:scale-95 transition-all duration-150 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-quantum-gold/40 hover:border-quantum-gold"
            title="Finalizar enlace neuronal"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </button>

          {/* Toggle Translation Subtitles - Beautiful Gold Toggle */}
          <button
            id="control-btn-translate"
            onClick={onToggleTranslation}
            className={`p-3.5 rounded-full transition-all duration-300 cursor-pointer ${
              enableTranslation 
                ? 'bg-quantum-gold/20 text-quantum-gold border border-quantum-gold/50 hover:bg-quantum-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
            title={enableTranslation ? 'Desactivar traducción en tiempo real' : 'Activar traducción en tiempo real'}
          >
            <Languages className="w-5 h-5" />
          </button>

          {/* Extra utility: Clear transcription logs */}
          <button
            id="control-btn-clear"
            onClick={onClearSubtitles}
            className="p-3.5 bg-zinc-900 text-zinc-400 rounded-full hover:bg-quantum-gold/10 hover:text-quantum-gold border border-zinc-800 hover:border-quantum-gold/20 transition-all cursor-pointer"
            title="Limpiar subtítulos"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Call Setup / Dialing Screen Launcher Buttons with Supremacy AI Theme */
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full">
          
          {/* Main Dial Button: Interactive Demo Mode in majestic premium Quantum Gold */}
          <button
            id="dial-btn-demo"
            onClick={() => onStartCall('demo')}
            className="w-full sm:w-1/2 flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-quantum-gold-dark via-quantum-gold to-quantum-gold-light hover:from-quantum-gold hover:to-quantum-gold-light text-black font-extrabold rounded-xl transition-all shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] cursor-pointer active:scale-95 group font-display tracking-widest uppercase text-xs"
          >
            <Cpu className="w-5 h-5 group-hover:scale-115 transition-transform text-black" />
            <span>Fusión Demo (Voz Live)</span>
          </button>

          {/* Connect Button: Real WebRTC Gateway connecting logic */}
          <button
            id="dial-btn-webrtc"
            onClick={() => onStartCall('webrtc')}
            className="w-full sm:w-1/2 flex items-center justify-center gap-3 py-4 px-6 bg-[#090909] hover:bg-[#111111] text-quantum-gold hover:text-quantum-gold-light font-extrabold rounded-xl transition-all border border-quantum-gold/30 hover:border-quantum-gold shadow-md cursor-pointer active:scale-95 group font-display tracking-widest uppercase text-xs"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>Enlace WebRTC Real (Vertex)</span>
          </button>
        </div>
      )}

      {/* Call Settings Drawer shortcut overlay label */}
      {!isCalling && (
        <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1 font-mono uppercase tracking-widest">
          <Settings className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
          Haz clic en Parámetros para alinear la matriz del servidor WebRTC de Vertex AI
        </p>
      )}
    </div>
  );
}
