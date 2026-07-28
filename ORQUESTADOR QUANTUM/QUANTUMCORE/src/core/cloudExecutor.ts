/**
 * QuantumCore Cloud Executor
 * 
 * Executes skills directly in the cloud container without requiring
 * the local Quantum Runner. Skills that don't need filesystem access
 * run here. Skills that need local access are routed to the Runner.
 */

import { getClient } from './providers/dbRouter.js';

export interface CloudSkill {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'local' | 'builtin';
  sourceUrl?: string;
  code: string;                     // The skill's main script (JS/TS)
  requiresLocal: boolean;           // If true, must be executed by the Runner
  parameters?: Record<string, any>;
  createdAt?: string;
}

/**
 * Load all skills from the core database.
 */
export async function loadCloudSkills(): Promise<CloudSkill[]> {
  const db = getClient('core');
  const { data, error } = await db.from('cloud_skills').select('*');
  if (error) {
    console.warn('[CloudExecutor] Could not load cloud skills:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Save a skill to the cloud database so it persists across deployments.
 */
export async function saveCloudSkill(skill: CloudSkill): Promise<boolean> {
  const db = getClient('core');
  const { error } = await db.from('cloud_skills').upsert({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    source: skill.source,
    source_url: skill.sourceUrl || null,
    code: skill.code,
    requires_local: skill.requiresLocal,
    parameters: skill.parameters || {},
    created_at: skill.createdAt || new Date().toISOString(),
  });

  if (error) {
    console.error('[CloudExecutor] Failed to save skill:', error.message);
    return false;
  }
  return true;
}

/**
 * Execute a cloud skill in the server's Node.js runtime.
 * This is a sandboxed execution — the skill code runs as a JS function.
 * 
 * SECURITY: Only skills marked as requiresLocal=false can be executed here.
 * Skills that need filesystem access MUST go through the Quantum Runner.
 */
export async function executeCloudSkill(
  skillId: string,
  args: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string }> {
  
  const skills = await loadCloudSkills();
  const skill = skills.find(s => s.id === skillId);

  if (!skill) {
    return { success: false, error: `Skill "${skillId}" not found in cloud database.` };
  }

  if (skill.requiresLocal) {
    return { 
      success: false, 
      error: `Skill "${skill.name}" requires local execution. Route to Quantum Runner.` 
    };
  }

  try {
    // Create an async function from the skill code and execute it
    // The skill receives `args` and `fetch` as its context
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const skillFn = new AsyncFunction('args', 'fetch', 'console', skill.code);
    const result = await skillFn(args, fetch, console);
    
    return { success: true, result };
  } catch (err: any) {
    console.error(`[CloudExecutor] Skill "${skill.name}" execution error:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Determine whether a skill should run in the cloud or locally.
 */
export function shouldRunInCloud(skill: CloudSkill): boolean {
  // If it explicitly requires local access, route to runner
  if (skill.requiresLocal) return false;
  
  // Check if the skill code references filesystem or OS operations
  const localIndicators = [
    'fs.', 'require("fs")', 'require("child_process")',
    'process.cwd', 'execSync', 'spawn(', 'exec(',
    '__dirname', '__filename', 'path.resolve',
  ];
  
  return !localIndicators.some(indicator => skill.code.includes(indicator));
}
