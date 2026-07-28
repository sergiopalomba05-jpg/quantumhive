import React, { useState, useEffect } from "react";
import { 
  Languages, Globe, ArrowRightLeft, Sparkles, Copy, Check, 
  BookOpen, HelpCircle, Loader2, Play, Volume2, Bookmark, Trash2, History, MessageSquare, AlertCircle
} from "lucide-react";

interface TranslationResult {
  translation: string;
  alternatives: string[];
  languageDetected: string;
  explanation: string;
  breakdown: Array<{ word: string; meaning: string; notes: string }>;
  pronunciationTip: string;
}

export default function TranslationHub() {
  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState("Auto-detectar");
  const [targetLang, setTargetLang] = useState("English");
  const [mode, setMode] = useState<"standard" | "learn" | "formalize" | "casual">("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; input: string; output: string; from: string; to: string }>>([]);

  useEffect(() => {
    // Load local history
    const cached = localStorage.getItem("quantum_translation_history");
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveToHistory = (input: string, output: string, from: string, to: string) => {
    const newItem = {
      id: Date.now().toString(),
      input: input.length > 50 ? input.substring(0, 50) + "..." : input,
      output: output.length > 50 ? output.substring(0, 50) + "..." : output,
      from,
      to
    };
    const updated = [newItem, ...history.slice(0, 19)];
    setHistory(updated);
    localStorage.setItem("quantum_translation_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("quantum_translation_history");
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: inputText,
          sourceLang,
          targetLang,
          mode
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondió con código ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      if (data.translation) {
        saveToHistory(inputText, data.translation, data.languageDetected || sourceLang, targetLang);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Ocurrió un error al procesar tu traducción con la red soberana de Quantum Hive. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== "Auto-detectar") {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
  };

  const speakText = (textToSpeak: string, langCode: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      // Map basic target names to speech synthesis BCP 47 codes
      const voiceMap: Record<string, string> = {
        "English": "en-US",
        "Spanish": "es-ES",
        "Español": "es-ES",
        "French": "fr-FR",
        "German": "de-DE",
        "Japanese": "ja-JP",
        "Portuguese": "pt-BR",
        "Italian": "it-IT",
        "Chinese": "zh-CN"
      };
      utterance.lang = voiceMap[targetLang] || "en-US";
      window.speechSynthesis.speak(utterance);
    } else {
      alert("La síntesis de voz no es soportada en este navegador.");
    }
  };

  const PRESETS_LANGUAGES = [
    "English", "Spanish", "French", "German", "Japanese", "Portuguese", "Italian", "Chinese", "Russian", "Arabic"
  ];

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-16 animate-fade-in" id="translation-hub-root">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-brand-primary uppercase flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-brand-primary" />
            <span>Traductor Inteligente de Quantum Hive</span>
          </h2>
          <p className="text-[11px] text-white/50">Traducción de ultra-alta fidelidad, análisis de matices y desglose técnico mediante la red inteligente Quantum Hive.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-4">
        {/* Source and Target selection */}
        <div className="p-3 bg-brand-surface/80 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
          <div className="flex-1">
            <label className="text-[9px] font-mono uppercase text-white/40 block mb-1">Origen</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer font-sans"
            >
              <option value="Auto-detectar">Auto-detectar idioma</option>
              {PRESETS_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwapLanguages}
            disabled={sourceLang === "Auto-detectar"}
            className="p-2 mt-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Intercambiar Idiomas"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1">
            <label className="text-[9px] font-mono uppercase text-white/40 block mb-1">Destino</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer font-sans"
            >
              {PRESETS_LANGUAGES.filter(lang => lang !== sourceLang).map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Translation Modes Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/30 rounded-xl border border-white/5">
          {[
            { id: "standard", label: "Estándar", desc: "Fiel & Fluido" },
            { id: "learn", label: "Aprender", desc: "Sutilezas" },
            { id: "formalize", label: "Formal", desc: "Negocios" },
            { id: "casual", label: "Coloquial", desc: "Jerga / Chat" }
          ].map((item) => {
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id as any)}
                className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-bold" 
                    : "border border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                <div className="text-[11px] font-sans font-medium">{item.label}</div>
                <div className="text-[8px] opacity-60 leading-none mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Input Text Area */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-mono uppercase text-white/40 font-bold">Texto a traducir</label>
            <span className="text-[9px] text-white/30 font-mono">{inputText.length} caracteres</span>
          </div>
          <div className="relative">
            <textarea
              rows={4}
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe o pega el texto que deseas traducir..."
              className="w-full bg-brand-surface/70 border border-white/10 rounded-2xl py-3 px-3 text-xs text-white placeholder-white/30 font-sans focus:outline-none focus:border-brand-primary/50 resize-none leading-relaxed"
            />
            {inputText && (
              <button
                onClick={() => setInputText("")}
                className="absolute right-3.5 bottom-3 text-[9px] font-mono text-white/30 hover:text-white"
              >
                LIMPIAR
              </button>
            )}
          </div>
        </div>

        {/* Submit Translate Action */}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className="w-full py-3 bg-brand-primary text-brand-bg hover:bg-brand-primary-hover disabled:opacity-40 font-bold font-mono text-xs tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isLoading ? "TRADUCIENDO CON GEMINI AI..." : "TRADUCIR CON ALTA FIDELIDAD"}</span>
        </button>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Result Showcase */}
        {result && (
          <div className="space-y-4 animate-fade-in pt-1">
            {/* Main Translation Output Card */}
            <div className="p-4 bg-brand-surface/90 border border-brand-primary/25 rounded-3xl space-y-3.5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 flex items-center gap-1.5 z-10">
                <button
                  onClick={() => handleCopy(result.translation)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
                  title="Copiar traducción"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-brand-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => speakText(result.translation, targetLang)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
                  title="Escuchar pronunciación"
                >
                  <Volume2 className="w-3.5 h-3.5 text-brand-primary" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-mono font-bold uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/25 px-1.5 py-0.5 rounded-md">
                  {result.languageDetected || "Idioma de origen"} ➜ {targetLang}
                </span>
                <p className="text-sm font-bold text-white leading-relaxed pt-2 select-text whitespace-pre-wrap">{result.translation}</p>
              </div>

              {/* Alternatives */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div className="pt-2.5 border-t border-white/5 space-y-1">
                  <span className="text-[9px] font-mono text-white/40 block">Otras alternativas comunes:</span>
                  <div className="space-y-1">
                    {result.alternatives.map((alt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60" />
                        <span className="select-text">{alt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pronunciation block */}
            {result.pronunciationTip && (
              <div className="p-3 bg-[#0a111a]/80 border border-white/5 rounded-2xl flex items-start gap-3">
                <div className="p-1.5 bg-brand-primary/10 rounded-xl text-brand-primary mt-0.5">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono uppercase text-brand-primary font-bold">Consejo de Pronunciación</span>
                  <p className="text-[11px] text-white/70 leading-relaxed font-sans">{result.pronunciationTip}</p>
                </div>
              </div>
            )}

            {/* Linguistic Breakdown, Matices, and Explanations */}
            {result.explanation && (
              <div className="p-4 bg-[#0a0d14]/75 border border-white/5 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="text-[10px] font-mono uppercase font-bold text-white/60">Análisis del Experto en Idiomas</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-sans">{result.explanation}</p>
              </div>
            )}

            {/* Grammar and Vocabulary Breakdown */}
            {result.breakdown && result.breakdown.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest pl-1 block">Vocabulario & Expresiones Destacadas</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {result.breakdown.map((item, idx) => (
                    <div key={idx} className="p-3 bg-brand-surface/40 border border-white/5 rounded-2xl flex justify-between items-start gap-3">
                      <div>
                        <span className="text-xs font-bold text-white font-mono">{item.word}</span>
                        <p className="text-[11px] text-brand-primary mt-0.5">{item.meaning}</p>
                      </div>
                      <span className="text-[10px] text-white/45 italic text-right max-w-[180px] leading-tight">{item.notes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Translation History Sidebar/Section */}
        {history.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <History className="w-3 h-3 text-white/30" />
                <span>Historial Reciente</span>
              </span>
              <button
                onClick={clearHistory}
                className="text-[9px] font-mono text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
              {history.map((item) => (
                <div key={item.id} className="p-2.5 bg-brand-surface/25 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-white/80 truncate font-sans">{item.input}</p>
                    <p className="text-brand-primary truncate font-bold">{item.output}</p>
                  </div>
                  <span className="text-[8px] font-mono text-white/30 uppercase bg-white/5 px-1 py-0.5 rounded flex-shrink-0">
                    {item.from} ➔ {item.to}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
