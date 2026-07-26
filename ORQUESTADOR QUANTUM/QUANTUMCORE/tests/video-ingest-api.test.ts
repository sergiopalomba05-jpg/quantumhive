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

describe('video ingest API', () => {
  it('rejects Telegram updates from non-allowed chat when allowlist is configured', async () => {
    process.env.TELEGRAM_ALLOWED_CHAT_ID = '123';
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/telegram`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 1,
            chat: { id: 999, type: 'group' },
            from: { id: 456 },
            text: 'https://www.instagram.com/reel/ABC/',
          },
        }),
      });

      assert.equal(response.status, 403);
    } finally {
      delete process.env.TELEGRAM_ALLOWED_CHAT_ID;
      await server.close();
    }
  });

  it('accepts manual URL ingest and returns queued item metadata', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/manual`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.instagram.com/reel/ABC/' }),
      });
      const data = await response.json() as { item: { sourceType: string; originalUrl: string; status: string } };

      assert.equal(response.status, 202);
      assert.equal(data.item.sourceType, 'instagram_reel');
      assert.equal(data.item.originalUrl, 'https://www.instagram.com/reel/ABC/');
      assert.equal(data.item.status, 'queued');
    } finally {
      await server.close();
    }
  });

  it('returns catalog loop metadata for the Ingestador de Videos without exposing query tokens', async () => {
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/manual`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://v0.dev/?token=SECRET&utm_source=reel' }),
      });
      const data = await response.json() as {
        item: {
          originalUrl: string;
          displayUrl: string;
          ingestorAgentName: string;
          catalog: {
            status: string;
            score: { confianza: number };
            taxonomia: { division: string; subdivision: string };
          };
        };
      };

      assert.equal(response.status, 202);
      assert.equal(data.item.ingestorAgentName, 'Ingestador de Videos');
      assert.equal(data.item.catalog.status, 'dudosa');
      assert.equal(data.item.catalog.taxonomia.division, 'Webs y Apps');
      assert.ok(data.item.catalog.score.confianza > 0);
      assert.equal(data.item.displayUrl, 'https://v0.dev/');
      assert.doesNotMatch(JSON.stringify(data), /SECRET|utm_source/);
    } finally {
      await server.close();
    }
  });

  it('accepts Telegram updates from allowed chat and queues Dominus-routed item', async () => {
    process.env.TELEGRAM_ALLOWED_CHAT_ID = '123';
    const server = await listen();
    try {
      const response = await fetch(`${server.url}/api/video-ingest/telegram`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          update_id: 2,
          message: {
            message_id: 77,
            chat: { id: 123, type: 'group' },
            from: { id: 456 },
            text: 'Dominus guardá esto https://youtu.be/abc',
          },
        }),
      });
      const data = await response.json() as { item: { sourceType: string; routedBy: string; status: string } };

      assert.equal(response.status, 202);
      assert.equal(data.item.sourceType, 'youtube');
      assert.equal(data.item.routedBy, 'dominus');
      assert.equal(data.item.status, 'queued');
    } finally {
      delete process.env.TELEGRAM_ALLOWED_CHAT_ID;
      await server.close();
    }
  });
});
