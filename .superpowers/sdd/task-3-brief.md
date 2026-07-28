# Task 3 Brief: Provider API Routes

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 3 only: expand backend provider routes so the UI can list providers, list models for a provider, and test provider readiness without exposing secrets.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-3-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- OpenAI-compatible provider secrets must be read server-side from env only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Existing Interfaces

- `src/core/aiProviders.ts` exports `getProviderRegistry(env?: NodeJS.ProcessEnv)`.
- `src/server/routes/providers.ts` already exports `providersRouter` and has `GET /api/providers`.

## Files

- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/providers.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-api.test.ts`
- Report: `.superpowers/sdd/task-3-report.md`

## Required Endpoints

- `GET /api/providers`: returns `{ providers }` and never includes secret values.
- `GET /api/providers/:id/models`: returns `{ models }` for an existing provider, or `404 { error: 'provider not found' }`.
- `POST /api/providers/:id/test`: returns readiness metadata only:
  - browser/headless/local providers with `requires_runner` return status `requires_runner` and a message mentioning runner.
  - API providers with `needs_secret` return status `needs_secret` and a message mentioning the provider's `secretRef`.
  - connected providers return current status and a message saying the provider is available for the router.
  - unknown provider returns 404.

## Required Tests

Create `tests/provider-api.test.ts` with tests that start `app` on an ephemeral port and verify:

- `GET /api/providers` returns status 200, enough provider metadata, and no secret-looking values.
- `GET /api/providers/gcp-vertex-ai/models` includes `gemini-2.5-flash`.
- `POST /api/providers/chatgpt-plus-browser/test` returns status `requires_runner` and a runner message.

Use the existing Node test style. Make sure the test server closes in `finally`.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/provider-api.test.ts`
- `npm test -- tests/provider-manager.test.ts tests/provider-router.test.ts tests/provider-api.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/providers.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-api.test.ts"`

Commit message: `feat: add provider api routes`

## Report Contract

Write `.superpowers/sdd/task-3-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
