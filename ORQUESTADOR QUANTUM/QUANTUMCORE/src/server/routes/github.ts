import { randomUUID } from 'node:crypto';
import { Router } from 'express';

type GitHubRepoMetadata = {
  description?: string | null;
  full_name?: string;
  html_url?: string;
  name?: string;
  owner?: {
    login?: string;
  };
};

type ConnectedRepo = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  title: string;
  summary: string;
  url: string;
  active: boolean;
  lastIndexedAt: string;
};

const connectedRepos: ConnectedRepo[] = [];

export function parseGitHubRepoUrl(url: string): { owner: string; name: string } {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Expected a valid GitHub repository URL');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
    throw new Error('Expected a GitHub repository URL');
  }

  const [owner, rawName] = parsed.pathname.split('/').filter(Boolean);
  if (!owner || !rawName) {
    throw new Error('Expected a GitHub repository URL with owner and repo name');
  }

  return {
    owner,
    name: rawName.replace(/\.git$/i, ''),
  };
}

export const githubRouter = Router();

githubRouter.get('/github/repos', (_req, res) => {
  res.json({ repos: connectedRepos });
});

githubRouter.post('/github/repos', async (req, res) => {
  try {
    const { url } = req.body as { url?: unknown };
    if (typeof url !== 'string') {
      throw new Error('url is required');
    }

    const { owner, name } = parseGitHubRepoUrl(url);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'QuantumCore-GitHub-Connector',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers });
    if (!response.ok) {
      throw new Error(`GitHub repo fetch failed with status ${response.status}`);
    }

    const metadata = await response.json() as GitHubRepoMetadata;
    const isFirstRepo = connectedRepos.length === 0;
    const repo: ConnectedRepo = {
      id: randomUUID(),
      owner: metadata.owner?.login || owner,
      name: metadata.name || name,
      fullName: metadata.full_name || `${owner}/${name}`,
      title: metadata.full_name || `${owner}/${name}`,
      summary: metadata.description || 'No description provided.',
      url: metadata.html_url || `https://github.com/${owner}/${name}`,
      active: isFirstRepo,
      lastIndexedAt: new Date().toISOString(),
    };

    connectedRepos.push(repo);
    res.status(201).json({ repo });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'GitHub repo connection failed' });
  }
});

githubRouter.patch('/github/repos/:id/active', (req, res) => {
  const repo = connectedRepos.find((item) => item.id === req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }

  for (const item of connectedRepos) {
    item.active = item.id === repo.id;
  }

  res.json({ repo });
});

githubRouter.get('/github/repos/:id/context', (req, res) => {
  const repo = connectedRepos.find((item) => item.id === req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }

  res.json({
    id: repo.id,
    title: repo.title,
    summary: repo.summary,
    url: repo.url,
    lastIndexedAt: repo.lastIndexedAt,
  });
});
