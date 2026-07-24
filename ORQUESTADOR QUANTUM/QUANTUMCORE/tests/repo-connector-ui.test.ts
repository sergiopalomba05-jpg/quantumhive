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

  it('sends POST to /api/github/repos when adding a repo', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /method: 'POST'/);
    assert.match(page, /\/api\/github\/repos/);
    assert.match(page, /JSON\.stringify\(\{ url/);
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
    assert.match(page, /Conectando\.\.\./);
  });

  it('uses mapBackendRepo to convert backend data', () => {
    const page = readProjectFile('src/pages/RepoConnector.tsx');

    assert.match(page, /function mapBackendRepo/);
    assert.match(page, /provider: 'github'/);
    assert.match(page, /graphifyStatus: 'imported'/);
  });
});
