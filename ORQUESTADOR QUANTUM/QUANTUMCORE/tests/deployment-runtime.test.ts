import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('deployment runtime', () => {
  it('uses Node 22 in Docker because Supabase Realtime needs native WebSocket', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');

    assert.match(dockerfile, /^FROM node:22-slim AS build/m);
    assert.match(dockerfile, /^FROM node:22-slim$/m);
  });
});
