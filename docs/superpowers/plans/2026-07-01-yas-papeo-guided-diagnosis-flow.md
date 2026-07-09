# Yas Papeo Guided Diagnosis Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mismatched static chips with a deterministic diagnosis-first flow and remove forbidden currency tokens from prompt/output.

**Architecture:** Keep the existing Telegram bot file but make chip selection phase-based. Gemini still drafts natural text, while the app owns flow state, buttons, and final sanitization.

**Tech Stack:** Python, python-telegram-bot, Google GenAI, Cartesia TTS, unittest.

## Global Constraints

- No literal foreign-currency words, `USD`, or currency signs in `system_prompt.md`.
- Do not offer audio as a persistent chip; audio remains only as the user's input channel.
- Use `Atención más personalizada`, not `Asesoría humana` or `atención humana`.
- Do not create an internal staff notification group for the demo.

---

### Task 1: Tests

**Files:**
- Modify: `tests/test_yas_papeo_prompt_and_proposal.py`
- Modify: `tests/test_yas_papeo_vertex_config.py`

**Interfaces:**
- Produces failing tests for prompt currency cleanup, phase constants, deterministic chip groups, and output sanitizer.

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run tests to verify failure**

Run: `python -m unittest tests.test_yas_papeo_vertex_config tests.test_yas_papeo_prompt_and_proposal -v`

Expected: FAIL on missing `FlowPhase`, missing sanitizer, old chip constants, and prompt forbidden tokens.

### Task 2: Guided Flow Implementation

**Files:**
- Modify: `agencia/clientes/yas-papeo/app.py`

**Interfaces:**
- Produces: `FlowPhase`, `flow_states`, `_options_for_phase`, `_phase_for_option`, `_sanitize_outgoing_text`.

- [ ] **Step 1: Replace static next-options with phase-based chips**
- [ ] **Step 2: Sanitize Gemini output before sending text/audio**
- [ ] **Step 3: Run targeted tests**

### Task 3: Prompt Cleanup

**Files:**
- Modify: `agencia/clientes/yas-papeo/system_prompt.md`

**Interfaces:**
- Produces: diagnosis-first instructions and no forbidden currency literals.

- [ ] **Step 1: Rewrite rules without forbidden currency tokens**
- [ ] **Step 2: Replace human wording with personalized-attention wording**
- [ ] **Step 3: Run targeted tests and deploy**
