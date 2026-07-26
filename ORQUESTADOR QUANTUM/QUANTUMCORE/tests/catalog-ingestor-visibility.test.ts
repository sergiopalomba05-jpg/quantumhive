import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

describe('Ingestador de Videos visibility', () => {
  it('seeds the Ingestador de Videos as a real QuantumCore agent', () => {
    const source = readFileSync('src/store/useStore.ts', 'utf8');

    assert.match(source, /INGESTADOR_VIDEOS_AGENT_ID/);
    assert.match(source, /name:\s*'Ingestador de Videos'/);
    assert.match(source, /catalogo_multimedia/);
    assert.match(source, /score_tools/);
    assert.match(source, /dedupe_tools/);
  });

  it('keeps the agent visible from Chat General through the existing agent list', () => {
    const chatSource = readFileSync('src/pages/ChatCentral.tsx', 'utf8');
    const storeSource = readFileSync('src/store/useStore.ts', 'utf8');

    assert.match(chatSource, /store\.agents|agents/);
    assert.match(storeSource, /Ingestador de Videos/);
    assert.match(storeSource, /ensureCoreAgents/);
    assert.match(storeSource, /set\(\{ agents: ensureCoreAgents\(mappedAgents\) \}\)/);
  });

  it('renames the old video inbox navigation into Catálogo de Herramientas', () => {
    const sidebarSource = readFileSync('src/components/Sidebar.tsx', 'utf8');
    const appSource = readFileSync('src/App.tsx', 'utf8');

    assert.match(sidebarSource, /Catálogo de Herramientas/);
    assert.match(sidebarSource, /\/catalogo-herramientas/);
    assert.match(appSource, /\/catalogo-herramientas/);
  });
});
