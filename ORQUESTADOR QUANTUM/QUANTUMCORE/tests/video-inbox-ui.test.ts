import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

describe('Catalogo de Herramientas UI', () => {
  it('exposes the PWA catalog, ingestor loop, scoring, duplicates, and taxonomy copy', () => {
    const source = readFileSync('src/pages/VideoInbox.tsx', 'utf8');

    assert.match(source, /Catálogo de Herramientas/);
    assert.match(source, /PWA/);
    assert.match(source, /Ingestador de Videos/);
    assert.match(source, /puntaje|scoring/i);
    assert.match(source, /duplicad/i);
    assert.match(source, /taxonom/i);
    assert.match(source, /publicable|dudosa|duplicada|descartada/);
    assert.match(source, /formatCatalogStatus/);
    assert.match(source, /safeDisplayUrl/);
    assert.match(source, /catalogPwaUrl = viteEnv\.VITE_CATALOGO_PWA_URL \|\| '\/catalogo-pwa\/'/);
    assert.match(source, /gbngjsulhqcwgkqoxozy\.supabase\.co/);
    assert.doesNotMatch(source, /directimport-app\.onrender\.com/);
    assert.match(source, /\/api\/video-ingest\/manual/);
    assert.match(source, /\/api\/video-ingest\/items/);
    assert.doesNotMatch(source, /\{item\.status\}/);
  });

  it('ships the real catalog PWA against the dedicated catalog Supabase project', () => {
    const pwaPath = 'public/catalogo-pwa/index.html';
    const source = readFileSync(pwaPath, 'utf8');

    assert.equal(existsSync(pwaPath), true);
    assert.match(source, /Catálogo de Herramientas IA/);
    assert.match(source, /https:\/\/gbngjsulhqcwgkqoxozy\.supabase\.co/);
    assert.match(source, /divisiones\?select=\*&order=orden/);
    assert.match(source, /herramienta_subdivision\?select=subdivision_id,herramientas\(id,nombre,repo_url,para_que,estado,detalle\)/);
  });
});
