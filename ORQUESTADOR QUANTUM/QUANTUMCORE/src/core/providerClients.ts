import { enqueueRunnerJob, waitForRunnerJob, getRunnerDynamicTools } from '../server/routes/runner.js';
import { spawnWorker, killWorker, messageWorker, workerMessageBus } from './workerManager.js';
import { updateKnowledgeGraph } from '../server/routes/graph.js';
import { remember as mementoRemember } from './mementoClient.js';
import { ai } from './providers/ai.js';
import type { ProviderSelectionResult } from './providerRouter.js';

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

const ceoTools = [
  {
    name: "spawn_subagent",
    description: "Spawns a background subagent to perform a task. Use this to delegate work.",
    parameters: {
      type: "OBJECT",
      properties: { role: { type: "STRING" }, task: { type: "STRING" } },
      required: ["role", "task"]
    }
  },
  {
    name: "message_subagent",
    description: "Sends a message or additional instruction to an existing subagent.",
    parameters: {
      type: "OBJECT",
      properties: { workerId: { type: "STRING" }, message: { type: "STRING" } },
      required: ["workerId", "message"]
    }
  },
  {
    name: "kill_subagent",
    description: "Terminates a subagent.",
    parameters: {
      type: "OBJECT",
      properties: { workerId: { type: "STRING" } },
      required: ["workerId"]
    }
  },
  {
    name: "remember_knowledge",
    description: "Store important knowledge (facts, decisions, preferences, rules, people, projects, architecture) in the OS's long-term semantic memory. Use this when the user shares something worth remembering across sessions. This saves to both the Knowledge Graph and Memanto semantic memory.",
    parameters: {
      type: "OBJECT",
      properties: { 
        content: { type: "STRING", description: "The knowledge to remember, in clear natural language." },
        type: { type: "STRING", description: "One of: fact, preference, decision, rule, goal, context, person, project, architecture, business, constraint, feedback, misc" },
        importance: { type: "NUMBER", description: "0.0 to 1.0 — how important is this knowledge?" },
        tags: { type: "ARRAY", items: { type: "STRING" }, description: "Optional tags for categorization" }
      },
      required: ["content", "type"]
    }
  }
];

const workerTools = [
  {
    name: "send_message_to_ceo",
    description: "Send your final results or ask for clarification from the CEO.",
    parameters: {
      type: "OBJECT",
      properties: { message: { type: "STRING" } },
      required: ["message"]
    }
  }
];

async function generateWithVertex(modelId: string, prompt: string, repoFullName?: string, workerId?: string): Promise<string> {
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

  const dynamicTools = getRunnerDynamicTools();
  if (dynamicTools.length > 0) {
    tools.push({
      functionDeclarations: dynamicTools.map(t => {
        // Gemini expects uppercase OBJECT, STRING, etc.
        const convertType = (schema: any): any => {
          if (!schema) return { type: "STRING" };
          let tStr = schema.type ? schema.type.toUpperCase() : "STRING";
          let props = {};
          if (schema.properties) {
             for (const [k, v] of Object.entries(schema.properties)) {
                props[k] = convertType(v);
             }
          }
          return { type: tStr, description: schema.description, properties: Object.keys(props).length ? props : undefined, required: schema.required };
        };
        return {
          name: t.name,
          description: t.description || `Tool from ${t.source}`,
          parameters: convertType(t.parameters)
        };
      })
    });
  }

  // Inject orchestration tools
  if (workerId) {
    tools.push({ functionDeclarations: workerTools });
  } else {
    tools.push({ functionDeclarations: ceoTools });
  }

  const vertexTools = tools.length > 0
    ? [{ functionDeclarations: tools.flatMap((tool) => tool.functionDeclarations || []) }]
    : undefined;

  let currentPrompt = prompt;
  let response = await ai.models.generateContent({ 
    model: modelId, 
    contents: currentPrompt,
    config: vertexTools ? { tools: vertexTools } : undefined
  });

  // Simple function calling loop (max 3 iterations)
  let iterations = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
    iterations++;
    const call = response.functionCalls[0];
    const callArgs = (call.args || {}) as Record<string, any>;
    let result = {};
    
    if (call.name === "query_github_repo" && repoFullName) {
      try {
        const action = callArgs.action;
        const token = process.env.GITHUB_TOKEN || '';
        const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'QuantumCore' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        let url = '';
        if (action === 'list_branches') url = `https://api.github.com/repos/${repoFullName}/branches`;
        else if (action === 'list_commits') url = `https://api.github.com/repos/${repoFullName}/commits`;
        else if (action === 'get_file' && callArgs.path) url = `https://api.github.com/repos/${repoFullName}/contents/${callArgs.path}`;
        
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
    } else if (call.name === "spawn_subagent" && !workerId) {
      const newId = spawnWorker(callArgs.role, callArgs.task, 'gcp-vertex-ai', modelId);
      result = { status: 'success', workerId: newId, message: "Worker spawned and running in background." };
    } else if (call.name === "message_subagent" && !workerId) {
      const ok = await messageWorker(callArgs.workerId, callArgs.message);
      result = { status: ok ? 'success' : 'error', message: ok ? "Message sent" : "Worker not found" };
    } else if (call.name === "kill_subagent" && !workerId) {
      const ok = killWorker(callArgs.workerId);
      result = { status: ok ? 'success' : 'error', message: ok ? "Worker killed" : "Worker not found" };
    } else if (call.name === "send_message_to_ceo" && workerId) {
      workerMessageBus.push({ workerId, message: callArgs.message });
      result = { status: 'success', message: "Message sent to CEO." };
    } else if (call.name === "remember_knowledge" && !workerId) {
      // Dual write: Memanto (semantic) + Graph (structural)
      const mOk = await mementoRemember({
        content: callArgs.content,
        type: callArgs.type || 'misc',
        importance: callArgs.importance || 0.5,
        tags: callArgs.tags || [],
      });
      // Also store in graph for backward compat
      const nodeId = callArgs.content.substring(0, 30).replace(/\s+/g, '_').toLowerCase();
      updateKnowledgeGraph(
        [{ id: nodeId, label: callArgs.content.substring(0, 60), type: callArgs.type, summary: callArgs.content }],
        []
      );
      result = { status: 'success', mementoStored: mOk, message: "Knowledge stored in semantic memory and graph." };
    } else if (call.name === "execute_local_command" || call.name === "view_file" || call.name === "write_to_file" || call.name === "multi_replace_file_content") {
      try {
        const job = enqueueRunnerJob(call.name, callArgs);
        const finishedJob = await waitForRunnerJob(job.id, 60000); // 60s timeout
        result = { status: finishedJob.status, result: finishedJob.result };
      } catch (err: any) {
        result = { status: 'error', error: err.message };
      }
    } else {
      const dynamicTool = getRunnerDynamicTools().find(t => t.name === call.name);
      if (dynamicTool) {
        try {
          const runnerToolName = dynamicTool.source === 'mcp' ? 'call_mcp_tool' : 'call_skill';
          const runnerArgs = { serverId: dynamicTool.serverId, toolName: call.name, args: callArgs };
          const job = enqueueRunnerJob(runnerToolName, runnerArgs);
          const finishedJob = await waitForRunnerJob(job.id, 60000);
          result = { status: finishedJob.status, result: finishedJob.result };
        } catch (err: any) {
          result = { status: 'error', error: err.message };
        }
      }
    }

    response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: currentPrompt }] },
        { role: 'model', parts: [{ functionCall: call }] },
        { role: 'user', parts: [{ functionResponse: { name: call.name, response: result } }] }
      ],
      config: vertexTools ? { tools: vertexTools } : undefined
    });
  }

  return response.text || '';
}

async function generateWithOpenAICompatible(baseUrl: string, apiKey: string, modelId: string, prompt: string, repoFullName?: string, workerId?: string): Promise<string> {
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

  const dynamicTools = getRunnerDynamicTools();
  for (const dt of dynamicTools) {
    tools.push({
      type: "function",
      function: {
        name: dt.name,
        description: dt.description || `Tool from ${dt.source}`,
        parameters: dt.parameters || { type: "object", properties: {} }
      }
    });
  }

  // Inject orchestration tools
  const convertToOpenAI = (arr: any[]) => arr.map(t => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: { type: "object", properties: t.parameters.properties, required: t.parameters.required } }
  }));
  
  if (workerId) {
    tools.push(...convertToOpenAI(workerTools));
  } else {
    tools.push(...convertToOpenAI(ceoTools));
  }

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
         } else if (name === "spawn_subagent" && !workerId) {
           const newId = spawnWorker(args.role, args.task, 'openai-api', modelId);
           toolResultStr = JSON.stringify({ status: 'success', workerId: newId, message: "Worker spawned." });
         } else if (name === "message_subagent" && !workerId) {
           const ok = await messageWorker(args.workerId, args.message);
           toolResultStr = JSON.stringify({ status: ok ? 'success' : 'error' });
         } else if (name === "kill_subagent" && !workerId) {
           const ok = killWorker(args.workerId);
           toolResultStr = JSON.stringify({ status: ok ? 'success' : 'error' });
         } else if (name === "send_message_to_ceo" && workerId) {
           workerMessageBus.push({ workerId, message: args.message });
           toolResultStr = JSON.stringify({ status: 'success' });
         } else if (name === "remember_knowledge" && !workerId) {
           const mOk = await mementoRemember({
             content: args.content,
             type: args.type || 'misc',
             importance: args.importance || 0.5,
             tags: args.tags || [],
           });
           const nodeId = (args.content || '').substring(0, 30).replace(/\s+/g, '_').toLowerCase();
           updateKnowledgeGraph(
             [{ id: nodeId, label: (args.content || '').substring(0, 60), type: args.type, summary: args.content }],
             []
           );
           toolResultStr = JSON.stringify({ status: 'success', mementoStored: mOk, message: "Knowledge stored." });
         } else if (name === "execute_local_command" || name === "view_file" || name === "write_to_file" || name === "multi_replace_file_content") {
           try {
             const job = enqueueRunnerJob(name, args);
             const finishedJob = await waitForRunnerJob(job.id, 60000);
             toolResultStr = JSON.stringify({ status: finishedJob.status, result: finishedJob.result });
            } catch (err: any) {
             toolResultStr = JSON.stringify({ status: 'error', error: err.message });
           }
        } else {
           const dynamicTool = getRunnerDynamicTools().find(t => t.name === name);
           if (dynamicTool) {
             try {
               const runnerToolName = dynamicTool.source === 'mcp' ? 'call_mcp_tool' : 'call_skill';
               const runnerArgs = { serverId: dynamicTool.serverId, toolName: name, args: args };
               const job = enqueueRunnerJob(runnerToolName, runnerArgs);
               const finishedJob = await waitForRunnerJob(job.id, 60000);
               toolResultStr = JSON.stringify({ status: finishedJob.status, result: finishedJob.result });
             } catch (err: any) {
               toolResultStr = JSON.stringify({ status: 'error', error: err.message });
             }
           } else {
             toolResultStr = JSON.stringify({ error: "Unknown tool" });
           }
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

export async function generateWithProvider(request: ProviderChatRequest, workerId?: string): Promise<ProviderChatResult> {
  const env = request.env || process.env;
  const { selection, prompt } = request;

  if (selection.providerId === 'gcp-vertex-ai') {
    return {
      text: await generateWithVertex(selection.modelId, prompt, request.repoFullName, workerId),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId === 'openai-api') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    return {
      text: await generateWithOpenAICompatible('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, selection.modelId, prompt, request.repoFullName, workerId),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId === 'openrouter-api') {
    if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
    return {
      text: await generateWithOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, selection.modelId, prompt, request.repoFullName, workerId),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  if (selection.providerId.startsWith('custom-') && selection.customProvider) {
    const chatUrl = selection.customProvider.baseUrl.replace(/\/$/, '') + '/chat/completions';
    return {
      text: await generateWithOpenAICompatible(chatUrl, selection.customProvider.apiKey, selection.modelId, prompt, request.repoFullName, workerId),
      providerId: selection.providerId,
      modelId: selection.modelId,
    };
  }

  throw new Error(`Provider ${selection.providerId} is not executable yet`);
}
