import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('agent schema migrations', () => {
  it('adds Dominus memory, router, permission, and constitution fields to agents', () => {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
      .join('\n');

    for (const column of [
      'brain_provider_id',
      'default_model_id',
      'memory_scope',
      'memory_policy',
      'permissions',
      'constitution_doc_path',
      'system_core_doc_path',
    ]) {
      assert.match(migrationSql, new RegExp(`\\b${column}\\b`));
    }
  });

  it('seeds an idempotent operational memory for Dominus Prime', () => {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
      .join('\n');

    assert.match(migrationSql, /Dominus Prime memoria operativa inicial/);
    assert.match(migrationSql, /11111111-1111-4111-8111-111111111111/);
    assert.match(migrationSql, /NOT EXISTS/);
  });
});
