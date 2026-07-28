import React, { useEffect, useRef, useState } from "react";
import { Contact, CameraFilter } from "../types";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, MessageSquare, Sparkles, RefreshCw, 
  Tv, Layers, Sliders, ShieldCheck
} from "lucide-react";

interface VideoCanvasProps {
  contact: Contact;
  isMuted: boolean;
  isVideoOff: boolean;
  cameraFilter: CameraFilter;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSetFilter: (filter: CameraFilter) => void;
  onEndCall: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  isThinking: boolean;
  lastAiMessageText: string | null;
}

export default function VideoCanvas({
  contact,
  isMuted,
  isVideoOff,
  cameraFilter,
  onToggleMute,
  onToggleVideo,
  onSetFilter,
  onEndCall,
  onToggleChat,
  isChatOpen,
  isThinking,
  lastAiMessageText
}: VideoCanvasProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // PiP Snapping Quadrant state: 0=Top-Right, 1=Bottom-Right, 2=Bottom-Left, 3=Top-Left
  const [pipQuadrant, setPipQuadrant] = useState<number>(0); 
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Load real user camera stream
  useEffect(() => {
    if (isVideoOff) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((userStream) => {
        setStream(userStream);
        setCameraError(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userStream;
        }
      })
      .catch((err) => {
        console.warn("Camera access denied or unavailable:", err);
        setCameraError("Camera blocked/unavailable");
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOff]);

  // Handle video element bindings when stream updates
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cycle Picture-in-Picture quadrants
  const cyclePipPosition = () => {
    setPipQuadrant((prev) => (prev + 1) % 4);
  };

  // Resolve filter tailwind CSS values
  const getFilterClass = (filter: CameraFilter) => {
    switch (filter) {
      case "grayscale":
        return "grayscale contrast-110";
      case "sepia":
        return "sepia brightness-90 contrast-100";
      case "cinematic":
        return "hue-rotate-15 saturate-130 brightness-105 contrast-95";
      case "cyber":
        return "hue-rotate-90 saturate-200 brightness-110 contrast-125 saturate-150 border-brand-primary/40";
      case "night":
        return "brightness-150 contrast-125 saturate-50 sepia hue-rotate-60 invert-5 opacity-90";
      default:
        return "";
    }
  };

  // Resolve PiP placement styles
  const getPipPlacementClass = () => {
    switch (pipQuadrant) {
      case 0: // Top-Right
        return "top-20 right-4 sm:top-24 sm:right-6";
      case 1: // Bottom-Right
        return "bottom-28 right-4 sm:bottom-32 sm:right-6";
      case 2: // Bottom-Left
        return "bottom-28 left-4 sm:bottom-32 sm:left-6";
      case 3: // Top-Left
        return "top-20 left-4 sm:top-24 sm:left-6";
      default:
        return "top-20 right-4";
    }
  };

  const filtersList: { id: CameraFilter; label: string; previewColor: string }[] = [
    { id: "normal", label: "Normal Feed", previewColor: "bg-white/10" },
    { id: "grayscale", label: "Noir (Grayscale)", previewColor: "bg-neutral-500" },
    { id: "sepia", label: "Vintage Sepia", previewColor: "bg-amber-700" },
    { id: "cinematic", label: "Cinematic Gold", previewColor: "bg-rose-500" },
    { id: "cyber", label: "Cyber Matrix", previewColor: "bg-brand-primary" },
    { id: "night", label: "Infrared Night", previewColor: "bg-emerald-800" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#060f16]">
      {/* Background Remote Video Call Simulator */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gradient-to-b from-brand-bg via-brand-bg to-[#050b10] px-4">
        
        {/* Decorative background visualizer */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#128c7e_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Remote Caller Identity */}
        <div className="relative flex flex-col items-center justify-center z-10 text-center max-w-md">
          
          {/* Animated speaking pulses representing live connection stream */}
          <div className="relative mb-6">
            <div className={`absolute -inset-4 rounded-full bg-brand-primary/10 blur-xl transition-all duration-300 ${isThinking || lastAiMessageText ? "animate-voice" : "scale-90 opacity-45"}`} />
            <div className={`absolute -inset-1.5 rounded-full border-2 border-brand-primary/30 transition-all duration-500 ${isThinking ? "animate-voice" : "scale-100 opacity-60"}`} />
            
            <img 
              src={contact.avatar} 
              alt={contact.name} 
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-full object-cover border-4 border-brand-surface relative z-10 shadow-2xl"
            />
            
            {/* Status indicator badge */}
            <div className="absolute bottom-1 right-2 w-5 h-5 bg-brand-primary border-4 border-brand-bg rounded-full flex items-center justify-center z-20">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white tracking-wide font-sans">{contact.name}</h3>
          <p className="text-xs text-brand-primary font-medium tracking-wider uppercase mt-1 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20">
            {contact.role}
          </p>
          <p className="text-xs text-white/50 italic mt-3 px-6 leading-relaxed">
            "{contact.tagline}"
          </p>
        </div>

        {/* Dynamic visual representation of audio speech overlay */}
        {(isThinking || lastAiMessageText) && (
          <div className="absolute bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-6">
            <div className="glass-panel px-5 py-3.5 rounded-2xl text-center shadow-xl border border-white/10 animate-fade-in">
              {isThinking ? (
                <div className="flex items-center justify-center gap-1.5 text-brand-primary font-mono text-xs">
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-white/75">speaking...</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-sans font-medium">
                  {lastAiMessageText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local Camera Picture-in-Picture Overlay (Draggable snappable box) */}
      <div 
        onClick={cyclePipPosition}
        className={`absolute z-30 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/15 transition-all duration-300 ease-out cursor-pointer hover:scale-105 active:scale-95 group ${getPipPlacementClass()}`}
        title="Tap to change position"
      >
        {isVideoOff ? (
          <div className="w-full h-full bg-[#111] flex flex-col items-center justify-center text-center p-3">
            <VideoOff className="w-6 h-6 text-white/40 mb-1" />
            <span className="text-[9px] text-white/40 font-mono">Camera Off</span>
          </div>
        ) : cameraError ? (
          <div className="w-full h-full bg-brand-surface flex flex-col items-center justify-center text-center p-2">
            <Sparkles className="w-6 h-6 text-amber-500/80 mb-1 animate-pulse" />
            <span className="text-[8px] text-white/30 font-sans leading-tight">Virtual Camera active</span>
          </div>
        ) : (
          <div className="relative w-full h-full bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${getFilterClass(cameraFilter)}`}
            />
            {/* Filter name indicator tag */}
            <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[8px] text-brand-primary font-mono px-1.5 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
              {cameraFilter}
            </span>
          </div>
        )}

        {/* Dynamic prompt badge overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-center p-2 transition-opacity duration-200">
          <RefreshCw className="w-5 h-5 text-white/90 animate-spin" style={{ animationDuration: "3s" }} />
        </div>
      </div>

      {/* Floating Call Control Center */}
      <div className="absolute bottom-6 inset-x-4 z-30 flex flex-col items-center gap-3">
        
        {/* Floating Filters Quick Tray */}
        {showFilterMenu && (
          <div className="glass-panel p-2.5 rounded-2xl flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar shadow-2xl border border-white/10 animate-fade-in">
            {filtersList.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onSetFilter(f.id);
                  setShowFilterMenu(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                  cameraFilter === f.id 
                    ? "bg-brand-primary text-brand-bg font-semibold" 
                    : "bg-white/5 hover:bg-white/10 text-white"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${f.previewColor} border border-white/10`} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Master Glassmorphic Pill Controls */}
        <div className="flex items-center justify-between gap-3 sm:gap-5 px-6 py-4 glass-panel rounded-full shadow-2xl max-w-md">
          
          {/* Mute toggle circular button */}
          <button
            onClick={onToggleMute}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all ${
              isMuted 
                ? "bg-white text-brand-bg font-bold scale-95 shadow-inner" 
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video toggle circular button */}
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all ${
              isVideoOff 
                ? "bg-white text-brand-bg font-bold scale-95 shadow-inner" 
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Filter overlay selector */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            disabled={isVideoOff}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all border border-white/10 disabled:opacity-40 disabled:pointer-events-none ${
              showFilterMenu || cameraFilter !== "normal"
                ? "bg-brand-primary/20 text-brand-primary"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Video Filters"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* Text Message overlay slider */}
          <button
            onClick={onToggleChat}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all border border-white/10 ${
              isChatOpen
                ? "bg-brand-primary text-brand-bg font-bold"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Toggle Messaging Overlay"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* End Call red circular trigger */}
          <button
            onClick={onEndCall}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-brand-red hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:shadow-brand-red/30 transition-all hover:scale-110 active:scale-95 animate-pulse"
            title="Hang Up"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
