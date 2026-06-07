---
proyecto: QuantumHive
tipo: principios
version: "2.0"
fecha: 2026-06-01
tags: [quantumhive/reglas, fase/fundamento]
---

# 01 · Reglas de Oro y Lectura Crítica (v2.0)

⬅️ Volver al [[00 - Mapa Maestro]]

> [!warning] Leer antes de construir
> El proyecto ya colapsó una vez: 3 meses de parches que dejaron un Frankenstein. Estas reglas son la cura.

---

## 1. Reglas inamovibles

1. **CLAUDE.md primero.** Antes de cualquier código, en cada sesión.
2. **Git push antes de dar algo por terminado.** Si no está en GitHub, no existe.
3. **Un paso a la vez.** Si el anterior no está estable, no se avanza.
4. **Claude Code pregunta antes de acciones destructivas.** Es feature, no obstáculo.
5. **NUNCA `--dangerously-skip-permissions`.** Borró los bots. Prohibido permanente.
6. **Verificar el repo/URL antes de integrar.** No la *existencia* (casi todo es real) — la **URL exacta** y que esté mantenido. Gemini cita bien la herramienta pero a veces mal el org.
7. **No instalar todo junto.** Entra una cuando la anterior está estable.
8. **`/rewind` en vez de corregir errores con mensajes.** Mantiene el contexto limpio y ahorra tokens.

## 2. Principio de la biblioteca (catálogo) ⭐ NUEVO

- **El catálogo es la biblioteca completa: NADA se descarta.** Todo lo recolectado entra como opción.
- **Tener en el catálogo ≠ usarlo ahora.** La herramienta concreta se elige **al aplicar cada paso**, según la necesidad.
- **Las alternativas conviven** (ej: Playwright + Agent-Browser + Chrome DevTools; OpenClaw + Hermes + Antigravity). No se "reemplaza y tira" — se elige al construir.
- Lo único que queda afuera: duplicados exactos e inputs que no son herramientas (o decisiones de negocio, como Combox por ser minorista).

## 3. Sobre la seguridad ⭐ NUEVO

- **No aplicamos restricciones de seguridad / IP / repos privados / permisos.** No encajan en esta situación (no hay nada que robar, el repo no lo ve nadie, el único pago es la suscripción). Eso fue una traba con Gemini; acá no.
- Lo único que importa es **funcional**: que un cobro entre bien (PagoKit), que un flujo no se rompa. Nada de paranoia.

## 4. Anti-patrones prohibidos

- ❌ Archivos "para después" que nunca se usan → si existe en el repo, corre.
- ❌ Parchear en lugar de refactorizar.
- ❌ Alucinar rutas/funciones.
- ❌ Re-explicar la arquitectura cada sesión (para eso está la bóveda).
- ❌ Construir frentes avanzados sin el ingreso base funcionando.
- ❌ **Reemplazar decisiones tomadas "por vibe"** sin comparar (lección sesión 2).

## 5. Lectura crítica de Gemini (vigente, actualizada)

- **Falla 1 — Inflación:** casi todo 9.5-10. El puntaje no informa.
- **Falla 2 — No cruza recursos:** mete duplicados; el conteo se le desarma (143 videos → ~113 reales).
- **Falla 3 — Contexto viejo + overreach:** Oracle (descartado→Render), "DeepSeek V4" (verificar nombre), e intenta **ejecutar/reescribir el plan** (eso lo decide Sergio + Claude estrategia).
- **Falla 4 (sesión 2) — Swaps por vibe:** propone "X reemplaza a Y" sin comparar. → se tratan como **alternativas que conviven**, no reemplazos.
- **Lo que Gemini SÍ hace bien:** descubrir herramientas y describirlas. Las herramientas son reales; el filtro y la ubicación los hace Claude.

## 6. Hardware (Mac 2015)

- ❌ Modelos grandes locales, ComfyUI, video local, repos pesados juntos.
- ✅ Todo lo pesado por API Cloud / VPS. Local solo liviano.

## 7. Negocios y jerarquía

- **3 frentes, un motor:** (1) @directimport420 B2B mayorista [F1, primero], (2) Agencia IA servicios/PyME [F2-F3], (3) Trading **manual** [F4, sin bots].
- Jerarquía: **Sergio (CEO)** → AGI Telegram → **Claude (estrategia/arquitectura/filtro)** + Gemini (ingesta) → Claude Code/Aider (ejecutor) → agentes por fase.
- Claude define brief y arquitectura. Claude Code ejecuta. Sergio aprueba antes de cada deploy.

---
➡️ Con las reglas claras: [[02 - Plan Cronologico]].
