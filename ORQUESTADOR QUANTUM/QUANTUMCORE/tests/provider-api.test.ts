import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app } from '../src/server/app';

function listen() {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('invalid test server address');
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

describe('provider API routes', () => {
  it('returns secret-safe provider metadata', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers`);
      const data = await response.json() as { providers: unknown[] };
      const serialized = JSON.stringify(data);

      assert.equal(response.status, 200);
      assert.equal(data.providers.length >= 8, true);
      assert.doesNotMatch(serialized, /apiKey|secretKey|sk-/i);
    } finally {
      await server.close();
    }
  });

  it('lists models for one provider', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers/gcp-vertex-ai/models`);
      const data = await response.json() as { models: Array<{ id: string }> };

      assert.equal(response.status, 200);
      assert.equal(data.models.some((model) => model.id === 'gemini-2.5-flash'), true);
    } finally {
      await server.close();
    }
  });

  it('reports requires_runner for browser providers without executing them', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/providers/chatgpt-plus-browser/test`, { method: 'POST' });
      const data = await response.json() as { status: string; message: string };

      assert.equal(response.status, 200);
      assert.equal(data.status, 'requires_runner');
      assert.match(data.message, /runner/i);
    } finally {
      await server.close();
    }
  });
});
