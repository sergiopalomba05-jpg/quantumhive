import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('chat provider selection contract', () => {
  it('accepts providerId, modelId, and repoId in Dominus chat route', () => {
    const chatRoute = readProjectFile('src/server/routes/chat.ts');

    assert.match(chatRoute, /providerId/);
    assert.match(chatRoute, /repoId/);
    assert.match(chatRoute, /resolveProviderSelection/);
    assert.match(chatRoute, /generateWithProvider/);
  });
});
