import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Search, Command, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : document.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const performAction = (action: () => void) => {
    action();
    onClose();
    setQuery('');
  };

  const results = [
    // Mock Actions
    { type: 'Action', label: 'Create Idea', action: () => alert('Create idea flow...') },
    { type: 'Action', label: 'Create Task', action: () => alert('Create task flow...') },
        { type: 'Action', label: 'Export Master Context', action: () => {
      const data = {
        projects: store.projects,
        tasks: store.tasks,
        memories: store.memories, communicationChannels: store.communicationChannels, agentChannelBindings: store.agentChannelBindings,
        knowledgeGraphNodes: store.knowledgeGraphNodes,
        knowledgeGraphEdges: store.knowledgeGraphEdges,
        graphQueries: store.graphQueries,
        visualNodeBoards: store.visualNodeBoards,
        visualNodes: store.visualNodes,
        visualEdges: store.visualEdges,
        promptProjects: store.promptProjects,
        promptPackItems: store.promptPackItems,
        promptLoops: store.promptLoops
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quantumhive-master-context.json';
      a.click();
      URL.revokeObjectURL(url);
      performAction(() => {});
    } },
    
    { type: 'Action', label: 'Generate Brief', action: () => performAction(() => navigate('/brief')) },
    { type: 'Action', label: 'Open Skill Advisor', action: () => performAction(() => navigate('/skill-advisor')) },

    
    
    // Search Results from Store
    ...store.skillDefinitions.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).map(s => ({
      type: 'Skill', label: s.name, action: () => performAction(() => navigate('/skill-advisor'))
    })),

    ...store.projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).map(p => ({
      type: 'Project', label: p.name, action: () => performAction(() => navigate('/projects'))
    })),
    ...store.agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).map(a => ({
      type: 'Agent', label: a.name, action: () => performAction(() => navigate('/agents'))
    }))
  ];

  const filteredResults = query ? results.filter(r => r.label.toLowerCase().includes(query.toLowerCase()) || r.type.toLowerCase().includes(query.toLowerCase())) : results.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-qh-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center px-4 border-b border-qh-border">
          <Search className="text-qh-gold shrink-0" size={18} />
          <input 
            autoFocus
            type="text" 
            className="flex-1 bg-transparent border-none text-slate-200 p-4 focus:outline-none placeholder:text-slate-500"
            placeholder="Search or type a command... (Cmd+K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredResults.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No results found for "{query}"</div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((res, i) => (
                <button 
                  key={i} 
                  onClick={res.action}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-left transition-colors group"
                >
                  <span className="text-slate-200 text-sm group-hover:text-qh-gold">{res.label}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono border border-slate-700 px-2 py-0.5 rounded">{res.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-2 border-t border-qh-border bg-slate-900/50 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-mono">
           <span>Use <kbd className="bg-slate-800 px-1 rounded">↑↓</kbd> to navigate</span>
           <span><kbd className="bg-slate-800 px-1 rounded">Enter</kbd> to select</span>
        </div>
      </div>
    </div>
  );
}
