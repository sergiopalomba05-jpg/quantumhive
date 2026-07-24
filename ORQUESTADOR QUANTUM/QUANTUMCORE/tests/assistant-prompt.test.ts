import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSectionAssistantPrompt } from '../src/components/assistants/sectionPromptModel';

describe('section assistant prompt model', () => {
  it('builds a Spanish prompt for Agent Builder', () => {
    const prompt = getSectionAssistantPrompt('/agent-builder', 'Asistente Constructor de Agentes');

    assert.equal(prompt.tipId, 'assistant-tip:/agent-builder');
    assert.equal(prompt.title, 'Queres que te ayude a crear tu agente?');
    assert.match(prompt.body, /rol, cerebro, worker, herramientas/);
  });

  it('falls back to a generic Spanish prompt', () => {
    const prompt = getSectionAssistantPrompt('/unknown', 'Asistente Global');

    assert.equal(prompt.title, 'Queres ayuda con esta seccion?');
  });
});
