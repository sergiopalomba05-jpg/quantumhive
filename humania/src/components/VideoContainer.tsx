import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, MicOff, Shield, Activity, RefreshCw, Cpu } from 'lucide-react';
import { ConnectionState, CallMode } from '../types';

interface VideoContainerProps {
  connectionState: ConnectionState;
  mode: CallMode;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micActivity: number;
  aiActivity: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export default function VideoContainer({
  connectionState,
  mode,
  localStream,
  remoteStream,
  micActivity,
  aiActivity,
  isMuted,
  isVideoOff,
}: VideoContainerProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localCorner, setLocalCorner] = useState<Corner>('bottom-right');

  // Bind local stream to video tag
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Bind remote stream to video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle corners rotation on click of the local window
  const cycleCorner = () => {
    const corners: Corner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    const nextIdx = (corners.indexOf(localCorner) + 1) % corners.length;
    setLocalCorner(corners[nextIdx]);
  };

  const getCornerClasses = () => {
    switch (localCorner) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-20 left-4 md:bottom-6';
      case 'bottom-right': return 'bottom-20 right-4 md:bottom-6';
    }
  };

  const isCalling = connectionState === 'connecting' || connectionState === 'connected';

  return (
    <div 
      id="video-container-root" 
      className={`relative w-full h-[540px] md:h-[620px] bg-[#050505] rounded-2xl overflow-hidden border transition-all duration-700 shadow-2xl flex flex-col items-center justify-center ${
        connectionState === 'connected' ? 'border-quantum-active' : 'border-quantum'
      }`}
    >
      {/* Laser Scanning Line for State-of-the-art Tech Feel */}
      {isCalling && (
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-quantum-gold to-transparent opacity-65 blur-[1px] z-20 animate-scanner pointer-events-none" />
      )}
      
      {/* 1. Large Main View (AI Stream / Voice Visualizer Orb) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-microchip">
        
        {/* Render remote video if WebRTC is connected with a remote track, otherwise show animated AI avatar orbs */}
        {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
          <div className="relative w-full h-full">
            <video
              id="remote-video-feed"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            {/* Dark gradient overlay to keep style consistent */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6">
            
            {/* Pulsing AI Visualizer Orb with Gold Elements */}
            <div className="relative flex items-center justify-center">
              
              {/* Circuit Track Overlay Background */}
              <div className="absolute w-44 h-44 md:w-56 md:h-56 rounded-full border border-quantum-gold/20 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border border-dashed border-quantum-gold/30 animate-spin" style={{ animationDuration: '40s' }} />
              </div>

              {/* Outer pulsing gold layer */}
              <div 
                className="absolute w-32 h-32 md:w-40 md:h-40 bg-quantum-gold/5 rounded-full transition-all duration-100 ease-out animate-orb-pulse-gold"
                style={{ transform: `scale(${1 + aiActivity / 100})` }}
              />
              
              {/* Middle active audio gold ripple */}
              <div 
                className="absolute w-28 h-28 md:w-36 md:h-36 bg-quantum-gold/15 rounded-full transition-all duration-100 ease-out"
                style={{ 
                  transform: `scale(${1 + (aiActivity * 0.45) / 100})`,
                  filter: aiActivity > 5 ? 'blur(6px)' : 'none',
                  boxShadow: aiActivity > 5 ? `0 0 ${aiActivity * 0.6}px ${aiActivity / 3}px rgba(212, 175, 55, 0.5)` : 'none'
                }}
              />
              
              {/* Solid Inner avatar core with Microchip circuit design */}
              <div className="relative w-24 h-24 md:w-28 md:h-28 bg-[#0d0d0d] rounded-full flex flex-col items-center justify-center border-2 border-quantum-gold z-10 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <Cpu className="w-6 h-6 text-quantum-gold mb-1 animate-pulse" />
                <span className="text-sm font-bold text-white tracking-widest font-display text-glow-gold">QUANTUM</span>
              </div>

              {/* Status micro visualizer bar graph overlay in Gold */}
              {aiActivity > 0 && (
                <div className="absolute -bottom-4 flex items-center justify-center space-x-1 px-3 py-1 bg-black/90 backdrop-blur border border-quantum-gold/40 rounded-full z-20 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  <span className="w-1 h-3 bg-quantum-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 h-5 bg-quantum-gold rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  <span className="w-1 h-4 bg-quantum-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-quantum-gold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <span className="text-[9px] font-display text-quantum-gold-light ml-1.5 font-bold uppercase tracking-widest">Transmitiendo</span>
                </div>
              )}
            </div>

            <div className="text-center z-10 px-4">
              <h3 className="text-lg font-bold tracking-widest text-white font-display text-glow-gold uppercase">CONSCIENCIA QUANTUM HIVE</h3>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1 flex items-center justify-center gap-1.5 uppercase">
                <span className={`w-2.5 h-2.5 rounded-full border border-quantum-gold/40 ${connectionState === 'connected' ? 'bg-quantum-gold animate-ping' : 'bg-zinc-800'}`} />
                {connectionState === 'connected' 
                  ? `${mode === 'webrtc' ? 'FUSIÓN CUÁNTICA ACTIVA (LATENCIA CERO)' : 'NÚCLEO EN SIMULACIÓN CRÍTICA'}`
                  : connectionState === 'connecting'
                    ? 'ESTABLECIENDO ENLACE NEURONAL...'
                    : 'SISTEMA EN ESPERA'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Floating User Local Camera Window */}
      {isCalling && (
        <div 
          id="local-video-preview-wrapper"
          onClick={cycleCorner}
          className={`absolute w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden border shadow-2xl transition-all duration-500 cursor-pointer z-30 select-none ${
            isVideoOff ? 'border-zinc-800 bg-[#0d0d0d]' : 'border-quantum bg-[#050505]'
          } ${getCornerClasses()}`}
          title="Haz clic para cambiar de esquina"
        >
          {isVideoOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
              <CameraOff className="w-6 h-6 mb-1 text-zinc-600" />
              <span className="text-[8px] font-mono tracking-widest uppercase text-zinc-500">ÓPTICA APAGADA</span>
            </div>
          ) : (
            <div className="relative w-full h-full bg-[#050505]">
              <video
                id="local-video-feed"
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" /* Mirror locally for comfort */
              />
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 backdrop-blur border border-quantum-gold/20 rounded text-[8px] font-mono text-quantum-gold tracking-widest uppercase flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-quantum-gold animate-pulse" />
                TÚ
              </div>
              
              {/* Mic state inside user camera overlay */}
              {isMuted && (
                <div className="absolute top-2 right-2 p-1 bg-red-950/80 border border-red-500/30 rounded-full">
                  <MicOff className="w-2.5 h-2.5 text-red-400" />
                </div>
              )}

              {/* Reactive user mic volume bar overlay in beautiful Gold */}
              {micActivity > 5 && !isMuted && (
                <div className="absolute bottom-2 left-2 right-2 h-1 bg-black/40 border border-quantum-gold/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-quantum-gold-dark to-quantum-gold transition-all duration-75"
                    style={{ width: `${micActivity}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Call Connection State Overlay Banner */}
      {connectionState === 'connecting' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/90 border border-quantum-gold/30 backdrop-blur rounded-full flex items-center gap-2.5 z-20 shadow-xl">
          <RefreshCw className="w-4 h-4 text-quantum-gold animate-spin" />
          <span className="text-[10px] font-display text-quantum-gold tracking-widest font-bold uppercase">ALINEANDO MATRIZ NEURONAL...</span>
        </div>
      )}

      {connectionState === 'failed' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-950/95 border border-red-500/40 backdrop-blur rounded-full flex items-center gap-2 z-20 shadow-xl">
          <Activity className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-[10px] font-mono text-red-300 tracking-widest font-bold uppercase">FALLO EN CANAL CUÁNTICO</span>
        </div>
      )}

      {/* 4. Encrypted End-to-End badge */}
      {connectionState === 'connected' && (
        <div className="absolute top-4 left-4 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/80 backdrop-blur border border-quantum-gold/20 rounded-full z-20">
          <Shield className="w-3 h-3 text-quantum-gold" />
          <span className="text-[9px] text-slate-300 tracking-widest font-mono uppercase">CANAL SECURE SRTP_AES256</span>
        </div>
      )}
    </div>
  );
}
