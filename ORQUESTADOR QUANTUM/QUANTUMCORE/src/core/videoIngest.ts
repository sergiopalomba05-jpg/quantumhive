import { VideoCategory, VideoSourceType } from '../types';

export type SupportedVideoSource = Extract<VideoSourceType, 'instagram_reel' | 'youtube' | 'tiktok' | 'x_video' | 'web'>;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string };
    text?: string;
    caption?: string;
    date?: number;
    video?: { file_id: string; mime_type?: string };
    document?: { file_id: string; mime_type?: string; file_name?: string };
  };
}

export interface NormalizedVideoInput {
  sourceType: SupportedVideoSource;
  originalUrl: string;
  telegram: {
    chatId: number;
    messageId: number;
    fromId?: number;
    fileId?: string;
  };
  rawText?: string;
}

export interface StructuredVideoAnalysis {
  title: string;
  summary: string;
  category: VideoCategory;
  detectedToolName?: string;
  catalogDivision?: string;
  catalogSubdivision?: string;
  paraQue: string;
  detalle: string;
  tags: string[];
  actionableSteps: string[];
  confidence: number;
}

const VIDEO_CATEGORIES: VideoCategory[] = [
  'ai_tool',
  'skill',
  'business_idea',
  'tutorial',
  'competitor',
  'inspiration',
  'bugfix',
  'automation',
  'design',
  'avatar',
  'marketing',
  'trading',
  'other',
];

export function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>()]+/g) || []).map((url) => url.replace(/[.,;!?]+$/, ''));
}

export function detectVideoSource(input: string): SupportedVideoSource {
  const value = input.toLowerCase();
  if (value.includes('instagram.com/reel') || value.includes('instagram.com/p/')) return 'instagram_reel';
  if (value.includes('youtube.com/') || value.includes('youtu.be/')) return 'youtube';
  if (value.includes('tiktok.com/')) return 'tiktok';
  if (value.includes('x.com/') || value.includes('twitter.com/')) return 'x_video';
  return 'web';
}

export function normalizeTelegramMessage(update: TelegramUpdate): NormalizedVideoInput | null {
  const message = update.message;
  if (!message) return null;

  const rawText = message.text || message.caption || '';
  const url = extractUrls(rawText)[0];
  const fileId = message.video?.file_id || message.document?.file_id;

  if (!url && !fileId) return null;

  const originalUrl = url || `telegram:file/${fileId}`;
  return {
    sourceType: detectVideoSource(originalUrl),
    originalUrl,
    rawText,
    telegram: {
      chatId: message.chat.id,
      messageId: message.message_id,
      fromId: message.from?.id,
      fileId,
    },
  };
}

export function validateStructuredVideoAnalysis(value: unknown): StructuredVideoAnalysis {
  if (!value || typeof value !== 'object') throw new Error('analysis object is required');
  const input = value as Record<string, unknown>;

  const requiredStringFields = ['title', 'summary', 'paraQue', 'detalle'];
  for (const field of requiredStringFields) {
    if (typeof input[field] !== 'string' || !(input[field] as string).trim()) {
      throw new Error(`${field} is required`);
    }
  }

  if (typeof input.category !== 'string' || !VIDEO_CATEGORIES.includes(input.category as VideoCategory)) {
    throw new Error('category must be a valid video category');
  }
  if (!Array.isArray(input.tags) || !input.tags.every((tag) => typeof tag === 'string')) {
    throw new Error('tags must be a string array');
  }
  if (!Array.isArray(input.actionableSteps) || !input.actionableSteps.every((step) => typeof step === 'string')) {
    throw new Error('actionableSteps must be a string array');
  }
  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1');
  }

  return {
    title: input.title as string,
    summary: input.summary as string,
    category: input.category as VideoCategory,
    detectedToolName: typeof input.detectedToolName === 'string' ? input.detectedToolName : undefined,
    catalogDivision: typeof input.catalogDivision === 'string' ? input.catalogDivision : undefined,
    catalogSubdivision: typeof input.catalogSubdivision === 'string' ? input.catalogSubdivision : undefined,
    paraQue: input.paraQue as string,
    detalle: input.detalle as string,
    tags: input.tags as string[],
    actionableSteps: input.actionableSteps as string[],
    confidence: input.confidence as number,
  };
}

export function buildVideoAnalysisPrompt(input: NormalizedVideoInput): string {
  return [
    'Sos Dominus derivando contenido al Agente Ingestador de Videos de QuantumCore.',
    'Analizá el link/video enviado por Sergio y devolvé SOLO JSON válido.',
    'El resultado debe quedar como borrador pending_review: no publiques ni apruebes catálogo automáticamente.',
    'Respetá la taxonomía Supabase del catálogo: divisiones, subdivisiones, herramientas, herramienta_subdivision, stack_categorias, stack_items.',
    'Si detectás una herramienta, prepará campos compatibles con herramientas: nombre, repo_url, para_que, estado, detalle.',
    'No inventes URLs ni capacidades. Si falta metadata o no podés verificar, bajá confidence y explicalo en detalle.',
    `sourceType: ${input.sourceType}`,
    `originalUrl/repo_url: ${input.originalUrl}`,
    input.rawText ? `texto/caption: ${input.rawText}` : '',
    'JSON schema: { "title": string, "summary": string, "category": "ai_tool|skill|business_idea|tutorial|competitor|inspiration|bugfix|automation|design|avatar|marketing|trading|other", "detectedToolName": string|null, "catalogDivision": string|null, "catalogSubdivision": string|null, "paraQue": string, "detalle": string, "tags": string[], "actionableSteps": string[], "confidence": number }',
  ].filter(Boolean).join('\n');
}
