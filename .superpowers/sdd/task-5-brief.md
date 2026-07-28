# Task 5 Brief: GitHub Repo Connector Backend

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 5 only: add a backend GitHub repo connector that parses GitHub URLs, stores connected repo metadata in memory for this MVP, exposes repo listing/activation/context endpoints, and registers the route in Express.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-5-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- Do not expose `GITHUB_TOKEN` or any token in API responses.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Files

- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/github.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/app.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/github-connector.test.ts`
- Report: `.superpowers/sdd/task-5-report.md`

## Required Interfaces

`src/server/routes/github.ts` must export:

- `parseGitHubRepoUrl(url: string): { owner: string; name: string }`
- `githubRouter`

Required endpoints under `/api` after app registration:

- `GET /api/github/repos`
- `POST /api/github/repos`
- `PATCH /api/github/repos/:id/active`
- `GET /api/github/repos/:id/context`

## Required Behavior

- `parseGitHubRepoUrl('https://github.com/owner/repo')` returns `{ owner: 'owner', name: 'repo' }`.
- `parseGitHubRepoUrl('https://github.com/owner/repo.git')` returns `{ owner: 'owner', name: 'repo' }`.
- Non-GitHub URLs throw an error mentioning GitHub.
- `POST /api/github/repos` accepts `{ url }`, fetches GitHub repo metadata from `https://api.github.com/repos/:owner/:name`, and stores a repo record.
- `GITHUB_TOKEN`, when present, is used only in the outbound Authorization header.
- API responses never include token values.
- If GitHub fetch fails, return `400 { error }`.
- First connected repo becomes active by default.
- `PATCH /api/github/repos/:id/active` selects the active repo.
- `GET /api/github/repos/:id/context` returns a small context object with repo id, title, summary, url, and lastIndexedAt.

## Required Tests

Create `tests/github-connector.test.ts` with tests for:

- parsing HTTPS GitHub repo URLs with and without `.git`.
- rejecting non-GitHub URLs.

Keep route behavior testable by exported parser; full network endpoint tests can be left for later because this MVP uses live GitHub API unless fetch is injected.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/github-connector.test.ts`
- `npm test -- tests/github-connector.test.ts tests/provider-api.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/github.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/app.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/github-connector.test.ts"`

Commit message: `feat: add github repo connector api`

## Report Contract

Write `.superpowers/sdd/task-5-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
