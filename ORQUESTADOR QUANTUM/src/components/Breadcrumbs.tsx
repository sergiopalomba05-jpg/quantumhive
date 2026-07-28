import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { macroAreas, navItems } from './Sidebar';

export function Breadcrumbs() {
  const location = useLocation();
  const currentPath = location.pathname;

  if (currentPath === '/') return null; // Don't show on dashboard

  let currentItem = null;
  let currentArea = null;

  for (const area of macroAreas) {
    for (const link of area.links) {
      if (link.to === currentPath) {
        currentItem = link;
        currentArea = area;
        break;
      }
    }
    if (currentItem) break;
  }

  if (!currentItem) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 ml-1">
      <span className="text-slate-400">{currentArea?.title}</span>
      <ChevronRight size={12} />
      <span className="text-qh-cyan">{currentItem.label}</span>
    </div>
  );
}
