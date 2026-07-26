import { NormalizedVideoInput, StructuredVideoAnalysis } from './videoIngest';

export interface CatalogDraftInsert {
  nombre: string;
  repo_url: string;
  para_que: string;
  detalle: string;
  estado: 'pending_review';
}

interface SupabaseInsertClient {
  from: (table: string) => {
    insert: (rows: CatalogDraftInsert[]) => Promise<{ data?: Array<{ id?: string }>; error?: { message: string } | null }>;
  };
}

export function buildPendingReviewTool(input: NormalizedVideoInput, analysis: StructuredVideoAnalysis): CatalogDraftInsert {
  const nombre = (analysis.detectedToolName || analysis.title).trim();
  const confidence = Math.round(analysis.confidence * 100);
  const tags = analysis.tags.length ? `\nTags: ${analysis.tags.join(', ')}` : '';
  const steps = analysis.actionableSteps.length ? `\nPasos sugeridos: ${analysis.actionableSteps.join(' | ')}` : '';

  return {
    nombre,
    repo_url: input.originalUrl,
    para_que: analysis.paraQue,
    detalle: `${analysis.detalle}\nResumen: ${analysis.summary}\nFuente: ${input.sourceType}\nConfianza: ${confidence}%${tags}${steps}`,
    estado: 'pending_review',
  };
}

export async function saveVideoDraft(
  supabase: SupabaseInsertClient,
  input: NormalizedVideoInput,
  analysis: StructuredVideoAnalysis,
): Promise<{ id: string; status: 'pending_review' }> {
  const draft = buildPendingReviewTool(input, analysis);
  const { data, error } = await supabase.from('herramientas').insert([draft]);
  if (error) throw new Error(error.message);
  return { id: data?.[0]?.id || draft.repo_url, status: 'pending_review' };
}
