import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
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

describe('graph API routes', () => {
  it('GET /api/graph/stats returns stats with expected fields', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph/stats`);
      const data = await response.json() as Record<string, unknown>;

      assert.equal(response.status, 200);
      assert.equal(typeof data.totalNodes, 'number');
      assert.equal(typeof data.totalEdges, 'number');
      assert.equal(typeof data.communities, 'number');
      assert.equal(typeof data.nodeTypes, 'object');
      assert.ok(Array.isArray(data.topCommunities));
      assert.ok(data.loadedAt);
    } finally {
      await server.close();
    }
  });

  it('GET /api/graph returns nodes and edges arrays', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph`);
      const data = await response.json() as { nodes: unknown[]; edges: unknown[] };

      assert.equal(response.status, 200);
      assert.ok(Array.isArray(data.nodes));
      assert.ok(Array.isArray(data.edges));
    } finally {
      await server.close();
    }
  });

  it('GET /api/graph limits nodes to default cap', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph`);
      const data = await response.json() as { nodes: unknown[] };

      assert.equal(response.status, 200);
      assert.ok(data.nodes.length <= 2000, `Expected <=2000 nodes, got ${data.nodes.length}`);
    } finally {
      await server.close();
    }
  });

  it('GET /api/graph?limit=5 respects custom limit', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph?limit=5`);
      const data = await response.json() as { nodes: unknown[]; edges: unknown[] };

      assert.equal(response.status, 200);
      assert.ok(data.nodes.length <= 5, `Expected <=5 nodes, got ${data.nodes.length}`);
    } finally {
      await server.close();
    }
  });

  it('GET /api/graph?community=99999 returns empty for non-existent community', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph?community=99999`);
      const data = await response.json() as { nodes: unknown[]; edges: unknown[] };

      assert.equal(response.status, 200);
      assert.equal(data.nodes.length, 0);
    } finally {
      await server.close();
    }
  });

  it('GET /api/graph nodes have required fields', async () => {
    const server = await listen();
    try {
      await fetch(`${server.url}/api/graph/reload`, { method: 'POST' });
      const response = await fetch(`${server.url}/api/graph?limit=100`);
      const data = await response.json() as { nodes: Array<Record<string, unknown>>; edges: unknown[] };

      assert.equal(response.status, 200);
      assert.ok(data.nodes.length > 0, `Expected at least 1 node, got ${data.nodes.length}`);

      const node = data.nodes[0];
      assert.equal(typeof node.id, 'string');
      assert.equal(typeof node.label, 'string');
      assert.equal(typeof node.type, 'string');
      assert.equal(typeof node.importance, 'number');
    } finally {
      await server.close();
    }
  });

  it('POST /api/graph/reload clears cache', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph/reload`, { method: 'POST' });
      const data = await response.json() as { reloaded: boolean; totalNodes: number };

      assert.equal(response.status, 200);
      assert.equal(data.reloaded, true);
      assert.equal(typeof data.totalNodes, 'number');
    } finally {
      await server.close();
    }
  });

  it('graph stats nodeTypes does not contain file system paths', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/graph/stats`);
      const data = await response.json() as { nodeTypes: Record<string, number> };
      const serialized = JSON.stringify(data.nodeTypes);

      assert.doesNotMatch(serialized, /C:\\|\/Users\/|\/home\//);
    } finally {
      await server.close();
    }
  });
});
