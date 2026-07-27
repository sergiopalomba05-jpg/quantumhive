import { Router } from "express";
import { randomUUID } from "node:crypto";

export const runnerRouter = Router();

type RunnerJob = {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
};

// In-memory queue for MVP
const jobs = new Map<string, RunnerJob>();

export function enqueueRunnerJob(command: string): RunnerJob {
  const id = randomUUID();
  const job: RunnerJob = { id, command, status: 'pending', createdAt: Date.now() };
  jobs.set(id, job);
  return job;
}

export async function waitForRunnerJob(id: string, timeoutMs = 30000): Promise<RunnerJob> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = jobs.get(id);
    if (!job) throw new Error("Job not found");
    if (job.status === 'completed' || job.status === 'failed') return job;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Timeout waiting for runner");
}

// 1. Endpoint para encolar un comando (Usado por interfaz web si se quiere)
runnerRouter.post('/runner/jobs', (req, res) => {
  const { command } = req.body;
  if (!command) {
    res.status(400).json({ error: "command is required" });
    return;
  }
  const job = enqueueRunnerJob(command);
  res.status(201).json(job);
});

// 2. Endpoint para el Runner Local: Buscar trabajos pendientes
runnerRouter.get('/runner/jobs/pending', (req, res) => {
  const pendingJobs = Array.from(jobs.values()).filter(j => j.status === 'pending');
  // Marcarlos como en proceso
  pendingJobs.forEach(j => { j.status = 'running'; });
  res.json({ jobs: pendingJobs });
});

// 3. Endpoint para el Runner Local: Enviar el resultado del comando
runnerRouter.post('/runner/jobs/:id/result', (req, res) => {
  const { id } = req.params;
  const { result, status } = req.body;
  
  const job = jobs.get(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  job.status = status || 'completed';
  job.result = result;
  res.json(job);
});

// 4. Endpoint para chequear estado de un job (Dominus chequea si ya terminó)
runnerRouter.get('/runner/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});
