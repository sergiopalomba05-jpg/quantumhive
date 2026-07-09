# Yas Papeo Chunked Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send long Telegram voice replies as multiple short voice notes, with the first audio delivered as soon as possible.

**Architecture:** Keep the existing Telegram audio flow in `app.py`. Replace the hard cap with deterministic sentence-based chunking, then generate/send each chunk sequentially so chunk 1 reaches the user before chunks 2 and 3 are generated.

**Tech Stack:** Python, python-telegram-bot, aiohttp, Cartesia TTS, ffmpeg, Cloud Run, `unittest`.

## Global Constraints

- Preserve current Cloud Run + Vertex AI + Cartesia deployment.
- Do not read URLs aloud; send links as text after voice notes.
- First voice note must be short and sent before generating later voice notes.
- Voice chunks should target roughly 15-25 seconds each by limiting characters per chunk.
- No hard maximum number of chunks; send as many as needed, but keep each chunk short.

---

### Task 1: Chunk Voice Reply Text

**Files:**
- Modify: `agencia/clientes/yas-papeo/app.py`
- Modify: `tests/test_yas_papeo_vertex_config.py`

**Interfaces:**
- Produces: `_voice_reply_chunks(text: str) -> list[str]`

- [ ] **Step 1: Write failing tests**

Add source-level tests that require `VOICE_REPLY_CHUNK_MAX_CHARS`, `_voice_reply_chunks`, and looped `reply_voice` usage.

- [ ] **Step 2: Verify failing tests**

Run: `python -m unittest tests.test_yas_papeo_vertex_config.YasPapeoVertexConfigTest.test_app_sends_chunked_telegram_voice_replies -v`

Expected: FAIL because chunking does not exist yet.

- [ ] **Step 3: Implement minimal chunker**

Add `_voice_reply_chunks(text: str) -> list[str]` that normalizes whitespace, splits on sentence boundaries, and keeps chunks under `VOICE_REPLY_CHUNK_MAX_CHARS` where possible.

- [ ] **Step 4: Run targeted tests**

Run: `python -m unittest tests.test_yas_papeo_vertex_config tests.test_yas_papeo_prompt_and_proposal -v`

Expected: OK.

### Task 2: Sequential Send Per Chunk

**Files:**
- Modify: `agencia/clientes/yas-papeo/app.py`
- Modify: `tests/test_yas_papeo_vertex_config.py`

**Interfaces:**
- Consumes: `_voice_reply_chunks(text: str) -> list[str]`

- [ ] **Step 1: Use chunk loop in `handle_audio`**

Replace single `tts_generate(audio_text)` call with `for index, audio_text in enumerate(audio_chunks, start=1)`.

- [ ] **Step 2: Log chunk timings**

Use `log_stage(f"tts_chunk_{index}")`, `log_stage(f"ffmpeg_chunk_{index}")`, and `log_stage(f"send_voice_chunk_{index}")`.

- [ ] **Step 3: Verify tests**

Run: `python -m unittest tests.test_yas_papeo_vertex_config tests.test_yas_papeo_prompt_and_proposal -v`

Expected: OK.

### Task 3: Deploy And Verify

**Files:**
- Deploy only from: `agencia/clientes/yas-papeo`

**Interfaces:**
- Cloud Run service: `yas-papeo-telegram-bot`

- [ ] **Step 1: Deploy**

Run from `agencia/clientes/yas-papeo`: `gcloud run deploy yas-papeo-telegram-bot --source . --region us-central1 --quiet`

Expected: new revision serving 100 percent traffic.

- [ ] **Step 2: Health check**

Run: `curl.exe -sS "https://yas-papeo-telegram-bot-557866434489.us-central1.run.app/health"`

Expected: `ok`.

- [ ] **Step 3: Inspect logs**

Run: `gcloud run services logs read yas-papeo-telegram-bot --region us-central1 --limit=120`

Expected: autodiagnostic OK and future user audio shows `send_voice_chunk_1` before later chunks.
