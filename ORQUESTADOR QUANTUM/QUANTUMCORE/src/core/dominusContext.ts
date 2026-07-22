interface DominusAgentContext {
  name: string;
  role: string;
}

interface DominusMemoryContext {
  title?: string;
  content?: string;
  importance?: string;
  type?: string;
  tags?: string[];
}

interface BuildDominusContextInput {
  agent: DominusAgentContext;
  systemCore: string;
  constitution: string;
  memories: DominusMemoryContext[];
  message: string;
}

export function buildDominusContextPack(input: BuildDominusContextInput) {
  const sortedMemories = [...input.memories].sort((a, b) => {
    const rank: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
    return (rank[b.importance || ''] || 0) - (rank[a.importance || ''] || 0);
  });

  const memoriesText = sortedMemories.length
    ? sortedMemories.map((memory) => `- ${memory.title || 'Memoria'} [${memory.type || 'Contexto'} / ${memory.importance || 'media'}]: ${memory.content || ''}`).join('\n')
    : '- Sin memorias vinculadas recuperadas.';

  const memoryProposalInstruction = [
    'Si detectas una decision, contexto importante, proxima accion o riesgo que conviene guardar, devolve una propuesta de memoria en formato JSON al final bajo la clave memoryProposal.',
    'No afirmes que fue guardado. Solo proponelo para aprobacion humana.',
  ].join(' ');

  const prompt = [
    'SYSTEM CORE',
    input.systemCore.trim(),
    '',
    'AGENTE',
    `${input.agent.name}: ${input.agent.role}`,
    '',
    'CONSTITUCION',
    input.constitution.trim(),
    '',
    'MEMORIAS DEL AGENTE',
    memoriesText,
    '',
    'INSTRUCCION DE MEMORIA',
    memoryProposalInstruction,
    '',
    'MENSAJE DEL USUARIO',
    input.message,
  ].join('\n');

  return { prompt, memoryProposalInstruction };
}
