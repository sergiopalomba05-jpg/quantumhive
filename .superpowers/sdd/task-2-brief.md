# Task 2 Brief: Provider Router And Execution Clients

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 2 only: add provider/model selection logic and execution clients for Vertex and OpenAI-compatible providers.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-2-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- OpenAI-compatible provider secrets must be read server-side from env only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Existing Interface From Task 1

`src/core/aiProviders.ts` exports `getProviderRegistry(env?: NodeJS.ProcessEnv)` and provider/model definitions. Use that registry as the source of truth. Do not create a parallel provider list.

## Files

- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerRouter.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerClients.ts`
- Modify only if necessary: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/brainRouter.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-router.test.ts`
- Report: `.superpowers/sdd/task-2-report.md`

## Required Interfaces

`src/core/providerRouter.ts` must export:

- `ProviderSelectionRequest`
- `ProviderSelectionResult`
- `resolveProviderSelection(request: ProviderSelectionRequest, env?: NodeJS.ProcessEnv): ProviderSelectionResult`

`src/core/providerClients.ts` must export:

- `ProviderChatRequest`
- `ProviderChatResult`
- `generateWithProvider(request: ProviderChatRequest): Promise<ProviderChatResult>`

## Required Router Behavior

- If requested provider/model is router-ready, use it without fallback.
- If requested provider/model is browser/headless/local and requires runner, fallback to `gcp-vertex-ai` + `gemini-2.5-flash` with a `fallbackReason` mentioning runner.
- If requested provider/model is not router-ready, fallback to `gcp-vertex-ai` + `gemini-2.5-flash`.
- In auto/dev mode for code/debug tasks, prefer `openai-api` + `gpt-5.5` when `OPENAI_API_KEY` exists.
- In low-cost tasks, prefer a router-ready model with cheap/low-cost capability if available; otherwise use default Vertex fallback.
- Default fallback must remain `gcp-vertex-ai` + `gemini-2.5-flash`.

## Required Client Behavior

- `gcp-vertex-ai` must call existing Vertex `ai.models.generateContent`.
- `openai-api` must call `https://api.openai.com/v1/chat/completions` using `OPENAI_API_KEY` from server env.
- `openrouter-api` must call `https://openrouter.ai/api/v1/chat/completions` using `OPENROUTER_API_KEY` from server env.
- Do not implement browser/headless execution in this task.
- Throw clear errors when required env secrets are missing.

## Required Tests

Create `tests/provider-router.test.ts` with tests for:

- requested OpenAI model is used when `OPENAI_API_KEY` exists.
- browser/headless provider falls back to Vertex and says runner is required.
- auto code/debug task chooses OpenAI when `OPENAI_API_KEY` exists.

Use Node test runner style consistent with existing tests.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/provider-router.test.ts`
- `npm test -- tests/provider-manager.test.ts tests/provider-router.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerRouter.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/providerClients.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/src/core/brainRouter.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-router.test.ts"`

If `brainRouter.ts` was not modified, omit it from the staged paths.

Commit message: `feat: add provider router clients`

## Report Contract

Write `.superpowers/sdd/task-2-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
