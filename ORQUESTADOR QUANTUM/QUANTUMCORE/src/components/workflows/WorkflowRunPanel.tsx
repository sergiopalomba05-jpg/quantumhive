import { WorkflowRun } from '../../workflows/types';

interface WorkflowRunPanelProps {
  run?: WorkflowRun;
}

export function WorkflowRunPanel({ run }: WorkflowRunPanelProps) {
  if (!run) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-500">Todavia no hay ejecucion simulada.</div>;
  }

  return (
    <div className="rounded-xl border border-qh-cyan/30 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-qh-cyan">Ejecucion simulada</span>
        <span className="text-[10px] text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
      </div>
      <div className="space-y-2">
        {run.steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-slate-800 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-200">{step.title}</div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400/70 border border-emerald-400/20 rounded-full px-1.5 py-0.5">{step.status}</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">{step.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
