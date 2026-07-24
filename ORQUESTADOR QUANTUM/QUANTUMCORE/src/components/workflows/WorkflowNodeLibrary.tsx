import { WORKFLOW_NODE_LIBRARY } from '../../workflows/catalog';

export function WorkflowNodeLibrary() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {WORKFLOW_NODE_LIBRARY.map((item) => (
        <div key={item.kind} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="text-sm font-bold text-slate-100">{item.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{item.description}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-qh-gold">{item.kind}</span>
            {item.defaultRequiresApproval && (
              <span className="text-[9px] uppercase tracking-wider text-amber-400/70 border border-amber-400/20 rounded-full px-1.5 py-0.5">requiere aprobacion</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
