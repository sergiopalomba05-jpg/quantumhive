# CLAUDE.md — Constitución de QuantumHive (v3)

> **Claude Code: leé este archivo COMPLETO antes de tocar nada en cada sesión.**
> Es la guía suprema de comportamiento. Si algo de lo que vas a hacer contradice este archivo, frená y avisá.

---

## 0. Contexto de un vistazo

- **Proyecto:** QuantumHive — la infraestructura/motor invisible detrás de todos los negocios de Sergio.
- **3 frentes sobre un mismo motor** (se prenden en secuencia, no en paralelo):
  1. **@directimport420 — B2B mayorista high-ticket** (capital→provincia). Caja rápida → **F1, primero**.
  2. **Agencia de servicios IA + canal IG** (automatizaciones, webs, apps, carta QR para PyMEs; contenido mostrando builds reales) → **F2-F3**.
  3. **Trading manual** (@traderboss420). Lo opera Sergio a mano; soporte de visión → **F4. Sin bots.**
- **Foco inmediato:** `@directimport420` (mayorista B2B). Lo demás viene después.
- **Estado:** repo nuevo `quantumhive`, arranque **desde cero y en limpio**. El repo viejo (`quantumhive-algorithmictrading`) está **descartado**: no se audita, no se copia, **no se rescata nada de ahí**. Toda la lógica que vale vive en este archivo y en la bóveda.
- **Documentación viva:** la bóveda de Obsidian (Mapa Maestro, Reglas, Plan Cronológico, Stack, Catálogo). Este archivo es el resumen operativo; la bóveda es el detalle.

## 1. Quién es Sergio (el CEO)

- Trader manual de US30 (apertura NY), 6+ años. Dev autodidacta en Python. **Constructor de oficio** (experiencia real en obra — clave para el contenido de la agencia).
- CEO y único operador de QuantumHive hoy. Opera desde Olivos, Argentina.
- **Equipo de trabajo: Mac 2015 corriendo Windows vía Boot Camp.** Implicancia técnica en sección 8.
- **Paga plan Max → calidad premium.** No se escatima razonamiento para ahorrar centavos (ver sección 5).
- Pasó 3 meses sufriendo con código parcheado por IAs. Este repo existe para que eso **no se repita**.

---

## 2. REGLAS DE ORO (inamovibles)

1. **Este archivo (`CLAUDE.md`) primero**, antes de cualquier línea de código.
2. **`git push` antes de dar una tarea por terminada.** Si no está en GitHub, no existe.
3. **Un paso a la vez.** Si el paso anterior no está estable, NO se avanza. (Esto rompió todo la vez pasada.)
4. **Preguntá antes de cualquier acción destructiva** (borrar, sobrescribir, mover masivo). Es una feature, no un obstáculo.
5. **NUNCA usar `--dangerously-skip-permissions`.** Es el comando que borró todos los bots una vez. Prohibido permanente.
6. **Verificá que un repo/framework exista y esté mantenido** (la **URL exacta**, último commit, issues) ANTES de integrarlo. No la existencia abstracta — el org correcto.
7. **No instalar todo junto.** Cada herramienta entra cuando la anterior está estable.
8. **No re-explicar la arquitectura cada sesión.** Para eso está este archivo y la bóveda.
9. **El catálogo es biblioteca: nada se descarta. Tener ≠ usar** — la herramienta concreta se elige AL APLICAR cada paso. Las alternativas conviven (no se "reemplaza y tira").
10. **`/rewind` (o doble Esc) en vez de corregir errores con mensajes.** Mantiene el contexto limpio y ahorra tokens.

## 3. ANTI-PATRONES PROHIBIDOS (errores reales de los 3 meses)

- ❌ Crear archivos "para después" que nunca se usan → si existe en el repo, **corre**.
- ❌ Parchear en lugar de refactorizar.
- ❌ Alucinar rutas, funciones o nombres de archivos → si no estás seguro, verificá o preguntá.
- ❌ Mezclar varias IAs sin un arquitecto central → genera "Frankenstein".
- ❌ Construir las divisiones avanzadas (agencia, trading) sin el ingreso base funcionando.
- ❌ Reemplazar decisiones ya tomadas "por vibe", sin comparar.
- ⚠️ **Antecedente:** un agente (Cascade/Windsurf) borró bots por correr sin permisos. De ahí la regla #5.

---

## 4. 🔒 Keys — EL REPO ES PÚBLICO

No es paranoia de seguridad (no hay nada que robar, el repo lo ve cualquiera a propósito, para que HuggingFace lo lea). Es **una sola disciplina práctica**: no publicar las keys, porque si se filtran te drenan los créditos/cuentas que SÍ pagás.

- Las keys (`TELEGRAM_TOKEN`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `HF_TOKEN`, `SUPABASE`, `AWS`) van **solo** en:
  1. Env vars de **HuggingFace Spaces** / **Render** (producción).
  2. Un **`.env` LOCAL** en `.gitignore` (desarrollo).
- Al repo solo sube **`.env.ejemplo`** con claves vacías.
- Antes de cada commit, verificá que no haya keys hardcodeadas. Si hay, frená y avisá.

## 5. Stack, arquitectura y CALIDAD

> [!important] Calidad premium + economía de tokens (cañería sí, cerebro no)
> - **El modelo RAZONA y planifica** (Ultraplan). **Jamás** amordazar el razonamiento para ahorrar tokens — eso da peor código y es falsa economía.
> - Delegar a modelos baratos (DeepSeek/Kimi) **solo para tareas mecánicas/repetitivas**, NUNCA para lógica.
> - Concisión **en el chat/output**, no en el razonamiento.
> - Ahorro real = cañería: Claude-Mem (no re-leer el repo), `/rewind`, no cargar archivos de más, CLAUDE.md conciso.

**FreeEngine — 3 capas:**
1. **Arquitecto:** Claude Code (este agente). Construye y limpia estructura.
2. **Agentes con razonamiento:** Claude vía AWS Bedrock ($200).
3. **Operativos $0:** DeepSeek vía NVIDIA + OpenRouter + Bytez (puentes a modelos baratos). Solo tareas mecánicas.

**Infraestructura:** HuggingFace Spaces · **Render** (n8n + servicios, reemplaza a Oracle descartado) · GitHub · Supabase + SQLite.

**Jerarquía operativa:**
```
SERGIO (decisión final, trading manual)
  └─ AGI TELEGRAM (extensión digital 24/7)
       └─ CLAUDE (estrategia/arquitectura/filtro) + GEMINI (ingesta masiva)
            └─ CLAUDE CODE / AIDER (ejecutor — vos)
                 └─ AGENTES (se activan por fase, no todos de golpe)
```

## 6. Estructura del repo

```
quantumhive/
├── CLAUDE.md              ← este archivo, SIEMPRE primero
├── .env.ejemplo           ← plantilla de variables (claves vacías)
├── .gitignore             ← .env y secretos JAMÁS al repo
├── directimport/          ← FRENTE 1 — FOCO ACTUAL (F1)
│   ├── n8n/               ← flujos Render
│   ├── contenido/         ← imágenes, copies, catálogo
│   └── agentes/           ← captación y ventas B2B
├── agencia/               ← FRENTE 2 (F2-F3): servicios IA, carta QR, apps, contenido/IG
├── agi/                   ← AGI Telegram (Jarvis) — se construye LIMPIO en F3 (no se rescata del viejo)
├── nucleo/                ← solo código nuevo y verificado
└── trading/               ← FRENTE 3 (F4): soporte al trading manual. Sin bots.
```

**Regla:** si un archivo existe en este repo, **corre**. Nada muerto, nada rescatado del repo viejo.

## 7. Plan de fases (resumen — detalle en la bóveda)

- **F0 · Cimientos:** este archivo + GitHub MCP + Context7 + Superpowers + Claude-Mem + Bedrock + DeepSeek/OpenRouter/Bytez + regla `/rewind`. ← **estamos acá**
- **F1 · Primer ingreso (directimport B2B mayorista):** flujo n8n (orden Telegram → post → aprobación → publica), outreach a revendedores, cierre WhatsApp, cobro (PagoKit). **Gate: primera comisión cobrada.**
- **F2 · Escala + arranque agencia:** contenido en video + captación + arrancar el canal IG de la agencia (mostrando builds reales).
- **F3 · Orquestación + agencia IA servicio:** elegir UN orquestador (tras verificar repos) + AGI con memoria persistente + producto agencia (carta QR PyME, apps).
- **F4 · Trading manual + premium:** soporte de visión (Mark-XXXIX) mientras Sergio opera. **Sin bots.**

**Gate F0 → F1:** el repo corre, hace su primer commit, y Claude Code arranca leyendo este archivo.

## 8. Restricciones técnicas

- **Mac 2015 + Windows (Boot Camp):** nada pesado en local.
  - ❌ Modelos LLM locales grandes, ComfyUI, generación de video local, repos pesados.
  - ✅ Todo lo pesado por **API Cloud**. Procesamiento masivo en Render o con créditos cloud.
- Internet requerido (el modelo corre en servidores, no en la máquina).

## 9. Flujo de trabajo por sesión

1. Sergio trae el problema o la tarea.
2. Claude (estrategia) define el brief y la arquitectura.
3. Claude Code (vos) ejecuta el código.
4. **Sergio aprueba antes de cada deploy.**
5. `git push`. Recién ahí la tarea está cerrada.

---
*Documento vivo. Si descubrís un error de arquitectura o una alucinación vieja, anotá la solución acá para que no se repita.*
