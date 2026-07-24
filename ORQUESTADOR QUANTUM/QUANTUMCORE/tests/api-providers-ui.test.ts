import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('AI Providers / API Providers UI', () => {
  it('exposes a dedicated provider route and intelligence sidebar link', () => {
    const app = readProjectFile('src/App.tsx');
    const sidebar = readProjectFile('src/components/Sidebar.tsx');

    assert.equal(existsSync(join(root, 'src/pages/ApiProviders.tsx')), true);
    assert.match(app, /ApiProviders/);
    assert.match(app, /path="\/api-providers"/);
    assert.match(sidebar, /to:\s*'\/api-providers'/);
    assert.match(sidebar, /Proveedores de IA \/ APIs/);
  });

  it('shows provider metadata without collecting secrets in the frontend', () => {
    const page = readProjectFile('src/pages/ApiProviders.tsx');

    assert.match(page, /Vertex AI/);
    assert.match(page, /OpenAI API/);
    assert.match(page, /Azure OpenAI/);
    assert.match(page, /Claude via Vertex Garden/);
    assert.match(page, /NVIDIA NIM/);
    assert.match(page, /Secret Manager/);
    assert.doesNotMatch(page, /type="password"/);
    assert.doesNotMatch(page, /localStorage/);
    assert.doesNotMatch(page, /apiKey|api_key|secretKey|token/i);
  });
});
