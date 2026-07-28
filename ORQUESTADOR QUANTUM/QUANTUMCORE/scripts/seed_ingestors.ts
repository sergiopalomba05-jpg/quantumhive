import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://okknbcumosciujogcqtc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: Supabase key is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAgents() {
  const agents = [
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Ingestador de Videos',
      role: 'Agente principal del catalogo multimedia de herramientas. Recibe links, reels, videos y posts enviados por Sergio; detecta herramientas, clasifica por taxonomia, deduplica, compara alternativas, asigna puntajes y deja cada recurso listo para la PWA del catalogo cuando la confianza es suficiente.',
      macro_division: 'General',
      status: 'active',
      preferred_model: 'vertex',
      brain_provider_id: 'vertex',
      default_model_id: 'gemini-3.6-flash',
      memory_scope: 'catalogo_multimedia,herramientas,taxonomia,video_ingest,comparativas',
      permissions: ['catalogo_multimedia', 'ingest_links', 'analyze_video', 'classify_taxonomy', 'dedupe_tools', 'score_tools', 'compare_tools', 'publish_catalog_candidates'],
      provider_policy: 'automatico_si_confianza_alta',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Ingestador de PDFs y Conversaciones',
      role: 'Agente especializado en leer PDFs largos, manuales técnicos y conversaciones. Extrae datos estructurados, resume y alimenta la memoria semántica (Memanto) con contexto denso.',
      macro_division: 'General',
      status: 'active',
      preferred_model: 'vertex',
      brain_provider_id: 'vertex',
      default_model_id: 'gemini',
      memory_scope: 'documentos,pdfs,conversaciones,memanto',
      permissions: ['read_pdfs', 'parse_conversations', 'write_memanto'],
      provider_policy: 'automatico_si_confianza_alta',
    }
  ];

  for (const agent of agents) {
    const { data, error } = await supabase.from('agents').upsert(agent).select().single();
    if (error) {
      console.error(`Error inserting ${agent.name}:`, error.message);
    } else {
      console.log(`✅ ${agent.name} seeded successfully.`);
    }
  }
}

seedAgents();
