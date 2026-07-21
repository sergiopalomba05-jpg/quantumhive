import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { helpArticles } from '../../data/helpContent';
import { cn } from '../../lib/utils';

export function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const filteredArticles = helpArticles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const article = helpArticles.find(a => a.id === selectedArticle);

  return (
    <div className="flex h-full bg-slate-950 text-slate-300">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 border-r border-slate-800 flex flex-col transition-all",
        selectedArticle ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-qh-cyan" /> Centro de Ayuda
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar artículos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-qh-cyan focus:ring-1 focus:ring-qh-cyan transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredArticles.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedArticle(a.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group",
                selectedArticle === a.id ? "bg-qh-cyan/10 text-qh-cyan border border-qh-cyan/20" : "hover:bg-slate-900 text-slate-400"
              )}
            >
              <span className="font-medium line-clamp-2">{a.title}</span>
              <ChevronRight size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", selectedArticle === a.id && "opacity-100")} />
            </button>
          ))}
          {filteredArticles.length === 0 && (
            <div className="p-4 text-center text-slate-500 text-sm">
              No se encontraron artículos.
            </div>
          )}
        </div>
      </div>

      {/* Article Content */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedArticle ? "hidden md:flex items-center justify-center text-slate-500" : "flex"
      )}>
        {!selectedArticle ? (
          <div className="text-center">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p>Selecciona un artículo para leer</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
            <button 
              onClick={() => setSelectedArticle(null)}
              className="md:hidden mb-6 flex items-center gap-1 text-qh-cyan text-sm"
            >
              <ChevronLeft size={16} /> Volver a la lista
            </button>
            <h1 className="text-3xl font-sans font-bold text-white mb-6">{article?.title}</h1>
            <div className="prose prose-invert prose-qh max-w-none">
              {article?.content.split('\\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 leading-relaxed text-slate-300">{paragraph}</p>
              ))}
            </div>
            <div className="mt-12 flex gap-2">
              {article?.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs font-mono text-slate-500">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple internal ChevronLeft for mobile back
function ChevronLeft(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}
