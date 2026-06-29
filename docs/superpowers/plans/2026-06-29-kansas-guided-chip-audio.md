# Kansas Guided Chip Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 4 main Carta QR chips use deterministic pregrabbed audio flows instead of calling the LLM.

**Architecture:** `app.py` remains the single-file deployment. The backend exposes guided flows through `/guion` and `/pregrabar` includes every bridge phrase plus every referenced dish phrase. The frontend intercepts main chips in `quickAsk()` and plays the flow playlist with spotlight instead of calling `/chat/stream`.

**Tech Stack:** FastAPI, embedded HTML/JS, Supabase Storage TTS cache, Cartesia TTS only during pregrab/regeneration.

## Global Constraints

- Repo is public: no secrets in code or commits.
- Work on `main` only.
- No destructive commands.
- Verify against real code before reporting status.
- Keep change minimal inside `agencia/clientes/kansas/app.py`.

---

### Task 1: Guided Flow Contract

**Files:**
- Modify: `agencia/clientes/kansas/app.py`
- Test: `tests/test_kansas_guided_flows.py`

**Interfaces:**
- Produces: `build_guion_autoguiado()['flujos']`, keyed by quick chip text.
- Produces: flow items with `{tipo, texto_tts, dish_id}` where `tipo` is `puente` or `plato`.

- [ ] Write failing tests that require `/guion` to expose four deterministic flows.
- [ ] Implement `build_flujos_guiados()` and include it in `build_guion_autoguiado()`.
- [ ] Verify tests pass.

### Task 2: Pregrab Includes Main Chips

**Files:**
- Modify: `agencia/clientes/kansas/app.py`
- Test: `tests/test_kansas_guided_flows.py`

**Interfaces:**
- Consumes: `build_guion_autoguiado()['flujos']`.
- Produces: `/pregrabar` text list includes every guided flow `texto_tts`.

- [ ] Write failing test for `/pregrabar` iterating guided flow texts.
- [ ] Add guided flow texts to `/pregrabar` before dedupe.
- [ ] Verify tests pass.

### Task 3: Frontend Bypasses LLM For Main Chips

**Files:**
- Modify: `agencia/clientes/kansas/app.py`
- Test: `tests/test_kansas_guided_flows.py`

**Interfaces:**
- Consumes: `state.guidedFlows` populated from `/guion`.
- Produces: `runGuidedFlow(text)` that plays cached `/tts` audio playlist and schedules spotlight.

- [ ] Write failing test that `quickAsk()` calls `runGuidedFlow()` before `converse()`.
- [ ] Load `/guion` during `loadMenu()` and store `state.guidedFlows`.
- [ ] Implement `runGuidedFlow()` using existing `synthesize()` and `playAudioUrl()` helpers.
- [ ] Verify tests pass and `python -m py_compile agencia/clientes/kansas/app.py` passes.
