import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

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
    assert.match(source, /\/api\/video-ingest\/manual/);
    assert.match(source, /\/api\/video-ingest\/items/);
    assert.doesNotMatch(source, /\{item\.status\}/);
  });
});
