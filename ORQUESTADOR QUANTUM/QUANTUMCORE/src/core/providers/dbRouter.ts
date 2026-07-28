/**
 * QuantumCore Multi-Database Router
 * 
 * Provides a centralized way to connect to multiple Supabase projects
 * from a single QuantumCore engine. Each "project" or "scope" can have
 * its own database, but all are orchestrated by the same motor.
 * 
 * Architecture:
 *   dbRouter.getClient('core')     → QuantumCore DB (agents, memories, skills)
 *   dbRouter.getClient('ingest')   → Ingestion DB (videos, PDFs, links)
 *   dbRouter.getClient('project-X')→ Any future project DB
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  id: string;
  name: string;
  scope: string;             // 'core' | 'ingest' | 'empleados-virtuales' | 'humania' | etc.
  supabaseUrl: string;
  supabaseAnonKey: string;
  description?: string;
  isDefault?: boolean;
}

// In-memory registry of database connections
const clientCache = new Map<string, SupabaseClient>();
const configRegistry = new Map<string, DatabaseConfig>();

// Initialize the Core DB (always available — this is QuantumCore's own database)
const CORE_CONFIG: DatabaseConfig = {
  id: 'core',
  name: 'QuantumCore',
  scope: 'core',
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://okknbcumosciujogcqtc.supabase.co',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_lfCC9gDWnL--ARhnZlLDXw_pgJsZqAs',
  description: 'Base de datos principal del Sistema Operativo QuantumCore',
  isDefault: true,
};

/**
 * Register a new database connection in the router.
 * Can be called at runtime (e.g., when a new project is indexed into the OS).
 */
export function registerDatabase(config: DatabaseConfig): void {
  configRegistry.set(config.scope, config);
  // Invalidate cached client so it gets recreated with new config
  clientCache.delete(config.scope);
  console.log(`[dbRouter] Registered database: ${config.name} (scope: ${config.scope})`);
}

/**
 * Get a Supabase client for a given scope.
 * Falls back to 'core' if the scope is not registered.
 */
export function getClient(scope: string = 'core'): SupabaseClient {
  // Check cache first
  const cached = clientCache.get(scope);
  if (cached) return cached;

  // Look up config
  let config = configRegistry.get(scope);
  if (!config) {
    // If scope not found, fall back to core
    if (scope !== 'core') {
      console.warn(`[dbRouter] Scope "${scope}" not registered, falling back to 'core'.`);
    }
    config = configRegistry.get('core') || CORE_CONFIG;
  }

  // Create and cache the client
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  clientCache.set(scope, client);
  return client;
}

/**
 * List all registered database connections.
 */
export function listDatabases(): DatabaseConfig[] {
  return Array.from(configRegistry.values());
}

/**
 * Remove a database connection from the router.
 */
export function unregisterDatabase(scope: string): boolean {
  if (scope === 'core') {
    console.error('[dbRouter] Cannot unregister the core database.');
    return false;
  }
  clientCache.delete(scope);
  return configRegistry.delete(scope);
}

/**
 * Load project databases from the core database.
 * This reads the `project_databases` table in the core Supabase
 * and registers each one in the router.
 */
export async function loadProjectDatabases(): Promise<void> {
  const coreClient = getClient('core');

  try {
    const { data, error } = await coreClient
      .from('project_databases')
      .select('*');

    if (error) {
      // Table might not exist yet — that's OK for first boot
      console.warn('[dbRouter] Could not load project_databases:', error.message);
      return;
    }

    if (data && data.length > 0) {
      for (const row of data) {
        registerDatabase({
          id: row.id,
          name: row.name,
          scope: row.scope,
          supabaseUrl: row.supabase_url,
          supabaseAnonKey: row.supabase_anon_key,
          description: row.description,
        });
      }
      console.log(`[dbRouter] Loaded ${data.length} project databases from core.`);
    }
  } catch (err) {
    console.warn('[dbRouter] Error loading project databases:', err);
  }
}

/**
 * Save a new project database to the core DB and register it.
 */
export async function addProjectDatabase(config: DatabaseConfig): Promise<boolean> {
  const coreClient = getClient('core');

  const { error } = await coreClient.from('project_databases').upsert({
    id: config.id,
    name: config.name,
    scope: config.scope,
    supabase_url: config.supabaseUrl,
    supabase_anon_key: config.supabaseAnonKey,
    description: config.description || '',
  });

  if (error) {
    console.error('[dbRouter] Failed to save project database:', error.message);
    return false;
  }

  registerDatabase(config);
  return true;
}

// Auto-register the core database on module load
registerDatabase(CORE_CONFIG);

// Export a convenience alias for the core client (backward compatibility)
export const supabase = getClient('core');

// Export the router as a namespace
export const dbRouter = {
  getClient,
  registerDatabase,
  unregisterDatabase,
  listDatabases,
  loadProjectDatabases,
  addProjectDatabase,
};
