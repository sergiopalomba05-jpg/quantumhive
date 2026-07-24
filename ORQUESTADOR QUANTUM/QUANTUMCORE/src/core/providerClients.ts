import { ai } from './providers/ai';
import type { ProviderSelectionResult } from './providerRouter';

export interface ProviderChatRequest {
  selection: ProviderSelectionResult;
  prompt: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProviderChatResult {
  text: string;
  providerId: string;
  modelId: string;
}

async function generateWithVertex(modelId: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({ model: modelId, contents: prompt });
  return response.text || '';
}

async function generateWithOpenAICompatible(baseUrl: string, apiKey: string, modelId: string, prompt: string): Promise<string> {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Provider request failed: ${response.status}`);

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

export async function generateWithProvider(request: ProviderChatRequest): Promise<ProviderChatResult> {
  const env = request.env || process.env;
  const { selection, prompt } = request;

  if (selection.providerId === 'gcp-vertex-ai') {
    return {
      text: await generateWithVertex(selection.modelId, prompt),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId === 'openai-api') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    return {
      text: await generateWithOpenAICompatible('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, selection.modelId, prompt),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId === 'openrouter-api') {
    if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
    return {
      text: await generateWithOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, selection.modelId, prompt),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  throw new Error(`Provider ${selection.providerId} is not executable yet`);
}
