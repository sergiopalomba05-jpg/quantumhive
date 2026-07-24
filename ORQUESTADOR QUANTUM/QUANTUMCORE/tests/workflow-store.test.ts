import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useStore } from '../src/store/useStore';
import { createStarterAgentWorkflow, simulateWorkflowRun } from '../src/workflows/runtime';

describe('workflow store integration', () => {
  it('stores workflow definitions and workflow runs', () => {
    useStore.getState().resetData();
    const initialWorkflowCount = useStore.getState().workflowDefinitions.length;
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const run = simulateWorkflowRun(workflow);

    useStore.getState().addWorkflowDefinition(workflow);
    useStore.getState().addWorkflowRun(run);

    assert.equal(useStore.getState().workflowDefinitions.length, initialWorkflowCount + 1);
    assert.equal(useStore.getState().workflowRuns.length, 1);
    assert.equal(useStore.getState().workflowDefinitions[0].name, 'Workflow inicial - CEO Test');
  });

  it('updates workflow definitions by id', () => {
    useStore.getState().resetData();
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');

    useStore.getState().addWorkflowDefinition(workflow);
    useStore.getState().updateWorkflowDefinition(workflow.id, { name: 'Workflow actualizado' });

    assert.equal(useStore.getState().workflowDefinitions[0].name, 'Workflow actualizado');
  });
});
