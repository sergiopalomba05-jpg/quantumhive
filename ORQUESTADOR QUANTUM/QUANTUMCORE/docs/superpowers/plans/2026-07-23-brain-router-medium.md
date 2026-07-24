# Brain Router Medium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the medium Brain Router upgrade: responsive header, real V.S 2 Gemini execution, and an initial AI Providers/API Providers page.

**Architecture:** Keep provider metadata static for this phase. Add a focused council execution helper for Gemini-only V.S mode. Keep secrets out of the frontend and represent future providers as metadata only.

**Tech Stack:** React, Express, @google/genai, Node test runner, Vite, Cloud Run.

## Global Constraints

- No frontend/localStorage/API-provider secret storage.
- V.S 2 real uses only connected Vertex Gemini models in this phase.
- Provider page is metadata/status only.
- Deploy to Cloud Run after lint/test/build pass.

---

### Task 1: Responsive Chat Header

**Files:**
- Modify: `src/index.css`
- Test: `tests/chat-command-ui.test.ts`

**Interfaces:**
- Produces CSS for `.dominus-header-router`, `.header-brain-model-row`, and `.chat-header-controls`.

- [ ] Write failing UI contract for flexible header widths.
- [ ] Implement CSS to allow controls and router to expand when sidebar collapses.
- [ ] Run `npm test -- tests/chat-command-ui.test.ts`.

### Task 2: Real V.S 2 Gemini Execution

**Files:**
- Modify: `src/core/brainRouter.ts`
- Modify: `src/server/routes/chat.ts`
- Test: `tests/brain-router.test.ts`

**Interfaces:**
- Produces `resolveVsBrainSelection({ brainMode, modelId, vsModelIds, message })`.
- Produces response JSON with `brain.vsResults` and `brain.synthesizerModelId` for V.S mode.

- [ ] Write failing router tests for two connected Gemini models.
- [ ] Implement V.S selection helper.
- [ ] Update backend route to call both selected models in parallel and synthesize final answer.
- [ ] Run `npm test -- tests/brain-router.test.ts`.

### Task 3: AI Providers / API Providers Page

**Files:**
- Create: `src/pages/ApiProviders.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Test: `tests/api-providers-ui.test.ts`

**Interfaces:**
- Produces route `/api-providers`.
- Shows provider metadata only.

- [ ] Write failing UI contract for route, sidebar link, no secret input, and provider cards.
- [ ] Implement page and route.
- [ ] Add sidebar link under Intelligence.
- [ ] Run `npm test -- tests/api-providers-ui.test.ts`.

### Task 4: Verification And Deploy

**Files:**
- No source changes expected.

- [ ] Run `npm run lint`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Deploy with `gcloud run deploy quantumcore --source . --region us-central1 --allow-unauthenticated --quiet`.
- [ ] Smoke test `/chat`, `/api-providers`, and Dominus V.S endpoint.
