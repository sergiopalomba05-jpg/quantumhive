import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";

const execAsync = promisify(exec);

// La URL a la que se conectará el runner. 
// Por defecto apunta a tu instancia de producción en Cloud Run.
const API_BASE = process.env.QUANTUMCORE_URL || "https://quantumcore-854335368640.us-central1.run.app";

const POLL_INTERVAL = 3000; // Chequear tareas cada 3 segundos

console.log(`🚀 Iniciando Quantum Runner Local...`);
console.log(`🔗 Conectando a QuantumCore en: ${API_BASE}`);

async function executeTool(toolName: string, args: any): Promise<{ result: string, status: 'completed' | 'failed' }> {
  try {
    if (toolName === 'execute_local_command') {
      const command = args.command || args; // Fallback
      console.log(`\n⚙️ Ejecutando comando: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      let resultText = stdout;
      if (stderr) {
        resultText += `\n[STDERR]\n${stderr}`;
      }
      console.log(`✅ Comando finalizado.`);
      return { result: resultText.trim() || "Comando ejecutado sin salida.", status: 'completed' };
    } 
    
    if (toolName === 'view_file') {
      console.log(`\n📄 Leyendo archivo: ${args.path}`);
      const content = await fs.readFile(args.path, 'utf8');
      console.log(`✅ Archivo leído.`);
      return { result: content, status: 'completed' };
    }
    
    if (toolName === 'write_to_file') {
      console.log(`\n💾 Escribiendo archivo: ${args.path}`);
      await fs.writeFile(args.path, args.content, 'utf8');
      console.log(`✅ Archivo guardado.`);
      return { result: "File written successfully.", status: 'completed' };
    }

    if (toolName === 'multi_replace_file_content') {
      console.log(`\n✂️ Modificando archivo: ${args.path}`);
      let content = await fs.readFile(args.path, 'utf8');
      for (const chunk of args.chunks) {
        content = content.replace(chunk.targetContent, chunk.replacementContent);
      }
      await fs.writeFile(args.path, content, 'utf8');
      console.log(`✅ Archivo modificado.`);
      return { result: "File updated successfully.", status: 'completed' };
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
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json() as { jobs: any[] };
    const jobs = data.jobs || [];

    for (const job of jobs) {
      console.log(`\n📥 Tarea recibida [ID: ${job.id}] -> Tool: ${job.tool || 'comando legacy'}`);
      
      const toolName = job.tool || 'execute_local_command';
      const args = job.args || job.command;
      const { result, status } = await executeTool(toolName, args);

      // Enviamos el resultado de vuelta a la nube
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
    // Silenciamos los errores de conexión para no ensuciar la consola si el server está apagado
    // console.error(`⚠️ Error contactando QuantumCore:`, error.message);
  } finally {
    // Volver a chequear luego del intervalo
    setTimeout(pollJobs, POLL_INTERVAL);
  }
}

// Iniciar el loop de chequeo
pollJobs();
