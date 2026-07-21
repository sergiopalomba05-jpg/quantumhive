import React from 'react';
import { useStore } from '../store/useStore';
import { NavLink } from 'react-router-dom';
import { 
  Play, Lightbulb, MessageSquare, Briefcase, 
  Settings, Save, Activity, FolderKanban, CheckSquare, Wand2, TerminalSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';

export function StartHere() {
  const store = useStore();

  const steps = [
    {
      id: 1,
      title: 'Paso 1: Capturar',
      description: 'Ingresa ideas, notas de voz o videos crudos.',
      actions: [
        { label: 'Ideas Inbox', to: '/ideas', icon: Lightbulb },
        { label: 'Bandeja de Videos', to: '/video-inbox', icon: Play },
        { label: 'Nota de Voz', to: '/voice', icon: MessageSquare }
      ]
    },
    {
      id: 2,
      title: 'Paso 2: Clasificar',
      description: 'Organiza y envía la información a los agentes.',
      actions: [
        { label: 'Chat Central', to: '/chat', icon: MessageSquare },
        { label: 'Memoria', to: '/memory', icon: Save }
      ]
    },
    {
      id: 3,
      title: 'Paso 3: Planificar',
      description: 'Prepara workflows y prompt packs.',
      actions: [
        { label: 'Prompt Studio', to: '/prompt-studio', icon: Wand2 },
        { label: 'Visual Planner', to: '/planner', icon: Briefcase },
        { label: 'Proyectos', to: '/projects', icon: FolderKanban }
      ]
    },
    {
      id: 4,
      title: 'Paso 4: Ejecutar',
      description: 'Asigna tareas y corre workflows.',
      actions: [
        { label: 'Tareas', to: '/tasks', icon: CheckSquare },
        { label: 'Entorno Dev', to: '/dev-env', icon: TerminalSquare }
      ]
    },
    {
      id: 5,
      title: 'Paso 5: Revisar',
      description: 'Revisa resultados, approvals y contexto diario.',
      actions: [
        { label: 'Resumen Diario', to: '/brief', icon: Activity },
        { label: 'Aprobaciones', to: '/approvals', icon: CheckSquare },
        { label: 'Auditoría', to: '/audit', icon: Save }
      ]
    }
  ];

  return (
    <div className="flex flex-col max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Play className="text-qh-gold" size={28} /> Start Here / Guided Workflow
          </h2>
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Sigue estos pasos para aprovechar la plataforma al máximo.</p>
        </div>
        <TourButton tourId="startHere" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.id} className="bg-slate-900/50 border border-slate-700 hover:border-slate-500 transition-colors rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-qh-gold font-bold flex items-center justify-center border border-slate-600">
                {step.id}
              </div>
              <h3 className="text-lg font-bold text-slate-200">{step.title}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5 flex-1">{step.description}</p>
            <div className="space-y-2 mt-auto">
              {step.actions.map((act) => (
                <NavLink key={act.label} to={act.to} className="flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase transition-colors">
                  <div className="flex items-center gap-2">
                    <act.icon size={14} className="text-qh-cyan" /> {act.label}
                  </div>
                  <span className="text-slate-500">&rarr;</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
