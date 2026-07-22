import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://okknbcumosciujogcqtc.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_lfCC9gDWnL--ARhnZlLDXw_pgJsZqAs";

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials are missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
