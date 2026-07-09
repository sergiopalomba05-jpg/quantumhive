# Yas Papeo Guided Chips Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace persistent Telegram chips with contextual guided chips and clean TTS pronunciation for prices, schedules, and common misread words.

**Architecture:** Keep the current single-file Telegram bot, but change the chip model from one global option list to reusable `ReplyOption` entries with `next_options`. Telegram renders only the options relevant to the current node; WhatsApp can later render the same option ids as quick replies/lists.

**Tech Stack:** Python, python-telegram-bot 22.x, Vertex AI Gemini, Cartesia TTS, Cloud Run, `unittest`.

## Global Constraints

- No persistent global chips after every message.
- Chips must appear by context: main menu, treatment submenu, alisados submenu, diagnostic questions.
- Prices must be spoken as pesos, not pesos argentinos, dollars, USD, or `$`.
- Audio wording must prefer `rango horario`, avoid `hs`, and use `formol,` when needed for pronunciation.
- Keep Cloud Run deployment and existing audio speed fixes.

---

### Task 1: Prompt/TTS Pronunciation Guard

- [ ] Add failing tests for pesos-only, no `$`, no `hs`, `rango horario`, and `formol,` guidance.
- [ ] Update `system_prompt.md` with these exact rules and safer price wording.
- [ ] Run prompt tests.

### Task 2: Guided Chip Tree

- [ ] Add failing tests proving persistent `DIAGNOSTIC_OPTIONS` markup is removed from every generic response.
- [ ] Extend `ReplyOption` with `next_options` and add context option groups.
- [ ] Make `/start` show only main chips.
- [ ] Make callbacks navigate menus/submenus without always calling Gemini.
- [ ] Keep free text mostly text-only unless a contextual prompt is detected.

### Task 3: Verify And Deploy

- [ ] Run targeted tests and syntax check.
- [ ] Deploy to Cloud Run.
- [ ] Verify health and revision.
