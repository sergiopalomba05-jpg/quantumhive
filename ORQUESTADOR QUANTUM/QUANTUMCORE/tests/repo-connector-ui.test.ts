import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('RepoConnector UI', () => {
  it('fetches repos from /api/github/repos on mount', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /\/api\/github\/repos/);
    assert.match(page, /useEffect/);
    assert.match(page, /fetch\('\/api\/github\/repos'\)/);
  });

  it('sends POST to /api/github/repos when adding a repo by URL', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /method: 'POST'/);
    assert.match(page, /\/api\/github\/repos/);
    assert.match(page, /JSON\.stringify\(\{ url/);
  });

  it('sends POST with fullName when connecting from list', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /fullName: repo\.fullName/);
  });

  it('fetches available repos from GitHub API', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /\/api\/github\/repos\/available/);
  });

  it('supports two-step connection flow (choose, github, local)', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /connectionType/);
    assert.match(page, /'choose'/);
    assert.match(page, /'github'/);
    assert.match(page, /'local'/);
  });

  it('shows agent assignment per repo', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /assignedAgentIds/);
    assert.match(page, /handleAgentAssignment/);
    assert.match(page, /Asignar agentes/);
  });

  it('sends PATCH to /api/github/repos/:id/agents for assignment', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /PATCH/);
    assert.match(page, /\/api\/github\/repos\/.*\/agents/);
    assert.match(page, /assignedAgentIds: agentIds/);
  });

  it('includes disconnect button', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /Desconectar/);
    assert.match(page, /handleDisconnect/);
  });

  it('does not contain mock data generation', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.doesNotMatch(page, /id: `repo_\$\{Date\.now\(\)\}`/);
    assert.doesNotMatch(page, /status: 'simulado'/);
    assert.doesNotMatch(page, /Repo mock added manually/);
  });

  it('does not contain English mock labels', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.doesNotMatch(page, /Modo Simulado/);
    assert.doesNotMatch(page, /Worktrees \(Mock\)/);
    assert.doesNotMatch(page, /Branch Active:/);
    assert.doesNotMatch(page, /Last Indexed:/);
    assert.doesNotMatch(page, /Conectar Simulado/);
    assert.doesNotMatch(page, /Añadir Repositorio \(Mock\)/);
  });

  it('contains Spanish labels', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /Rama activa:/);
    assert.match(page, /Última indexación:/);
    assert.match(page, /Conecta repositorios GitHub/);
    assert.match(page, /No hay repositorios conectados/);
    assert.match(page, /Cargando repositorios\.\.\./);
    assert.match(page, /Conectar Repo/);
  });

  it('uses mapBackendRepo to convert backend data', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /function mapBackendRepo/);
    assert.match(page, /provider: 'github'/);
    assert.match(page, /graphifyStatus: 'imported'/);
  });
});

describe('GitHub API routes', () => {
  it('has /api/github/repos/available endpoint', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.match(routes, /\/github\/repos\/available/);
    assert.match(routes, /api\.github\.com\/user\/repos/);
  });

  it('supports fullName in POST body for connecting from list', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.match(routes, /fullName/);
    assert.match(routes, /url or fullName is required/);
  });

  it('has PATCH endpoint for agent assignment', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.match(routes, /\/github\/repos\/:id\/agents/);
    assert.match(routes, /assignedAgentIds/);
  });

  it('never exposes GITHUB_TOKEN in responses', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.doesNotMatch(routes, /res\.json\(.*token/i);
    assert.doesNotMatch(routes, /GITHUB_TOKEN.*res\./);
  });

  it('returns assignedAgentIds in connected repo object', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.match(routes, /assignedAgentIds: string\[\]/);
  });

  it('does not keep connected repos only in process memory', () => {
    const routes = readProjectFile('src/server/routes/github.ts');

    assert.doesNotMatch(routes, /const\s+connectedRepos:\s*ConnectedRepo\[\]\s*=\s*\[\]/);
    assert.match(routes, /github_connected_repo/);
    assert.match(routes, /memories/);
  });
});
