# Task 6 Brief: Provider Manager UI And Chat Controls

Plan file: `ORQUESTADOR QUANTUM/QUANTUMCORE/docs/superpowers/plans/2026-07-24-provider-manager-github.md`

## Goal

Implement Task 6 only: upgrade the Provider Manager UI and add compact provider/model/repo controls to the Dominus chat request flow.

## Global Constraints

- Work only inside `ORQUESTADOR QUANTUM/QUANTUMCORE` unless writing your report to `.superpowers/sdd/task-6-report.md`.
- Do not store API keys, tokens, cookies, or secrets in frontend/localStorage.
- Frontend may only receive `secretRef`, `hasSecret`, status, and non-sensitive metadata.
- Browser/headless ChatGPT or Claude plans must be shown as `requires_runner` or `needs_login`; do not automate them from Cloud Run in this block.
- GitHub token must be read server-side from env only: `GITHUB_TOKEN`.
- Do not modify or delete unrelated dirty files in the repository root.
- Commit only files changed for this task using scoped git paths, never `git add .`.

## Existing Interfaces

- `GET /api/providers` returns `{ providers }`.
- `POST /api/providers/:id/test` returns `{ status, message }`.
- `GET /api/github/repos` returns `{ repos }`.
- Chat POST to `/api/agents/:agentId/chat` accepts `providerId`, `modelId`, and `repoId`.

## Files

- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/ApiProviders.tsx`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/ChatCentral.tsx`
- Create: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-manager-ui.test.ts`
- Report: `.superpowers/sdd/task-6-report.md`

## Required Provider UI Behavior

- `ApiProviders.tsx` must render `Agregar proveedor`.
- It must show filters or labels for `Browser`, `Headless`, and `Local/VM`.
- It must fetch from `/api/providers`.
- It must call `/api/providers/${provider.id}/test` when testing a provider.
- It must not contain `type="password"`, `localStorage`, `apiKey`, or `secretKey`.
- It should display `kind`, `status`, `secretRef`, model count, and model chips.

## Required Chat UI Behavior

- `ChatCentral.tsx` must fetch `/api/providers` and `/api/github/repos`.
- It must maintain selected `providerId`, `modelId`, and `repoId` state.
- It must include `providerId`, `modelId`, and `repoId` in the chat request body.
- Keep the current chat layout intact; add compact controls in the existing footer/header area without redesigning the whole page.

## Required Test

Create `tests/provider-manager-ui.test.ts` with static contract tests that assert:

- `ApiProviders.tsx` includes `Agregar proveedor`, `Browser`, `Headless`, `Local/VM`, `/api/providers`, and no secret/localStorage patterns.
- `ChatCentral.tsx` includes `providerId`, `modelId`, `repoId`, and `/api/providers`.

## Commands

Run from `ORQUESTADOR QUANTUM/QUANTUMCORE`:

- `npm test -- tests/provider-manager-ui.test.ts`
- `npm test -- tests/provider-manager-ui.test.ts tests/chat-command-ui.test.ts tests/chat-provider-selection.test.ts`
- `npm run lint`

If `npm run lint` times out at 120s without TypeScript errors, rerun it with a longer timeout and report that.

## Commit

After tests pass, commit scoped files only:

`git add "ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/ApiProviders.tsx" "ORQUESTADOR QUANTUM/QUANTUMCORE/src/pages/ChatCentral.tsx" "ORQUESTADOR QUANTUM/QUANTUMCORE/tests/provider-manager-ui.test.ts"`

Commit message: `feat: add provider manager chat controls`

## Report Contract

Write `.superpowers/sdd/task-6-report.md` with:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`
- Files changed
- Tests run with pass/fail result
- Commit hash if committed
- Self-review notes

Return only: status, commit hash, one-line tests summary, and concerns.
