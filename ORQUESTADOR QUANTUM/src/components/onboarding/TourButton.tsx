import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useTour } from './TourProvider';

export function TourButton({ tourId }: { tourId: string }) {
  const { startTour } = useTour();

  return (
    <button 
      onClick={() => startTour(tourId)}
      className="flex items-center gap-1.5 px-2 py-1 bg-qh-cyan/10 hover:bg-qh-cyan/20 text-qh-cyan rounded-md text-[10px] font-bold uppercase tracking-widest border border-qh-cyan/30 transition-all ml-4"
    >
      <HelpCircle size={12} />
      <span>Tour</span>
    </button>
  );
}
