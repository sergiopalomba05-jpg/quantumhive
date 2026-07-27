import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Video, Link, Mic, BrainCircuit, Image as ImageIcon, Loader2, Send, RefreshCw, ExternalLink, GitCompare, Trophy, Layers } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

interface BackendVideoIngestItem {
  id: string;
  sourceType: string;
  originalUrl: string;
  displayUrl?: string;
  status: 'queued' | 'analyzing' | 'pending_review' | 'approved' | 'failed';
  routedBy: 'dominus';
  ingestorAgentName?: string;
  catalog?: {
    status: 'detectada' | 'clasificada' | 'comparada' | 'publicable' | 'dudosa' | 'duplicada' | 'descartada';
    score: { confianza: number; promedio: number };
    taxonomia: { division: string; subdivision: string; utilidad: string };
    accionSugerida: string;
  };
  createdAt: number;
}

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const catalogPwaUrl = viteEnv.VITE_CATALOGO_PWA_URL || '/catalogo-pwa/';
const catalogSupabaseUrl = 'https://gbngjsulhqcwgkqoxozy.supabase.co';

function formatCatalogStatus(status: string): string {
  const labels: Record<string, string> = {
    queued: 'detectada',
    analyzing: 'analizando',
    pending_review: 'dudosa',
    approved: 'publicable',
    failed: 'fallida',
    detectada: 'detectada',
    clasificada: 'clasificada',
    comparada: 'comparada',
    publicable: 'publicable',
    dudosa: 'dudosa',
    duplicada: 'duplicada',
    descartada: 'descartada',
  };
  return labels[status] || 'por revisar';
}

function safeDisplayUrl(value: string): string {
  if (value.startsWith('telegram:')) return value;
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

export function VideoInbox() {
  const store = useStore();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [backendItems, setBackendItems] = useState<BackendVideoIngestItem[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState('Loop del Ingestador de Videos listo: pegá un link y el agente lo clasifica, puntúa, compara y acomoda en la taxonomía del catálogo.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackendItems = async () => {
    try {
      const res = await fetch('/api/video-ingest/items');
      if (!res.ok) return;
      const data = await res.json();
      setBackendItems(data.items || []);
    } catch {
      setTelegramStatus('No se pudo consultar la cola del agente ingestador.');
    }
  };

  useEffect(() => {
    loadBackendItems();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleManualIngest = async () => {
    if (!urlInput.trim()) return;
    setIsIngesting(true);
    try {
      const res = await fetch('/api/video-ingest/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!res.ok) throw new Error('No se pudo enviar el link al Ingestador de Videos');
      setUrlInput('');
      await loadBackendItems();
    } catch (err: any) {
      setTelegramStatus(err.message || 'Error enviando URL al Ingestador de Videos.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/video-ingest/items/${id}/approve`, { method: 'POST' });
    if (res.ok) await loadBackendItems();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    
    const tempId = Date.now().toString();
    store.addVideoItem({
      id: tempId,
      sourceType: mediaType === 'video' ? 'uploaded_video' : 'web',
      originalUrl: file.name,
      title: `Analizando ${mediaType === 'video' ? 'Video' : 'Imagen'}: ${file.name}`,
      description: 'En proceso...',
      status: 'analyzing',
      category: 'other',
      priority: 'medium',
      tags: [],
      notes: ''
    });

    const formData = new FormData();
    formData.append(mediaType, file);

    try {
      const endpoint = mediaType === 'video' ? '/api/analyze-video' : '/api/analyze-image';
      const res = await fetch(endpoint, { method: 'POST', body: formData });

      if (!res.ok) throw new Error('Error al analizar medio');
      const data = await res.json();

      store.updateVideoItem(tempId, {
        status: 'analyzed',
        title: `Resultado de ${file.name}`,
        description: 'Analisis completado por Gemini/Vertex.',
        summary: data.text,
        analyzedAt: Date.now(),
      });
    } catch (err: any) {
      store.updateVideoItem(tempId, {
        status: 'failed',
        title: `Error en ${file.name}`,
        description: err.message,
      });
    } finally {
      setIsAnalyzing(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getSourceIcon = (type: string) => {
    switch(type) {
      case 'youtube': return <Video size={16} className="text-qh-cyan" />;
      case 'instagram_reel': return <Video size={16} className="text-pink-500" />;
      case 'voice_note': return <Mic size={16} className="text-green-500" />;
      case 'web': return <ImageIcon size={16} className="text-qh-amber" />;
      default: return <Link size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">Catálogo de Herramientas <span className="text-qh-gold">Multimedia</span></h2>
          <p className="text-xs text-slate-500 mt-1">Laboratorio previo a la PWA real: el Ingestador de Videos analiza links, detecta duplicados, aplica scoring y acomoda cada herramienta en la taxonomía.</p>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">Base catálogo: {catalogSupabaseUrl}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={catalogPwaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-qh-gold bg-qh-gold/10 hover:bg-qh-gold/20 px-3 py-1.5 rounded-lg transition-colors border border-qh-gold/20"
          >
            <ExternalLink size={14} /> Abrir PWA Final
          </a>
          <button
            onClick={() => navigate('/skill-advisor')}
            className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-qh-cyan bg-qh-cyan/10 hover:bg-qh-cyan/20 px-3 py-1.5 rounded-lg transition-colors border border-qh-cyan/20"
          >
            <BrainCircuit size={14} /> Consultar Herramientas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-qh-card border border-qh-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-qh-cyan text-xs font-bold uppercase tracking-widest"><BrainCircuit size={14} /> Agente</div>
          <div className="text-sm text-white font-bold mt-2">Ingestador de Videos</div>
          <p className="text-xs text-slate-500 mt-1">Visible en Chat General y QuantumCore.</p>
        </div>
        <div className="bg-qh-card border border-qh-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-qh-gold text-xs font-bold uppercase tracking-widest"><Trophy size={14} /> Puntaje / scoring</div>
          <div className="text-sm text-white font-bold mt-2">Calidad, utilidad, precio</div>
          <p className="text-xs text-slate-500 mt-1">No compara genérico: compara por utilidad.</p>
        </div>
        <div className="bg-qh-card border border-qh-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-widest"><GitCompare size={14} /> Duplicados</div>
          <div className="text-sm text-white font-bold mt-2">Nombre, dominio, alias</div>
          <p className="text-xs text-slate-500 mt-1">Si se repite, enriquece la ficha existente.</p>
        </div>
        <div className="bg-qh-card border border-qh-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-widest"><Layers size={14} /> Taxonomía</div>
          <div className="text-sm text-white font-bold mt-2">División y subdivisión</div>
          <p className="text-xs text-slate-500 mt-1">La PWA muestra lo limpio y publicable.</p>
        </div>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-lg p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-qh-cyan">Loop de Ingesta al Catálogo</h3>
            <p className="text-xs text-slate-500 mt-1">Pegá un Reel, YouTube, TikTok, post o web de herramienta. El agente decide estado: publicable, duplicada, dudosa o descartada.</p>
          </div>
          <button onClick={loadBackendItems} className="glass-button text-xs flex items-center gap-2">
            <RefreshCw size={13} /> Refrescar
          </button>
        </div>
        <div className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-3">{telegramStatus}</div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Pegar URL de herramienta, Reel, YouTube, TikTok, post o recurso..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-qh-cyan"
          />
          <button onClick={handleManualIngest} disabled={!urlInput.trim() || isIngesting} className="glass-button text-xs flex items-center gap-2 disabled:opacity-50">
            {isIngesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar al Ingestador de Videos
          </button>
        </div>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
          <button className={cn("px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all", mediaType === 'video' ? "bg-qh-gold/20 text-qh-gold" : "text-slate-500 hover:text-slate-300")} onClick={() => setMediaType('video')}>Video</button>
          <button className={cn("px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all", mediaType === 'image' ? "bg-qh-gold/20 text-qh-gold" : "text-slate-500 hover:text-slate-300")} onClick={() => setMediaType('image')}>Imagen</button>
        </div>
        <input type="file" accept={mediaType === 'video' ? "video/*" : "image/*"} ref={fileInputRef} onChange={handleFileChange} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-slate-800 file:text-qh-gold hover:file:bg-slate-700 cursor-pointer" />
        <button className="glass-button ml-auto disabled:opacity-50" onClick={handleAnalyze} disabled={!file || isAnalyzing}>
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
          <span className="text-qh-gold">{isAnalyzing ? 'Analizando...' : 'Analizar con Gemini'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {backendItems.map(item => (
          <div key={item.id} className="bg-qh-card border border-qh-border p-5 flex flex-col gap-3 border-l-2 border-l-qh-cyan rounded-lg shadow-md">
            <div className="flex justify-between gap-3 items-start">
              <div className="flex items-center gap-3 min-w-0">
                {getSourceIcon(item.sourceType)}
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider truncate">Ingesta al Catálogo</h3>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-1 flex gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-qh-cyan border border-qh-cyan/20">{formatCatalogStatus(item.catalog?.status || item.status)}</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">{item.sourceType}</span>
                  </div>
                </div>
              </div>
              {(item.catalog?.status === 'dudosa' || item.status === 'pending_review') && (
                <button onClick={() => handleApprove(item.id)} className="glass-button text-xs flex items-center gap-2 text-emerald-300 border-emerald-400/30">
                  <Trophy size={13} /> Marcar publicable
                </button>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-500 break-all">{safeDisplayUrl(item.displayUrl || item.originalUrl)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
              <span className="bg-slate-900 border border-slate-800 rounded px-2 py-1">scoring: {item.catalog ? `${item.catalog.score.promedio}/10 · confianza ${item.catalog.score.confianza}%` : 'pendiente'}</span>
              <span className="bg-slate-900 border border-slate-800 rounded px-2 py-1">duplicados: {item.catalog?.status === 'duplicada' ? 'enriquecer ficha existente' : 'sin coincidencia inicial'}</span>
              <span className="bg-slate-900 border border-slate-800 rounded px-2 py-1">taxonomía: {item.catalog ? `${item.catalog.taxonomia.division} > ${item.catalog.taxonomia.subdivision}` : 'por clasificar'}</span>
            </div>
          </div>
        ))}

        {store.videoInboxItems.map(item => (
          <div key={item.id} className="bg-qh-card border border-qh-border p-5 flex flex-col gap-4 border-l-2 border-l-qh-gold rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {getSourceIcon(item.sourceType)}
                <div>
                  <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">{item.title}</h3>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-1 flex gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-qh-gold border border-qh-gold/20">{tStatus(item.status)}</span>
                    {item.analyzedAt && <span className="bg-slate-800 px-2 py-0.5 rounded">{new Date(item.analyzedAt).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">{item.description}</p>
            {item.originalUrl && <div className="text-[10px] font-mono text-slate-500 break-all">{item.originalUrl}</div>}
            {item.status === 'analyzing' && <div className="text-qh-gold text-xs uppercase tracking-widest font-bold animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Procesando en Gemini...</div>}
            {item.status === 'analyzed' && (
              <div className="bg-slate-900/80 p-4 rounded text-xs space-y-2 border border-slate-700">
                <div className="whitespace-pre-wrap font-mono text-slate-300 leading-relaxed"><strong className="text-qh-gold uppercase tracking-widest block mb-2 text-[10px]">Análisis Gemini:</strong> {item.summary}</div>
              </div>
            )}
          </div>
        ))}

        {backendItems.length === 0 && store.videoInboxItems.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-xs uppercase tracking-widest border border-dashed border-slate-700 rounded-lg">
            Sin herramientas en análisis. Pegá un link para activar el loop del Ingestador de Videos.
          </div>
        )}
      </div>
    </div>
  );
}
