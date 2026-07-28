import { recall, remember, type MementoMemory, type MemoryType } from './mementoClient.js';

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

interface GraphNodeContext {
  id: string;
  label: string;
  type: string;
  summary: string;
  community: number;
  importance: number;
  tags: string[];
}

interface RepoContext {
  title: string;
  summary: string;
  url: string;
}

interface MementoContextItem {
  content: string;
  type: string;
  importance: number;
}

interface BuildDominusContextInput {
  agent: DominusAgentContext;
  systemCore: string;
  constitution: string;
  memories: DominusMemoryContext[];
  message: string;
  graphNodes?: GraphNodeContext[];
  repo?: RepoContext;
  mementoMemories?: MementoContextItem[];
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

  const graphSection = input.graphNodes && input.graphNodes.length > 0
    ? [
        'CONOCIMIENTO DEL GRAFO (Graphify)',
        'Estos son nodos relevantes de tu base de conocimiento persistente:',
        ...input.graphNodes.map(n =>
          `- [${n.type}] ${n.label} (comunidad ${n.community}, importancia ${n.importance.toFixed(1)}): ${n.summary || 'Sin resumen'}${n.tags.length ? ` [${n.tags.join(', ')}]` : ''}`
        ),
        '',
        'Usa este conocimiento para responder con contexto real de proyectos anteriores.',
        '',
      ].join('\n')
    : '';

  const mementoSection = input.mementoMemories && input.mementoMemories.length > 0
    ? [
        'MEMORIA SEMÁNTICA (Memanto)',
        'Recuerdos relevantes recuperados de tu memoria a largo plazo:',
        ...input.mementoMemories.map(m =>
          `- [${m.type}] (importancia: ${m.importance.toFixed(1)}): ${m.content}`
        ),
        '',
        'Usa estos recuerdos para dar una respuesta informada y personalizada.',
        '',
      ].join('\n')
    : '';

  const repoSection = input.repo
    ? [
        'REPOSITORIO CONECTADO',
        `Nombre: ${input.repo.title}`,
        `Resumen: ${input.repo.summary}`,
        `URL: ${input.repo.url}`,
        'Usa el contexto de este repositorio cuando el usuario pregunte sobre código, arquitectura o decisiones técnicas de este proyecto.',
        '',
      ].join('\n')
    : '';

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
    graphSection,
    mementoSection,
    repoSection,
    'INSTRUCCION DE MEMORIA',
    memoryProposalInstruction,
    '',
    'MENSAJE DEL USUARIO',
    input.message,
  ].join('\n');

  return { prompt, memoryProposalInstruction };
}

export interface MemoryProposal {
  title: string;
  content: string;
  type: string;
  importance: string;
  tags: string[];
}

export function extractMemoryProposal(rawText: string): { text: string; memoryProposal?: MemoryProposal } {
  const jsonBlock = rawText.match(/```json\s*([\s\S]*?)```/i);
  if (!jsonBlock) return { text: rawText };

  try {
    const parsed = JSON.parse(jsonBlock[1]);
    if (!parsed.memoryProposal) return { text: rawText };
    return {
      text: rawText.replace(jsonBlock[0], '').trim(),
      memoryProposal: parsed.memoryProposal,
    };
  } catch {
    return { text: rawText };
  }
}
