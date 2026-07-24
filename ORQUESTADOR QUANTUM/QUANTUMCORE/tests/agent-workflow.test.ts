import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStarterAgentWorkflow } from '../src/workflows/runtime';

describe('agent workflow creation', () => {
  it('names the starter workflow after the created agent', () => {
    const workflow = createStarterAgentWorkflow('agent_77', 'Agente Ventas');

    assert.equal(workflow.agentId, 'agent_77');
    assert.equal(workflow.name, 'Workflow inicial - Agente Ventas');
  });
});
