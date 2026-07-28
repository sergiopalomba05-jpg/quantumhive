# Task 1 Brief: Provider Domain And Secret-Safe Registry

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 1 only: expand `src/core/aiProviders.ts` into the provider domain and secret-safe registry used by later Provider Manager tasks.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-1-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- OpenAI-compatible provider secrets must be read server-side from env only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Files

- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/aiProviders.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-manager.test.ts`
- Report: `.superpowers/sdd/task-1-report.md`

## Required Interfaces

`src/core/aiProviders.ts` must export:

- `ProviderKind = 'api' | 'cloud' | 'browser' | 'headless' | 'local'`
- `ProviderVendor = 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'openrouter' | 'ollama'`
- `ProviderRuntimeStatus = 'connected' | 'needs_secret' | 'requires_runner' | 'needs_login' | 'limit_reached' | 'disabled' | 'failed'`
- `ProviderStatus` compatible with `ProviderRuntimeStatus`
- `ModelConnectionStatus` including `verified`, `candidate`, `catalog_only`, `requires_runner`, `needs_secret`
- `ProviderDefinition`
- `ProviderModelDefinition`
- `GCP_VERTEX_MODELS`
- `getProviderTemplates(): ProviderDefinition[]`
- `getProviderRegistry(env?: NodeJS.ProcessEnv): ProviderDefinition[]`
- `findProviderModel(providerId: string, modelId: string, env?: NodeJS.ProcessEnv)`

## Required Behavior

- `getProviderTemplates()` lists at least one provider of each kind: `api`, `cloud`, `browser`, `headless`, `local`.
- `getProviderRegistry(env)` must not expose secret values, even when env vars are passed.
- API providers must set `hasSecret: true`, `status: 'connected'`, their models `routerReady: true`, and their model `connectionStatus: 'verified'` when the matching env var exists.
- API providers without env secrets must remain `needs_secret`, with models not router-ready.
- Browser/headless plan providers must be `requires_runner` and not router-ready.
- Vertex must stay connected with the already verified Gemini models router-ready.
- Existing tests for `GCP_VERTEX_MODELS` must keep passing.

## Required Test

Create `tests/provider-manager.test.ts` with tests for:

- provider templates include all five kinds.
- env secrets set `hasSecret` but serialized registry does not contain secret values.
- browser/headless plan providers are `requires_runner`.

Use Node test runner style consistent with existing tests.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/provider-manager.test.ts`
- `npm test -- tests/gcp-vertex-models.test.ts tests/provider-manager.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/aiProviders.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-manager.test.ts"`

Commit message: `feat: expand provider manager registry`

## Report Contract

Write `.superpowers/sdd/task-1-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
