import { ai } from './providers/ai';
import type { ProviderSelectionResult } from './providerRouter';
import { enqueueRunnerJob, waitForRunnerJob } from '../server/routes/runner';

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

  // Add the local runner tools
  tools.push({
    functionDeclarations: [
      {
        name: "execute_local_command",
        description: "Execute a command on the user's local machine via Quantum Runner. CRITICAL: The local machine is running WINDOWS. You MUST use Windows commands (e.g., 'dir' instead of 'ls', 'type' instead of 'cat').",
        parameters: {
          type: "OBJECT",
          properties: { command: { type: "STRING" } },
          required: ["command"]
        }
      },
      {
        name: "view_file",
        description: "View the contents of a file on the user's local machine. Provide an absolute path or path relative to the project root.",
        parameters: {
          type: "OBJECT",
          properties: { path: { type: "STRING" } },
          required: ["path"]
        }
      },
      {
        name: "write_to_file",
        description: "Create or overwrite a file on the user's local machine with the given content.",
        parameters: {
          type: "OBJECT",
          properties: { path: { type: "STRING" }, content: { type: "STRING" } },
          required: ["path", "content"]
        }
      },
      {
        name: "multi_replace_file_content",
        description: "Replace exact chunks of text in a local file. Use this to edit specific parts of a file.",
        parameters: {
          type: "OBJECT",
          properties: { 
            path: { type: "STRING" }, 
            chunks: { 
              type: "ARRAY", 
              items: {
                type: "OBJECT",
                properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } },
                required: ["targetContent", "replacementContent"]
              }
            } 
          },
          required: ["path", "chunks"]
        }
      }
    ]
  });

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
    } else if (call.name === "execute_local_command" || call.name === "view_file" || call.name === "write_to_file" || call.name === "multi_replace_file_content") {
      try {
        const job = enqueueRunnerJob(call.name, call.args);
        const finishedJob = await waitForRunnerJob(job.id, 60000); // 60s timeout
        result = { status: finishedJob.status, result: finishedJob.result };
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

async function generateWithOpenAICompatible(baseUrl: string, apiKey: string, modelId: string, prompt: string, repoFullName?: string): Promise<string> {
  const tools: any[] = [];
  
  if (repoFullName) {
    tools.push({
      type: "function",
      function: {
        name: "query_github_repo",
        description: `Query the connected GitHub repository (${repoFullName}) to list branches or get file contents.`,
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", description: "The action to perform: 'list_branches', 'list_commits', or 'get_file'." },
            path: { type: "string", description: "The file path if action is 'get_file'." }
          },
          required: ["action"]
        }
      }
    });
  }

  // Add the local runner tools
  tools.push(
    {
      type: "function",
      function: {
        name: "execute_local_command",
        description: "Execute a command on the user's local machine via Quantum Runner. CRITICAL: The local machine is running WINDOWS. You MUST use Windows commands.",
        parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] }
      }
    },
    {
      type: "function",
      function: {
        name: "view_file",
        description: "View the contents of a file on the user's local machine.",
        parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
      }
    },
    {
      type: "function",
      function: {
        name: "write_to_file",
        description: "Create or overwrite a file on the user's local machine.",
        parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] }
      }
    },
    {
      type: "function",
      function: {
        name: "multi_replace_file_content",
        description: "Replace exact chunks of text in a local file.",
        parameters: {
          type: "object",
          properties: { 
            path: { type: "string" }, 
            chunks: { 
              type: "array", 
              items: {
                type: "object",
                properties: { targetContent: { type: "string" }, replacementContent: { type: "string" } },
                required: ["targetContent", "replacementContent"]
              }
            } 
          },
          required: ["path", "chunks"]
        }
      }
    }
  );

  let messages: any[] = [{ role: 'user', content: prompt }];
  let iterations = 0;
  let finalResponse = '';

  while (iterations < 5) {
    iterations++;
    
    const body: any = {
      model: modelId,
      messages: messages,
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Provider request failed: ${response.status} - ${errText}`);
    }

    const data = await response.json() as any;
    const message = data.choices?.[0]?.message;
    
    if (!message) break;
    
    finalResponse = message.content || '';
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message); // Append the assistant's tool call message
      
      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}
        
        let toolResultStr = "";

        if (name === "query_github_repo" && repoFullName) {
           // Reuse the github logic (simplified)
           toolResultStr = JSON.stringify({ status: "error", error: "Please use local runner for repo files." });
        } else if (name === "execute_local_command" || name === "view_file" || name === "write_to_file" || name === "multi_replace_file_content") {
           try {
             const job = enqueueRunnerJob(name, args);
             const finishedJob = await waitForRunnerJob(job.id, 60000);
             toolResultStr = JSON.stringify({ status: finishedJob.status, result: finishedJob.result });
           } catch (err: any) {
             toolResultStr = JSON.stringify({ status: 'error', error: err.message });
           }
        } else {
           toolResultStr = JSON.stringify({ error: "Unknown tool" });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultStr
        });
      }
    } else {
      break; // No more tool calls, we're done
    }
  }

  return finalResponse;
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
      text: await generateWithOpenAICompatible('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, selection.modelId, prompt, request.repoFullName),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId === 'openrouter-api') {
    if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
    return {
      text: await generateWithOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, selection.modelId, prompt, request.repoFullName),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId.startsWith('custom-') && selection.customProvider) {
    const chatUrl = selection.customProvider.baseUrl.replace(/\/$/, '') + '/chat/completions';
    return {
      text: await generateWithOpenAICompatible(chatUrl, selection.customProvider.apiKey, selection.modelId, prompt, request.repoFullName),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  throw new Error(`Provider ${selection.providerId} is not executable yet`);
}

