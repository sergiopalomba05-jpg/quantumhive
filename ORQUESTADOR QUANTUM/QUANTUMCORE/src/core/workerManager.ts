import { v4 as uuidv4 } from 'uuid';
import { generateWithProvider } from './providerClients.js';
import { resolveProviderSelection } from './providerRouter.js';

export interface WorkerMessage {
  role: 'user' | 'model';
  content: string;
}

export interface WorkerInstance {
  id: string;
  role: string;
  task: string;
  status: 'running' | 'idle' | 'error' | 'finished';
  messages: WorkerMessage[];
  createdAt: number;
}

const activeWorkers = new Map<string, WorkerInstance>();

// Global callback to notify CEO (implemented via SSE or websockets in the future, for now just logged or polled)
export const workerMessageBus: { workerId: string, message: string }[] = [];

export function getActiveWorkers(): WorkerInstance[] {
  return Array.from(activeWorkers.values());
}

export function spawnWorker(role: string, task: string, providerId: string, modelId: string): string {
  const workerId = uuidv4();
  
  const newWorker: WorkerInstance = {
    id: workerId,
    role,
    task,
    status: 'running',
    messages: [
      { role: 'user', content: `Eres un subagente (Worker) especializado en el rol: ${role}. Tu tarea principal es: ${task}. Puedes usar herramientas locales si es necesario. Cuando termines o necesites ayuda de tu supervisor, usa la herramienta 'send_message_to_ceo' para informarle.` }
    ],
    createdAt: Date.now()
  };
  
  activeWorkers.set(workerId, newWorker);
  
  // Fire and forget the loop
  runWorkerLoop(workerId, providerId, modelId).catch(err => {
    console.error(`[Worker ${workerId}] Fatal error:`, err);
    const worker = activeWorkers.get(workerId);
    if (worker) worker.status = 'error';
  });

  return workerId;
}

export function killWorker(workerId: string): boolean {
  return activeWorkers.delete(workerId);
}

export async function messageWorker(workerId: string, message: string): Promise<boolean> {
  const worker = activeWorkers.get(workerId);
  if (!worker) return false;
  
  worker.messages.push({ role: 'user', content: message });
  
  // Restart the loop if it was idle
  if (worker.status !== 'running') {
    worker.status = 'running';
    runWorkerLoop(workerId, 'gcp-vertex-ai', 'gemini-2.5-flash').catch(err => {
      console.error(`[Worker ${workerId}] Fatal error:`, err);
      worker.status = 'error';
    });
  }
  
  return true;
}

async function runWorkerLoop(workerId: string, providerId: string, modelId: string) {
  const worker = activeWorkers.get(workerId);
  if (!worker) return;

  const maxTurns = 15; // Prevent infinite loops
  let turns = 0;

  while (worker.status === 'running' && turns < maxTurns) {
    turns++;
    
    // Compile history into a prompt for the model
    // Note: generateWithProvider is currently stateless and takes a single string prompt.
    // For a real multi-turn conversation without a dedicated memory table, we format it.
    let fullPrompt = worker.messages.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');
    fullPrompt += '\n\nMODEL:';

    const selection = resolveProviderSelection({ 
      brainMode: 'normal', 
      providerId: providerId, 
      modelId: modelId, 
      message: fullPrompt 
    });

    try {
      // In providerClients.ts we'll need to intercept 'send_message_to_ceo' specifically for this worker.
      // We pass the workerId in the prompt so it knows.
      const response = await generateWithProvider({
        selection,
        prompt: fullPrompt,
      }, workerId); // We will modify generateWithProvider to accept a workerId

      worker.messages.push({ role: 'model', content: response.text });
      
      // If the model didn't call send_message_to_ceo, we assume it's waiting or idle?
      // Actually, if it finishes processing, it goes idle.
      worker.status = 'idle';

    } catch (err: any) {
      console.error(`[Worker ${workerId}] Error in turn:`, err);
      worker.status = 'error';
      break;
    }
  }
  
  if (turns >= maxTurns && worker.status === 'running') {
    worker.status = 'error';
    worker.messages.push({ role: 'model', content: 'Terminated due to excessive loop turns.' });
  }
}
