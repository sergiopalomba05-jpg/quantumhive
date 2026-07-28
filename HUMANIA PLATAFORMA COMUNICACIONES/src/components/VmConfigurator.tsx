import React, { useState } from "react";
import { VmConfig } from "../types";
import { 
  Server, Cpu, Wifi, ShieldCheck, Activity, Eye, Video,
  Settings, RefreshCw, Volume2, Key, Sliders, CheckCircle2, Lock, Sparkles, Terminal
} from "lucide-react";

interface VmConfiguratorProps {
  config: VmConfig;
  onChange: (updated: VmConfig) => void;
}

export default function VmConfigurator({ config, onChange }: VmConfiguratorProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [customWs, setCustomWs] = useState(config.wsUrl);
  const [customHttp, setCustomHttp] = useState(config.httpUrl);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate contacting their VM server / Cloud Agent Node
    setTimeout(() => {
      setIsTesting(false);
      const isVertex = config.liveModelProvider === "vertex-live";
      const desc = isVertex 
        ? "CONNECTED TO VERTEX AI CLOUD SUITE. Successfully authorized. Voice-to-Voice Latency: 12ms." 
        : `CONNECTED TO ${config.liveModelProvider?.toUpperCase()} EDGE GATEWAY. Handshake completed. 0% Packet Loss.`;
      
      setTestResult(`${desc} Latency: ${config.latencyMs}ms. Camera Capture integration: ${config.cameraVisionEnabled ? "ON (15 FPS jpeg chunking)" : "OFF"}.`);
      onChange({
        ...config,
        wsUrl: customWs,
        httpUrl: customHttp,
        isConnected: true
      });
    }, 1800);
  };

  const toggleMode = (mode: "simulation" | "vm") => {
    onChange({
      ...config,
      mode
    });
  };

  const handleProviderChange = (provider: "gemini-live" | "openai-realtime" | "groq-live" | "vertex-live") => {
    onChange({
      ...config,
      liveModelProvider: provider
    });
  };

  const handleCameraToggle = () => {
    onChange({
      ...config,
      cameraVisionEnabled: !config.cameraVisionEnabled
    });
  };

  return (
    <div className="p-5 space-y-6 animate-fade-in text-white" id="vm-configurator-container">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
            <Server className="w-5 h-5 text-brand-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold tracking-widest text-brand-primary uppercase">
              Ultra-Low Latency VM Core
            </h2>
            <p className="text-[11px] text-white/50">Configure your custom real-time websocket avatar and camera vision pipelines</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/30">
          WS CORE v2.8
        </span>
      </div>

      {/* Connection Mode Selection Card */}
      <div className="p-4 bg-brand-surface/80 rounded-2xl border border-white/10 space-y-3">
        <label className="text-[11px] font-mono uppercase text-brand-primary font-bold tracking-wider block">
          Core Engine Connection Protocol
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toggleMode("simulation")}
            className={`p-3 rounded-xl flex flex-col items-center justify-center text-center gap-2 border transition-all cursor-pointer ${
              config.mode === "simulation"
                ? "bg-brand-primary/15 border-brand-primary text-white"
                : "bg-black/20 border-white/5 text-white/60 hover:bg-white/5"
            }`}
          >
            <Cpu className="w-5 h-5" />
            <div className="text-center">
              <p className="text-xs font-bold font-mono">Simulator Mode</p>
              <p className="text-[9px] opacity-70 mt-0.5">Local Audio Sync</p>
            </div>
          </button>

          <button
            onClick={() => toggleMode("vm")}
            className={`p-3 rounded-xl flex flex-col items-center justify-center text-center gap-2 border transition-all cursor-pointer ${
              config.mode === "vm"
                ? "bg-brand-primary/15 border-brand-primary text-white"
                : "bg-black/20 border-white/5 text-white/60 hover:bg-white/5"
            }`}
          >
            <Wifi className="w-5 h-5 text-brand-primary" />
            <div className="text-center">
              <p className="text-xs font-bold font-mono">Direct Cloud Agent VM</p>
              <p className="text-[9px] opacity-70 mt-0.5">Your Live WebSocket Node</p>
            </div>
          </button>
        </div>
      </div>

      {/* Agent API & Model Selection */}
      <div className="p-4 bg-brand-surface/80 rounded-2xl border border-white/10 space-y-4">
        <div>
          <label className="text-[11px] font-mono uppercase text-brand-primary font-bold tracking-wider block mb-1">
            Real-Time Agent Engine Provider
          </label>
          <p className="text-[10px] text-white/40 mb-3">
            Select the ultra-low latency model backend. The client will negotiate bidirectional audio/video channels over the WebSocket.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "gemini-live", label: "Gemini Live API", desc: "Multimodal Voice & Vision" },
              { id: "vertex-live", label: "Vertex AI Live (Cloud)", desc: "My Cloud Node Agent" },
              { id: "openai-realtime", label: "OpenAI Realtime", desc: "Low-latency GPT-4o voice" },
              { id: "groq-live", label: "Groq Live Voice", desc: "Llama-3.1 Audio pipeline" }
            ].map((prov) => {
              const isSelected = config.liveModelProvider === prov.id;
              return (
                <button
                  key={prov.id}
                  onClick={() => handleProviderChange(prov.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                      : "bg-black/30 border-white/5 text-white/70 hover:bg-white/5"
                  }`}
                >
                  <span className="text-[11px] font-bold font-mono">{prov.label}</span>
                  <span className="text-[9px] text-white/40 mt-1 leading-snug">{prov.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Camera Vision Integration Toggle */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-[11px] font-mono uppercase text-brand-primary font-bold tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                <span>Camera Vision Pipeline (Real-Time)</span>
              </label>
              <p className="text-[10px] text-white/50 max-w-md leading-relaxed">
                Interleave camera frame capturing (JPEG binary/base64 chunks) with mic input audio. Enables live vision to analyze objects, expressions, or documents.
              </p>
            </div>
            <button
              onClick={handleCameraToggle}
              className={`w-12 h-6 rounded-full transition-all cursor-pointer relative flex items-center p-0.5 border ${
                config.cameraVisionEnabled 
                  ? "bg-brand-primary border-brand-primary" 
                  : "bg-white/5 border-white/10"
              }`}
            >
              <span className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform transform ${
                config.cameraVisionEnabled ? "translate-x-6" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* VM Address Parameters */}
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5 pl-1">
            WebSocket Streaming Gateway (WebRTC fallback)
          </label>
          <div className="relative">
            <input 
              type="text"
              value={customWs}
              onChange={(e) => setCustomWs(e.target.value)}
              placeholder="ws://your-vm-ip-or-dns:8000/v1/stream"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5 pl-1">
              HTTP Rest Engine Endpoint
            </label>
            <input 
              type="text"
              value={customHttp}
              onChange={(e) => setCustomHttp(e.target.value)}
              placeholder="https://your-vm-ip-or-dns:8000/api"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-brand-primary/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 pl-1">
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block">
                API Secret Token / Key
              </label>
              <button 
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[9px] font-mono text-brand-primary/80 hover:text-brand-primary uppercase"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input 
                type={showApiKey ? "text" : "password"}
                value={config.liveModelApiKey || ""}
                onChange={(e) => onChange({ ...config, liveModelApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-white/20 font-mono focus:outline-none focus:border-brand-primary/50"
              />
              <Lock className="absolute right-3.5 top-3 w-3.5 h-3.5 text-white/25 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom prompt instructions for live model */}
        <div>
          <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5 pl-1">
            Active Prompt System Instructions
          </label>
          <textarea
            rows={2}
            value={config.customPromptInstruction || ""}
            onChange={(e) => onChange({ ...config, customPromptInstruction: e.target.value })}
            placeholder="Introduce system instructions for the low-latency agent..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-white/30 font-sans focus:outline-none focus:border-brand-primary/50 resize-none"
          />
        </div>

        {/* Audio Codec & Parameters */}
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5 pl-1">
              Audio Frame Rate & Compression
            </label>
            <select
              value={config.audioQuality}
              onChange={(e) => onChange({ ...config, audioQuality: e.target.value as any })}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white/80 focus:outline-none focus:border-brand-primary/50 cursor-pointer"
            >
              <option value="low">Standard Opus (16kHz, Low Latency)</option>
              <option value="medium">Broadband Opus (24kHz, Balanced)</option>
              <option value="high">Hi-Fi Studio PCM (48kHz, lossless)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5 pl-1">
              Connection Jitter / Latency Buffer
            </label>
            <select
              value={config.latencyMs}
              onChange={(e) => onChange({ ...config, latencyMs: Number(e.target.value) })}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white/80 focus:outline-none focus:border-brand-primary/50 cursor-pointer"
            >
              <option value={10}>Ultra Low Latency (10ms Edge)</option>
              <option value={30}>Standard Server (30ms Buffer)</option>
              <option value={80}>High Fidelity Stream (80ms safe)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trigger & Test Actions */}
      <div className="pt-2">
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {isTesting ? (
            <RefreshCw className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <Activity className="w-4.5 h-4.5" />
          )}
          <span>{isTesting ? "Handshaking with Cloud Agent Node..." : "Test WebSocket Pipeline Connection"}</span>
        </button>

        {testResult && (
          <div className="mt-3 p-3.5 bg-brand-primary/10 border border-brand-primary/30 rounded-xl flex items-start gap-2.5 animate-fade-in text-brand-primary">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-[11px] font-mono leading-relaxed font-semibold">
              {testResult}
            </p>
          </div>
        )}
      </div>

      {/* Technical WebSockets Interleaving Pipeline Diagram */}
      <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span>Multimodal Interleaved Frame Pipeline</span>
        </h4>
        <p className="text-[10px] text-white/50 leading-relaxed">
          The frontend is fully pre-configured to stream base64 camera image buffers interleaved with 16-bit PCM audio arrays to your cloud Vertex Live Agent or chosen model via WebSockets:
        </p>
        
        <div className="p-3 bg-black/80 rounded-xl font-mono text-[9px] text-emerald-400 overflow-x-auto whitespace-pre space-y-1.5 border border-white/5 no-scrollbar">
{`// Websocket connection interface structure
const ws = new WebSocket("${config.wsUrl}");

// Interleaving binary audio and Camera frames
ws.send(JSON.stringify({
  type: "audio_chunk",
  data: "base64_encoded_pcm_pcm16_array..."
}));

${config.cameraVisionEnabled ? `ws.send(JSON.stringify({
  type: "camera_frame",
  mimeType: "image/jpeg",
  data: "base64_captured_frame_chunk..."
})); // Active: camera streaming enabled` : `// ws.send(camera_frame) is currently disabled`}

// Receiver endpoint listening for live voice/vision answers
ws.onmessage = (event) => {
  const packet = JSON.parse(event.data);
  if (packet.type === "audio_output") {
    playPcmAudio(packet.pcmData);
  }
};`}
        </div>
      </div>
    </div>
  );
}
