import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2, Camera, Eye, CameraOff, MonitorUp, MonitorX, MousePointer2, Check, X, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { SystemService } from '../services/system';

export function LiveAssistant() {
  const store = useStore();
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);
  const [isMouseControlEnabled, setIsMouseControlEnabled] = useState(false);
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startAssistant = async () => {
    try {
      setIsListening(true);
      setIsThinking(true);
      
      let stream;
      if (isScreenShareEnabled) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        SystemService.logAction('screen_share.started', 'system', 'Screen sharing session started', 'user', 'info');
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoEnabled });
      }
      streamRef.current = stream;
      
      if ((isVideoEnabled || isScreenShareEnabled) && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Setup websocket for real-time mode (dummy connect for UI)
      setIsThinking(false);

    } catch (err) {
      console.error("Media access error:", err);
      stopAssistant();
    }
  };

  const stopAssistant = () => {
    setIsListening(false);
    setIsThinking(false);
    
    if (isScreenShareEnabled && streamRef.current) {
       SystemService.logAction('screen_share.stopped', 'system', 'Screen sharing session stopped', 'user', 'info');
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleAssistant = () => {
    if (isListening) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };
  
  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (isScreenShareEnabled) setIsScreenShareEnabled(false);
    if (isListening) stopAssistant();
  };

  const toggleScreenShare = () => {
    setIsScreenShareEnabled(!isScreenShareEnabled);
    if (isVideoEnabled) setIsVideoEnabled(false);
    if (isListening) stopAssistant();
  };

  const toggleMouseControl = () => {
    if (!isMouseControlEnabled) {
      SystemService.requestApproval('other', 'Allow Agent Remote Mouse/Screen Control', 'high');
    }
    setIsMouseControlEnabled(!isMouseControlEnabled);
  };

  const handleSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        SystemService.logAction('snapshot.captured', 'system', 'Screen snapshot captured', 'user', 'info');
        // We're mocking this
        alert("Snapshot captured! Analyzing screen context mock...");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopAssistant(); // cleanup on unmount
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-4">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Eye className="text-qh-cyan" size={28} /> Live Vision Assistant
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Multimodal Real-Time Orchestration (Gemini/GPT/Grok)</p>
        </div>
        <button 
          onClick={() => setShowRealityCheck(!showRealityCheck)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-colors",
            showRealityCheck ? "bg-qh-emerald/10 text-qh-emerald border-qh-emerald/30" : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          )}
        >
          Reality Check
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        
        {/* Main Camera / Agent View */}
        <div className="md:col-span-2 bg-qh-card border border-qh-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">
           
           <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
              {(isVideoEnabled || isScreenShareEnabled) ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {!isListening && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10 text-slate-400 text-sm font-mono uppercase tracking-widest">
                       {isScreenShareEnabled ? 'Screen Share Ready. Press start.' : 'Camera Ready. Press start.'}
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-slate-500 z-10 font-mono text-sm uppercase tracking-widest gap-4">
                  <CameraOff size={48} className="text-slate-700" />
                  Vision Mode Disabled
                </div>
              )}
              
              {/* Overlay Agent UI */}
              <div className="absolute bottom-6 inset-x-0 flex flex-col items-center z-20 pointer-events-none">
                 {isListening && (
                    <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-qh-gold/30 flex items-center gap-4 text-qh-gold shadow-lg shadow-qh-gold/10">
                       <div className="flex items-center gap-1">
                          <span className="w-1 h-3 bg-qh-gold animate-[pulse_1s_ease-in-out_infinite]"></span>
                          <span className="w-1 h-4 bg-qh-gold animate-[pulse_1.2s_ease-in-out_infinite]"></span>
                          <span className="w-1 h-2 bg-qh-gold animate-[pulse_0.8s_ease-in-out_infinite]"></span>
                       </div>
                       <span className="text-xs font-bold uppercase tracking-widest">Listening...</span>
                    </div>
                 )}
              </div>
           </div>
           
           {/* Controls Bar */}
           <div className="h-16 bg-slate-900/80 border-t border-qh-border flex items-center justify-between px-6 shrink-0 z-20 backdrop-blur-md overflow-x-auto">
              <div className="flex items-center gap-2">
                 <button 
                   onClick={toggleVideo}
                   className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                     isVideoEnabled ? "bg-qh-cyan/20 text-qh-cyan hover:bg-qh-cyan/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                   )}
                   title="Toggle Camera"
                 >
                   {isVideoEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                 </button>
                 <button 
                   onClick={toggleScreenShare}
                   className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                     isScreenShareEnabled ? "bg-qh-gold/20 text-qh-gold hover:bg-qh-gold/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                   )}
                   title="Share Screen"
                 >
                   {isScreenShareEnabled ? <MonitorUp size={18} /> : <MonitorX size={18} />}
                 </button>
                 <button 
                   onClick={toggleMouseControl}
                   className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                     isMouseControlEnabled ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30" : "bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700"
                   )}
                   title="Agent Mouse Control"
                 >
                   <MousePointer2 size={18} />
                 </button>
                 <button 
                   onClick={handleSnapshot}
                   disabled={!isVideoEnabled && !isScreenShareEnabled}
                   className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                     "bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   )}
                   title="Take Snapshot"
                 >
                   <Camera size={18} className="text-qh-cyan" />
                 </button>
              </div>
              
              <button 
                onClick={toggleAssistant}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border shadow-lg -translate-y-4",
                  isListening 
                    ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                    : "bg-qh-gold/20 border-qh-gold text-qh-gold hover:bg-qh-gold/30 hover:scale-105 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                )}
              >
                {isListening ? <Square size={20} className="fill-current" /> : <Mic size={24} />}
              </button>
              
              <div className="flex items-center gap-3">
                <select className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-qh-gold font-mono">
                   <option>Gemini 1.5 Pro Live</option>
                   <option>GPT-4o Realtime</option>
                   <option>Grok Vision</option>
                </select>
              </div>
           </div>
        </div>

        {/* Side Panel: Agent Actions & Insights */}
        {/* Side Panel: Agent Actions & Insights */}
        <div className="bg-qh-card border border-qh-border rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
           <div className="p-4 border-b border-qh-border bg-slate-900/60">
              <h3 className="text-slate-200 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                 <Bot size={14} className={showRealityCheck ? "text-qh-cyan" : "text-qh-emerald"} />
                 {showRealityCheck ? 'Capability Status' : 'Computer Control'}
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
              {showRealityCheck ? (
                <div className="space-y-6 font-sans">
                   <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-xs text-slate-400 italic">
                     El agente puede ver o analizar la pantalla solo cuando el usuario autoriza compartir pantalla. El control real de computadora requiere un Local Desktop Worker futuro y aprobación explícita por acción.
                   </div>
                   
                   <div className="space-y-2">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Real Now</h4>
                     <ul className="space-y-2 font-mono text-[10px]">
                        <li className="flex items-center justify-between"><span className="text-slate-300">Screen Sharing</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Camera Preview</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Manual Snapshot</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Action Proposal UI</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Approval Queue UI</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Local State Persistence</span><span className="bg-qh-emerald/20 text-qh-emerald px-1.5 py-0.5 rounded border border-qh-emerald/30">REAL</span></li>
                     </ul>
                   </div>

                   <div className="space-y-2">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Simulado / Futuro</h4>
                     <ul className="space-y-2 font-mono text-[10px]">
                        <li className="flex items-center justify-between"><span className="text-slate-300">Gemini Live Vision</span><span className="bg-qh-cyan/20 text-qh-cyan px-1.5 py-0.5 rounded border border-qh-cyan/30">MOCK</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">GPT/Grok Vision</span><span className="bg-qh-cyan/20 text-qh-cyan px-1.5 py-0.5 rounded border border-qh-cyan/30">MOCK</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Remote Mouse</span><span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 text-[8px] text-center w-20 leading-tight">LOCAL WORKER</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Keyboard Control</span><span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 text-[8px] text-center w-20 leading-tight">LOCAL WORKER</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">Browser Auto</span><span className="bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600">FUTURE</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">OS Automation</span><span className="bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600">FUTURE</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">File Editing</span><span className="bg-qh-gold/20 text-qh-gold px-1.5 py-0.5 rounded border border-qh-gold/30 text-[8px] text-center w-20 leading-tight">REQ BACKEND</span></li>
                        <li className="flex items-center justify-between"><span className="text-slate-300">CLI Execution</span><span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 text-[8px] text-center w-20 leading-tight">LOCAL WORKER</span></li>
                     </ul>
                   </div>
                </div>
              ) : (
                <>
                  {!isListening ? (
                     <div className="text-center text-slate-500 mt-10 uppercase tracking-widest leading-loose font-sans text-xs">
                        Assistant Offline.<br/>
                        Start the session for screen analysis.
                     </div>
                  ) : (
                     <>
                       <div className="p-3 bg-slate-800/50 border-l-2 border-qh-emerald rounded text-[10px]">
                         <span className="text-slate-500">[{new Date().toLocaleTimeString()}] </span>
                         <span className="text-slate-300">Connected to Screen Stream.</span>
                       </div>
                       
                       {/* Simulado Action Request */}
                       {isScreenShareEnabled && isMouseControlEnabled && (
                         <div className="bg-slate-900 border border-red-500/30 rounded-lg p-3 text-xs shadow-lg space-y-3">
                           <div className="flex items-start justify-between gap-2">
                             <div className="flex items-center gap-2">
                               <AlertTriangle size={14} className="text-red-400" />
                               <span className="font-bold text-slate-200">Action Requested</span>
                             </div>
                             <span className="text-[9px] uppercase tracking-widest bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">High Risk</span>
                           </div>
                           
                           <div className="text-slate-300 font-sans">
                             Agent proposes to: <strong className="text-qh-gold">Create new Google Doc and write daily brief</strong>
                           </div>

                           <div className="space-y-1 text-[10px] text-slate-400">
                             <div className="uppercase text-slate-500 font-bold font-sans">Steps:</div>
                             <div>1. Navigate to docs.new</div>
                             <div>2. Type brief context</div>
                             <div>3. Rename document</div>
                           </div>
                           
                           <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                              <button 
                                 onClick={() => {
                                   SystemService.logAction("agent_action.rejected", "system", "Rejected action: Create new Google Doc", "user", "warning");
                                   alert("Action rejected");
                                 }} 
                                 className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 uppercase tracking-widest text-[9px] font-bold font-sans"
                              >
                                <X size={12} /> Reject
                              </button>
                              <button 
                                 onClick={() => {
                                   SystemService.logAction("agent_action.approved", "system", "Approved action: Create new Google Doc", "user", "info");
                                   SystemService.logAction("agent_action.executed_mock", "system", "Executed action mock: Create new Google Doc", "system", "info");
                                   alert("Action approved. Simulado executing...");
                                 }} 
                                 className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded bg-qh-emerald/10 text-qh-emerald hover:bg-qh-emerald/20 border border-qh-emerald/30 uppercase tracking-widest text-[9px] font-bold font-sans"
                              >
                                <Check size={12} /> Approve
                              </button>
                           </div>
                         </div>
                       )}
                       
                       {isListening && !isMouseControlEnabled && (
                          <div className="p-3 bg-qh-gold/10 border-l-2 border-qh-gold rounded text-[10px]">
                            <span className="text-slate-500">[{new Date().toLocaleTimeString()}] </span>
                            <span className="text-qh-gold font-sans">Viewing screen... Mouse control disabled. Allow mouse control to let agent execute tasks.</span>
                          </div>
                       )}
                     </>
                  )}
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
