import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Video, Youtube, Link, Mic, FileText, CheckCircle, BrainCircuit, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { VideoSourceType, VideoCategory } from '../types';
import { cn, tStatus } from '../lib/utils';

export function VideoInbox() {
  const store = useStore();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    
    // Create a temporary item
    const tempId = Date.now().toString();
    store.addVideoItem({
      id: tempId,
      sourceType: mediaType === 'video' ? 'youtube' : 'web', // mapping for icons
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
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al analizar medio');
      const data = await res.json();

      store.updateVideoItem(tempId, {
        status: 'analyzed',
        title: `Resultado de ${file.name}`,
        description: 'Análisis completado (gemini-3.1-pro-preview).',
        summary: data.text,
        analyzedAt: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      store.updateVideoItem(tempId, {
        status: 'inbox',
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
          <h2 className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">Media Intelligence <span className="text-qh-gold">Inbox</span></h2>
        </div>
        <button 
          onClick={() => navigate('/skill-advisor')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-qh-cyan bg-qh-cyan/10 hover:bg-qh-cyan/20 px-3 py-1.5 rounded-lg transition-colors border border-qh-cyan/20"
        >
          <BrainCircuit size={14} /> Recomendador de Herramientas
        </button>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
           <button 
             className={cn("px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all", mediaType === 'video' ? "bg-qh-gold/20 text-qh-gold" : "text-slate-500 hover:text-slate-300")}
             onClick={() => setMediaType('video')}
           >
             Video
           </button>
           <button 
             className={cn("px-4 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-all", mediaType === 'image' ? "bg-qh-gold/20 text-qh-gold" : "text-slate-500 hover:text-slate-300")}
             onClick={() => setMediaType('image')}
           >
             Image
           </button>
        </div>
        
        <input 
          type="file" 
          accept={mediaType === 'video' ? "video/*" : "image/*"}
          ref={fileInputRef}
          onChange={handleFileChange}
          className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-slate-800 file:text-qh-gold hover:file:bg-slate-700 cursor-pointer"
        />
        
        <button 
          className="glass-button ml-auto disabled:opacity-50" 
          onClick={handleAnalyze} 
          disabled={!file || isAnalyzing}
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
          <span className="text-qh-gold">{isAnalyzing ? 'Analyzing...' : 'Analyze (Gemini Pro)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
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

            {item.status === 'analyzing' && <div className="text-qh-gold text-xs uppercase tracking-widest font-bold animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Procesando en Gemini 3.1 Pro...</div>}

            {item.status === 'analyzed' && (
              <div className="bg-slate-900/80 p-4 rounded text-xs space-y-2 border border-slate-700">
                <div className="whitespace-pre-wrap font-mono text-slate-300 leading-relaxed"><strong className="text-qh-gold uppercase tracking-widest block mb-2 text-[10px]">Gemini Analysis:</strong> {item.summary}</div>
              </div>
            )}
          </div>
        ))}
        {store.videoInboxItems.length === 0 && (
           <div className="text-center py-10 text-slate-600 text-xs uppercase tracking-widest border border-dashed border-slate-700 rounded-lg">
              No media items analyzed yet. Upload a video or image.
           </div>
        )}
      </div>
    </div>
  );
}
