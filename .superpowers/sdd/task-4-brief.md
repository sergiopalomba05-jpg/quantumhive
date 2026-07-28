# Task 4 Brief: Chat Route Provider Selection

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 4 only: wire the Dominus chat route to accept `providerId`, `modelId`, and `repoId`, resolve them through the new provider router, and execute through the provider client for non-`vs_2` chat.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-4-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Vertex AI on Cloud Run must use service account/ADC, not a frontend API key.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- OpenAI-compatible provider secrets must be read server-side from env only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Existing Interfaces

- `src/core/providerRouter.ts` exports `resolveProviderSelection({ brainMode, providerId, modelId, repoId, message })`.
- `src/core/providerClients.ts` exports `generateWithProvider({ selection, prompt })`.
- Existing `vs_2` branch in `src/server/routes/chat.ts` must keep using verified Vertex Gemini models.

## Files

- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/chat.ts`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/chat-provider-selection.test.ts`
- Report: `.superpowers/sdd/task-4-report.md`

## Required Behavior

- `/api/agents/:agentId/chat` must destructure `providerId` and `repoId` from `req.body` in addition to existing fields.
- Non-`vs_2` chat must call `resolveProviderSelection` and then `generateWithProvider`.
- Response `brain` must include `providerId`, `providerName`, `usedModelId`, `modelDisplayName`, `fallbackUsed`, `fallbackReason`, and `repoId` from provider selection.
- Existing `vs_2` behavior must remain unchanged and continue to use `gemini-2.5-flash` + `gemini-2.5-pro`.
- Keep memory proposal extraction unchanged.

## Required Test

Create `tests/chat-provider-selection.test.ts` with a static contract test that asserts `src/server/routes/chat.ts` contains:

- `providerId`
- `repoId`
- `resolveProviderSelection`
- `generateWithProvider`

Use Node test runner style consistent with existing tests.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/chat-provider-selection.test.ts`
- `npm test -- tests/brain-router.test.ts tests/chat-command-ui.test.ts tests/chat-provider-selection.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/server/routes/chat.ts" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/chat-provider-selection.test.ts"`

Commit message: `feat: route dominus through providers`

## Report Contract

Write `.superpowers/sdd/task-4-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
