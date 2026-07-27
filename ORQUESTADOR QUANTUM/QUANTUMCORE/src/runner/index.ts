import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { initSkillManager, getAllSkillTools, callSkill, importSkillFromGithub } from "./skillManager.js";
import { getAllMcpTools, callMcpTool, connectMcpServer, disconnectMcpServer } from "./mcpManager.js";

const execAsync = promisify(exec);

// La URL a la que se conectará el runner. 
const API_BASE = process.env.QUANTUMCORE_URL || "https://quantumcore-854335368640.us-central1.run.app";

const POLL_INTERVAL = 3000; // Chequear tareas cada 3 segundos

console.log(`🚀 Iniciando Quantum Runner Local...`);
console.log(`🔗 Conectando a QuantumCore en: ${API_BASE}`);

async function registerDynamicTools() {
  try {
    const skills = await getAllSkillTools();
    const mcpTools = await getAllMcpTools();
    
    const allTools = [...skills, ...mcpTools];
    
    console.log(`[Runner] Registrando ${allTools.length} herramientas en la nube...`);
    const response = await fetch(`${API_BASE}/api/runner/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tools: allTools })
    });
    
    if (response.ok) {
      console.log(`✅ Herramientas dinámicas registradas exitosamente.`);
    } else {
      console.error(`❌ Error registrando herramientas: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ Excepción registrando herramientas: ${error.message}`);
  }
}

async function executeTool(toolName: string, args: any): Promise<{ result: string, status: 'completed' | 'failed' }> {
  try {
    // 1. Core Tools
    if (toolName === 'execute_local_command') {
      const command = args.command || args; 
      console.log(`\n⚙️ Ejecutando comando: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      let resultText = stdout;
      if (stderr) resultText += `\n[STDERR]\n${stderr}`;
      return { result: resultText.trim() || "Comando ejecutado sin salida.", status: 'completed' };
    } 
    
    if (toolName === 'view_file') {
      const content = await fs.readFile(args.path, 'utf8');
      return { result: content, status: 'completed' };
    }
    
    if (toolName === 'write_to_file') {
      await fs.writeFile(args.path, args.content, 'utf8');
      return { result: "File written successfully.", status: 'completed' };
    }

    if (toolName === 'multi_replace_file_content') {
      let content = await fs.readFile(args.path, 'utf8');
      for (const chunk of args.chunks) {
        content = content.replace(chunk.targetContent, chunk.replacementContent);
      }
      await fs.writeFile(args.path, content, 'utf8');
      return { result: "File updated successfully.", status: 'completed' };
    }

    // 2. Skill Tool Call
    if (toolName === 'call_skill') {
      const result = await callSkill(args.serverId, args.args);
      return { result: typeof result === 'string' ? result : JSON.stringify(result, null, 2), status: 'completed' };
    }

    // 3. MCP Tool Call
    if (toolName === 'call_mcp_tool') {
      const result = await callMcpTool(args.serverId, args.toolName, args.args);
      return { result: typeof result === 'string' ? result : JSON.stringify(result, null, 2), status: 'completed' };
    }
    
    // 4. Admin Tools
    if (toolName === 'manage_mcp_server') {
      if (args.action === 'connect') {
        await connectMcpServer(args.id, args.name, args.command, args.args);
        await registerDynamicTools();
        return { result: `MCP ${args.name} conectado.`, status: 'completed' };
      }
    }
    if (toolName === 'import_github_skill') {
      const repoName = await importSkillFromGithub(args.url);
      await registerDynamicTools();
      return { result: `Skill ${repoName} importada exitosamente de GitHub.`, status: 'completed' };
    }

    return { result: `Tool no reconocida: ${toolName}`, status: 'failed' };
  } catch (error: any) {
    console.error(`❌ Error en tool ${toolName}:`, error.message);
    const errorText = `${error.message}\n${error.stdout || ""}\n${error.stderr || ""}`;
    return { result: errorText.trim(), status: 'failed' };
  }
}

async function pollJobs() {
  try {
    const response = await fetch(`${API_BASE}/api/runner/jobs/pending`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const data = await response.json() as { jobs: any[] };
    const jobs = data.jobs || [];

    for (const job of jobs) {
      console.log(`\n📥 Tarea recibida [ID: ${job.id}] -> Tool: ${job.tool || 'comando legacy'}`);
      
      const toolName = job.tool || 'execute_local_command';
      const args = job.args || job.command;
      const { result, status } = await executeTool(toolName, args);

      console.log(`📤 Enviando resultado a la nube...`);
      const resultResponse = await fetch(`${API_BASE}/api/runner/jobs/${job.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, status })
      });

      if (!resultResponse.ok) {
        console.error(`❌ Error enviando resultado a la nube: ${resultResponse.status}`);
      } else {
        console.log(`✅ Resultado guardado en la nube.`);
      }
    }
  } catch (error: any) {
    // Silenciamos los errores de conexión de polling
  } finally {
    setTimeout(pollJobs, POLL_INTERVAL);
  }
}

async function boot() {
  await initSkillManager();
  await registerDynamicTools();
  pollJobs();
}

boot();
