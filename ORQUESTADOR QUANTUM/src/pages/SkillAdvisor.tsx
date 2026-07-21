import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search, BrainCircuit, ExternalLink, Settings, Lightbulb, Workflow, Check, Plus, Code, Youtube, Play, ShieldAlert, Rocket } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { TooltipInfo } from '../components/onboarding/TooltipInfo';
import { SkillDefinition } from '../types';

export function SkillAdvisor() {
  const store = useStore();
  const [intent, setIntent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<SkillDefinition[]>([]);
  const [suggestedOrder, setSuggestedOrder] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent.trim()) return;
    
    setIsAnalyzing(true);
    // Mocking recommendation logic
    setTimeout(() => {
      const allSkills = store.skillDefinitions;
      let matched: SkillDefinition[] = [];
      let order: string[] = [];
      let prompt = '';
      
      const lowerIntent = intent.toLowerCase();
      
      if (lowerIntent.includes('landing') || lowerIntent.includes('visual') || lowerIntent.includes('diseñ')) {
        matched = allSkills.filter(s => ['frontend-design', 'abogado-del-diablo'].includes(s.name));
        order = ['frontend-design', 'abogado-del-diablo'];
        prompt = `Analizá esto y proponé mejoras visuales premium manteniendo estructura actual.\nContexto: ${intent}`;
      } else if (lowerIntent.includes('idea') || lowerIntent.includes('viable') || lowerIntent.includes('vale la pena')) {
        matched = allSkills.filter(s => ['abogado-del-diablo', 'brainstorming'].includes(s.name));
        order = ['abogado-del-diablo', 'brainstorming'];
        prompt = `Actúa como abogado del diablo y evalúa la viabilidad de la siguiente idea: ${intent}`;
      } else if (lowerIntent.includes('bug') || lowerIntent.includes('error') || lowerIntent.includes('arregla')) {
        matched = allSkills.filter(s => ['systematic-debugging'].includes(s.name));
        order = ['systematic-debugging'];
        prompt = `Ayúdame a debuggear este problema de forma sistemática: ${intent}`;
      } else if (lowerIntent.includes('video') || lowerIntent.includes('youtube') || lowerIntent.includes('reel')) {
        matched = allSkills.filter(s => ['watch'].includes(s.name));
        order = ['watch'];
        prompt = `Por favor, mira este video y dame un resumen detallado. Intent: ${intent}`;
      } else {
        matched = allSkills.slice(0, 3);
        order = matched.map(m => m.name);
        prompt = `Quiero lograr lo siguiente: ${intent}. Sugiere los mejores pasos.`;
      }
      
      setRecommendations(matched);
      setSuggestedOrder(order);
      setGeneratedPrompt(prompt);
      
      // Save recommendation to store (mock)
      store.addSkillRecommendation({
        userIntent: intent,
        recommendedSkillIds: matched.map(m => m.id),
        reason: 'Coincidencia por palabras clave de intención (Simulado)',
        confidence: 0.85,
        suggestedOrder: order,
        generatedPrompt: prompt,
        status: 'suggested'
      });
      
      setIsAnalyzing(false);
    }, 800);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'installed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'available': return 'text-qh-cyan bg-qh-cyan/10 border-qh-cyan/20';
      case 'missing': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'future': return 'text-qh-amber bg-qh-amber/10 border-qh-amber/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-qh-cyan" /> Asesor de Skills
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Encuentra las herramientas, MCPs, CLIs y Agentes correctos para tu tarea.
          </p>
        </div>
      </div>

      <div className="bg-qh-card border border-qh-border p-6 rounded-xl shadow-lg">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="¿Qué querés hacer? (Ej: 'Quiero mejorar visualmente una landing page', 'Tengo un bug')"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-4 pl-12 pr-32 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-qh-cyan focus:ring-1 focus:ring-qh-cyan transition-colors text-lg"
          />
          <button 
            type="submit"
            disabled={isAnalyzing || !intent.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-qh-cyan/20 text-qh-cyan hover:bg-qh-cyan/30 px-6 py-2 rounded font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? 'Analizando...' : 'Asesorar'}
          </button>
        </form>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="bg-qh-card border border-qh-border p-5 rounded-xl">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Workflow size={18} className="text-qh-gold" /> Orden Sugerido <TooltipInfo text="Secuencia recomendada para ejecutar estas skills y obtener el mejor resultado" />
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {suggestedOrder.map((skillName, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-qh-cyan font-mono">
                    <span className="text-slate-500 mr-2">{idx + 1}.</span>{skillName}
                  </div>
                  {idx < suggestedOrder.length - 1 && <span className="text-slate-600">→</span>}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-bold">Prompt Generado Listo Para Usar <TooltipInfo text="Copia este prompt y úsalo en el Chat Central para iniciar la tarea" /></h4>
              <p className="text-slate-300 font-mono text-sm whitespace-pre-wrap">{generatedPrompt}</p>
              <div className="mt-3 flex justify-end gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrompt);
                    alert('Prompt copiado al portapapeles');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors"
                >
                  Copiar Prompt
                </button>
                <button className="bg-qh-cyan/20 hover:bg-qh-cyan/30 text-qh-cyan px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors">
                  Crear Workflow
                </button>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-200 mt-8 mb-4">Skills Recomendadas ({recommendations.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(skill => (
              <div key={skill.id} className="bg-qh-card border border-qh-border p-5 rounded-xl flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-white text-lg">{skill.name}</h4>
                    <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border mt-1", getStatusColor(skill.installStatus))}>
                      {skill.installStatus}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1">Confidence <TooltipInfo text="Nivel de certeza de que esta skill resuelve tu intención" /></span>
                    <span className="text-emerald-400 font-mono font-bold text-lg">{(skill.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <p className="text-slate-400 text-sm mb-4 flex-1">{skill.description}</p>
                
                <div className="space-y-3 mb-4 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider block mb-1">Mejor Para:</span>
                    <div className="flex flex-wrap gap-1">
                      {skill.bestFor.map((b, i) => <span key={i} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{b}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block mb-1">Input:</span>
                      <span className="text-slate-400">{skill.inputNeeded.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block mb-1">Output:</span>
                      <span className="text-slate-400">{skill.outputExpected.join(', ')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Source: {skill.source}</span>
                  <button className="text-qh-cyan hover:text-qh-cyan/70 font-bold uppercase tracking-widest text-xs flex items-center gap-1">
                    <Play size={12} /> Usar Skill
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 bg-slate-900/50 border border-qh-border p-6 rounded-xl">
        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Settings size={18} className="text-slate-400" /> Skill Sources <TooltipInfo text="Lugares de donde el sistema extrae definiciones de skills: repositorios GitHub, carpetas locales o servidores MCP" />
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Conecta repositorios de GitHub, carpetas locales o servidores MCP para descubrir nuevas skills.
        </p>
        <div className="space-y-3">
          {store.skillSources.map(source => (
            <div key={source.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <Code className="text-slate-400" size={16} />
                <div>
                  <div className="text-slate-200 text-sm font-mono">{source.url}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{source.type}</div>
                </div>
              </div>
              <span className="text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1">
                <Check size={12} /> {tStatus(source.status)}
              </span>
            </div>
          ))}
          <button className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-400 flex items-center justify-center gap-2 text-sm transition-colors">
            <Plus size={16} /> Agregar Source
          </button>
        </div>
      </div>
    </div>
  );
}
