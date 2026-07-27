import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createConnectedRepoMemoryPayload,
  mapConnectedRepoMemoryRow,
  parseGitHubRepoUrl,
} from '../src/server/routes/github';

describe('GitHub repo connector', () => {
  it('parses HTTPS GitHub repo URLs', () => {
    assert.deepEqual(parseGitHubRepoUrl('https://github.com/owner/repo'), {
      owner: 'owner',
      name: 'repo',
    });
  });

  it('parses HTTPS GitHub repo URLs with .git suffix', () => {
    assert.deepEqual(parseGitHubRepoUrl('https://github.com/owner/repo.git'), {
      owner: 'owner',
      name: 'repo',
    });
  });

  it('rejects non-GitHub URLs', () => {
    assert.throws(
      () => parseGitHubRepoUrl('https://example.com/owner/repo'),
      /GitHub/i,
    );
  });

  it('round-trips connected repos through durable Supabase memory metadata', () => {
    const repo = {
      id: 'repo-123',
      owner: 'sergiopalomba05-jpg',
      name: 'quantumhive',
      fullName: 'sergiopalomba05-jpg/quantumhive',
      title: 'sergiopalomba05-jpg/quantumhive',
      summary: 'QuantumCore repo',
      url: 'https://github.com/sergiopalomba05-jpg/quantumhive',
      active: true,
      lastIndexedAt: '2026-07-26T12:00:00.000Z',
      assignedAgentIds: ['dominus-prime'],
    };

    const payload = createConnectedRepoMemoryPayload(repo);

    assert.equal(payload.scope, 'global');
    assert.equal(payload.visibility, 'private');
    assert.equal(payload.metadata.kind, 'github_connected_repo');
    assert.equal(payload.metadata.fullName, repo.fullName);
    assert.doesNotMatch(JSON.stringify(payload), /GITHUB_TOKEN|ghp_|github_pat_/i);

    assert.deepEqual(
      mapConnectedRepoMemoryRow({
        id: 'memory-row-1',
        content: payload.content,
        metadata: payload.metadata,
        created_at: '2026-07-26T12:01:00.000Z',
      }),
      repo,
    );
  });
});
