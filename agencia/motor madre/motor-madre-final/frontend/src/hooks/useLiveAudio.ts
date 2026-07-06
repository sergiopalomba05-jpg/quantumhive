import { useState, useRef, useCallback } from "react";

// Helper to convert Float32Array (from browser mic) to Int16Array (PCM 16-bit for Gemini)
function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// Helper to convert Int16Array (from Gemini) to Float32Array (for browser playback)
function int16ToFloat32(input: Int16Array) {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const int = input[i];
    const float = int >= 0 ? int / 32767 : int / 32768;
    output[i] = float;
  }
  return output;
}

interface UseLiveAudioProps {
  onToolCall?: (name: string, args: any) => void;
  onAudioStart?: () => void;
  onAudioStop?: () => void;
}

export function useLiveAudio({ onToolCall, onAudioStart, onAudioStop }: UseLiveAudioProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const connect = useCallback(async (systemInstruction: string, initialMessage?: string) => {
    if (wsRef.current) return;

    try {
      // 1. Iniciar WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Enviar config inicial
        ws.send(JSON.stringify({ system_instruction: systemInstruction }));
        if (initialMessage) {
          ws.send(JSON.stringify({ client_content: initialMessage }));
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        disconnect();
      };

      // 2. Configurar reproducción de audio (salida)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn("Failed to resume audio context automatically:", e);
        }
      }
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      // Crear el AnalyserNode para sincronización labial
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(audioCtx.destination);
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "tool_call" && onToolCall) {
              onToolCall(msg.name, msg.args);
            }
          } catch (e) {
            console.error("Error parseando WS text", e);
          }
        } else if (event.data instanceof Blob) {
          // Es audio binario (PCM 16-bit 24kHz desde Gemini)
          if (audioCtx.state === 'suspended') {
            try {
              await audioCtx.resume();
            } catch (e) {
              console.warn("Failed to resume audio context on message:", e);
            }
          }
          const arrayBuffer = await event.data.arrayBuffer();
          const int16Array = new Int16Array(arrayBuffer);
          const float32Array = int16ToFloat32(int16Array);
          
          const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);

          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(analyser);
          
          const startTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current);
          source.start(startTime);
          nextPlayTimeRef.current = startTime + audioBuffer.duration;

          if (!isSpeaking) {
             setIsSpeaking(true);
             onAudioStart?.();
             
             // Setup a timeout to detect when audio stops playing
             source.onended = () => {
                if (audioCtx.currentTime >= nextPlayTimeRef.current - 0.1) {
                   setIsSpeaking(false);
                   onAudioStop?.();
                }
             };
          }
        }
      };

      // 3. Capturar micrófono (entrada) - Opcional para soportar modo autoguiado sin micrófono
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
           sampleRate: 16000,
           channelCount: 1,
           echoCancellation: true,
           noiseSuppression: true,
        } });
        mediaStreamRef.current = stream;

        const micCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        if (micCtx.state === 'suspended') {
          try {
            await micCtx.resume();
          } catch (e) {
            console.warn("Failed to resume mic context:", e);
          }
        }
        micContextRef.current = micCtx;

        const source = micCtx.createMediaStreamSource(stream);
        const processor = micCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = floatTo16BitPCM(inputData);
            // Enviar como binario
            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(micCtx.destination); // Required for Chrome to trigger onaudioprocess
      } catch (micErr) {
        console.warn("Microphone access denied or not available. Running in output-only (listen) mode.", micErr);
      }
      
    } catch (err) {
      console.error("Error connecting to Live API", err);
      disconnect();
    }
  }, [onToolCall, onAudioStart, onAudioStop, isSpeaking]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (micContextRef.current) {
      micContextRef.current.close();
      micContextRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserNode(null);
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ client_content: text }));
    }
  }, []);

  return {
    isConnected,
    isSpeaking,
    connect,
    disconnect,
    sendTextMessage,
    analyserNode
  };
}
