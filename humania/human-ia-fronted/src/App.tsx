import { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import VideoContainer from './components/VideoContainer';
import ControlsBar from './components/ControlsBar';
import TranslationPanel from './components/TranslationPanel';
import SettingsDrawer from './components/SettingsDrawer';
import { Phone, Shield, ArrowLeft, Sliders, MessageSquare, Volume2, HelpCircle, Activity, Cpu } from 'lucide-react';
import { PREBUILT_AVATARS } from './types';

export default function App() {
  const {
    mode,
    connectionState,
    subtitles,
    logs,
    micActivity,
    aiActivity,
    localStream,
    remoteStream,
    config,
    updateConfig,
    startCall,
    endCall,
    clearSubtitles,
    addLog,
  } = useWebRTC();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(true);

  // Suggestion chips to trigger conversational interaction (friendly companion style)
  const SUGGESTIONS = [
    { label: 'CONVERSAR', text: 'Hola, hoy tuve un día largo y me gustaría conversar un rato con un amigo.' },
    { label: 'CONSEJO DIARIO', text: '¿Qué consejo me darías hoy para mantener la mente positiva y tranquila?' },
    { label: 'DIVERSIÓN', text: 'Cuéntame un dato curioso y divertido sobre el mundo para alegrar mi tarde.' },
    { label: 'REFLEXIONAR', text: 'Me gustaría reflexionar sobre cómo equilibrar mi rutina y mi descanso hoy.' }
  ];

  const handleSuggestionClick = async (text: string) => {
    if (connectionState !== 'connected') {
      addLog('warning', 'Inicia la llamada primero para usar los comandos sugeridos.');
      return;
    }
    
    const currentAvatar = PREBUILT_AVATARS.find(a => a.id === config.avatarId) || PREBUILT_AVATARS[0];
    
    // Simulate user speaking this suggestion
    addLog('info', `Comando enviado: "${text}"`);
    
    // Check if we can fetch translation for suggestion
    let trans = '';
    if (config.enableTranslation) {
      try {
        const transLang = config.targetLanguage === 'es' ? 'en' : 'es';
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage: transLang }),
        });
        const d = await res.json();
        trans = d.translatedText || '';
      } catch (e) {
        trans = '...';
      }
    }

    // Call AI response endpoint directly to fetch answer for clicked suggestion
    try {
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: config.targetLanguage,
          voice: config.aiVoice,
          enableTranslation: config.enableTranslation,
          avatarId: config.avatarId,
          speechStyleId: config.speechStyleId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        // Speak response
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.reply);
          utterance.lang = config.targetLanguage === 'es' ? 'es-ES' : 'en-US';
          window.speechSynthesis.speak(utterance);
        }
        // Force log success
        addLog('success', 'Respuesta a sugerencia recibida');
        // Inject into log/subtitles
        addLog('info', `${currentAvatar.name}: "${data.reply}"`);
      }
    } catch (e) {
      addLog('error', 'Error al procesar sugerencia');
    }
  };

  const isCalling = connectionState === 'connecting' || connectionState === 'connected';
  const currentAvatar = PREBUILT_AVATARS.find(a => a.id === config.avatarId) || PREBUILT_AVATARS[0];

  return (
    <div id="app-root" className="min-h-screen bg-[#030303] text-slate-100 flex flex-col font-sans selection:bg-quantum-gold selection:text-black">
      
      {/* 1. Header (Premium Sci-Fi Gold and Black) */}
      <header className="bg-[#050505] border-b border-quantum-gold/20 px-4 py-4 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Back button and Profile details */}
          <div className="flex items-center gap-4">
            <button 
              className="p-1.5 hover:bg-quantum-gold/10 rounded-full transition text-quantum-gold hover:text-quantum-gold-light border border-quantum-gold/10 hover:border-quantum-gold/40"
              onClick={() => { if (isCalling) endCall(); }}
              title="Cerrar canal de acompañamiento"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Dynamic Avatar styled based on Selection */}
            <div className="relative">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${currentAvatar.color} p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-transform hover:scale-105 duration-350 flex items-center justify-center`}>
                <div className="w-full h-full bg-[#0d0d0d] rounded-full flex items-center justify-center text-xl select-none">
                  {currentAvatar.iconLabel}
                </div>
              </div>
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#050505] ${isCalling ? 'bg-quantum-gold animate-ping' : 'bg-zinc-700'}`} />
            </div>

            {/* Profile labels */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-widest font-display text-glow-gold uppercase">human-ia</h1>
                <span className="text-[9px] bg-quantum-gold/10 text-quantum-gold px-2 py-0.5 border border-quantum-gold/30 rounded font-mono font-bold tracking-widest uppercase">{currentAvatar.name} — {currentAvatar.role}</span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono tracking-wider">
                <Shield className="w-3.5 h-3.5 text-quantum-gold" />
                <span className="uppercase text-[9px] text-zinc-400">Canal Afectivo Seguro y Traducido</span>
              </p>
            </div>
          </div>

          {/* Action buttons on Header */}
          <div className="flex items-center gap-3">
            
            {/* Performance telemetry stats in gold */}
            {isCalling && (
              <div className="hidden md:flex items-center gap-3.5 px-3.5 py-1.5 bg-[#0d0d0d] border border-quantum-gold/20 rounded-lg text-[10px] font-mono text-zinc-400 shadow-inner">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-quantum-gold animate-pulse" />
                  <span>NÚCLEO RTT: <span className="text-quantum-gold font-bold">14ms</span></span>
                </div>
                <span className="w-px h-3 bg-quantum-gold/20" />
                <span>CANAL: <span className="text-quantum-gold font-bold">OPUS_VP8_ARES</span></span>
              </div>
            )}

            {/* Drawer Toggle */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                isSettingsOpen 
                  ? 'bg-quantum-gold/10 border-quantum-gold/40 text-quantum-gold shadow-[0_0_10px_rgba(212,175,55,0.15)]' 
                  : 'bg-[#0d0d0d] border-zinc-800 text-zinc-400 hover:border-quantum-gold/30 hover:text-quantum-gold hover:bg-[#111111]'
              }`}
              title="Mostrar configuraciones WebRTC"
            >
              <Sliders className="w-4 h-4" />
              <span className="text-xs font-bold font-display uppercase tracking-wider hidden md:inline">Parámetros</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 items-stretch overflow-hidden bg-microchip">
        
        {/* Left column: Video Container + Captions / Subtitles */}
        <div className="flex-1 flex flex-col space-y-4">
          
          {/* Main Video Call Frame */}
          <VideoContainer
            connectionState={connectionState}
            mode={mode}
            localStream={localStream}
            remoteStream={remoteStream}
            micActivity={micActivity}
            aiActivity={aiActivity}
            isMuted={config.isMuted}
            isVideoOff={config.isVideoOff}
          />

          {/* Real-time speech transcription & translation overlay captions panel */}
          <TranslationPanel
            subtitles={subtitles}
            enableTranslation={config.enableTranslation}
            targetLanguage={config.targetLanguage}
          />

          {/* Suggested Interactive Prompt Chips (Quick Actions) */}
          <div className="bg-[#050505]/90 border border-quantum-gold/20 p-4 rounded-xl shadow-lg backdrop-blur">
            <span className="text-[10px] text-quantum-gold uppercase font-display tracking-widest block mb-2.5 flex items-center gap-1.5 font-bold">
              <Cpu className="w-4 h-4 text-quantum-gold animate-pulse" />
              INICIADORES DE CHARLA COTIDIANA
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(s.text)}
                  disabled={connectionState !== 'connected'}
                  className={`text-xs p-3 rounded-lg border text-left transition-all duration-300 ${
                    connectionState === 'connected'
                      ? 'bg-[#0a0a0a] border-quantum-gold/10 hover:border-quantum-gold/60 text-zinc-300 hover:text-white cursor-pointer hover:bg-quantum-gold/5 shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                      : 'bg-[#030303] border-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <span className="font-bold font-display text-quantum-gold block text-[9px] uppercase tracking-widest mb-1">{s.label}</span>
                  <span className="line-clamp-1 text-xs">{s.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Call controls (hangup, mute, camera etc) */}
          <div className="py-2">
            <ControlsBar
              connectionState={connectionState}
              mode={mode}
              isMuted={config.isMuted}
              isVideoOff={config.isVideoOff}
              enableTranslation={config.enableTranslation}
              onToggleMute={() => updateConfig({ isMuted: !config.isMuted })}
              onToggleVideo={() => updateConfig({ isVideoOff: !config.isVideoOff })}
              onToggleTranslation={() => updateConfig({ enableTranslation: !config.enableTranslation })}
              onHangup={endCall}
              onStartCall={startCall}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onClearSubtitles={clearSubtitles}
            />
          </div>
        </div>

        {/* Right column: Settings & Live Diagnostics Terminal Logs Drawer */}
        {isSettingsOpen && (
          <div className="w-full lg:w-[400px] flex-shrink-0 animate-fadeIn h-auto lg:h-auto">
            <SettingsDrawer
              config={config}
              mode={mode}
              connectionState={connectionState}
              logs={logs}
              onUpdateConfig={updateConfig}
              onClearSubtitles={clearSubtitles}
              isOpen={isSettingsOpen}
              onToggleOpen={() => setIsSettingsOpen(!isSettingsOpen)}
            />
          </div>
        )}
      </main>

      {/* 3. Global Call Status Bar */}
      {isCalling && (
        <div className="bg-quantum-gold text-black text-xs py-1.5 px-4 text-center font-black tracking-widest font-display flex items-center justify-center gap-2 select-none uppercase shadow-[0_-4px_15px_rgba(212,175,55,0.3)]">
          <Volume2 className="w-4 h-4 text-black animate-bounce" />
          <span>CANAL EN VIVO CON {currentAvatar.name.toUpperCase()} — {currentAvatar.role.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
