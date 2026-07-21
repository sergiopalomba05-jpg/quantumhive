import { TourButton } from '../components/onboarding/TourButton';
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Bot, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { resolveLiveSocketUrl } from '../lib/runtime';

export function LiveCommand() {
  const store = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState(store.agents[0]?.id || '');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeAgent = store.agents.find(a => a.id === selectedAgentId);

  const pcmToBase64 = (float32Array: Float32Array) => {
    let l = float32Array.length;
    let buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, float32Array[l]) * 0x7FFF;
    }
    const buffer = new ArrayBuffer(buf.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < buf.length; i++) {
      view.setInt16(i * 2, buf[i], true); // true for little-endian
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playAudioChunk = (audioCtx: AudioContext, base64Audio: string) => {
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Convert 16-bit PCM little-endian to Float32Array
    const view = new DataView(bytes.buffer);
    const float32Array = new Float32Array(bytes.length / 2);
    for (let i = 0; i < bytes.length / 2; i++) {
      float32Array[i] = view.getInt16(i * 2, true) / 0x7FFF;
    }
    
    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      setIsThinking(true);
      
      const ws = new WebSocket(resolveLiveSocketUrl(location.protocol, location.host));
      wsRef.current = ws;
      
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onopen = () => setIsThinking(false);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playAudioChunk(outputAudioCtx, msg.audio);
          }
        } catch (err) {
          console.error("Live API Message Error:", err);
        }
      };
    } catch (err) {
      console.error("Mic access error:", err);
      stopListening();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsThinking(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const toggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening(); // cleanup on unmount
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-10 max-w-3xl mx-auto text-center">
      <div className="space-y-4">
        <div className="flex items-center"><h2 className="text-4xl font-display font-bold text-slate-200">Centro de Comando en Vivo</h2><TourButton tourId="liveCommand" /></div>
        <p className="text-slate-500 uppercase tracking-widest text-[10px]">Real-time Voice Orchestration</p>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-qh-border">
        <Bot className="text-qh-gold ml-2" size={16} />
        <select 
          className="bg-transparent text-slate-300 focus:outline-none pr-8 py-2 font-medium text-xs uppercase tracking-wider"
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
        >
          {store.agents.map(a => (
            <option key={a.id} value={a.id} className="bg-qh-bg">{a.name}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        {/* Glow effect */}
        {isListening && (
          <div className="absolute inset-0 bg-qh-gold rounded-full blur-3xl opacity-20 animate-pulse"></div>
        )}
        
        <button 
          onClick={toggleListen}
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 border-2",
            isListening 
              ? "bg-qh-gold/20 border-qh-gold text-qh-gold scale-110 shadow-[0_0_30px_rgba(212,175,55,0.4)]" 
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-qh-gold/50 hover:text-qh-gold shadow-lg"
          )}
        >
          {isListening ? <Square size={40} className="fill-current" /> : <Mic size={40} />}
        </button>
      </div>

      <div className="w-full max-w-2xl min-h-[120px] bg-qh-card border border-qh-border rounded-lg p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        {isListening || isThinking ? (
          <div className="space-y-4 flex flex-col items-center justify-center h-full">
            {isThinking ? (
              <div className="text-qh-gold flex items-center gap-3 text-xs uppercase tracking-widest font-bold">
                <Loader2 size={16} className="animate-spin" /> Connecting to Live API...
              </div>
            ) : (
              <div className="text-qh-emerald flex items-center gap-3 text-xs uppercase tracking-widest font-bold animate-pulse">
                <Mic size={16} /> Listening and interacting...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 h-full flex flex-col justify-center text-xs uppercase tracking-widest leading-loose">
            Press the microphone and start speaking.<br/>
            Real-time Live API using gemini-3.1-flash-live-preview
          </div>
        )}
      </div>
    </div>
  );
}
