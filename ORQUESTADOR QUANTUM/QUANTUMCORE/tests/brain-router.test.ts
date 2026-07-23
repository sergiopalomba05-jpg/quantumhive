import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BRAIN_MODELS, resolveBrainSelection } from '../src/core/brainRouter';

describe('brain router', () => {
  it('uses a connected Gemini model when requested manually', () => {
    const result = resolveBrainSelection({ brainMode: 'manual', modelId: 'gemini-2.5-pro', message: 'analiza este contexto' });

    assert.equal(result.requestedModelId, 'gemini-2.5-pro');
    assert.equal(result.usedModelId, 'gemini-2.5-pro');
    assert.equal(result.provider, 'vertex');
    assert.equal(result.fallbackUsed, false);
  });

  it('falls back to Gemini when the requested model is not connected', () => {
    const result = resolveBrainSelection({ brainMode: 'manual', modelId: 'claude-sonnet-5', message: 'escribi codigo' });

    assert.equal(result.requestedModelId, 'claude-sonnet-5');
    assert.equal(result.usedModelId, 'gemini-2.5-flash');
    assert.equal(result.provider, 'vertex');
    assert.equal(result.fallbackUsed, true);
    assert.match(result.fallbackReason || '', /todavia no conectado/i);
  });

  it('recommends code-capable catalog entries without forcing them in auto mode', () => {
    const result = resolveBrainSelection({ brainMode: 'auto', message: 'revisa este codigo y escribi el fix' });

    assert.equal(result.usedModelId, 'gemini-2.5-flash');
    assert.equal(result.recommendedModelId, 'claude-sonnet-5');
    assert.equal(result.fallbackUsed, true);
  });

  it('exposes visual catalog metadata for the chat selector', () => {
    const claude = BRAIN_MODELS.find((model) => model.id === 'claude-sonnet-5');

    assert.equal(claude?.displayName, 'Claude Sonnet 5');
    assert.equal(claude?.status, 'not_connected');
    assert.equal(claude?.recommendedFor.includes('codigo'), true);
  });
});
