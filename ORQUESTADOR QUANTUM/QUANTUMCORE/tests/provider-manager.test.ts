import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getProviderRegistry, getProviderTemplates } from '../src/core/aiProviders';

describe('provider manager registry', () => {
  it('lists API, cloud, browser, headless, and local provider templates', () => {
    const kinds = new Set(getProviderTemplates().map((provider) => provider.kind));

    assert.equal(kinds.has('api'), true);
    assert.equal(kinds.has('cloud'), true);
    assert.equal(kinds.has('browser'), true);
    assert.equal(kinds.has('headless'), true);
    assert.equal(kinds.has('local'), true);
  });

  it('does not expose secret values when env vars are present', () => {
    const registry = getProviderRegistry({
      OPENAI_API_KEY: 'sk-real-secret',
      ANTHROPIC_API_KEY: 'anthropic-secret',
      OPENROUTER_API_KEY: 'openrouter-secret',
    } as NodeJS.ProcessEnv);
    const serialized = JSON.stringify(registry);

    assert.equal(registry.find((provider) => provider.id === 'openai-api')?.hasSecret, true);
    assert.equal(registry.find((provider) => provider.id === 'anthropic-api')?.hasSecret, true);
    assert.equal(registry.find((provider) => provider.id === 'openrouter-api')?.hasSecret, true);
    assert.doesNotMatch(serialized, /sk-real-secret|anthropic-secret|openrouter-secret/);
  });

  it('marks browser and headless plan providers as requiring runners', () => {
    const registry = getProviderRegistry({} as NodeJS.ProcessEnv);

    assert.equal(registry.find((provider) => provider.id === 'chatgpt-plus-browser')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'chatgpt-plus-headless')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'claude-pro-browser')?.status, 'requires_runner');
    assert.equal(registry.find((provider) => provider.id === 'claude-pro-headless')?.status, 'requires_runner');
  });
});
