import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGitHubRepoUrl } from '../src/server/routes/github';

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
});
