import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { generateWithProvider } from '../src/core/providerClients';
import { ai } from '../src/core/providers/ai';

const originalGenerateContent = ai.models.generateContent.bind(ai.models);

describe('Vertex provider client', () => {
  afterEach(() => {
    ai.models.generateContent = originalGenerateContent;
  });

  it('uses the shared Gemini client for Vertex requests', async () => {
    let requestedModel = '';
    let toolsLength = 0;
    ai.models.generateContent = async (request: any) => {
      requestedModel = request.model;
      toolsLength = request.config?.tools?.length ?? 0;
      return { text: 'respuesta ok' } as any;
    };

    const result = await generateWithProvider({
      selection: {
        providerId: 'gcp-vertex-ai',
        providerName: 'Google Vertex AI',
        modelId: 'gemini-2.5-flash',
        modelDisplayName: 'Gemini 2.5 Flash',
        fallbackUsed: false,
      },
      prompt: 'hola',
    });

    assert.equal(result.text, 'respuesta ok');
    assert.equal(result.providerId, 'gcp-vertex-ai');
    assert.equal(result.modelId, 'gemini-2.5-flash');
    assert.equal(requestedModel, 'gemini-2.5-flash');
    assert.equal(toolsLength, 1);
  });
});
