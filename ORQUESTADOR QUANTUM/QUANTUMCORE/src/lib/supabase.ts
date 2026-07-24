import { createClient } from '@supabase/supabase-js';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL || 'https://okknbcumosciujogcqtc.supabase.co';
const supabaseKey = viteEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lfCC9gDWnL--ARhnZlLDXw_pgJsZqAs';

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials are missing for the web client. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
}

export const supabase = createClient(
  supabaseUrl || 'https://okknbcumosciujogcqtc.supabase.co',
  supabaseKey || 'sb_publishable_lfCC9gDWnL--ARhnZlLDXw_pgJsZqAs'
);
