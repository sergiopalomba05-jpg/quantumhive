import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getServerPort, resolveLiveSocketUrl } from '../src/lib/runtime';

describe('runtime configuration', () => {
  it('uses the Cloud Run PORT value when present', () => {
    assert.equal(getServerPort({ PORT: '8080' }), 8080);
  });

  it('falls back to port 3000 when PORT is missing or invalid', () => {
    assert.equal(getServerPort({}), 3000);
    assert.equal(getServerPort({ PORT: 'not-a-number' }), 3000);
  });

  it('uses a secure websocket URL from HTTPS pages', () => {
    assert.equal(resolveLiveSocketUrl('https:', 'example.com'), 'wss://example.com/live');
  });

  it('uses an insecure websocket URL only from HTTP pages', () => {
    assert.equal(resolveLiveSocketUrl('http:', 'localhost:3000'), 'ws://localhost:3000/live');
  });
});
