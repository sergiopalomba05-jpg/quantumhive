import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { tours, TourStep } from '../../data/tourSteps';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TourContextType {
  startTour: (tourId: string) => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within TourProvider');
  return context;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const { completeTour } = useStore();

  const steps = activeTour ? tours[activeTour] : [];
  const currentStep = steps?.[currentStepIndex];

  const updateTargetRect = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null); // fallback to center if not found
    }
  }, [currentStep]);

  useEffect(() => {
    if (activeTour) {
      updateTargetRect();
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect);
      return () => {
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
      };
    }
  }, [activeTour, currentStepIndex, updateTargetRect]);

  const startTour = (tourId: string) => {
    if (tours[tourId]) {
      setActiveTour(tourId);
      setCurrentStepIndex(0);
    }
  };

  const endTour = () => {
    if (activeTour) completeTour(activeTour);
    setActiveTour(null);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(p => p + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(p => p - 1);
    }
  };

  return (
    <TourContext.Provider value={{ startTour, isActive: !!activeTour }}>
      {children}
      
      {activeTour && currentStep && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Overlay with cutout */}
          <div className="absolute inset-0 bg-slate-950/80 pointer-events-auto transition-all duration-300"
               style={targetRect ? {
                 clipPath: `polygon(
                   0% 0%, 0% 100%, 
                   ${targetRect.left - 10}px 100%, 
                   ${targetRect.left - 10}px ${targetRect.top - 10}px, 
                   ${targetRect.right + 10}px ${targetRect.top - 10}px, 
                   ${targetRect.right + 10}px ${targetRect.bottom + 10}px, 
                   ${targetRect.left - 10}px ${targetRect.bottom + 10}px, 
                   ${targetRect.left - 10}px 100%, 
                   100% 100%, 100% 0%
                 )`
               } : {}} 
          />
          
          {/* Popover */}
          <div 
            className={cn(
              "absolute bg-qh-card border border-qh-gold/30 rounded-xl shadow-2xl p-5 pointer-events-auto transition-all duration-300 w-[300px]",
              !targetRect || currentStep.placement === 'center' ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
            )}
            style={
              targetRect && currentStep.placement !== 'center' ? {
                top: currentStep.placement === 'bottom' ? targetRect.bottom + 20 : 
                     currentStep.placement === 'top' ? targetRect.top - 20 : 
                     targetRect.top,
                left: currentStep.placement === 'right' ? targetRect.right + 20 : 
                      currentStep.placement === 'left' ? targetRect.left - 20 : 
                      targetRect.left,
                transform: currentStep.placement === 'top' ? 'translateY(-100%)' : 
                           currentStep.placement === 'left' ? 'translateX(-100%)' : 
                           'none'
              } : {}
            }
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-qh-gold font-bold uppercase tracking-widest text-xs">{currentStep.title}</h4>
              <button onClick={endTour} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {currentStep.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full", i === currentStepIndex ? "bg-qh-gold" : "bg-slate-700")} />
                ))}
              </div>
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <button onClick={prevStep} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                    <ChevronLeft size={16} />
                  </button>
                )}
                <button onClick={nextStep} className="flex items-center gap-1 px-3 py-1.5 bg-qh-gold/20 text-qh-gold hover:bg-qh-gold/30 rounded text-xs font-bold uppercase tracking-widest border border-qh-gold/30">
                  {currentStepIndex < steps.length - 1 ? (
                    <>Siguiente <ChevronRight size={14} /></>
                  ) : (
                    <>Finalizar <Check size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
