import '@xyflow/react/dist/style.css';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import { WorkflowDefinition } from '../../workflows/types';

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition;
}

export function WorkflowCanvas({ workflow }: WorkflowCanvasProps) {
  const nodes = workflow.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: `${node.title}\n${node.kind}` },
    type: 'default',
  }));

  const edges = workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));

  return (
    <div className="h-[560px] overflow-hidden rounded-xl border border-qh-border bg-slate-950">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
