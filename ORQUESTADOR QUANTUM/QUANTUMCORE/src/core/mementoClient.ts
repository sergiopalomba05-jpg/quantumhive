/**
 * QuantumCore Memanto Client
 * 
 * TypeScript wrapper for the Memanto memory system.
 * Provides semantic memory operations (remember, recall, answer)
 * that work alongside the Supabase transactional database.
 * 
 * Memanto runs as a sidecar service (Python FastAPI) on port 8000.
 * This client communicates with it via HTTP.
 */

const MEMANTO_BASE_URL = process.env.MEMANTO_URL || 'http://localhost:8000';

export type MemoryType = 
  | 'fact'
  | 'preference' 
  | 'decision'
  | 'rule'
  | 'goal'
  | 'context'
  | 'person'
  | 'project'
  | 'architecture'
  | 'business'
  | 'constraint'
  | 'feedback'
  | 'misc';

export interface MementoMemory {
  id?: string;
  content: string;
  type: MemoryType;
  scope?: string;           // 'core' | 'ingest' | project-specific scope
  agentId?: string;         // Which agent created this memory
  tags?: string[];
  importance?: number;      // 0.0 to 1.0
}

export interface RecallResult {
  memories: MementoMemory[];
  query: string;
  latencyMs: number;
}

let mementoAvailable: boolean | null = null;

/**
 * Check if the Memanto service is running.
 */
async function checkAvailability(): Promise<boolean> {
  try {
    const res = await fetch(`${MEMANTO_BASE_URL}/health`, { 
      signal: AbortSignal.timeout(2000) 
    });
    mementoAvailable = res.ok;
    return mementoAvailable;
  } catch {
    mementoAvailable = false;
    return false;
  }
}

/**
 * Store a piece of knowledge in Memanto's semantic memory.
 * Also stores in Supabase for durability (dual write).
 */
export async function remember(memory: MementoMemory): Promise<boolean> {
  // Always try Memanto first
  if (mementoAvailable === null) await checkAvailability();
  
  if (mementoAvailable) {
    try {
      const res = await fetch(`${MEMANTO_BASE_URL}/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: memory.content,
          type: memory.type,
          metadata: {
            scope: memory.scope || 'core',
            agentId: memory.agentId,
            tags: memory.tags || [],
            importance: memory.importance || 0.5,
          }
        }),
        signal: AbortSignal.timeout(5000),
      });
      
      if (!res.ok) {
        console.warn('[Memanto] remember() failed:', await res.text());
        return false;
      }
      
      return true;
    } catch (err) {
      console.warn('[Memanto] remember() error:', err);
      return false;
    }
  }
  
  // Memanto not available — fall back silently
  // (Supabase dual-write is handled by the caller in dominusContext.ts)
  console.warn('[Memanto] Service not available. Memory only stored in Supabase.');
  return false;
}

/**
 * Retrieve relevant memories from Memanto based on a semantic query.
 * This is the main retrieval method used before generating responses.
 */
export async function recall(query: string, options?: { 
  scope?: string; 
  limit?: number;
  types?: MemoryType[];
}): Promise<RecallResult> {
  if (mementoAvailable === null) await checkAvailability();
  
  const emptyResult: RecallResult = { memories: [], query, latencyMs: 0 };
  
  if (!mementoAvailable) return emptyResult;
  
  const start = Date.now();
  
  try {
    const res = await fetch(`${MEMANTO_BASE_URL}/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: options?.limit || 15,
        filters: {
          scope: options?.scope,
          types: options?.types,
        }
      }),
      signal: AbortSignal.timeout(3000),
    });
    
    if (!res.ok) {
      console.warn('[Memanto] recall() failed:', await res.text());
      return emptyResult;
    }
    
    const data = await res.json();
    
    return {
      memories: (data.results || []).map((r: any) => ({
        id: r.id,
        content: r.content,
        type: r.type || 'misc',
        scope: r.metadata?.scope,
        agentId: r.metadata?.agentId,
        tags: r.metadata?.tags || [],
        importance: r.metadata?.importance || 0.5,
      })),
      query,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    console.warn('[Memanto] recall() error:', err);
    return emptyResult;
  }
}

/**
 * Ask Memanto to generate an answer grounded in stored memories (RAG).
 */
export async function answer(question: string, scope?: string): Promise<string | null> {
  if (mementoAvailable === null) await checkAvailability();
  
  if (!mementoAvailable) return null;
  
  try {
    const res = await fetch(`${MEMANTO_BASE_URL}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, scope }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.answer || null;
  } catch {
    return null;
  }
}

/**
 * Export a health-check function for the UI status panel.
 */
export async function getMementoStatus(): Promise<{
  available: boolean;
  url: string;
}> {
  const available = await checkAvailability();
  return { available, url: MEMANTO_BASE_URL };
}

export const memanto = {
  remember,
  recall,
  answer,
  getMementoStatus,
};
