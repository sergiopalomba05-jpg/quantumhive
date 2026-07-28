import { tStatus } from '../lib/utils';
import { TooltipInfo } from '../components/onboarding/TooltipInfo';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Lightbulb } from 'lucide-react';
import { IdeaPriority, IdeaStatus, IdeaType, MacroDivision } from '../types';

export function Ideas() {
  const store = useStore();
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [macroDivision, setMacroDivision] = useState<MacroDivision>('General');
  const [type, setType] = useState<IdeaType>('MVP');
  const [priority, setPriority] = useState<IdeaPriority>('parking lot');
  
  const handleSave = () => {
    store.addIdea({ title, description, macroDivision, type, priority, status: 'inbox', dependencies: '', notes: '' });
    setShowForm(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Lightbulb className="text-qh-amber" /> Bandeja de Ideas
        </h2>
        <button className="glass-button text-qh-amber" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Nueva Idea
        </button>
      </div>

      {showForm && (
        <div className="glass-panel p-6 space-y-4 border-qh-amber/30">
          <input className="glass-input text-lg font-bold" placeholder="Título de la idea..." value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="glass-input h-24" placeholder="Descripción..." value={description} onChange={e => setDescription(e.target.value)} />
          
          <div className="grid grid-cols-3 gap-4">
            <select className="glass-input" value={macroDivision} onChange={e => setMacroDivision(e.target.value as MacroDivision)}>
              <option value="General" className="bg-qh-bg">General</option>
              <option value="Carta Viva" className="bg-qh-bg">Carta Viva</option>
              <option value="HumanIA" className="bg-qh-bg">HumanIA</option>
              <option value="Infraestructura" className="bg-qh-bg">Infraestructura</option>
            </select>
            <select className="glass-input" value={type} onChange={e => setType(e.target.value as IdeaType)}>
              <option value="MVP" className="bg-qh-bg">MVP</option>
              <option value="visión futura" className="bg-qh-bg">Visión Futura</option>
              <option value="mejora" className="bg-qh-bg">Mejora</option>
            </select>
            <select className="glass-input" value={priority} onChange={e => setPriority(e.target.value as IdeaPriority)}>
              <option value="ahora" className="bg-qh-bg">Ahora</option>
              <option value="próxima" className="bg-qh-bg">Próxima</option>
              <option value="después" className="bg-qh-bg">Después</option>
              <option value="parking lot" className="bg-qh-bg">Parking Lot</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-2">
            <button className="glass-button" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="glass-button text-qh-amber" onClick={handleSave}>Guardar Idea</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {store.ideas.map(idea => (
          <div key={idea.id} className="glass-panel p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-qh-cyan font-mono">{idea.macroDivision}</span>
                <span className="text-xs text-gray-500">{new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-bold text-lg text-white mb-2 leading-tight">{idea.title}</h3>
              <p className="text-sm text-gray-400 line-clamp-3 mb-4">{idea.description}</p>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="px-2 py-1 bg-qh-amber/10 text-qh-amber rounded-full">{tStatus(idea.priority)}</span>
              <span className="text-gray-500">{tStatus(idea.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
