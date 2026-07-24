import { useState, useMemo, useRef, useEffect } from 'react';
import { VisualNode } from '../types';
import { useStore } from '../store/useStore';
import { GitBranch, Box, GitMerge, ListTree, Search, Plus, Filter, Play, CheckCircle, Clock, AlertTriangle, PlayCircle, Download, Workflow } from 'lucide-react';
import { cn, tStatus } from '../lib/utils';
import { TourButton } from '../components/onboarding/TourButton';
import { WorkflowCanvas } from '../components/workflows/WorkflowCanvas';
import { WorkflowNodeLibrary } from '../components/workflows/WorkflowNodeLibrary';
import { WorkflowRunPanel } from '../components/workflows/WorkflowRunPanel';
import { createStarterAgentWorkflow, exportWorkflowJson, simulateWorkflowRun } from '../workflows/runtime';

type PlannerTab = 'workflows' | 'idea_map' | 'workflow_map' | 'pipeline_map' | 'roadmap';

export function VisualPlanner() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<PlannerTab>('workflows');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(store.workflowDefinitions[0]?.id || null);

  const boards = store.visualNodeBoards || [];

  const filteredBoards = useMemo(() => {
    if (activeTab === 'workflows') return [];
    return boards.filter(b => b.boardType === activeTab);
  }, [boards, activeTab]);

  const activeWorkflow = store.workflowDefinitions.find((w) => w.id === activeWorkflowId) || store.workflowDefinitions[0];
  const latestRun = useMemo(() => store.workflowRuns.find((run) => run.workflowId === activeWorkflow?.id), [store.workflowRuns, activeWorkflow?.id]);

  // Select first board when tab changes
  useEffect(() => {
    if (activeTab === 'workflows') return;
    if (filteredBoards.length > 0 && (!selectedBoardId || !filteredBoards.find(b => b.id === selectedBoardId))) {
      setSelectedBoardId(filteredBoards[0].id);
    } else if (filteredBoards.length === 0) {
      setSelectedBoardId(null);
    }
  }, [activeTab, filteredBoards]);

  const nodes = store.visualNodes?.filter(n => n.boardId === selectedBoardId) || [];
  const edges = store.visualEdges?.filter(e => e.boardId === selectedBoardId) || [];

  const createWorkflow = () => {
    const agent = store.agents[0];
    const workflow = createStarterAgentWorkflow(agent?.id || 'agent_manual', agent?.name || 'Agente Manual');
    store.addWorkflowDefinition(workflow);
    setActiveWorkflowId(workflow.id);
  };

  const simulate = () => {
    if (!activeWorkflow) return;
    const run = simulateWorkflowRun(activeWorkflow);
    store.addWorkflowRun(run);
    store.addAuditLog({ action: 'agent_action.executed_mock', actor: 'workflow-runtime', module: 'system', summary: `Workflow simulado: ${activeWorkflow.name}`, severity: 'info' });
  };

  const exportJson = () => {
    if (!activeWorkflow) return;
    const blob = new Blob([exportWorkflowJson(activeWorkflow)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkflow.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: PlannerTab; label: string; icon: typeof GitBranch }[] = [
    { key: 'workflows', label: 'Workflows', icon: Workflow },
    { key: 'idea_map', label: 'Mapa de Ideas', icon: GitBranch },
    { key: 'workflow_map', label: 'Mapa de Flujo', icon: GitMerge },
    { key: 'pipeline_map', label: 'Pipeline', icon: ListTree },
    { key: 'roadmap', label: 'Roadmap', icon: Box },
  ];

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500', real: 'bg-emerald-500', done: 'bg-emerald-500',
      mock: 'bg-amber-400', future: 'bg-blue-400',
      blocked: 'bg-red-500',
    };
    return map[status] || 'bg-slate-500';
  };

  const statusIcon = (status: string) => {
    const map: Record<string, typeof CheckCircle> = {
      active: PlayCircle, real: CheckCircle, done: CheckCircle,
      mock: Clock, future: Clock,
      blocked: AlertTriangle,
    };
    const Icon = map[status] || Clock;
    return <Icon size={12} />;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-tour="visual-planner">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Workflow size={24} className="text-qh-cyan" />
            Planificador Visual
            <TourButton tourId="visual-planner" />
          </h2>
          <p className="mt-1 text-sm text-slate-400">Canvas propio de QuantumHive para disenar flujos de agentes, workflows visuales, pipelines y roadmaps.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all',
              activeTab === tab.key
                ? 'bg-qh-cyan/15 text-qh-cyan border border-qh-cyan/30 shadow-[0_0_16px_rgba(66,232,255,0.1)]'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workflow Builder Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {/* Workflow Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={createWorkflow} className="glass-button"><Plus size={14} /> Crear workflow inicial</button>
            <button onClick={simulate} disabled={!activeWorkflow} className="glass-button disabled:opacity-40"><Play size={14} /> Simular</button>
            <button onClick={exportJson} disabled={!activeWorkflow} className="glass-button disabled:opacity-40"><Download size={14} /> Exportar JSON</button>

            {store.workflowDefinitions.length > 1 && (
              <select
                value={activeWorkflowId || ''}
                onChange={(e) => setActiveWorkflowId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 outline-none focus:border-qh-cyan/40"
              >
                {store.workflowDefinitions.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Canvas */}
          {activeWorkflow ? (
            <WorkflowCanvas workflow={activeWorkflow} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
              <Workflow size={40} className="mx-auto mb-3 text-slate-700" />
              <p>Crea un workflow inicial para empezar a disenar flujos de agentes.</p>
              <button onClick={createWorkflow} className="mt-4 glass-button"><Plus size={14} /> Crear workflow</button>
            </div>
          )}

          {/* Run Results */}
          <WorkflowRunPanel run={latestRun} />

          {/* Node Library */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Biblioteca de nodos</h3>
            <WorkflowNodeLibrary />
          </div>
        </div>
      )}

      {/* Legacy Visual Boards (idea_map, workflow_map, pipeline_map, roadmap) */}
      {activeTab !== 'workflows' && (
        <div className="space-y-6">
          {/* Board Selector */}
          {filteredBoards.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filteredBoards.map(board => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-xs font-bold transition-all',
                    selectedBoardId === board.id
                      ? 'bg-qh-gold/15 text-qh-gold border border-qh-gold/30'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  )}
                >
                  {board.title}
                </button>
              ))}
            </div>
          )}

          {/* Visual Board Canvas */}
          {nodes.length > 0 ? (
            <div className="relative rounded-xl border border-qh-border bg-slate-950/80 overflow-hidden" style={{ minHeight: 400 }}>
              <svg className="w-full" style={{ minHeight: 400 }} viewBox="0 0 800 400">
                {/* Edges */}
                {edges.map(edge => {
                  const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
                  const targetNode = nodes.find(n => n.id === edge.targetNodeId);
                  if (!sourceNode || !targetNode) return null;
                  return (
                    <g key={edge.id}>
                      <line
                        x1={sourceNode.x + 60} y1={sourceNode.y + 30}
                        x2={targetNode.x + 60} y2={targetNode.y + 30}
                        stroke="rgba(66,232,255,0.3)" strokeWidth={2} strokeDasharray="6 4"
                      />
                      <text
                        x={(sourceNode.x + targetNode.x) / 2 + 60}
                        y={(sourceNode.y + targetNode.y) / 2 + 25}
                        fill="rgba(148,163,184,0.6)" fontSize={10} textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}
                {/* Nodes */}
                {nodes.map(node => (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <rect width={120} height={60} rx={10} fill="rgba(15,23,42,0.9)" stroke={statusColor(node.status).replace('bg-', 'rgb(').replace('500', '400)').replace('400', '300)')} strokeWidth={1.5} />
                    <text x={60} y={25} fill="white" fontSize={11} fontWeight="bold" textAnchor="middle">{node.title.slice(0, 18)}</text>
                    <text x={60} y={42} fill="rgba(148,163,184,0.7)" fontSize={9} textAnchor="middle">{tStatus(node.status)}</text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
              No hay tableros para este tipo. Crea uno desde el panel de arriba.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
