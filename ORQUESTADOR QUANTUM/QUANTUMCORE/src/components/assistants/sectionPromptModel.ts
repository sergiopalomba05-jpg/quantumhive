export interface SectionAssistantPromptModel {
  tipId: string;
  title: string;
  body: string;
}

const SECTION_PROMPTS: Record<string, Omit<SectionAssistantPromptModel, 'tipId'>> = {
  '/agent-builder': {
    title: 'Queres que te ayude a crear tu agente?',
    body: 'Puedo recomendar rol, cerebro, worker, herramientas, permisos y workflow inicial sin que tengas que conocer la parte tecnica.',
  },
  '/planner': {
    title: 'Queres que armemos el flujo visual?',
    body: 'Puedo convertir tu objetivo en nodos conectados: agente, worker, memoria, aprobacion y salida.',
  },
  '/mcp-hub': {
    title: 'Queres que te recomiende herramientas?',
    body: 'Puedo sugerir MCP servers, APIs y CLI tools segun lo que quieras automatizar.',
  },
};

export function getSectionAssistantPrompt(pathname: string, assistantName: string): SectionAssistantPromptModel {
  const prompt = SECTION_PROMPTS[pathname] ?? {
    title: 'Queres ayuda con esta seccion?',
    body: `${assistantName} puede explicarte esta pantalla y proponerte proximos pasos en modo simulado.`,
  };

  return {
    tipId: `assistant-tip:${pathname}`,
    ...prompt,
  };
}
