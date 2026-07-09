# Carta Viva Premium Demo Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una app demo nueva basada en Kansas con cartas visuales premium: fotos por plato, carrusel de destacados, cards con motion/spotlight y sin tocar la demo Kansas estable.

**Architecture:** Se copia el motor monolítico actual de `agencia/clientes/kansas` a `agencia/clientes/carta-viva-premium-demo`. La demo mantiene FastAPI + HTML/CSS/JS embebido, pero introduce un contrato de menú con `image_url`, `image_alt`, `featured`, `badge` y render visual por cards. Kansas queda como referencia estable mientras la carpeta demo evoluciona hacia motor madre visual.

**Tech Stack:** Python FastAPI, HTML/CSS/JS vanilla embebido, CSS tokens, IntersectionObserver, CSS scroll-snap, tests Python por inspección de contrato.

## Global Constraints

- No tocar `agencia/clientes/kansas/app.py` para esta primera iteración visual.
- No introducir React, shadcn/ui, Framer Motion, GSAP, Swiper ni Lenis en el motor monolítico actual.
- Usar imágenes externas legales/estables para demo; no usar fotos random con copyright de restaurantes reales.
- Mantener intactos carrito, chips guiados, `dish_id`, `/guion`, `/tts`, `/stt`, spotlight y variantes copa/botella.
- El diseño debe ser mobile-first, premium, oscuro/dorado, con fallback elegante si falta imagen.
- Todo cambio de producción debe tener test rojo primero.

---

### Task 1: Demo Folder And Visual Contract

**Files:**
- Create: `tests/test_carta_viva_premium_demo_visual.py`
- Create: `agencia/clientes/carta-viva-premium-demo/app.py`
- Create: `agencia/clientes/carta-viva-premium-demo/requirements.txt`
- Create: `agencia/clientes/carta-viva-premium-demo/Dockerfile`
- Create: `agencia/clientes/carta-viva-premium-demo/README.md`

**Interfaces:**
- Consumes: Kansas app structure from `agencia/clientes/kansas/app.py`.
- Produces: a demo app path with a menu containing `image_url`, `image_alt`, `featured`, and `badge` fields.

- [ ] Write failing test that asserts the premium demo folder exists and its menu contains image metadata.
- [ ] Run `python tests/test_carta_viva_premium_demo_visual.py` and confirm it fails because the demo app does not exist.
- [ ] Copy the Kansas folder into `agencia/clientes/carta-viva-premium-demo`.
- [ ] Replace demo config/menu with a short premium menu and external image URLs.
- [ ] Run the test and confirm it passes.

### Task 2: Photo Card Renderer

**Files:**
- Modify: `agencia/clientes/carta-viva-premium-demo/app.py`
- Modify: `tests/test_carta_viva_premium_demo_visual.py`

**Interfaces:**
- Consumes: menu item fields `image_url`, `image_alt`, `featured`, `badge`.
- Produces: CSS classes `.dish-card`, `.dish-media`, `.dish-img`, `.dish-badge`, `.featured-rail`, `.featured-card` and JS render helpers for images.

- [ ] Extend the test to assert the app contains the visual class names and reads `it.image_url`.
- [ ] Run the test and confirm it fails against the copied Kansas renderer.
- [ ] Replace the list renderer with a card renderer while keeping `state.dishIndex` fields unchanged.
- [ ] Add image fallback and lazy loading.
- [ ] Run the test and confirm it passes.

### Task 3: Featured Carousel And Motion

**Files:**
- Modify: `agencia/clientes/carta-viva-premium-demo/app.py`
- Modify: `tests/test_carta_viva_premium_demo_visual.py`

**Interfaces:**
- Consumes: `featured: true` menu items.
- Produces: a top featured rail with CSS scroll-snap and IntersectionObserver reveal.

- [ ] Extend the test to assert `renderFeaturedRail`, `IntersectionObserver`, `scroll-snap-type`, and `prefers-reduced-motion` exist.
- [ ] Run the test and confirm it fails.
- [ ] Implement `renderFeaturedRail(sections, body)` before category sections.
- [ ] Add reveal observer and reduced-motion guard.
- [ ] Run the test and confirm it passes.

### Task 4: Verification And Review

**Files:**
- No new files.

**Interfaces:**
- Consumes: completed demo app.
- Produces: verified local state ready for user review.

- [ ] Run `python tests/test_carta_viva_premium_demo_visual.py`.
- [ ] Run existing Kansas tests to verify the stable app was not broken.
- [ ] Run `python -m py_compile agencia/clientes/carta-viva-premium-demo/app.py`.
- [ ] Extract embedded JS from the demo app and run `node --check`.
- [ ] Run `git diff -- agencia/clientes/carta-viva-premium-demo tests/test_carta_viva_premium_demo_visual.py docs/superpowers/plans/2026-07-03-carta-viva-premium-demo-visual.md`.
- [ ] Report what changed and any remaining visual/manual review needed.

## Self-Review

- Spec coverage: covers new isolated demo folder, visual menu contract, cards, featured rail, motion, and verification.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `image_url`, `image_alt`, `featured`, `badge`, `renderFeaturedRail`, and class names are consistent across tasks.
