import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { supabase } from '../../core/providers/supabase';

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

type ConnectedRepoMemoryPayload = {
  scope: 'global';
  content: string;
  metadata: {
    kind: 'github_connected_repo';
    fullName: string;
    repo: ConnectedRepo;
  };
  visibility: 'private';
};

type ConnectedRepoMemoryRow = {
  id: string;
  content: string | null;
  metadata: unknown;
  created_at?: string | null;
};

const fallbackConnectedRepos: ConnectedRepo[] = [];

function rememberFallbackRepo(repo: ConnectedRepo): void {
  const index = fallbackConnectedRepos.findIndex((item) => item.id === repo.id || item.fullName === repo.fullName);
  if (index >= 0) {
    fallbackConnectedRepos[index] = repo;
    return;
  }
  fallbackConnectedRepos.push(repo);
}

function forgetFallbackRepo(repoId: string): void {
  const index = fallbackConnectedRepos.findIndex((item) => item.id === repoId);
  if (index >= 0) fallbackConnectedRepos.splice(index, 1);
}

function isConnectedRepo(value: unknown): value is ConnectedRepo {
  if (!value || typeof value !== 'object') return false;
  const repo = value as Partial<ConnectedRepo>;
  return [repo.id, repo.owner, repo.name, repo.fullName, repo.title, repo.summary, repo.url, repo.lastIndexedAt]
    .every((item) => typeof item === 'string')
    && typeof repo.active === 'boolean'
    && Array.isArray(repo.assignedAgentIds)
    && repo.assignedAgentIds.every((id) => typeof id === 'string');
}

export function createConnectedRepoMemoryPayload(repo: ConnectedRepo): ConnectedRepoMemoryPayload {
  return {
    scope: 'global',
    content: `Repositorio GitHub conectado: ${repo.fullName}\n${repo.summary}`,
    metadata: {
      kind: 'github_connected_repo',
      fullName: repo.fullName,
      repo,
    },
    visibility: 'private',
  };
}

export function mapConnectedRepoMemoryRow(row: ConnectedRepoMemoryRow): ConnectedRepo {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as { repo?: unknown } : {};
  if (!isConnectedRepo(metadata.repo)) {
    throw new Error('Invalid connected repo memory row');
  }
  return metadata.repo;
}

async function listConnectedRepos(): Promise<ConnectedRepo[]> {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('id, content, metadata, created_at')
      .eq('scope', 'global')
      .eq('metadata->>kind', 'github_connected_repo')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const repos = (data || [])
      .map((row) => {
        try {
          return mapConnectedRepoMemoryRow(row as ConnectedRepoMemoryRow);
        } catch {
          return null;
        }
      })
      .filter((repo): repo is ConnectedRepo => repo !== null);

    return repos.length > 0 ? repos : fallbackConnectedRepos;
  } catch (error) {
    console.warn('GitHub repo persistence unavailable, using in-memory fallback:', error instanceof Error ? error.message : error);
    return fallbackConnectedRepos;
  }
}

async function saveConnectedRepo(repo: ConnectedRepo): Promise<void> {
  rememberFallbackRepo(repo);

  try {
    const payload = createConnectedRepoMemoryPayload(repo);
    const { data: existingRows, error: findError } = await supabase
      .from('memories')
      .select('id')
      .eq('scope', 'global')
      .eq('metadata->>kind', 'github_connected_repo')
      .eq('metadata->>fullName', repo.fullName)
      .limit(1);

    if (findError) throw findError;

    const existingId = existingRows?.[0]?.id;
    if (existingId) {
      const { error } = await supabase
        .from('memories')
        .update(payload)
        .eq('id', existingId);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('memories').insert(payload);
    if (error) throw error;
  } catch (error) {
    console.warn('GitHub repo persistence save failed, kept in in-memory fallback:', error instanceof Error ? error.message : error);
  }
}

async function deleteConnectedRepo(repoId: string): Promise<boolean> {
  const repos = await listConnectedRepos();
  const repo = repos.find((item) => item.id === repoId);
  forgetFallbackRepo(repoId);
  if (!repo) return false;

  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('scope', 'global')
      .eq('metadata->>kind', 'github_connected_repo')
      .eq('metadata->>fullName', repo.fullName);
    if (error) throw error;
  } catch (error) {
    console.warn('GitHub repo persistence delete failed:', error instanceof Error ? error.message : error);
  }

  return true;
}

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

githubRouter.get('/github/repos', async (_req, res) => {
  res.json({ repos: await listConnectedRepos() });
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
    const existingRepos = await listConnectedRepos();
    const existingRepo = existingRepos.find((item) => item.fullName.toLowerCase() === (metadata.full_name || `${owner}/${name}`).toLowerCase());
    const isFirstRepo = existingRepos.length === 0;
    const repo: ConnectedRepo = {
      id: existingRepo?.id || randomUUID(),
      owner: metadata.owner?.login || owner,
      name: metadata.name || name,
      fullName: metadata.full_name || `${owner}/${name}`,
      title: metadata.full_name || `${owner}/${name}`,
      summary: metadata.description || 'No description provided.',
      url: metadata.html_url || `https://github.com/${owner}/${name}`,
      active: existingRepo?.active ?? isFirstRepo,
      lastIndexedAt: existingRepo?.lastIndexedAt || new Date().toISOString(),
      assignedAgentIds: existingRepo?.assignedAgentIds || [],
    };

    await saveConnectedRepo(repo);
    res.status(201).json({ repo });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'GitHub repo connection failed' });
  }
});

githubRouter.patch('/github/repos/:id/agents', async (req, res) => {
  const repos = await listConnectedRepos();
  const repo = repos.find((item) => item.id === req.params.id);
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
  await saveConnectedRepo(repo);
  res.json({ repo });
});

githubRouter.patch('/github/repos/:id/active', async (req, res) => {
  const repos = await listConnectedRepos();
  const repo = repos.find((item) => item.id === req.params.id);
  if (!repo) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }

  for (const item of repos) {
    item.active = item.id === repo.id;
    await saveConnectedRepo(item);
  }

  res.json({ repo });
});

githubRouter.delete('/github/repos/:id', async (req, res) => {
  const deleted = await deleteConnectedRepo(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'repo not found' });
    return;
  }

  res.status(204).send();
});

githubRouter.get('/github/repos/:id/context', async (req, res) => {
  const repos = await listConnectedRepos();
  const repo = repos.find((item) => item.id === req.params.id);
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
