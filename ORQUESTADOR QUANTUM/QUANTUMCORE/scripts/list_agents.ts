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

async function listAgents() {
  console.log('Fetching agents from Supabase...');
  
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, role, status');

  if (error) {
    console.error('Error fetching agents:', error.message);
  } else {
    console.log('✅ Agentes encontrados:');
    console.table(data);
  }
}

listAgents();
