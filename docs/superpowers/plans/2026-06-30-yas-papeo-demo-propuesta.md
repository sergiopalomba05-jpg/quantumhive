# Yas Papeo Demo + Propuesta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar la demo de Yas Papeo con la nueva informacion operativa y reemplazar la propuesta futurista por una propuesta comercial concreta para cierre.

**Architecture:** El trabajo se divide en dos piezas de contenido que mueven el negocio hoy: el `system_prompt.md` como fuente de verdad del demo, y `docs/arquitectura.html` como pieza visual de venta. Un test de contenido en `tests/` protege precios, señas, horarios, rutas comerciales y los dos planes ofrecidos.

**Tech Stack:** Python `unittest`, Markdown, HTML/CSS estatico.

## Global Constraints

- Mantener el tono de Yas Papeo: calido, femenino, voseo argentino.
- No prometer integraciones productivas no validadas aun con la agenda real.
- La propuesta debe vender dos planes: `Plan Base` y `Plan Plus`.
- El valor `USD 300` debe quedar asociado al `Plan Base` como precio de clienta fundadora.

---

### Task 1: Blindar los cambios con un test de contenido

**Files:**
- Create: `tests/test_yas_papeo_prompt_and_proposal.py`

**Interfaces:**
- Consumes: `agencia/clientes/yas-papeo/system_prompt.md`, `agencia/clientes/yas-papeo/docs/arquitectura.html`
- Produces: chequeos de contenido critico ejecutables con `python -m unittest tests.test_yas_papeo_prompt_and_proposal -v`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Cover precios, señas, horarios, canas, repeticion de tratamientos y los dos planes**
- [ ] **Step 4: Re-run the test until failures point to missing content, not typos**

### Task 2: Actualizar la fuente de verdad del bot

**Files:**
- Modify: `agencia/clientes/yas-papeo/system_prompt.md`

**Interfaces:**
- Consumes: contenido aportado por Jaz sobre tratamientos, politicas y operacion real
- Produces: prompt listo para la demo de aprobacion

- [ ] **Step 1: Reescribir el prompt con tratamientos documentados y precios reales**
- [ ] **Step 2: Agregar dos caminos comerciales: agendar online o asesoramiento humano personalizado**
- [ ] **Step 3: Agregar horarios, direccion, pagos, señas y politica de cancelacion conocida**
- [ ] **Step 4: Agregar reglas de canas, color/decoloracion y repeticion de tratamientos**

### Task 3: Rehacer la propuesta visual para cerrar venta

**Files:**
- Modify: `agencia/clientes/yas-papeo/docs/arquitectura.html`
- Modify: `agencia/clientes/yas-papeo/docs/arquitectura.md`

**Interfaces:**
- Consumes: estrategia comercial acordada
- Produces: propuesta concreta para mostrar mañana

- [ ] **Step 1: Sacar discurso futurista y bajar a una propuesta comercial clara**
- [ ] **Step 2: Mostrar para que sirve la demo de Telegram**
- [ ] **Step 3: Presentar `Plan Base` y `Plan Plus` con precio fundadora**
- [ ] **Step 4: Explicar implementacion inicial bonificada y prerequisitos para produccion**

### Task 4: Verificacion final

**Files:**
- Test: `tests/test_yas_papeo_prompt_and_proposal.py`

**Interfaces:**
- Consumes: archivos actualizados
- Produces: evidencia de que el prompt y la propuesta contienen lo acordado

- [ ] **Step 1: Run `python -m unittest tests.test_yas_papeo_prompt_and_proposal -v`**
- [ ] **Step 2: Confirm all checks pass**
- [ ] **Step 3: Review files manually for tone, copy and accidental overpromises**
