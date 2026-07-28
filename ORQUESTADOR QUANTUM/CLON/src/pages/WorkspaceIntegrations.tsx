import { useState } from 'react';
import { 
  Mail, Calendar, FileText, Database, FileSpreadsheet, CheckSquare, 
  StickyNote, Video, Users, MessageCircle, Cloud, ShieldAlert,
  Link, Unlink, RefreshCw
} from 'lucide-react';
import { cn, tStatus } from '../lib/utils';

interface Integration {
  id: string;
  name: string;
  icon: any;
  status: 'connected' | 'disconnected' | 'needs_auth' | 'mock';
  lastSync: string;
  permissions: string;
  actions: string[];
  color: string;
}

const initialIntegrations: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    status: 'mock',
    lastSync: 'Hace 5 min',
    permissions: 'Lectura/Escritura (solo borradores)',
    color: 'text-red-400',
    actions: [
      'Ver correos importantes',
      'Convertir email en tarea',
      'Convertir email en memoria',
      'Convertir email en idea',
      'Resumir email',
      'Detectar follow-ups pendientes'
    ]
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    icon: Calendar,
    status: 'mock',
    lastSync: 'Hace 10 min',
    permissions: 'Lectura/Escritura',
    color: 'text-blue-400',
    actions: [
      'Ver próximos eventos',
      'Crear evento desde tarea',
      'Crear recordatorio de proyecto',
      'Detectar ventanas libres para trabajar'
    ]
  },
  {
    id: 'drive',
    name: 'Google Drive',
    icon: Database,
    status: 'mock',
    lastSync: 'Hace 1 hora',
    permissions: 'Lectura',
    color: 'text-green-400',
    actions: [
      'Adjuntar archivo a proyecto',
      'Guardar export de contexto maestro',
      'Leer documentos seleccionados por Google Picker'
    ]
  },
  {
    id: 'docs',
    name: 'Google Docs',
    icon: FileText,
    status: 'mock',
    lastSync: 'Nunca',
    permissions: 'Escritura',
    color: 'text-blue-500',
    actions: [
      'Crear spec desde idea',
      'Crear resumen ejecutivo',
      'Crear plan de proyecto'
    ]
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    icon: FileSpreadsheet,
    status: 'mock',
    lastSync: 'Nunca',
    permissions: 'Escritura',
    color: 'text-green-500',
    actions: [
      'Exportar backlog',
      'Exportar tareas',
      'Exportar recursos cloud/costos'
    ]
  },
  {
    id: 'tasks',
    name: 'Google Tasks',
    icon: CheckSquare,
    status: 'mock',
    lastSync: 'Ayer',
    permissions: 'Lectura/Escritura',
    color: 'text-blue-600',
    actions: [
      'Sincronizar tareas importantes',
      'Crear Google Task desde tarea interna'
    ]
  },
  {
    id: 'keep',
    name: 'Google Keep',
    icon: StickyNote,
    status: 'mock',
    lastSync: 'Ayer',
    permissions: 'Lectura/Escritura',
    color: 'text-yellow-400',
    actions: [
      'Importar notas como ideas',
      'Guardar nota rápida desde el panel'
    ]
  },
  {
    id: 'meet',
    name: 'Google Meet',
    icon: Video,
    status: 'mock',
    lastSync: 'Nunca',
    permissions: 'Creación de enlaces',
    color: 'text-green-600',
    actions: [
      'Crear link de reunión para proyecto',
      'Asociar reunión a decisión/tarea'
    ]
  },
  {
    id: 'contacts',
    name: 'Google Contacts',
    icon: Users,
    status: 'mock',
    lastSync: 'Nunca',
    permissions: 'Lectura',
    color: 'text-blue-300',
    actions: [
      'Asociar contactos a proyectos',
      'Registrar proveedor/cliente/contacto estratégico'
    ]
  },
  {
    id: 'chat',
    name: 'Google Chat',
    icon: MessageCircle,
    status: 'mock',
    lastSync: 'Nunca',
    permissions: 'Lectura/Escritura',
    color: 'text-green-400',
    actions: [
      'Leer/resumir espacios de trabajo',
      'Enviar resumen diario al espacio privado',
      'Crear tarea desde mensaje'
    ]
  },
  {
    id: 'firebase',
    name: 'Firestore/Auth',
    icon: Cloud,
    status: 'connected',
    lastSync: 'En tiempo real',
    permissions: 'Admin',
    color: 'text-yellow-500',
    actions: [
      'Base de datos del Control Plane',
      'Autenticación de usuarios'
    ]
  }
];

export function WorkspaceIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);

  const toggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        if (int.status === 'connected') return { ...int, status: 'disconnected' };
        if (int.status === 'disconnected' || int.status === 'mock' || int.status === 'needs_auth') return { ...int, status: 'connected' };
      }
      return int;
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Cloud className="text-qh-cyan" size={28} /> Integraciones de Workspace
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Conexiones centrales para orquestación de trabajo</p>
        </div>
      </div>
      
      <div className="p-4 bg-slate-900/60 border border-qh-border rounded-xl text-xs text-slate-400 font-mono space-y-2 mb-6">
         <div className="flex items-start gap-2">
            <ShieldAlert className="text-qh-amber shrink-0 mt-0.5" size={14} />
            <div>
               <strong className="text-slate-300">Políticas de Seguridad Activas:</strong> No se exponen API keys. No se permiten acciones destructivas (borrar correos/archivos). Mails requieren confirmación explícita.
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((int) => (
          <div key={int.id} className="bg-qh-card border border-qh-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col hover:border-qh-gold/30 transition-colors">
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center", int.color)}>
                  <int.icon size={20} />
                </div>
                <div>
                  <h3 className="text-slate-200 font-bold">{int.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      int.status === 'connected' ? 'bg-qh-emerald' : 
                      int.status === 'mock' ? 'bg-qh-gold' : 
                      int.status === 'needs_auth' ? 'bg-qh-amber animate-pulse' : 'bg-slate-500'
                    )}></span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400">
                      {tStatus(int.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-1">
               <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-qh-border/50 pb-1">
                  Acciones Disponibles
               </div>
               <ul className="text-xs text-slate-300 space-y-1.5 font-sans leading-relaxed">
                  {int.actions.map((action, i) => (
                     <li key={i} className="flex items-start gap-2">
                        <span className="text-qh-gold mt-1 text-[8px]">▶</span> {action}
                     </li>
                  ))}
               </ul>
            </div>
            
            <div className="mt-4 pt-4 border-t border-qh-border/50 space-y-3">
               <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Sincronización:</span>
                  <span className="text-slate-400">{int.lastSync}</span>
               </div>
               <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Permisos:</span>
                  <span className="text-slate-400 truncate max-w-[150px]" title={int.permissions}>{int.permissions}</span>
               </div>
               
               <button 
                  onClick={() => toggleConnection(int.id)}
                  className={cn(
                     "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors mt-2",
                     int.status === 'connected' 
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600" 
                        : "bg-qh-cyan/10 text-qh-cyan hover:bg-qh-cyan/20 border border-qh-cyan/30"
                  )}
               >
                  {int.status === 'connected' ? (
                     <><Unlink size={14} /> Desconectar</>
                  ) : (
                     <><Link size={14} /> {int.status === 'mock' ? 'Conectar (Simulado)' : 'Conectar'}</>
                  )}
               </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
