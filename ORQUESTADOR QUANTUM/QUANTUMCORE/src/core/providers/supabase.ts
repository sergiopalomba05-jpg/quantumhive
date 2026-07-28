/**
 * Backward-compatible Supabase client.
 * Now delegates to dbRouter for the core connection.
 * 
 * All existing code that imports `supabase` from this file
 * will continue to work without changes.
 */

import { supabase, dbRouter } from './dbRouter.js';

export { supabase, dbRouter };
