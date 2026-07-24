import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GCP_VERTEX_MODELS, getProviderRegistry } from '../src/core/aiProviders';
import { BRAIN_MODELS } from '../src/core/brainRouter';

describe('GCP Vertex model registry', () => {
  it('offers a broader Gemini catalog than the two verified router models', () => {
    const geminiModels = GCP_VERTEX_MODELS.filter((model) => model.family === 'gemini');

    assert.equal(geminiModels.length >= 8, true);
    assert.equal(geminiModels.some((model) => model.id === 'gemini-2.5-flash'), true);
    assert.equal(geminiModels.some((model) => model.id === 'gemini-2.5-pro'), true);
    assert.equal(geminiModels.some((model) => model.id === 'gemini-2.5-flash-lite'), true);
    assert.equal(geminiModels.some((model) => model.capabilities.includes('image')), true);
    assert.equal(geminiModels.some((model) => model.capabilities.includes('audio')), true);
  });

  it('marks only Cloud Run verified Gemini models as router-ready', () => {
    const routerReady = GCP_VERTEX_MODELS.filter((model) => model.routerReady).map((model) => model.id);

    assert.deepEqual(routerReady, ['gemini-2.5-flash', 'gemini-2.5-pro']);
    assert.equal(BRAIN_MODELS.filter((model) => model.provider === 'vertex' && model.status === 'available').length, 2);
  });

  it('returns provider metadata without secret values', () => {
    const registry = getProviderRegistry();
    const serialized = JSON.stringify(registry).toLowerCase();

    assert.equal(registry.some((provider) => provider.id === 'gcp-vertex-ai'), true);
    assert.equal(registry.find((provider) => provider.id === 'gcp-vertex-ai')?.models.length, GCP_VERTEX_MODELS.length);
    assert.doesNotMatch(serialized, /apikey|api_key|secretkey|password|tokenvalue/);
  });
});
