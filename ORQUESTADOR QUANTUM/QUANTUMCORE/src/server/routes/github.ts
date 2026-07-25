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
  assignedAgentIds: string[];
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

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'QuantumCore-GitHub-Connector',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export const githubRouter = Router();

githubRouter.get('/github/repos/available', async (_req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    res.status(400).json({ error: 'GITHUB_TOKEN no configurado en el servidor' });
    return;
  }

  try {
    const headers = getGitHubHeaders();
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const repos = await response.json() as Array<{
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      default_branch: string;
      updated_at: string;
    }>;

    const mapped = repos.map(r => ({
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      description: r.description,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));

    res.json({ repos: mapped });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error al obtener repositorios de GitHub' });
  }
});

githubRouter.get('/github/repos', (_req, res) => {
  res.json({ repos: connectedRepos });
});

githubRouter.post('/github/repos', async (req, res) => {
  try {
    const { url, fullName } = req.body as { url?: unknown; fullName?: unknown };

    let owner: string;
    let name: string;

    if (typeof url === 'string') {
      const parsed = parseGitHubRepoUrl(url);
      owner = parsed.owner;
      name = parsed.name;
    } else if (typeof fullName === 'string') {
      const parts = fullName.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error('fullName must be in the format "owner/name"');
      }
      owner = parts[0];
      name = parts[1];
    } else {
      throw new Error('url or fullName is required');
    }

    const headers = getGitHubHeaders();
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
      assignedAgentIds: [],
    };

    connectedRepos.push(repo);
    res.status(201).json({ repo });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'GitHub repo connection failed' });
  }
});

githubRouter.patch('/github/repos/:id/agents', (req, res) => {
  const repo = connectedRepos.find((item) => item.id === req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }

  const { assignedAgentIds } = req.body as { assignedAgentIds?: unknown };
  if (!Array.isArray(assignedAgentIds)) {
    res.status(400).json({ error: 'assignedAgentIds must be an array' });
    return;
  }

  repo.assignedAgentIds = assignedAgentIds.filter((id): id is string => typeof id === 'string');
  res.json({ repo });
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
