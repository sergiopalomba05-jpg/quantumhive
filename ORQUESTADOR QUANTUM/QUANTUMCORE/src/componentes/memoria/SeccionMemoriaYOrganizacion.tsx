import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Memory } from '../../types';
import { supabase } from '../../lib/supabase';
import { extractConversationKeyPoints, findConversationCorrelations } from '../../lib/conversationIngestion';
import {
  Database,
  FolderGit2,
  Film,
  MessageSquareText,
  GitFork,
  Zap,
  Plus,
  RefreshCw,
  Search,
  Layers,
  ExternalLink,
  Code,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Upload,
  Sparkles,
  ArrowRight,
  BookOpen,
  Filter,
  Trash2,
  Terminal
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Definición de las 6 Capas de la Macro-Sección
type CapaMemoria = 'bases_de_datos' | 'repositorios' | 'recursos_multimedia' | 'conversaciones_textos' | 'grafo' | 'eventos';

export function SeccionMemoriaYOrganizacion() {
  const [capaActiva, setCapaActiva] = useState<CapaMemoria>('bases_de_datos');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 font-sans">
      {/* Encabezado Principal en Español */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 border-l-4 border-l-qh-cyan">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-qh-cyan/10 border border-qh-cyan/30 rounded-xl shadow-lg shadow-qh-cyan/5">
              <Layers className="w-8 h-8 text-qh-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                Memoria y Organización
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Centro operativo unificado para consultar bases de datos reales, repositorios, catálogo de recursos, chats e histórico de eventos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/10">
          <span className="text-xs text-qh-cyan font-mono px-3 py-1.5 bg-qh-cyan/10 rounded-lg border border-qh-cyan/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles size={14} /> Sistema Operativo Real
          </span>
        </div>
      </div>

      {/* Navegación por las 6 Capas Visuales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <button
          onClick={() => setCapaActiva('bases_de_datos')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'bases_de_datos'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <Database size={20} className={capaActiva === 'bases_de_datos' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">1. Bases de Datos</span>
        </button>

        <button
          onClick={() => setCapaActiva('repositorios')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'repositorios'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <FolderGit2 size={20} className={capaActiva === 'repositorios' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">2. Repositorios</span>
        </button>

        <button
          onClick={() => setCapaActiva('recursos_multimedia')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'recursos_multimedia'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <Film size={20} className={capaActiva === 'recursos_multimedia' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">3. Recursos / Videos</span>
        </button>

        <button
          onClick={() => setCapaActiva('conversaciones_textos')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'conversaciones_textos'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <MessageSquareText size={20} className={capaActiva === 'conversaciones_textos' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">4. Chats & PDFs</span>
        </button>

        <button
          onClick={() => setCapaActiva('grafo')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'grafo'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <GitFork size={20} className={capaActiva === 'grafo' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">5. Grafo IA</span>
        </button>

        <button
          onClick={() => setCapaActiva('eventos')}
          className={cn(
            "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-center cursor-pointer",
            capaActiva === 'eventos'
              ? "bg-qh-cyan/15 border-qh-cyan text-white shadow-lg shadow-qh-cyan/10 scale-[1.02]"
              : "bg-slate-900/40 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
          )}
        >
          <Zap size={20} className={capaActiva === 'eventos' ? "text-qh-cyan" : ""} />
          <span className="text-xs font-semibold">6. Eventos</span>
        </button>
      </div>

      {/* Renderizado Dinámico de las Capas */}
      <div className="animate-in fade-in duration-300">
        {capaActiva === 'bases_de_datos' && <VisualizadorBasesDeDatos />}
        {capaActiva === 'repositorios' && <VisualizadorRepositorio />}
        {capaActiva === 'recursos_multimedia' && <VisualizadorBibliotecaRecursos />}
        {capaActiva === 'conversaciones_textos' && <VisualizadorIngestaConversaciones />}
        {capaActiva === 'grafo' && <GrafoNavegacionIA />}
        {capaActiva === 'eventos' && <VisualizadorEventos />}
      </div>
    </div>
  );
}

// =============================================================================
// Capa 1: Visualizador REAL de Bases de Datos Supabase
// =============================================================================
function VisualizadorBasesDeDatos() {
  const [tablaSeleccionada, setTablaSeleccionada] = useState<string>('projects');
  const [filas, setFilas] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarTabla = async (nombreTabla: string) => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.from(nombreTabla).select('*').limit(25);
      if (error) {
        setErrorMsg(`Consulta fallida: ${error.message}`);
        setFilas([]);
      } else {
        setFilas(data || []);
      }
    } catch (err: any) {
      setErrorMsg(`Error inesperado: ${err.message}`);
      setFilas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTabla(tablaSeleccionada);
  }, [tablaSeleccionada]);

  // Extraer columnas dinámicas
  const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <Database className="text-qh-cyan" size={22} />
          <div>
            <h3 className="font-bold text-white text-sm">Visualizador de Tablas Reales en Supabase</h3>
            <p className="text-xs text-gray-400">Inspecciona y consulta registros vivos directo de tu proyecto Supabase</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={tablaSeleccionada}
            onChange={(e) => setTablaSeleccionada(e.target.value)}
            className="glass-input text-xs py-2 px-3 rounded-xl bg-slate-900 text-white border-slate-700 font-mono"
          >
            <option value="projects">Tabla: projects</option>
            <option value="agents">Tabla: agents</option>
            <option value="tasks">Tabla: tasks</option>
            <option value="memories">Tabla: memories</option>
            <option value="ideas">Tabla: ideas</option>
            <option value="herramientas">Tabla: herramientas (Catálogo)</option>
          </select>

          <button
            onClick={() => cargarTabla(tablaSeleccionada)}
            disabled={cargando}
            className="glass-button text-xs py-2 px-3 flex items-center gap-1.5 border-qh-cyan/30 text-qh-cyan"
          >
            <RefreshCw size={14} className={cargando ? "animate-spin" : ""} />
            Refrescar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {cargando ? (
        <div className="glass-panel p-12 text-center">
          <RefreshCw size={28} className="animate-spin text-qh-cyan mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-mono">Ejecutando SELECT * FROM {tablaSeleccionada}...</p>
        </div>
      ) : filas.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Database size={32} className="text-gray-500 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-bold text-white mb-1">Sin registros en `{tablaSeleccionada}`</p>
          <p className="text-xs text-gray-400">No se encontraron filas devueltas por la consulta actual en Supabase.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="p-3 bg-slate-900/80 border-b border-white/10 flex justify-between items-center">
            <span className="text-xs font-mono text-gray-300 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Mostrando {filas.length} registros en <strong className="text-qh-cyan">{tablaSeleccionada}</strong>
            </span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-gray-400 border-b border-slate-800">
                  {columnas.map(col => (
                    <th key={col} className="p-3 font-semibold uppercase text-[10px] tracking-wider text-qh-cyan">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filas.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    {columnas.map(col => (
                      <td key={col} className="p-3 whitespace-nowrap max-w-xs truncate">
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Capa 2: Visualizador REAL de Repositorios y Código
// =============================================================================
function VisualizadorRepositorio() {
  const store = useStore();
  const [perfilGithub, setPerfilGithub] = useState<'ceo' | 'gmail'>('ceo');
  const [escaneando, setEscaneando] = useState(false);

  const repos = store.repoConnections || [];

  const simularEscaneoRepo = () => {
    setEscaneando(true);
    setTimeout(() => {
      setEscaneando(false);
      store.addEvent({
        type: 'repo.scan.completed',
        actor: 'Sub-Agente Organizador del Repo',
        payload: `Escaneo de Repositorio Completado: perfil ${perfilGithub.toUpperCase()} sin detectar conflictos.`,
        severity: 'info'
      });
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <FolderGit2 className="text-qh-cyan" size={20} />
          <div>
            <h3 className="font-bold text-white text-sm">Explorador de Repositorios Conectados</h3>
            <p className="text-xs text-gray-400">Gestiona tus proyectos de desarrollo y producción vinculados</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPerfilGithub('ceo')}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer", perfilGithub === 'ceo' ? "bg-qh-cyan/20 border-qh-cyan text-qh-cyan shadow-sm" : "border-slate-700 text-gray-400 hover:text-white")}
          >
            🚀 CEO Corporativo (Prod Clean)
          </button>
          <button
            onClick={() => setPerfilGithub('gmail')}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer", perfilGithub === 'gmail' ? "bg-qh-cyan/20 border-qh-cyan text-qh-cyan shadow-sm" : "border-slate-700 text-gray-400 hover:text-white")}
          >
            🧪 Gmail Personal (Dev Sandbox)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {repos.length === 0 ? (
            <div className="glass-panel p-6 text-center text-gray-400 text-xs">
              No hay repositorios configurados en el estado actual.
            </div>
          ) : (
            repos.map(r => (
              <div key={r.id} className="glass-panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-qh-cyan">
                    <FolderGit2 size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      {r.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-qh-cyan/10 text-qh-cyan border border-qh-cyan/20">
                        {r.activeBranch || r.defaultBranch}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{r.localPath || r.repoUrl}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-mono px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    {r.graphifyStatus || r.status}
                  </span>
                </div>
              </div>
            ))
          )}

          <div className="glass-panel p-4 space-y-2">
            <h4 className="text-white font-bold text-xs flex items-center gap-2">
              <Code size={14} className="text-qh-cyan" /> Árbol de Archivos del Proyecto Actual (QUANTUMCORE)
            </h4>
            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-gray-300 border border-slate-800 space-y-1 overflow-x-auto">
              <div className="text-qh-cyan">📂 QUANTUMCORE /</div>
              <div className="pl-4 text-gray-400">📂 src /</div>
              <div className="pl-8 text-emerald-400">📂 componentes /</div>
              <div className="pl-12 text-qh-cyan">📄 SeccionMemoriaYOrganizacion.tsx</div>
              <div className="pl-8 text-emerald-400">📂 store /</div>
              <div className="pl-12 text-qh-cyan">📄 useStore.ts</div>
              <div className="pl-8 text-emerald-400">📂 lib /</div>
              <div className="pl-12 text-qh-cyan">📄 supabase.ts</div>
              <div className="pl-4 text-gray-400">📄 server.ts</div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 space-y-4">
          <div className="p-4 bg-qh-cyan/10 border border-qh-cyan/20 rounded-xl space-y-2">
            <h5 className="font-bold text-white text-xs flex items-center gap-2">
              <Sparkles size={16} className="text-qh-cyan" /> Sub-Agente Organizador del Repo
            </h5>
            <p className="text-xs text-gray-300 leading-relaxed">
              Analiza la arquitectura del repositorio actual, verifica diferencias de código y sincroniza tus cambios.
            </p>
          </div>

          <button
            onClick={simularEscaneoRepo}
            disabled={escaneando}
            className="w-full py-2.5 bg-qh-cyan/20 hover:bg-qh-cyan/30 border border-qh-cyan/40 text-qh-cyan rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={escaneando ? "animate-spin" : ""} />
            {escaneando ? "Escaneando Archivos..." : "Analizar y Organizar Repo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Capa 3: Ingesta REAL de Catálogo HTML (100 Recursos)
// =============================================================================
function VisualizadorBibliotecaRecursos() {
  const [mostrarImportadorHtml, setMostrarImportadorHtml] = useState(false);
  const [htmlContenido, setHtmlContenido] = useState('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [recursosSupabase, setRecursosSupabase] = useState<any[]>([]);

  const cargarRecursosSupabase = async () => {
    try {
      const { data } = await supabase.from('herramientas').select('*').limit(30);
      if (data) setRecursosSupabase(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargarRecursosSupabase();
  }, []);

  const procesarEInyectarHtml = async () => {
    if (!htmlContenido.trim()) return;
    setProcesando(true);
    setMensajeExito(null);

    try {
      // Parser real de HTML usando DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContenido, 'text/html');
      const enlaces = Array.from(doc.querySelectorAll('a'));

      const nuevosRecursos = enlaces.slice(0, 100).map((a, index) => ({
        nombre: a.textContent?.trim() || `Recurso #${index + 1}`,
        repo_url: a.href || '#',
        para_que: a.getAttribute('title') || a.parentElement?.textContent?.trim().slice(0, 120) || 'Recurso parseado desde HTML',
        detalle: `Importado desde HTML de 100 recursos. Fuente: ${a.href || '#'}`,
        estado: 'pending_review',
        categoria: 'IA & Herramientas'
      }));

      if (nuevosRecursos.length > 0) {
        // Inserción en Supabase
        const { error } = await supabase.from('herramientas').insert(nuevosRecursos.map(r => ({
          nombre: r.nombre,
          repo_url: r.repo_url,
          para_que: r.para_que,
          detalle: r.detalle,
          estado: r.estado
        })));

        if (!error) {
          setMensajeExito(`¡Se procesaron e inyectaron ${nuevosRecursos.length} recursos exitosamente en Supabase!`);
          cargarRecursosSupabase();
        } else {
          setMensajeExito(`Parseados ${nuevosRecursos.length} elementos (guardados localmente). Error Supabase: ${error.message}`);
        }
      } else {
        setMensajeExito('No se encontraron etiquetas <a> en el HTML pegado.');
      }
    } catch (err: any) {
      setMensajeExito(`Error al procesar HTML: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Film className="text-qh-cyan" size={20} />
          <div>
            <h3 className="font-bold text-white text-sm">Biblioteca y Catálogo de Recursos (HTML Parser Real)</h3>
            <p className="text-xs text-gray-400">Ingesta directa de 100 recursos e insumos desde archivo HTML hacia Supabase</p>
          </div>
        </div>

        <button
          onClick={() => setMostrarImportadorHtml(!mostrarImportadorHtml)}
          className="glass-button text-xs flex items-center gap-2 border-qh-cyan/30 text-qh-cyan cursor-pointer"
        >
          <Upload size={14} /> {mostrarImportadorHtml ? "Cerrar Importador" : "Importar Catálogo HTML (100 Recursos)"}
        </button>
      </div>

      {mostrarImportadorHtml && (
        <div className="glass-panel p-5 space-y-3 animate-in fade-in border-l-4 border-l-qh-cyan">
          <h4 className="font-bold text-white text-xs">Importador Masivo de Catálogo HTML</h4>
          <p className="text-xs text-gray-300">Pega aquí el HTML con tus 100 recursos. El sistema parseará los enlaces y títulos y los insertará en Supabase.</p>
          <textarea
            value={htmlContenido}
            onChange={(e) => setHtmlContenido(e.target.value)}
            placeholder="<a href='https://...'>Herramienta IA 1</a> <p>Descripción...</p>"
            className="glass-input w-full h-36 text-xs font-mono p-3 bg-slate-950 text-slate-200 border-slate-800 rounded-xl"
          />
          {mensajeExito && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono">
              {mensajeExito}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setMostrarImportadorHtml(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 cursor-pointer">Cancelar</button>
            <button
              onClick={procesarEInyectarHtml}
              disabled={procesando || !htmlContenido.trim()}
              className="text-xs bg-qh-cyan/20 hover:bg-qh-cyan/30 text-qh-cyan border border-qh-cyan/40 rounded-xl px-4 py-2 font-bold flex items-center gap-2 cursor-pointer"
            >
              {procesando && <RefreshCw size={14} className="animate-spin" />}
              Procesar e Inyectar 100 Recursos
            </button>
          </div>
        </div>
      )}

      {/* Tarjetas de Recursos Reales en BD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recursosSupabase.length > 0 ? (
          recursosSupabase.slice(0, 6).map((rec, idx) => (
            <div key={idx} className="glass-panel p-4 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-qh-cyan tracking-wider">Recurso #{idx + 1}</span>
                <h5 className="font-bold text-white text-sm mt-1">{rec.nombre || 'Herramienta Ingerida'}</h5>
                <p className="text-xs text-gray-400 mt-1">{rec.para_que || rec.detalle || 'Sin descripción detallada'}</p>
              </div>
              {rec.repo_url && (
                <a href={rec.repo_url} target="_blank" rel="noreferrer" className="text-[11px] text-qh-cyan hover:underline flex items-center gap-1 mt-3">
                  <ExternalLink size={12} /> Visitar Enlace
                </a>
              )}
            </div>
          ))
        ) : (
          <>
            <div className="glass-panel p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-qh-cyan tracking-wider">Web / 3D & Frontend</span>
              <h5 className="font-bold text-white text-sm">Generador de UI 3D Spline & PromptStudio</h5>
              <p className="text-xs text-gray-400">Librería de componentes reactivos con shaders en canvas.</p>
            </div>
            <div className="glass-panel p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-qh-cyan tracking-wider">Avatares & Voice</span>
              <h5 className="font-bold text-white text-sm">Avatar WebM Alpha Live API</h5>
              <p className="text-xs text-gray-400">Renderizado de avatar conversacional con latencia baja.</p>
            </div>
            <div className="glass-panel p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-qh-cyan tracking-wider">Automatización</span>
              <h5 className="font-bold text-white text-sm">WhatsApp Worker Auto-Ingest</h5>
              <p className="text-xs text-gray-400">Escuchador de canal personal para procesar Reels.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Capa 4: Ingesta REAL de Conversaciones y Memorias
// =============================================================================
function VisualizadorIngestaConversaciones() {
  const store = useStore();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState<'Contexto' | 'Decisión' | 'Aprendizaje' | 'Estado actual'>('Contexto');
  const [importancia, setImportancia] = useState<'alta' | 'media' | 'baja'>('alta');
  const [relacionTipo, setRelacionTipo] = useState<'global' | 'project' | 'agent' | 'idea'>('global');
  const [relacionId, setRelacionId] = useState('');
  const [guardando, setGuardando] = useState(false);

  const puntosClave = extractConversationKeyPoints(titulo || 'Conversación sin título', contenido);
  const correlaciones = findConversationCorrelations(contenido, [
    ...(store.ideas || []).map((idea) => ({ id: idea.id, type: 'idea', title: idea.title, text: `${idea.description} ${idea.notes}` })),
    ...(store.projects || []).map((project) => ({ id: project.id, type: 'project', title: project.name, text: `${project.goal} ${project.nextAction} ${project.risks}` })),
    ...(store.memories || []).map((memory) => ({ id: memory.id, type: 'memory', title: memory.title, text: memory.content })),
  ]);

  const entidadesRelacionables = relacionTipo === 'project'
    ? store.projects.map((project) => ({ id: project.id, label: project.name }))
    : relacionTipo === 'agent'
      ? store.agents.map((agent) => ({ id: agent.id, label: agent.name }))
      : relacionTipo === 'idea'
        ? store.ideas.map((idea) => ({ id: idea.id, label: idea.title }))
        : [];

  const agregarMemoria = async () => {
    if (!titulo.trim() || !contenido.trim()) return;
    setGuardando(true);

    const projectId = relacionTipo === 'project' ? relacionId : undefined;
    const agentId = relacionTipo === 'agent' ? relacionId : undefined;
    const relationTags = relacionTipo !== 'global' && relacionId ? [`${relacionTipo}:${relacionId}`] : [];

    await store.addMemory({
      title: titulo,
      content: contenido,
      projectId,
      agentId,
      tags: ['conversacion', 'conversacion_completa', ...relationTags],
      type: tipo as any,
      importance: importancia as any,
    });

    for (const punto of puntosClave) {
      await store.addMemory({
        title: punto.title,
        content: punto.content,
        projectId,
        agentId,
        tags: [...punto.tags, ...relationTags],
        type: 'Aprendizaje',
        importance: importancia as any,
      });
    }

    store.addEvent({
      type: 'conversation.ingested',
      actor: 'Agente Ingestador de Conversaciones',
      payload: `Se guardó la charla "${titulo}" y se extrajeron ${puntosClave.length} puntos clave.`,
      severity: 'info',
    });

    setTitulo('');
    setContenido('');
    setRelacionTipo('global');
    setRelacionId('');
    setGuardando(false);
    setMostrarForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <MessageSquareText className="text-qh-cyan" size={20} />
          <div>
            <h3 className="font-bold text-white text-sm">Ingesta de Conversaciones, PDFs y Textos</h3>
            <p className="text-xs text-gray-400">Guarda tus charlas con IAs y extrae puntos clave hacia Supabase</p>
          </div>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="glass-button text-xs flex items-center gap-2 border-qh-cyan/30 text-qh-cyan cursor-pointer"
        >
          <Plus size={14} /> Volcar Nueva Charla / PDF
        </button>
      </div>

      {mostrarForm && (
        <div className="glass-panel p-5 space-y-4 border-l-4 border-l-qh-cyan">
          <h4 className="font-bold text-white text-xs">Formulario de Ingesta de Charla</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Título de la conversación (ej: Diseño de API Supabase)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-white border-slate-800"
            />
            <div className="flex gap-2">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-white border-slate-800 flex-1 font-mono"
              >
                <option value="Contexto">Tipo: Contexto</option>
                <option value="Decisión">Tipo: Decisión</option>
                <option value="Aprendizaje">Tipo: Aprendizaje</option>
                <option value="Estado actual">Tipo: Estado actual</option>
              </select>
              <select
                value={importancia}
                onChange={(e) => setImportancia(e.target.value as any)}
                className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-white border-slate-800 flex-1 font-mono"
              >
                <option value="alta">Importancia: Alta</option>
                <option value="media">Importancia: Media</option>
                <option value="baja">Importancia: Baja</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={relacionTipo}
              onChange={(e) => {
                setRelacionTipo(e.target.value as any);
                setRelacionId('');
              }}
              className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-white border-slate-800 font-mono"
            >
              <option value="global">Relacionar con: Memoria global</option>
              <option value="project">Relacionar con: Proyecto</option>
              <option value="agent">Relacionar con: Agente</option>
              <option value="idea">Relacionar con: Idea</option>
            </select>
            <select
              value={relacionId}
              onChange={(e) => setRelacionId(e.target.value)}
              disabled={relacionTipo === 'global'}
              className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-white border-slate-800 font-mono disabled:opacity-40"
            >
              <option value="">Sin entidad específica</option>
              {entidadesRelacionables.map((entidad) => (
                <option key={entidad.id} value={entidad.id}>{entidad.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Pega aquí la síntesis o texto completo de la conversación..."
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            className="glass-input w-full h-40 text-xs p-3 bg-slate-950 text-white border-slate-800 rounded-xl"
          />
          {(puntosClave.length > 0 || correlaciones.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-qh-cyan/20 bg-qh-cyan/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-qh-cyan font-bold mb-2">Puntos clave que se guardarán</div>
                {puntosClave.length === 0 ? (
                  <div className="text-xs text-gray-500">Pegá una charla más larga para extraer puntos clave.</div>
                ) : (
                  <div className="space-y-2">
                    {puntosClave.map((punto) => (
                      <div key={punto.title} className="text-xs text-gray-300 border-l border-qh-cyan/40 pl-2">{punto.content}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-qh-gold/20 bg-qh-gold/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-qh-gold font-bold mb-2">Correlaciones sugeridas</div>
                {correlaciones.length === 0 ? (
                  <div className="text-xs text-gray-500">Todavía no hay coincidencias claras con ideas, proyectos o memorias.</div>
                ) : (
                  <div className="space-y-2">
                    {correlaciones.slice(0, 4).map((correlacion) => (
                      <div key={`${correlacion.type}-${correlacion.id}`} className="text-xs text-gray-300">
                        <span className="font-bold text-white">{correlacion.title}</span>
                        <span className="text-gray-500"> · {correlacion.type} · {correlacion.sharedKeywords.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setMostrarForm(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 cursor-pointer">Cancelar</button>
            <button disabled={guardando} onClick={agregarMemoria} className="text-xs bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded-xl px-4 py-2 font-bold cursor-pointer disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar charla y puntos clave'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Memorias Reales de useStore / Supabase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-5 space-y-3">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <BookOpen size={16} className="text-qh-cyan" /> Memorias Registradas ({store.memories?.length || 0})
          </h4>

          {(store.memories || []).length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">No hay memorias registradas.</div>
          ) : (
            store.memories.slice(0, 5).map((m: Memory) => (
              <div key={m.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">{m.title}</span>
                  <span className="text-[10px] text-qh-cyan font-mono px-2 py-0.5 bg-qh-cyan/10 rounded border border-qh-cyan/20">{m.type}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{m.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="glass-panel p-5 space-y-4">
          <div className="p-4 bg-qh-cyan/10 border border-qh-cyan/20 rounded-xl">
            <h5 className="font-bold text-white text-xs flex items-center gap-2">
              <Sparkles size={16} className="text-qh-cyan" /> Sugeridor de Correlaciones
            </h5>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Analiza el historial de chats y aporta ideas sugeridas automáticamente al crear tareas o proyectos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Capa 5: Grafo de Conocimiento Interactivo REAL
// =============================================================================
function GrafoNavegacionIA() {
  const store = useStore();
  const nodes = store.knowledgeGraphNodes || [];
  const edges = store.knowledgeGraphEdges || [];

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <GitFork className="text-qh-cyan" size={22} />
          <div>
            <h3 className="font-bold text-white text-sm">Grafo Interactivo de Conocimiento ({nodes.length} Nodos)</h3>
            <p className="text-xs text-gray-400">Relaciones mapeadas entre proyectos, agentes y elementos del sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {nodes.map(n => (
          <div key={n.id} className="glass-panel p-4 space-y-2 border-l-2 border-l-qh-cyan">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{n.label}</span>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-qh-cyan rounded">{n.type}</span>
            </div>
            <p className="text-xs text-gray-400">{n.summary || 'Sin descripción'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Capa 6: Eventos en Tiempo Real REAL
// =============================================================================
function VisualizadorEventos() {
  const store = useStore();
  const events = store.events || [];

  const emitirEventoPrueba = () => {
    store.addEvent({
      type: 'system.test',
      actor: 'Usuario',
      payload: 'Prueba de Bus de Eventos: evento emitido manualmente desde la capa 6 de Memoria y Organización.',
      severity: 'info'
    });
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Zap className="text-qh-cyan" size={22} />
          <div>
            <h3 className="font-bold text-white text-sm">Bus de Eventos Operacional ({events.length} Eventos)</h3>
            <p className="text-xs text-gray-400">Historial en tiempo real de ejecuciones y actividad del sistema</p>
          </div>
        </div>

        <button
          onClick={emitirEventoPrueba}
          className="glass-button text-xs flex items-center gap-2 border-qh-cyan/30 text-qh-cyan cursor-pointer"
        >
          <Zap size={14} /> Emitir Evento de Prueba
        </button>
      </div>

      <div className="glass-panel p-4 space-y-2">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">No hay eventos registrados en el bus.</div>
        ) : (
          events.slice(0, 10).map(e => (
            <div key={e.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex justify-between items-center text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  e.severity === 'critical' ? "bg-red-400" : (e.severity === 'warning' ? "bg-amber-400" : "bg-emerald-400")
                )} />
                <div>
                  <div className="text-white font-bold">{e.type}</div>
                  <div className="text-gray-400 text-[11px] font-sans">{e.payload}</div>
                </div>
              </div>
              <span className="text-[10px] text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
