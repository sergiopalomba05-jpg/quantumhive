import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('provider manager UI', () => {
  it('renders provider manager controls without secret fields', () => {
    const page = readProjectFile('src/pages/ApiProviders.tsx');

    assert.match(page, /Agregar proveedor/);
    assert.match(page, /Browser/);
    assert.match(page, /Headless/);
    assert.match(page, /Local\/VM/);
    assert.match(page, /\/api\/providers/);
    assert.doesNotMatch(page, /type="password"|localStorage|apiKey|secretKey/i);
  });

  it('sends providerId modelId and repoId from chat requests', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');

    assert.match(chat, /providerId/);
    assert.match(chat, /modelId/);
    assert.match(chat, /repoId/);
    assert.match(chat, /\/api\/providers/);
  });
});
