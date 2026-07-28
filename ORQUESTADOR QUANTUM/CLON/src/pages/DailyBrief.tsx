import { useStore } from '../store/useStore';
import { DatabaseZap, Newspaper, Calendar, AlertTriangle, FileText, BrainCircuit, Share2, GitMerge, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function DailyBrief() {
  const store = useStore();

  const handleGenerateMock = () => {
    alert("Generando Resumen Diario mock (sintetizado por Gemini/Vertex)...");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Newspaper className="text-qh-cyan" size={28} /> Resumen Diario
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Resumen del estado, bloqueos y próximas acciones</p>
        </div>
        <button 
          onClick={handleGenerateMock}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-qh-gold/10 text-qh-gold border border-qh-gold/30 hover:bg-qh-gold/20 transition-colors"
        >
          <FileText size={14} /> Generar Brief Mock
        </button>
      </div>

      <div className="bg-qh-card border border-qh-border rounded-xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.5)] max-w-4xl mx-auto space-y-8">
        
        <div className="text-center pb-8 border-b border-qh-border">
           <h3 className="text-3xl font-display font-bold text-slate-100 mb-2">Morning Briefing</h3>
           <div className="text-sm text-qh-gold font-mono uppercase tracking-widest">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <div className="space-y-4">
           <h4 className="text-qh-cyan text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <Calendar size={14} /> Resumen General
           </h4>
           <p className="text-slate-300 leading-relaxed text-sm">
              Actualmente hay {store.projects.filter(p => p.status === 'active').length} proyectos activos y {store.tasks.filter(t => t.status === 'todo').length} tareas pendientes. 
              El equipo de agentes reporta estabilidad, pero hay {store.tasks.filter(t => t.status === 'blocked').length} elementos bloqueados que requieren tu atención.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-qh-border/50">
           <div className="space-y-4">
             <h4 className="text-red-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                <AlertTriangle size={14} /> Atención Requerida (Bloqueos)
             </h4>
             {store.tasks.filter(t => t.status === 'blocked').length > 0 ? (
               <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
                  {store.tasks.filter(t => t.status === 'blocked').map(t => (
                     <li key={t.id}>{t.title}</li>
                  ))}
               </ul>
             ) : (
               <div className="text-slate-500 text-sm italic">Sin bloqueos reportados.</div>
             )}
           </div>
           <div className="space-y-4 mt-8">
             <h4 className="text-qh-cyan text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                <BrainCircuit size={14} /> Skill Advisor Insights
             </h4>
             <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
               <li>Hay 2 skills recomendadas para resolver tus tareas bloqueadas (ej: systematic-debugging).</li>
               <li>Descubrimos 1 nueva skill disponible en tu catálogo local (watch).</li>
               <li>Sugerencia: Crea un workflow para "Diseño Visual" con las skills que más usas.</li>
             </ul>
           </div>
           
           <div className="space-y-4 mt-8">
             <h4 className="text-qh-cyan text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                <Share2 size={14} /> Knowledge Graph Insights
             </h4>
             <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
               <li>El módulo <strong>Shared Memory</strong> es el nodo más central de tu arquitectura actual.</li>
               <li>Detectamos alta actividad reciente en el clúster de "Agentes".</li>
               <li>Última query al grafo: <em>"¿Cómo se conecta Vertex AI Provider al Event Bus?"</em></li>
             </ul>
           </div>


           <div className="space-y-4">
             <h4 className="text-qh-emerald text-xs uppercase tracking-widest font-bold">
                Próximas Acciones Prioritarias
             </h4>
             <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
                {store.tasks.filter(t => t.priority === 'critical' || t.priority === 'high').slice(0, 3).map(t => (
                   <li key={t.id}>{t.title}</li>
                ))}
             </ul>
           </div>
        </div>

        <div className="pt-4 border-t border-qh-border/50 space-y-4">
           <h4 className="text-slate-400 text-xs uppercase tracking-widest font-bold">
              Videos & Contexto Pendiente
           </h4>
           <div className="text-sm text-slate-300">
             Tienes {store.videoInboxItems.filter(v => v.status === 'inbox' || v.status === 'queued').length} videos esperando análisis en el Inbox.
             Hay {store.syncedEmails.length} emails importantes sincronizados de tu Workspace.
           </div>
        </div>

        <div className="pt-4 border-t border-qh-border/50 space-y-4">
           <h4 className="text-qh-amber text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <DatabaseZap size={14} /> Estado de Bases de Datos
           </h4>
           <div className="text-sm text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
             <ul className="list-disc pl-4 space-y-1">
               <li>DBs Activas/Simuladas: {store.databaseConnections?.filter(db => db.status === 'activa' || db.status === 'simulada').length || 0}</li>
               <li>Pendientes de secreto: {store.databaseConnections?.filter(db => db.status === 'requiere_secret').length || 0}</li>
               <li>Asociadas a proyectos: {store.databaseConnections?.filter(db => db.relatedProjectIds?.length > 0).length || 0}</li>
               <li>Requieren integración real: {store.databaseConnections?.filter(db => db.status === 'requiere_backend' || db.status === 'requiere_secret' || db.status === 'futuro').length || 0}</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
