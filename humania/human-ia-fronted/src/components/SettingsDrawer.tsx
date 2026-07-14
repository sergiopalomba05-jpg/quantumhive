import { useState } from 'react';
import { Settings, Terminal, Shield, RefreshCw, Cpu, Globe, Sliders, User, Sparkles, Heart, Volume2 } from 'lucide-react';
import { 
  WebRTCConfig, 
  SUPPORTED_LANGUAGES, 
  PREBUILT_VOICES, 
  PREBUILT_AVATARS, 
  SPEECH_STYLES, 
  LogMessage, 
  CallMode, 
  ConnectionState 
} from '../types';

interface SettingsDrawerProps {
  config: WebRTCConfig;
  mode: CallMode;
  connectionState: ConnectionState;
  logs: LogMessage[];
  onUpdateConfig: (updates: Partial<WebRTCConfig>) => void;
  onClearSubtitles: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function SettingsDrawer({
  config,
  mode,
  connectionState,
  logs,
  onUpdateConfig,
  onClearSubtitles,
  isOpen,
  onToggleOpen,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'companion' | 'language' | 'connection' | 'logs'>('companion');

  return (
    <div id="settings-drawer-container" className="w-full lg:w-[400px] bg-[#050505] border border-quantum-gold/20 rounded-2xl p-5 flex flex-col h-full shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
      
      {/* Header and Toggle Button */}
      <div className="flex items-center justify-between border-b border-quantum-gold/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-quantum-gold animate-spin" style={{ animationDuration: '6s' }} />
          <h2 className="text-sm font-bold tracking-widest text-white font-display uppercase text-glow-gold">HUMAN-IA CONFIG</h2>
        </div>
        <div className="px-2.5 py-1 bg-[#0f0f0f] border border-quantum-gold/20 rounded-full text-[9px] font-mono text-quantum-gold uppercase font-bold tracking-widest">
          {connectionState === 'connected' ? 'CONECTADO' : connectionState.toUpperCase()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] border border-quantum-gold/10 p-1 rounded-lg mb-4 text-xs font-semibold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('companion')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer font-display uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'companion' 
              ? 'bg-quantum-gold/10 text-quantum-gold border border-quantum-gold/30 font-bold' 
              : 'text-zinc-500 hover:text-quantum-gold'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Acompañante</span>
        </button>
        <button
          onClick={() => setActiveTab('language')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer font-display uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'language' 
              ? 'bg-quantum-gold/10 text-quantum-gold border border-quantum-gold/30 font-bold' 
              : 'text-zinc-500 hover:text-quantum-gold'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Idioma</span>
        </button>
        <button
          onClick={() => setActiveTab('connection')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer font-display uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'connection' 
              ? 'bg-quantum-gold/10 text-quantum-gold border border-quantum-gold/30 font-bold' 
              : 'text-zinc-500 hover:text-quantum-gold'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Avanzado</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer relative font-display uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'logs' 
              ? 'bg-quantum-gold/10 text-quantum-gold border border-quantum-gold/30 font-bold' 
              : 'text-zinc-500 hover:text-quantum-gold'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Logs</span>
          {logs.length > 0 && (
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-quantum-gold rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto space-y-4 text-sm scrollbar-thin">
        
        {/* TAB 0: COMPANION SETTINGS */}
        {activeTab === 'companion' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Introductory bio card */}
            <div className="bg-[#0a0a0a] p-3 rounded-xl border border-quantum-gold/10">
              <span className="text-[9px] font-mono font-black text-quantum-gold uppercase tracking-widest block mb-1">CERCANÍA & EMPATÍA COTIDIANA</span>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Human-IA es tu confidente y guía diario. Elige un perfil neuronal para personalizar su interacción, tono de voz y estilo de habla.
              </p>
            </div>

            {/* Avatar Selector Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-widest font-black text-quantum-gold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-quantum-gold animate-pulse" />
                <span>Seleccionar Avatar Virtual</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {PREBUILT_AVATARS.map((avatar) => {
                  const isSelected = config.avatarId === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => {
                        // Auto-match fitting voice for convenience
                        let matchingVoice = config.aiVoice;
                        const defaultVoices: Record<string, string> = {
                          clara: 'human-ia-clara',
                          elias: 'human-ia-elias',
                          nova: 'human-ia-nova',
                          dante: 'human-ia-dante'
                        };
                        if (defaultVoices[avatar.id]) {
                          matchingVoice = defaultVoices[avatar.id];
                        }
                        onUpdateConfig({ 
                          avatarId: avatar.id,
                          aiVoice: matchingVoice
                        });
                      }}
                      className={`relative flex flex-col items-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#121212] to-[#0a0a0a] border-quantum-gold text-quantum-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                          : 'bg-[#030303] border-zinc-900 text-zinc-400 hover:bg-[#070707] hover:border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {/* Avatar Icon Accent */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${avatar.color} p-0.5 mb-2 shadow-lg flex items-center justify-center`}>
                        <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center text-lg select-none">
                          {avatar.iconLabel}
                        </div>
                      </div>
                      
                      <span className="font-display font-extrabold tracking-widest uppercase text-xs">
                        {avatar.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-medium tracking-wide mt-0.5 line-clamp-1">
                        {avatar.role}
                      </span>

                      {isSelected && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-quantum-gold animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Avatar Personality Card */}
            {(() => {
              const selectedAvatar = PREBUILT_AVATARS.find(a => a.id === config.avatarId) || PREBUILT_AVATARS[0];
              return (
                <div className="bg-gradient-to-r from-quantum-gold/5 via-quantum-gold/10 to-transparent border border-quantum-gold/25 p-3.5 rounded-xl shadow-inner">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{selectedAvatar.iconLabel}</span>
                    <span className="text-[10px] font-display font-black text-white uppercase tracking-widest">
                      Personalidad de {selectedAvatar.name}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans italic">
                    "{selectedAvatar.personality}"
                  </p>
                </div>
              );
            })()}

            {/* Speech Style Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-widest font-black text-quantum-gold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-quantum-gold" />
                <span>Estilo y Personalidad del Habla</span>
              </label>
              
              <div className="space-y-2">
                {SPEECH_STYLES.map((style) => {
                  const isSelected = config.speechStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => onUpdateConfig({ speechStyleId: style.id })}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-quantum-gold/5 border-quantum-gold/40 text-white shadow-sm'
                          : 'bg-[#030303] border-zinc-900 text-zinc-400 hover:bg-[#070707] hover:border-zinc-800'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-quantum-gold' : 'border-zinc-700'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-quantum-gold animate-pulse" />}
                      </div>
                      
                      <div>
                        <span className={`text-xs font-bold font-display uppercase tracking-wider block ${
                          isSelected ? 'text-quantum-gold' : 'text-zinc-300'
                        }`}>
                          {style.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-snug font-sans block mt-0.5">
                          {style.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-display uppercase tracking-widest font-black text-zinc-300 flex items-center gap-1">
                <span>Modulación de la Voz (Síntesis)</span>
              </label>
              <select
                value={config.aiVoice}
                onChange={(e) => onUpdateConfig({ aiVoice: e.target.value })}
                className="w-full bg-[#030303] border border-quantum-gold/20 focus:border-quantum-gold/60 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none transition-all cursor-pointer font-mono tracking-wide uppercase shadow-inner"
              >
                {PREBUILT_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-black text-quantum-gold font-mono">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
        )}

        {/* TAB 1: LANGUAGE & TRANSLATION SETTINGS */}
        {activeTab === 'language' && (
          <div className="space-y-4">
            
            {/* Target Language Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-display uppercase tracking-widest font-bold text-zinc-300 flex items-center gap-1">
                <span>Tu Idioma (Objetivo de Traducción)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onUpdateConfig({ targetLanguage: lang.code })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border text-left cursor-pointer transition-all ${
                      config.targetLanguage === lang.code
                        ? 'bg-quantum-gold/15 border-quantum-gold text-quantum-gold font-bold shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                        : 'bg-[#030303] border-zinc-900 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <span className="text-sm leading-none">{lang.flag}</span>
                    <span className="font-display tracking-widest uppercase text-[10px]">{lang.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-1">
                El acompañante virtual responderá traduciendo dinámicamente a este idioma.
              </p>
            </div>

            {/* Toggle Switch Translation overlay */}
            <div className="flex items-center justify-between p-3.5 bg-[#030303] border border-quantum-gold/15 rounded-xl">
              <div>
                <span className="text-xs font-bold text-white font-display uppercase tracking-widest text-glow-gold">Subtítulos Bifásicos</span>
                <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">TEXTO ORIGINAL + TRADUCIDO</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enableTranslation}
                  onChange={(e) => onUpdateConfig({ enableTranslation: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-zinc-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#030303] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-600 after:border-transparent after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-quantum-gold peer-checked:after:bg-black"></div>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: ADVANCED CONNECTION SETTINGS */}
        {activeTab === 'connection' && (
          <div className="space-y-4">
            
            <div className="bg-[#0a0a0a] p-3.5 rounded-xl border border-quantum-gold/10">
              <span className="text-[9px] font-mono font-black text-quantum-gold uppercase tracking-widest block mb-1">PASARELA WEBRTC & SDP</span>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Ajustes de infraestructura para la transmisión de audio y video con baja latencia milimétrica.
              </p>
            </div>

            {/* WebSocket URL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-display uppercase tracking-widest font-bold text-zinc-300 flex items-center gap-1">
                <span>Servidor WebSocket (Gateway Neuronal)</span>
              </label>
              <input
                type="text"
                value={config.wsUrl}
                onChange={(e) => onUpdateConfig({ wsUrl: e.target.value })}
                className="w-full bg-[#030303] border border-quantum-gold/20 focus:border-quantum-gold/60 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none transition-all shadow-inner focus:shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                placeholder="ws://localhost:3000/api/rtc"
              />
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                Controlador de canalización SDP y candidatos ICE para Vertex AI.
              </p>
            </div>

            {/* ICE Servers */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-display uppercase tracking-widest font-bold text-zinc-300">Servidores de bypass (STUN/TURN)</label>
              <textarea
                rows={2}
                value={config.iceServers}
                onChange={(e) => onUpdateConfig({ iceServers: e.target.value })}
                className="w-full bg-[#030303] border border-quantum-gold/20 focus:border-quantum-gold/60 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none transition-all resize-none shadow-inner focus:shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                placeholder="stun:stun.l.google.com:19302"
              />
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                Servidores ICE separados por comas para saltar cortafuegos y NAT.
              </p>
            </div>

            {/* Encryption & Security Label */}
            <div className="flex items-center gap-2.5 p-3.5 bg-quantum-gold/5 border border-quantum-gold/15 rounded-xl text-xs text-quantum-gold shadow-sm">
              <Shield className="w-5 h-5 flex-shrink-0 text-quantum-gold" />
              <span className="font-mono text-[10px] uppercase tracking-wide leading-relaxed">Cifrado de grado militar SRTP activo para proteger la telemetría multimedia.</span>
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME SIGNALING LOGS (TERMINAL) */}
        {activeTab === 'logs' && (
          <div className="space-y-3 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between border-b border-quantum-gold/10 pb-1">
              <span className="text-[9px] font-mono font-bold text-quantum-gold uppercase tracking-widest">FLUJO DE DATOS TELEMÉTRICOS</span>
              <button
                onClick={() => onClearSubtitles()}
                className="text-[9px] text-red-400 hover:text-red-300 font-mono font-bold uppercase tracking-widest hover:underline"
              >
                Purgar logs
              </button>
            </div>

            {/* Terminal log window */}
            <div className="flex-1 bg-black rounded-lg p-3 border border-quantum-gold/20 font-mono text-[10px] overflow-y-auto space-y-1.5 h-[280px] leading-relaxed select-text scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic text-center py-4 uppercase tracking-widest text-[9px]">
                  No se registran eventos de enlace neuronal en la matriz.
                </div>
              ) : (
                logs.map((log) => {
                  let colorClass = 'text-zinc-400';
                  if (log.type === 'success') colorClass = 'text-quantum-gold font-bold text-glow-gold';
                  if (log.type === 'warning') colorClass = 'text-amber-500 font-medium';
                  if (log.type === 'error') colorClass = 'text-red-500 font-black uppercase';
                  return (
                    <div key={log.id} className="flex items-start gap-1">
                      <span className="text-zinc-600 text-[9px] select-none">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                      <span className={colorClass}>{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Credentials with Supreme Aura */}
      <div className="border-t border-quantum-gold/10 pt-3 mt-4 flex items-center justify-between text-[8px] text-zinc-500 font-mono tracking-widest uppercase">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-quantum-gold animate-pulse" />
          <span>HUMAN-IA SECURE</span>
        </div>
        <span>v1.6.0_COGNITIVE</span>
      </div>
    </div>
  );
}
