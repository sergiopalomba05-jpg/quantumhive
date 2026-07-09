# Yas Papeo Channel-Agnostic Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable diagnostic chips to the Yas Papeo bot so Telegram can show buttons now and the same option model can later render as WhatsApp buttons/lists.

**Architecture:** Keep the current `app.py` flow but introduce a small channel-agnostic option model: each option has an id, label, text sent to Gemini, and optional cached-audio key. Telegram becomes only a renderer through inline keyboards and callback handlers; WhatsApp can later render the same options differently.

**Tech Stack:** Python, python-telegram-bot 22.x, Vertex AI Gemini, Cartesia TTS, Cloud Run, `unittest`.

## Global Constraints

- Preserve the current working Telegram demo and Cloud Run deployment.
- Do not implement WhatsApp now; only make the option model reusable for WhatsApp later.
- Do not implement audio cache now; include `cached_audio_key` in the option model so cache can be added without changing flows.
- Fix the pricing bug: all salon prices are Argentine pesos; never dollars.
- Use TDD: add failing tests before production code changes.

---

### Task 1: Prompt Pricing Guard

**Files:**
- Modify: `agencia/clientes/yas-papeo/system_prompt.md`
- Modify: `tests/test_yas_papeo_prompt_and_proposal.py`

**Interfaces:**
- Produces: prompt rules that explicitly block dollars in salon prices.

- [ ] **Step 1: Write failing test**

Require the prompt to include exact rules: `Todos los precios del salon estan en pesos argentinos`, `Nunca digas dolares`, and `En audio deci pesos argentinos`.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_yas_papeo_prompt_and_proposal.YasPapeoPromptAndProposalTest.test_prompt_forces_argentine_pesos_never_dollars -v`

Expected: FAIL because the prompt does not include the new hard rules.

- [ ] **Step 3: Add minimal prompt rules**

Add the rules under `## Reglas duras`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_yas_papeo_prompt_and_proposal -v`

Expected: OK.

### Task 2: Channel-Agnostic Options Model

**Files:**
- Modify: `agencia/clientes/yas-papeo/app.py`
- Modify: `tests/test_yas_papeo_vertex_config.py`

**Interfaces:**
- Produces: `ReplyOption` dataclass with fields `id: str`, `label: str`, `text: str`, `cached_audio_key: str | None`.
- Produces: `DIAGNOSTIC_OPTIONS: tuple[ReplyOption, ...]`.
- Produces: `_telegram_keyboard(options: tuple[ReplyOption, ...]) -> InlineKeyboardMarkup`.

- [ ] **Step 1: Write failing test**

Require source to include `@dataclass(frozen=True)`, `class ReplyOption`, `cached_audio_key`, `DIAGNOSTIC_OPTIONS`, and `_telegram_keyboard`.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_yas_papeo_vertex_config.YasPapeoVertexConfigTest.test_app_has_channel_agnostic_reply_options -v`

Expected: FAIL because these names do not exist yet.

- [ ] **Step 3: Implement minimal option model**

Add the dataclass and a diagnostic option tuple for: mantener natural, mas lacio, bajar frizz, recuperar dano, tengo tintura, tengo decoloracion, quiero precio, quiero turno.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_yas_papeo_vertex_config -v`

Expected: OK.

### Task 3: Telegram Button Rendering And Callback Handling

**Files:**
- Modify: `agencia/clientes/yas-papeo/app.py`
- Modify: `tests/test_yas_papeo_vertex_config.py`

**Interfaces:**
- Consumes: `ReplyOption`, `DIAGNOSTIC_OPTIONS`, `_telegram_keyboard`.
- Produces: `handle_option(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None`.

- [ ] **Step 1: Write failing test**

Require source to include `CallbackQueryHandler`, `handle_option`, `query.answer()`, and `reply_markup=_telegram_keyboard(DIAGNOSTIC_OPTIONS)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_yas_papeo_vertex_config.YasPapeoVertexConfigTest.test_app_renders_telegram_chips_and_handles_callbacks -v`

Expected: FAIL because callback handling does not exist yet.

- [ ] **Step 3: Implement minimal Telegram renderer**

Show diagnostic chips in `/start` and on text/audio replies. On callback, map option id to option text and pass it to `chat_text`.

- [ ] **Step 4: Run full targeted tests**

Run: `python -m unittest tests.test_yas_papeo_vertex_config tests.test_yas_papeo_prompt_and_proposal -v`

Expected: OK.

### Task 4: Deploy And Verify

**Files:**
- Deploy from: `agencia/clientes/yas-papeo`

**Interfaces:**
- Cloud Run service: `yas-papeo-telegram-bot`.

- [ ] **Step 1: Syntax check**

Run: `python -m py_compile "agencia/clientes/yas-papeo/app.py"`

Expected: exit 0.

- [ ] **Step 2: Deploy**

Run from `agencia/clientes/yas-papeo`: `gcloud run deploy yas-papeo-telegram-bot --source . --region us-central1 --quiet`

Expected: new revision serving 100 percent traffic.

- [ ] **Step 3: Health check**

Run: `curl.exe -sS "https://yas-papeo-telegram-bot-557866434489.us-central1.run.app/health"`

Expected: `ok`.
