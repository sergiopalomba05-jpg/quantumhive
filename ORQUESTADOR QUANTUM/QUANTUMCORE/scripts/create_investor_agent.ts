import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://okknbcumosciujogcqtc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: Supabase key is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAgent() {
  const agentData = {
    name: 'Pitch Master',
    role: 'Documentador de Inversores',
    system_core_doc_path: 'docs/agents/pitch_master_system_core.md',
    constitution_doc_path: 'docs/agents/pitch_master_constitution.md',
  };

  console.log('Creando agente en Supabase...');
  
  const { data, error } = await supabase
    .from('agents')
    .insert(agentData)
    .select()
    .single();

  if (error) {
    console.error('Error al crear el agente:', error.message);
  } else {
    console.log('✅ Agente creado exitosamente:');
    console.log(data);
  }
}

createAgent();
