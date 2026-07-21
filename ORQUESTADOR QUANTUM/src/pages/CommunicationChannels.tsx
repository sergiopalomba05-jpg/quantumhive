import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CommunicationChannel, AgentChannelBinding, ChannelStatus, ChannelType } from '../types';
import { 
  MessageSquare, Radio, Server, Phone, Video, 
  Mail, MessageCircle, Bot, AlertTriangle, Play,
  Plus, Shield, Zap, Search, ChevronRight, Activity, X
} from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';

const STATUS_COLORS: Record<ChannelStatus, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  mock: 'bg-qh-gold/20 text-qh-gold border-qh-gold/30',
  future: 'bg-slate-700/50 text-slate-400 border-slate-600',
  needs_backend: 'bg-qh-amber/20 text-qh-amber border-qh-amber/30',
  disabled: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const CHANNEL_ICONS: Record<ChannelType, React.FC<any>> = {
  internal_chat: MessageSquare,
  humania_chat: MessageCircle,
  whatsapp: Phone,
  telegram: Radio,
  gmail: Mail,
  google_chat: MessageSquare,
  web_widget: Bot,
  voice_live: Phone,
  screen_live: Video,
  discord: Server,
  slack: MessageSquare
};

export function CommunicationChannels() {
  const store = useStore();
  const [selectedChannel, setSelectedChannel] = useState<CommunicationChannel | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  const channels = store.communicationChannels || [];
  const bindings = store.agentChannelBindings || [];
  const agents = store.agents || [];

  const handleSimulateMessage = () => {
    if (!selectedChannel) return;
    store.addEvent({
      type: 'channel.message.received',
      actor: 'User',
      payload: `Mensaje simulado recibido en ${selectedChannel.name}`,
      severity: 'info'
    });
    alert('Mensaje simulado enviado y registrado en Event Bus y Audit Log (Simulado).');
    setShowSimulateModal(false);
  };

  const handleAssignAgent = (agentId: string) => {
    if (!selectedChannel) return;
    store.addAgentChannelBinding({
      agentId,
      channelId: selectedChannel.id,
      allowedActions: ['read', 'reply'],
      memoryScope: 'channel',
      status: 'active'
    });
    
    // Update channel assigned ids
    store.updateCommunicationChannel(selectedChannel.id, {
      assignedAgentIds: [...(selectedChannel.assignedAgentIds || []), agentId]
    });
    
    alert('Agente asignado exitosamente.');
    setShowAssignModal(false);
  };

  const convertToTask = () => {
    store.addTask({
      title: `Responder mensaje en ${selectedChannel?.name}`,
      acceptanceCriteria: 'Responder al mensaje.',
      status: 'todo',
      priority: 'high',
      notes: 'Convertido desde simulación de mensaje.'
    });
    alert('Tarea creada exitosamente.');
  };

  return (
    <div className="flex h-full space-x-6 relative">
      {/* List View */}
      <div className={cn("flex-1 overflow-y-auto transition-all", selectedChannel ? "hidden md:block md:w-1/2" : "w-full")}>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
              <Radio className="text-qh-cyan" size={28} /> Canales de Comunicación
            </h2>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Conecta agentes con el mundo exterior</p>
          </div>
          <TourButton tourId="channels" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map(channel => {
            const Icon = CHANNEL_ICONS[channel.type] || Radio;
            const isSelected = selectedChannel?.id === channel.id;
            const boundAgents = bindings.filter(b => b.channelId === channel.id);
            
            return (
              <div 
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={cn(
                  "bg-slate-900/80 border rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-1",
                  isSelected ? "border-qh-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)]" : "border-slate-700 hover:border-slate-500"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    <Icon size={20} className="text-slate-300" />
                  </div>
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded border", STATUS_COLORS[channel.status])}>
                    {tStatus(channel.status)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-200">{channel.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{channel.notes}</p>
                
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase font-bold tracking-widest">
                    Agentes: {channel.assignedAgentIds?.length || boundAgents.length || 0}
                  </span>
                  <span className="text-qh-cyan uppercase font-bold tracking-widest flex items-center gap-1">
                    Ver Detalles <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedChannel && (
        <div className="flex-1 w-full md:w-1/2 bg-slate-900/50 border border-slate-700 rounded-xl overflow-y-auto relative animate-fade-in flex flex-col">
          <button 
            onClick={() => setSelectedChannel(null)}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
          >
            <X size={20} />
          </button>
          
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              {React.createElement(CHANNEL_ICONS[selectedChannel.type] || Radio, { size: 24, className: "text-qh-cyan" })}
              <h2 className="text-xl font-bold text-slate-200">{selectedChannel.name}</h2>
            </div>
            <span className={cn("inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border mb-4", STATUS_COLORS[selectedChannel.status])}>
              {tStatus(selectedChannel.status)}
            </span>
            <p className="text-sm text-slate-400 mb-4">{selectedChannel.notes}</p>
            
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest font-bold">
              <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded">Dir: {selectedChannel.direction}</span>
              <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded">Risk: {selectedChannel.riskLevel}</span>
              {selectedChannel.requiresApproval && (
                <span className="px-2 py-1 bg-qh-amber/20 text-qh-amber border border-qh-amber/30 rounded flex items-center gap-1">
                  <Shield size={10} /> Approval Req
                </span>
              )}
            </div>
          </div>
          
          <div className="p-6 flex-1 space-y-6">
            {/* Actions */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-2">
                <Zap size={14} className="text-qh-gold" /> Channel Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowSimulateModal(true)}
                  className="glass-button text-xs py-2 justify-center"
                >
                  <Play size={12} className="mr-1" /> Simular Inbound
                </button>
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="glass-button text-xs py-2 justify-center"
                >
                  <Plus size={12} className="mr-1" /> Asignar Agente
                </button>
                <button 
                  onClick={convertToTask}
                  className="glass-button text-xs py-2 justify-center"
                >
                  <Activity size={12} className="mr-1" /> Crear Tarea
                </button>
                <button 
                  onClick={() => alert('Eventos del canal:\n- channel.message.received (x3)\n- channel.connected')}
                  className="glass-button text-xs py-2 justify-center"
                >
                  <Search size={12} className="mr-1" /> Ver Eventos
                </button>
              </div>
            </div>
            
            {/* Assigned Agents */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-2">
                <Bot size={14} className="text-qh-cyan" /> Agentes Asignados
              </h3>
              
              {bindings.filter(b => b.channelId === selectedChannel.id).length === 0 ? (
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-center text-xs text-slate-400">
                  Ningún agente asignado a este canal.
                </div>
              ) : (
                <div className="space-y-2">
                  {bindings.filter(b => b.channelId === selectedChannel.id).map(binding => {
                    const agent = agents.find(a => a.id === binding.agentId);
                    return (
                      <div key={binding.id} className="p-3 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 font-bold text-qh-cyan text-[10px]">
                            {agent?.name.substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{agent?.name || 'Agente Desconocido'}</div>
                            <div className="text-[9px] uppercase tracking-widest text-slate-500">
                              Scope: <span className="text-slate-300">{binding.memoryScope}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-[9px] uppercase tracking-widest px-2 py-1 rounded font-bold", 
                          binding.status === 'active' ? 'text-emerald-400' : 'text-slate-400'
                        )}>
                          {tStatus(binding.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Warning for needs backend */}
            {(selectedChannel.status === 'needs_backend' || selectedChannel.status === 'future') && (
              <div className="p-4 bg-qh-gold/10 border border-qh-gold/30 rounded-lg flex gap-3 text-qh-gold mt-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong>Canal No Operativo:</strong> Este canal está marcado como '{tStatus(selectedChannel.status)}'. La integración real de APIs externas (webhooks) se construirá en una iteración futura respaldada por un backend. Por ahora, usa las funciones Mock.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-qh-panel border border-qh-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Simular Mensaje Entrante</h3>
            <p className="text-xs text-slate-400 mb-4">Simula un mensaje llegando desde <strong>{selectedChannel?.name}</strong>. Esto disparará eventos en el Event Bus para que los agentes reaccionen.</p>
            <textarea 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 mb-4 outline-none focus:border-qh-cyan h-24"
              placeholder="Escribe el mensaje mock aquí..."
              defaultValue="Hola, necesito ayuda con un proyecto."
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSimulateModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={handleSimulateMessage} className="px-4 py-2 text-xs font-bold uppercase bg-qh-cyan text-black rounded hover:bg-qh-cyan/90">Enviar Simulación</button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-qh-panel border border-qh-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Asignar Agente</h3>
            <p className="text-xs text-slate-400 mb-4">Conecta un agente a <strong>{selectedChannel?.name}</strong> para que procese sus mensajes.</p>
            
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {agents.map(agent => {
                const isAssigned = bindings.some(b => b.channelId === selectedChannel?.id && b.agentId === agent.id);
                if (isAssigned) return null;
                
                return (
                  <button 
                    key={agent.id}
                    onClick={() => handleAssignAgent(agent.id)}
                    className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-qh-cyan border border-slate-600">
                      {agent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">{agent.name}</div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-500">{agent.role}</div>
                    </div>
                  </button>
                )
              })}
              {agents.filter(a => !bindings.some(b => b.channelId === selectedChannel?.id && b.agentId === a.id)).length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">Todos los agentes ya están asignados.</div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
