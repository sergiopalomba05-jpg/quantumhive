import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { simpleGit } from 'simple-git';
import { DynamicTool } from '../server/routes/runner.js';
import { pathToFileURL } from 'node:url';

const SKILLS_DIR = path.join(homedir(), '.quantumcore', 'skills');

type SkillModule = {
  name: string;
  description: string;
  parameters: any;
  run: (args: any) => Promise<any>;
};

const loadedSkills = new Map<string, SkillModule>();

export async function initSkillManager() {
  await fs.mkdir(SKILLS_DIR, { recursive: true });
  await reloadSkills();
}

export async function reloadSkills() {
  loadedSkills.clear();
  console.log(`[Skill Manager] Escaneando skills en ${SKILLS_DIR}...`);
  
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      // Si es un directorio (ej. clonado de git), buscamos un index.js o la skill principal
      if (entry.isDirectory()) {
        const indexPath = path.join(SKILLS_DIR, entry.name, 'index.js');
        await loadSkillFile(indexPath, entry.name);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
        const filePath = path.join(SKILLS_DIR, entry.name);
        await loadSkillFile(filePath, path.basename(entry.name, path.extname(entry.name)));
      }
    }
  } catch (error) {
    console.error('[Skill Manager] Error leyendo skills:', error);
  }
}

async function loadSkillFile(filePath: string, id: string) {
  try {
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats) return;

    // Usar import dinamico. Necesitamos file:// url en Windows
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);
    
    if (module.name && module.run) {
      loadedSkills.set(id, {
        name: module.name,
        description: module.description || '',
        parameters: module.parameters || { type: 'object', properties: {} },
        run: module.run
      });
      console.log(`[Skill Manager] Skill cargada: ${module.name}`);
    } else {
      console.warn(`[Skill Manager] El archivo ${filePath} no exporta 'name' o 'run'.`);
    }
  } catch (error) {
    console.error(`[Skill Manager] Error cargando skill ${filePath}:`, error);
  }
}

export async function getAllSkillTools(): Promise<DynamicTool[]> {
  const allTools: DynamicTool[] = [];
  
  for (const [id, skill] of loadedSkills.entries()) {
    allTools.push({
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
      source: 'skill',
      serverId: id
    });
  }
  
  return allTools;
}

export async function callSkill(skillId: string, args: any): Promise<any> {
  const skill = loadedSkills.get(skillId);
  if (!skill) {
    throw new Error(`Skill ${skillId} no encontrada.`);
  }
  
  console.log(`[Skill Manager] Ejecutando skill ${skill.name}...`);
  return await skill.run(args);
}

export async function importSkillFromGithub(repoUrl: string): Promise<string> {
  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown-skill';
  const targetDir = path.join(SKILLS_DIR, repoName);
  
  console.log(`[Skill Manager] Clonando repositorio ${repoUrl} en ${targetDir}...`);
  
  try {
    const stats = await fs.stat(targetDir).catch(() => null);
    if (stats) {
      // Pull if it exists
      const git = simpleGit(targetDir);
      await git.pull();
      console.log(`[Skill Manager] Repositorio actualizado.`);
    } else {
      // Clone if it doesn't exist
      const git = simpleGit();
      await git.clone(repoUrl, targetDir);
      console.log(`[Skill Manager] Repositorio clonado.`);
    }
    
    await reloadSkills();
    return repoName;
  } catch (error) {
    console.error(`[Skill Manager] Error clonando repositorio ${repoUrl}:`, error);
    throw error;
  }
}
