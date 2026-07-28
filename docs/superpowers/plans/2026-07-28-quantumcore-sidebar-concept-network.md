# QuantumCore Sidebar Concept Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el interior del sidebar de QuantumCore para que las macros y subdivisiones se diferencien como una red conceptual.

**Architecture:** Mantener `macroAreas`, rutas y estado de expansion actual. Cambiar solo clases/markup de `Sidebar.tsx` y estilos en `index.css`, usando pseudo-elementos para lineas verticales y ramas horizontales.

**Tech Stack:** React 19, React Router, Tailwind utility classes, CSS global en `src/index.css`, tests Node `tsx --test`.

## Global Constraints

- No cambiar rutas existentes.
- No eliminar archivos ni datos.
- Letras mas grandes en macro y subdivisiones.
- Letras con interior blanco y borde/glow verde para diferenciar.
- Subdivisiones tipo tab con sangria y linea que las une a la macro.
- Verificar con test existente, lint/build y deploy Cloud Run si pasa.

---

### Task 1: Sidebar Network Markup And Styles

**Files:**
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/tests/chat-command-ui.test.ts`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/components/Sidebar.tsx`
- Modify: `ORQUESTADOR QUANTUM/QUANTUMCORE/src/index.css`

**Interfaces:**
- Consumes: `macroAreas`, `expandedGroups`, `NavLink` structure in `Sidebar.tsx`.
- Produces: CSS classes `sidebar-concept-tree`, `sidebar-macro-node`, `sidebar-subtree`, `sidebar-subnode`, `sidebar-subnode-branch`.

- [ ] Step 1: Add failing test expectations for the new concept-network classes and green outlined white text.
- [ ] Step 2: Run `npm test -- tests/chat-command-ui.test.ts` and confirm the new assertions fail because classes/styles are missing.
- [ ] Step 3: Add minimal class names to macro area wrappers, triggers, subtree container, subnode wrappers, and NavLinks.
- [ ] Step 4: Add CSS for larger macro/subdivision text, white fill, green text-shadow outline, vertical connector, horizontal branches, tab indentation, active state.
- [ ] Step 5: Run `npm test -- tests/chat-command-ui.test.ts`, `npm run lint`, and `npm run build`.
- [ ] Step 6: Deploy with `gcloud run deploy quantumcore --source . --region us-central1 --platform managed --project bubbly-stone-502214-u7 --allow-unauthenticated` if verification passes.

## Self-Review

- Covers the approved option 3 only.
- No route or data model changes.
- No placeholders or unrelated refactor.
- Keeps desktop and drawer sidebar sharing the same component.
