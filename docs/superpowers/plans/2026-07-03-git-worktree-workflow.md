# Git Worktree Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** separar claramente el trabajo entre PC local, VM y agentes para evitar choques sobre `main` y reducir pushes rechazados.

**Architecture:** `main` queda como rama de integracion. Cada frente activo trabaja en su propia rama. Si varios agentes comparten el mismo clone, cada uno usa su propio worktree o sandbox. Si trabajan desde otra VM o PC, ya tienen otro clone pero igual deben usar rama propia.

**Tech Stack:** Git, GitHub, OpenCode, worktrees de Git, clones locales.

## Global Constraints

- No trabajar cambios largos directamente en `main`.
- No mezclar dos agentes editando el mismo checkout al mismo tiempo.
- En la misma maquina y mismo clone: un agente por worktree.
- En otra maquina o VM: un frente por branch.
- Hacer `fetch` antes de empujar cambios importantes a `main`.

---

### Task 1: Definir ramas activas por frente

**Files:**
- Reference: `WORKFLOW_GIT.md`
- Reference: `SKILLS.md`

**Interfaces:**
- Consumes: ramas y frentes de trabajo actuales
- Produces: asignacion simple de rama por frente

- [ ] Identificar que trabajo sigue en `main` y mover el trabajo nuevo a ramas dedicadas.
- [ ] Reservar `vm1-matrix` para la VM y no reutilizarla para otro frente distinto.
- [ ] Definir una rama separada para Hermes si sigue trabajando en paralelo.
- [ ] Definir que `main` se usa solo para integrar trabajo terminado.

### Task 2: Separar agentes que compartan el mismo clone

**Files:**
- Reference: `WORKFLOW_GIT.md`

**Interfaces:**
- Consumes: agentes o sandboxes abiertos en la misma maquina
- Produces: un checkout aislado por agente

- [ ] Si dos agentes trabajan en la misma maquina y mismo clone, abrir un sandbox o worktree distinto para cada uno.
- [ ] Verificar con `git worktree list` que cada frente tenga carpeta separada.
- [ ] Evitar que dos agentes editen el mismo `main` local al mismo tiempo.

### Task 3: Flujo de commits y pushes

**Files:**
- Reference: `WORKFLOW_GIT.md`

**Interfaces:**
- Consumes: una rama de trabajo activa
- Produces: commits ordenados y pushes previsibles

- [ ] Antes de commitear, confirmar la rama actual con `git branch --show-current`.
- [ ] Commitear siempre en la rama del frente activo, no en `main` salvo integracion intencional.
- [ ] Hacer `git push origin NOMBRE_DE_RAMA` para subir la rama de trabajo.
- [ ] Integrar a `main` solo despues de revisar que no haya quedado trabajo mezclado.

### Task 4: Regla operativa diaria

**Files:**
- Reference: `WORKFLOW_GIT.md`

**Interfaces:**
- Consumes: rutina diaria de trabajo
- Produces: menos conflictos y menos pushes rechazados

- [ ] Al empezar una tarea nueva, decidir: misma VM/clone o nuevo frente.
- [ ] Si es un frente nuevo, crear rama nueva antes de editar.
- [ ] Si es otro agente en el mismo clone, abrir otro sandbox o worktree.
- [ ] Si el remoto avanzo, hacer `git fetch origin` antes de integrar o empujar a `main`.

### Task 5: Verificacion minima

**Files:**
- Reference: `WORKFLOW_GIT.md`

**Interfaces:**
- Consumes: estado local y remoto
- Produces: confirmacion de aislamiento correcto

- [ ] Correr `git status` y confirmar que cada frente ve solo sus cambios.
- [ ] Correr `git branch --all` y confirmar que cada trabajo importante tiene su rama.
- [ ] Correr `git worktree list` si hay varios agentes en la misma maquina.
- [ ] Confirmar que `main` no queda como rama de trabajo simultanea en varios agentes del mismo clone.
