import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTour } from './TourProvider';
import { Sparkles, Compass, BookOpen, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OnboardingModal() {
  const { onboardingCompleted, setOnboardingCompleted } = useStore();
  const { startTour } = useTour();
  const navigate = useNavigate();

  if (onboardingCompleted) return null;

  const handleStartTour = () => {
    setOnboardingCompleted(true);
    startTour('global');
  };

  const handleExplore = () => {
    setOnboardingCompleted(true);
  };

  const handleManual = () => {
    setOnboardingCompleted(true);
    navigate('/help');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-qh-card border border-qh-border rounded-2xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-qh-cyan/20 blur-[60px] pointer-events-none rounded-full" />
        
        <div className="text-center relative z-10 mb-8">
          <div className="w-16 h-16 mx-auto bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-qh-cyan/10">
             <Sparkles className="text-qh-cyan w-8 h-8" />
          </div>
          <h2 className="text-2xl font-sans font-medium text-white mb-3">Welcome to QuantumHive Control Plane</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Este panel centraliza tus ideas, proyectos, agentes, memoria, videos, herramientas, tareas, integraciones y decisiones para que no pierdas contexto entre sesiones.
          </p>
        </div>

        <div className="space-y-3 relative z-10">
          <button onClick={handleStartTour} className="w-full flex items-center justify-center gap-2 p-3 bg-qh-cyan/10 hover:bg-qh-cyan/20 text-qh-cyan border border-qh-cyan/30 rounded-xl transition-all">
            <Compass size={18} />
            <span className="font-bold uppercase tracking-widest text-xs">Iniciar tutorial interactivo</span>
          </button>
          
          <button onClick={handleManual} className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700">
            <BookOpen size={18} />
            <span className="font-bold uppercase tracking-widest text-xs">Ver Manual / Help Center</span>
          </button>

          <button onClick={handleExplore} className="w-full flex items-center justify-center gap-2 p-3 text-slate-500 hover:text-slate-300 transition-all">
            <span className="font-bold uppercase tracking-widest text-[10px]">Explorar por mi cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
