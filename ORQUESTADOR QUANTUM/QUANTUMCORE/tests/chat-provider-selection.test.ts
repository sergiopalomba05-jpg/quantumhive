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

  it('keeps the legacy Dominus slug mapped to the real agent UUID', () => {
    const chatRoute = readProjectFile('src/server/routes/chat.ts');

    assert.match(chatRoute, /DOMINUS_PRIME_AGENT_ID/);
    assert.match(chatRoute, /dominus-prime/);
    assert.match(chatRoute, /11111111-1111-4111-8111-111111111111/);
  });
});
