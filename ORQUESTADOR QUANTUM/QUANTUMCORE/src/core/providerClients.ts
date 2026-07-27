import { ai } from './providers/ai';
import type { ProviderSelectionResult } from './providerRouter';

export interface ProviderChatRequest {
  selection: ProviderSelectionResult;
  prompt: string;
  repoFullName?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProviderChatResult {
  text: string;
  providerId: string;
  modelId: string;
}

async function generateWithVertex(modelId: string, prompt: string, repoFullName?: string): Promise<string> {
  const tools: any = [];
  if (repoFullName) {
    tools.push({
      functionDeclarations: [
        {
          name: "query_github_repo",
          description: `Query the connected GitHub repository (${repoFullName}) to list branches or get file contents.`,
          parameters: {
            type: "OBJECT",
            properties: {
              action: {
                type: "STRING",
                description: "The action to perform: 'list_branches', 'list_commits', or 'get_file'."
              },
              path: {
                type: "STRING",
                description: "The file path if action is 'get_file'."
              }
            },
            required: ["action"]
          }
        }
      ]
    });
  }

  let currentPrompt = prompt;
  let response = await ai.models.generateContent({ 
    model: modelId, 
    contents: currentPrompt,
    config: tools.length > 0 ? { tools } : undefined
  });

  // Simple function calling loop (max 3 iterations)
  let iterations = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
    iterations++;
    const call = response.functionCalls[0];
    let result = {};
    
    if (call.name === "query_github_repo" && repoFullName) {
      try {
        const action = call.args.action;
        const token = process.env.GITHUB_TOKEN || '';
        const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'QuantumCore' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        let url = '';
        if (action === 'list_branches') url = `https://api.github.com/repos/${repoFullName}/branches`;
        else if (action === 'list_commits') url = `https://api.github.com/repos/${repoFullName}/commits`;
        else if (action === 'get_file' && call.args.path) url = `https://api.github.com/repos/${repoFullName}/contents/${call.args.path}`;
        
        if (url) {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            if (action === 'get_file' && data.content) {
               data.content_decoded = Buffer.from(data.content, 'base64').toString('utf-8').substring(0, 1000) + '...';
            }
            result = { status: 'success', data: Array.isArray(data) ? data.slice(0, 10) : data };
          } else {
            result = { status: 'error', error: `GitHub API error: ${res.status}` };
          }
        }
      } catch (err: any) {
        result = { status: 'error', error: err.message };
      }
    }

    response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: currentPrompt }] },
        { role: 'model', parts: [{ functionCall: call }] },
        { role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] }
      ],
      config: { tools }
    });
  }

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
      text: await generateWithVertex(selection.modelId, prompt, request.repoFullName),
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
