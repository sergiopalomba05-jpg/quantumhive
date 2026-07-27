import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Graph direct link', () => {
  it('serves the existing root graphify-out directory before the SPA fallback', () => {
    const app = readProjectFile('src/server/app.ts');

    assert.match(app, /GRAPHIFY_STATIC_PATH/);
    assert.match(app, /path\.join\(workspaceRoot, "graphify-out"\)/);
    assert.doesNotMatch(app, /path\.join\(process\.cwd\(\), "graphify-out"\)/);
    assert.ok(app.indexOf('app.use("/graphify-out"') < app.indexOf('app.get("*"'));
  });

  it('shows a link to the existing Graphify graph data instead of local-only instructions', () => {
    const graphPage = readProjectFile('src/pages/KnowledgeGraph.tsx');

    assert.match(graphPage, /href="\/graphify-out\/graph\.json"/);
    assert.match(graphPage, /Abrir Graphify real/);
    assert.doesNotMatch(graphPage, /Ejecutá[\s\S]{0,80}localmente/);
    assert.equal(existsSync(join(root, '../../graphify-out/graph.json')), true);
  });

  it('lets users close the node detail side panel', () => {
    const graphPage = readProjectFile('src/pages/KnowledgeGraph.tsx');

    assert.match(graphPage, /Cerrar detalle/);
    assert.match(graphPage, /setSelectedNode\(null\)/);
  });
});
