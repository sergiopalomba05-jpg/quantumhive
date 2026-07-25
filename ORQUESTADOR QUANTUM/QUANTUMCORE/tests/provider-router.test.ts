import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProviderSelection } from '../src/core/providerRouter';

describe('provider router', () => {
  it('uses a requested router-ready OpenAI model when the server has an OpenAI secret', () => {
    const selection = resolveProviderSelection(
      { providerId: 'openai-api', modelId: 'gpt-5.5', message: 'arreglar codigo' },
      { OPENAI_API_KEY: 'secret' } as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'openai-api');
    assert.equal(selection.modelId, 'gpt-5.5');
    assert.equal(selection.fallbackUsed, false);
  });

  it('resolves legacy model-only requests across router-ready providers', () => {
    const selection = resolveProviderSelection(
      { modelId: 'gemini-2.5-pro', message: 'pensar profundo' },
      {} as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'gcp-vertex-ai');
    assert.equal(selection.modelId, 'gemini-2.5-pro');
    assert.equal(selection.fallbackUsed, false);
  });

  it('does not execute browser/headless providers before runners exist', () => {
    const selection = resolveProviderSelection(
      { providerId: 'chatgpt-plus-browser', modelId: 'chatgpt-plan-auto', message: 'codigo' },
      {} as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'gcp-vertex-ai');
    assert.equal(selection.modelId, 'gemini-3.6-flash');
    assert.equal(selection.fallbackUsed, true);
    assert.match(selection.fallbackReason || '', /requiere runner/i);
  });

  it('chooses code-capable API providers before Vertex when available in auto mode', () => {
    const selection = resolveProviderSelection(
      { brainMode: 'auto', message: 'necesito debuggear codigo TypeScript' },
      { OPENAI_API_KEY: 'secret' } as NodeJS.ProcessEnv,
    );

    assert.equal(selection.providerId, 'openai-api');
    assert.equal(selection.modelId, 'gpt-5.5');
  });
});
