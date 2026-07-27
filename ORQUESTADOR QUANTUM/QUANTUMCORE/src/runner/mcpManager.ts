import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DynamicTool } from "../server/routes/runner.js";

type MCPConnection = {
  id: string;
  name: string;
  client: Client;
  transport: StdioClientTransport;
  status: 'connected' | 'error' | 'disconnected';
};

const connections = new Map<string, MCPConnection>();

export async function connectMcpServer(id: string, name: string, command: string, args: string[]): Promise<void> {
  console.log(`[MCP Manager] Conectando a ${name} (${command} ${args.join(' ')})...`);
  
  const transport = new StdioClientTransport({
    command: command,
    args: args
  });

  const client = new Client(
    { name: "quantum-runner", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    connections.set(id, { id, name, client, transport, status: 'connected' });
    console.log(`[MCP Manager] Conectado exitosamente a ${name}.`);
  } catch (error) {
    console.error(`[MCP Manager] Error conectando a ${name}:`, error);
    connections.set(id, { id, name, client, transport, status: 'error' });
  }
}

export async function disconnectMcpServer(id: string): Promise<void> {
  const conn = connections.get(id);
  if (conn) {
    await conn.transport.close();
    connections.delete(id);
    console.log(`[MCP Manager] Desconectado de ${conn.name}.`);
  }
}

export async function getAllMcpTools(): Promise<DynamicTool[]> {
  const allTools: DynamicTool[] = [];
  
  for (const conn of connections.values()) {
    if (conn.status === 'connected') {
      try {
        const response = await conn.client.listTools();
        const serverTools = response.tools.map(t => ({
          name: t.name,
          description: t.description || '',
          parameters: t.inputSchema,
          source: 'mcp' as const,
          serverId: conn.id
        }));
        allTools.push(...serverTools);
      } catch (error) {
        console.error(`[MCP Manager] Error obteniendo herramientas de ${conn.name}:`, error);
      }
    }
  }
  
  return allTools;
}

export async function callMcpTool(serverId: string, toolName: string, args: any): Promise<any> {
  const conn = connections.get(serverId);
  if (!conn || conn.status !== 'connected') {
    throw new Error(`Servidor MCP ${serverId} no esta conectado.`);
  }
  
  console.log(`[MCP Manager] Ejecutando herramienta ${toolName} en ${conn.name}...`);
  const result = await conn.client.callTool({
    name: toolName,
    arguments: args
  });
  
  return result;
}
