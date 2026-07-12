import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, X, Mic, RefreshCw, Volume2, VolumeX, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";

interface VirtualWaitressProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChatMessage[];
  onSendMessage: (text: string, withVoice: boolean) => Promise<void>;
  waitressState: "idle" | "listening" | "thinking" | "speaking";
  setWaitressState: (state: "idle" | "listening" | "thinking" | "speaking") => void;
  chips: string[];
  onChipClick: (chip: string) => void;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
}

export const VirtualWaitress: React.FC<VirtualWaitressProps> = ({
  isOpen,
  onClose,
  history,
  onSendMessage,
  waitressState,
  setWaitressState,
  chips,
  onChipClick,
  isVoiceMuted,
  onToggleMute,
}) => {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const historyEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat history on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [history, isOpen, waitressState]);

  // Manage recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 11) {
            // max 12 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    onSendMessage(text, !isVoiceMuted);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      // Interrupt active speaking
      setWaitressState("listening");
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
        }
      }

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current?.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setWaitressState("thinking");

        // Stop all tracks to release mic hardware
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current || [], { type: mimeType });
        if (audioBlob.size === 0) {
          setWaitressState("idle");
          return;
        }

        try {
          const base64Data = await blobToBase64(audioBlob);
          
          // Send to transcription endpoint
          const response = await fetch("/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio_base64: base64Data, mime_type: mimeType }),
          });

          if (!response.ok) {
            throw new Error("Transmisión fallida");
          }

          const data = await response.json();
          const text = (data.text || "").trim();

          if (text) {
            // Process the voice transcription
            await onSendMessage(text, !isVoiceMuted);
          } else {
            setWaitressState("idle");
          }
        } catch (error) {
          console.error("Transcription Error:", error);
          setWaitressState("idle");
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Mic Access Error:", error);
      setIsRecording(false);
      setWaitressState("idle");
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-gradient-to-b from-[#1b1411] to-[#0e0a07] border-l border-gold/15 flex flex-col z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10">
              <div className="flex items-center gap-3">
                {/* Micro Animated Status Orb */}
                <div className="relative w-8 h-8 flex-shrink-0">
                  <motion.div
                    animate={
                      waitressState === "listening"
                        ? { scale: [1, 1.2, 1] }
                        : waitressState === "thinking"
                        ? { rotate: 360 }
                        : waitressState === "speaking"
                        ? { scale: [1, 1.08, 1] }
                        : {}
                    }
                    transition={
                      waitressState === "listening"
                        ? { duration: 1, repeat: Infinity }
                        : waitressState === "thinking"
                        ? { duration: 2, ease: "linear", repeat: Infinity }
                        : waitressState === "speaking"
                        ? { duration: 0.6, repeat: Infinity }
                        : { duration: 5, repeat: Infinity }
                    }
                    className={`absolute inset-0 rounded-full ${
                      waitressState === "listening"
                        ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                        : waitressState === "thinking"
                        ? "bg-gradient-to-r from-yellow-400 to-gold shadow-[0_0_12px_rgba(201,168,106,0.5)] border-2 border-dashed border-white/20"
                        : waitressState === "speaking"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : "bg-gradient-to-r from-accent to-accent-dark opacity-60"
                    }`}
                  />
                  <div className="absolute inset-1.5 bg-black/30 rounded-full backdrop-blur-xs flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter">
                    {waitressState === "listening" && "REC"}
                    {waitressState === "thinking" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {waitressState === "speaking" && "VOZ"}
                    {waitressState === "idle" && "SOL"}
                  </div>
                </div>

                <div>
                  <h3 className="font-serif font-semibold text-lg text-gold leading-tight">Sol</h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#9a8e78] font-bold">
                    {waitressState === "listening" && "Escuchando..."}
                    {waitressState === "thinking" && "Pensando..."}
                    {waitressState === "speaking" && "Hablando..."}
                    {waitressState === "idle" && "Mesera Virtual"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mute Toggle */}
                <button
                  onClick={onToggleMute}
                  className="p-2 text-[#9a8e78] hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  title={isVoiceMuted ? "Activar Voz" : "Silenciar Voz"}
                >
                  {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-gold" />}
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 text-[#9a8e78] hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto px-5 py-6 flex flex-col gap-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full max-w-xs mx-auto">
                  <MessageSquare className="w-12 h-12 text-[#5c4639] mb-4" />
                  <p className="font-serif italic text-[#9a8e78] text-sm">
                    "¡Hola! Soy Sol, tu mesera virtual. ¿Te tienta una entrañita o preferís que te recomiende un vino de la casa?"
                  </p>
                </div>
              ) : (
                history.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "self-end" : "self-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed break-words shadow-md ${
                        msg.role === "user"
                          ? "bg-accent text-[#F4ECD8] rounded-br-xs"
                          : "bg-[#FFFCF5] text-[#2A1F18] border border-gold/15 rounded-bl-xs"
                      }`}
                    >
                      {msg.role === "model" && (
                        <span className="block font-serif font-bold italic text-[11px] text-accent/80 uppercase tracking-wider mb-1">
                          Sol
                        </span>
                      )}
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}

              {/* Streaming placeholder bubble */}
              {waitressState === "thinking" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col max-w-[85%] self-start"
                >
                  <div className="px-4 py-3 rounded-2xl text-[14px] leading-relaxed bg-[#FFFCF5] text-[#2A1F18] border border-gold/15 rounded-bl-xs shadow-md">
                    <span className="block font-serif font-bold italic text-[11px] text-accent/80 uppercase tracking-wider mb-1">
                      Sol
                    </span>
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-1.5 h-1.5 bg-[#5c4639] rounded-full animate-bounce delay-0" />
                      <span className="w-1.5 h-1.5 bg-[#5c4639] rounded-full animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 bg-[#5c4639] rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={historyEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {chips.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gold/5 bg-[#181210]/40">
                <AnimatePresence>
                  {chips.map((chip, idx) => (
                    <motion.button
                      key={chip + idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => onChipClick(chip)}
                      className="px-3.5 py-1.5 bg-black/30 hover:bg-gold/10 hover:text-gold border border-gold/15 hover:border-gold/30 text-[#e9e0c7] text-xs font-semibold rounded-full cursor-pointer transition-all duration-200"
                    >
                      {chip}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Dock Controls */}
            <div className="p-4 bg-[#140e0b] border-t border-gold/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3 bg-[#1c1411] border border-gold/20 focus-within:border-accent rounded-full p-1.5 pl-4 transition-all shadow-inner">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isRecording ? "Grabando voz..." : "Escribí tu mensaje..."}
                  disabled={isRecording}
                  rows={1}
                  className="flex-grow bg-transparent text-[#F4ECD8] placeholder-gold/40 text-sm py-1.5 resize-none outline-none max-h-16"
                />

                {/* Mic Record Toggle */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-accent/20 text-gold border border-gold/20 hover:bg-accent/40"
                  }`}
                >
                  <Mic className={`w-4 h-4 ${isRecording ? "scale-110" : ""}`} />
                </button>

                {/* Send Text Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isRecording || waitressState === "thinking"}
                  className="w-9 h-9 rounded-full bg-gold text-[#0e0a07] hover:bg-gold/90 disabled:bg-[#342a25] disabled:text-[#9a8e78] flex items-center justify-center cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4 translate-x-[1px]" />
                </button>
              </div>

              {isRecording && (
                <div className="flex items-center justify-between px-4 mt-2">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest animate-pulse">
                    Grabando ({recordingSeconds}s)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-red-400 rounded-full animate-bounce delay-0" />
                    <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1 h-5 bg-red-400 rounded-full animate-bounce delay-200" />
                    <span className="w-1 h-3 bg-red-400 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
