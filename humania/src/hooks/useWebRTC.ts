import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionState, CallMode, SubtitleItem, LogMessage, WebRTCConfig, SUPPORTED_LANGUAGES } from '../types';

export function useWebRTC() {
  const [mode, setMode] = useState<CallMode>('demo');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  
  // Audio activity levels (0 to 100)
  const [micActivity, setMicActivity] = useState<number>(0);
  const [aiActivity, setAiActivity] = useState<number>(0);
  
  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Configuration State
  const [config, setConfig] = useState<WebRTCConfig>({
    wsUrl: 'ws://localhost:3000/api/rtc',
    iceServers: 'stun:stun.l.google.com:19302',
    targetLanguage: 'es',
    aiVoice: 'human-ia-clara',
    avatarId: 'clara',
    speechStyleId: 'warm',
    isMuted: false,
    isVideoOff: false,
    enableTranslation: true,
  });

  // Refs for WebRTC & WebSocket
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Speech Recognition Refs (Web Speech API)
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const speakTimeoutRef = useRef<any>(null);

  // Helper to add logs
  const addLog = useCallback((type: LogMessage['type'], text: string) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(7),
      type,
      text,
      timestamp: new Date(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);

  // Helper to add subtitles
  const addSubtitle = useCallback((sender: SubtitleItem['sender'], text: string, translation: string) => {
    const newSubtitle: SubtitleItem = {
      id: Math.random().toString(36).substring(7),
      sender,
      text,
      translation,
      timestamp: new Date(),
    };
    setSubtitles((prev) => [...prev, newSubtitle]);
  }, []);

  // Update specific config options
  const updateConfig = useCallback((newConfig: Partial<WebRTCConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      
      // Sync track states instantly
      if (localStreamRef.current) {
        if (newConfig.isMuted !== undefined) {
          localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !updated.isMuted;
          });
          addLog('info', updated.isMuted ? 'Micrófono silenciado' : 'Micrófono activado');
        }
        if (newConfig.isVideoOff !== undefined) {
          localStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = !updated.isVideoOff;
          });
          addLog('info', updated.isVideoOff ? 'Cámara apagada' : 'Cámara encendida');
        }
      }
      return updated;
    });
  }, [addLog]);

  // Audio level analyser loop
  const startAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize 0-255 average to 0-100 activity index
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicActivity(normalized);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Could not initialize audio visualizer:', err);
    }
  }, []);

  // Stop visualizers
  const stopAudioAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicActivity(0);
  }, []);

  // Text synthesis for simulated AI replies
  const speakSimulatedAI = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice based on selection or language
    const lang = config.targetLanguage === 'es' ? 'es-ES' : 'en-US';
    utterance.lang = lang;
    
    // Simulate AI activity level during TTS
    let activityInterval: any;
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      activityInterval = setInterval(() => {
        // Pulse voice activity between 25 and 85
        setAiActivity(Math.floor(Math.random() * 60) + 25);
      }, 100);
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      clearInterval(activityInterval);
      setAiActivity(0);
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      clearInterval(activityInterval);
      setAiActivity(0);
    };

    window.speechSynthesis.speak(utterance);
  }, [config.targetLanguage]);

  // Request translation & response from Server side
  const requestAIResponse = useCallback(async (userSpeech: string) => {
    addLog('info', 'Procesando respuesta del LLM con Vertex...');
    
    try {
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userSpeech,
          targetLanguage: config.targetLanguage,
          voice: config.aiVoice,
          enableTranslation: config.enableTranslation,
          avatarId: config.avatarId,
          speechStyleId: config.speechStyleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      
      // Update with Translation & Text
      const aiReply = data.reply || 'Hola, ¿en qué puedo ayudarte hoy?';
      const aiTranslation = data.translation || '';
      
      addLog('success', 'Respuesta de IA recibida');
      addSubtitle('ai', aiReply, aiTranslation);
      
      // Speak AI response
      speakSimulatedAI(aiReply);
    } catch (error) {
      addLog('error', `Error al invocar el LLM de Vertex: ${error instanceof Error ? error.message : error}`);
      
      // Fallback local mock translation
      setTimeout(() => {
        const fallback = config.targetLanguage === 'es' 
          ? 'Lo siento, hubo un problema al conectar con Vertex AI, pero la llamada WebRTC sigue simulada.'
          : 'I am sorry, there was a problem connecting to Vertex AI, but the WebRTC call remains active.';
        addSubtitle('ai', fallback, fallback);
        speakSimulatedAI(fallback);
      }, 1000);
    }
  }, [config.targetLanguage, config.aiVoice, config.enableTranslation, config.avatarId, config.speechStyleId, addLog, addSubtitle, speakSimulatedAI]);

  // Start continuous Web Speech recognition for interactive demo
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('warning', 'La API de reconocimiento de voz no es compatible con este navegador.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = config.targetLanguage === 'es' ? 'es-ES' : 'en-US';

    rec.onstart = () => {
      addLog('info', `Escucha de voz activada en ${rec.lang}`);
    };

    rec.onresult = async (event: any) => {
      if (isSpeakingRef.current) return; // Ignore mic if AI is talking

      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim();
      
      if (!transcript) return;

      addLog('info', `Usuario dijo: "${transcript}"`);
      
      // Ask API to translate what user said
      let userTranslation = '';
      if (config.enableTranslation) {
        try {
          const transLang = config.targetLanguage === 'es' ? 'en' : 'es'; // Translate to opposing language
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: transcript, targetLanguage: transLang }),
          });
          const d = await res.json();
          userTranslation = d.translatedText || '';
        } catch (e) {
          userTranslation = '...';
        }
      }

      addSubtitle('user', transcript, userTranslation);

      // Trigger AI reply after a short delay
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = setTimeout(() => {
        requestAIResponse(transcript);
      }, 1200);
    };

    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition error:', e.error);
        addLog('warning', `Reconocimiento de voz: ${e.error}`);
      }
    };

    rec.onend = () => {
      // Auto restart if call is still active
      if (connectionState === 'connected' && mode === 'demo') {
        try {
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [connectionState, mode, config.targetLanguage, config.enableTranslation, addLog, addSubtitle, requestAIResponse]);

  const stopSpeechRecognition = useCallback(() => {
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setAiActivity(0);
  }, []);

  // WebRTC - Initiate Real Peer Connection & Signaling
  const startRealWebRTC = useCallback(async () => {
    addLog('info', 'Iniciando conexión WebRTC con Vertex AI Gateway...');
    setConnectionState('connecting');

    try {
      // 1. Setup local stream if not already done
      let currentStream = localStreamRef.current;
      if (!currentStream) {
        addLog('info', 'Obteniendo permisos de cámara y micrófono...');
        currentStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        setLocalStream(currentStream);
        localStreamRef.current = currentStream;
        startAudioAnalyser(currentStream);
      }

      // 2. Connect to WebSocket Signaling Server
      addLog('info', `Conectando con WebSocket de señalización: ${config.wsUrl}`);
      const ws = new WebSocket(config.wsUrl);
      socketRef.current = ws;

      // 3. Configure RTCPeerConnection
      const parsedIceServers = config.iceServers.split(',').map(server => ({ urls: server.trim() }));
      const pc = new RTCPeerConnection({ iceServers: parsedIceServers });
      peerConnectionRef.current = pc;

      // 4. Attach media tracks
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream!);
        addLog('info', `Pista agregada al canal WebRTC: ${track.kind}`);
      });

      // 5. Setup ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'candidate',
            candidate: event.candidate
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        addLog('info', `Estado de conexión RTC: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setConnectionState('connected');
          addLog('success', 'Canal WebRTC establecido con el agente Vertex de baja latencia!');
        } else if (pc.connectionState === 'failed') {
          setConnectionState('failed');
          addLog('error', 'Fallo de conexión WebRTC. Revisa tus ICE servers o servidor WebSocket.');
        } else if (pc.connectionState === 'disconnected') {
          setConnectionState('disconnected');
          addLog('warning', 'WebRTC desconectado.');
        }
      };

      // 6. Handle remote streams
      pc.ontrack = (event) => {
        addLog('success', `Recibiendo canal remoto desde Vertex AI: ${event.track.kind}`);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          // Fallback if no stream wrapper
          const newStream = new MediaStream([event.track]);
          setRemoteStream(newStream);
        }
      };

      // 7. Signaling message router
      ws.onopen = async () => {
        addLog('success', 'Canal WebSocket de señalización abierto.');
        
        // Host creates the offer
        addLog('info', 'Creando WebRTC SDP Offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        ws.send(JSON.stringify({
          type: 'offer',
          sdp: pc.localDescription,
          config: {
            language: config.targetLanguage,
            voice: config.aiVoice,
            translation: config.enableTranslation
          }
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'answer') {
            addLog('info', 'Respuesta WebRTC SDP Answer recibida del agente.');
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
          } else if (message.type === 'candidate') {
            if (message.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
          } else if (message.type === 'subtitle') {
            // Live translation subtitle packets from Vertex agent
            addSubtitle(message.sender, message.text, message.translation);
          } else if (message.type === 'activity') {
            // Live speech audio activity level of the LLM
            setAiActivity(message.level || 0);
          } else if (message.type === 'error') {
            addLog('error', `Vertex WebRTC Server Error: ${message.message}`);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = (err) => {
        addLog('error', 'Error en el canal de señalización WebSocket.');
        console.error('WebSocket Error:', err);
      };

      ws.onclose = () => {
        addLog('warning', 'Conexión WebSocket de señalización cerrada.');
      };

    } catch (err) {
      addLog('error', `Fallo al iniciar WebRTC: ${err instanceof Error ? err.message : err}`);
      setConnectionState('failed');
    }
  }, [config.wsUrl, config.iceServers, config.targetLanguage, config.aiVoice, config.enableTranslation, addLog, addSubtitle, startAudioAnalyser]);

  // Start Call (triggers either WebRTC or high-fidelity Demo Mode)
  const startCall = useCallback(async (selectedMode: CallMode) => {
    setMode(selectedMode);
    setConnectionState('connecting');
    setSubtitles([]);
    
    addLog('info', `Iniciando llamada en modo: ${selectedMode === 'webrtc' ? 'WebRTC Real' : 'Demo Interactivo'}`);

    if (selectedMode === 'webrtc') {
      await startRealWebRTC();
    } else {
      // DEMO MODE - Interactive voice-to-voice simulation
      try {
        addLog('info', 'Solicitando cámara y micrófono...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        // Start live volume audio analyser
        startAudioAnalyser(stream);
        
        // Done connecting, set state
        setConnectionState('connected');
        addLog('success', '¡Conectado al simulador de agente de traducción de baja latencia!');
        
        // Welcome message
        setTimeout(() => {
          const welcome = config.targetLanguage === 'es' 
            ? '¡Hola! Bienvenido a tu videollamada de IA con traducción en tiempo real. ¿De qué te gustaría hablar hoy?'
            : 'Hello! Welcome to your AI video call with real-time translation. What would you like to talk about today?';
          addSubtitle('ai', welcome, welcome);
          speakSimulatedAI(welcome);
        }, 1200);

        // Turn on speech recognition so they can talk hands-free
        startSpeechRecognition();

      } catch (err) {
        addLog('error', `Fallo de permisos de hardware: ${err instanceof Error ? err.message : err}`);
        setConnectionState('failed');
      }
    }
  }, [config.targetLanguage, addLog, addSubtitle, startAudioAnalyser, startRealWebRTC, speakSimulatedAI, startSpeechRecognition]);

  // End Call - Stop all streams, clear WebRTC and speech contexts
  const endCall = useCallback(() => {
    addLog('info', 'Finalizando videollamada y limpiando canales...');
    
    // Stop WebRTC PeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close WS Signal channel
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Stop and clear Speech Recognition / Synthesis
    stopSpeechRecognition();

    // Turn off camera & mic tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        addLog('info', `Pista liberada: ${track.kind}`);
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    stopAudioAnalyser();
    setRemoteStream(null);
    setConnectionState('disconnected');
    setAiActivity(0);
    addLog('success', 'Llamada finalizada con éxito.');
  }, [addLog, stopAudioAnalyser, stopSpeechRecognition]);

  // Clear subtitles
  const clearSubtitles = useCallback(() => {
    setSubtitles([]);
    addLog('info', 'Historial de subtítulos limpiado.');
  }, [addLog]);

  // Handle unmount safely
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      if (socketRef.current) socketRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
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
    addLog
  };
}
