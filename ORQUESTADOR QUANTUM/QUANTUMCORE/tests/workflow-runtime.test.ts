import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createStarterAgentWorkflow,
  exportWorkflowJson,
  simulateWorkflowRun,
  validateWorkflow,
} from '../src/workflows/runtime';

describe('QuantumHive workflow runtime', () => {
  it('creates a starter agent workflow with trigger, agent, approval, worker, memory, and audit nodes', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');

    assert.equal(workflow.agentId, 'agent_1');
    assert.equal(workflow.name, 'Workflow inicial - CEO Test');
    assert.deepEqual(
      workflow.nodes.map((node) => node.kind),
      ['trigger', 'agent', 'approval', 'worker', 'memory', 'audit']
    );
    assert.equal(workflow.edges.length, 5);
  });

  it('validates that every edge points to existing nodes', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    workflow.edges[0] = { ...workflow.edges[0], target: 'missing_node' };

    const result = validateWorkflow(workflow);

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, ['La conexion edge_trigger_agent apunta a un nodo inexistente.']);
  });

  it('simulates runs without executing real external actions', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const run = simulateWorkflowRun(workflow);

    assert.equal(run.workflowId, workflow.id);
    assert.equal(run.status, 'completed_mock');
    assert.equal(run.steps.length, workflow.nodes.length);
    assert.ok(run.steps.every((step) => step.executionMode === 'mock'));
  });

  it('exports stable QuantumHive workflow JSON', () => {
    const workflow = createStarterAgentWorkflow('agent_1', 'CEO Test');
    const exported = JSON.parse(exportWorkflowJson(workflow));

    assert.equal(exported.schemaVersion, 'qh.workflow.v1');
    assert.equal(exported.name, 'Workflow inicial - CEO Test');
    assert.equal(exported.nodes.length, 6);
  });
});
