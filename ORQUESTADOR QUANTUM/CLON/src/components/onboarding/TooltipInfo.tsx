import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function TooltipInfo({ text }: { text: string }) {
  const { learningModeEnabled } = useStore();
  const [show, setShow] = useState(false);

  if (!learningModeEnabled) return null;

  return (
    <div 
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={12} className="text-slate-500 cursor-help" />
      
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-[10px] font-sans text-slate-300 shadow-xl z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}
