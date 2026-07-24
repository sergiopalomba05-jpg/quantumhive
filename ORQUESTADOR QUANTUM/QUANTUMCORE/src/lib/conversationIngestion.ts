const STOP_WORDS = new Set([
  'para', 'pero', 'porque', 'como', 'esta', 'este', 'esto', 'estas', 'estos',
  'entre', 'desde', 'sobre', 'tambien', 'tiene', 'tener', 'hacer', 'queda',
  'primero', 'despues', 'usuario', 'asistente', 'necesito', 'necesitamos',
]);

export interface ConversationKeyPoint {
  title: string;
  content: string;
  tags: string[];
}

export interface CorrelationCandidate {
  id: string;
  type: 'idea' | 'project' | 'memory' | 'task' | string;
  title: string;
  text: string;
}

export interface ConversationCorrelation {
  id: string;
  type: string;
  title: string;
  score: number;
  sharedKeywords: string[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'conversacion';
}

function cleanLine(line: string) {
  return line
    .replace(/^\s*(usuario|user|asistente|assistant|chatgpt|gemini|claude)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

export function extractConversationKeyPoints(title: string, content: string, limit = 3): ConversationKeyPoint[] {
  const slug = slugify(title);
  const lines = content
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter((line) => line.length >= 35)
    .filter((line, index, all) => all.indexOf(line) === index);

  return lines.slice(0, limit).map((line, index) => ({
    title: `${title} - punto clave ${index + 1}`,
    content: line,
    tags: ['conversacion', 'punto_clave', slug],
  }));
}

export function findConversationCorrelations(
  content: string,
  candidates: CorrelationCandidate[],
  limit = 5
): ConversationCorrelation[] {
  const sourceKeywords = new Set(tokenize(content));

  return candidates
    .map((candidate) => {
      const candidateKeywords = new Set(tokenize(`${candidate.title} ${candidate.text}`));
      const sharedKeywords = [...sourceKeywords].filter((keyword) => candidateKeywords.has(keyword));
      return {
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        score: sharedKeywords.length,
        sharedKeywords,
      };
    })
    .filter((correlation) => correlation.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
