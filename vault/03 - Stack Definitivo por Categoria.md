---
proyecto: QuantumHive
tipo: stack
version: "3.0"
fecha: 2026-06-01
tags: [quantumhive/stack, fase/referencia]
---

# 03 · Stack Definitivo por Categoría — v3.0

⬅️ Volver al [[00 - Mapa Maestro]] · Plan: [[02 - Plan Cronologico]] · Catálogo: [[04 - Catalogo de Recursos]] · Auditoría sesión 2: [[05 - Auditoria Critica - Sesion Gemini]]

> [!abstract] Qué cambió en v3.0
> Se incorporaron los recursos #87+ (sesión 2), **todos con repo verificado**. Criterio nuevo: **dentro de cada categoría conviven varias opciones; se elige la que encaja AL APLICAR.** Nada se descarta. Sin restricciones de seguridad.
>
> Leyenda: ✅ ganador/principal · 🔵 alternativa (se elige al aplicar) · 🌐 cloud · 🐙 GitHub · 🔧 skill/plugin

---

## A · Orquestación de agentes
**En F0–F2: NINGUNO → Claude Code orquesta directo (ahora con `/workflow` y `/rewind` nativos). Se elige UNO en F3.**

| Herramienta | Repo / URL | Estado | Nota |
|-------------|-----------|--------|------|
| **OpenClaw** | Peter Steinberger (~300k★) | 🔵 | Autónomo 24/7, Telegram/WhatsApp nativo, memoria, cron. |
| **Hermes Agent** | 🐙 `NousResearch/hermes-agent` (~143k★) | 🔵 | Self-improving, `/goal`+judge, 22 plataformas, $5 VPS, Termux. Muy alineado con AGI Telegram. |
| **Antigravity (Google)** | 🌐 `antigravity.google` | 🔵 | IDE agéntico + app de orquestación. Gemini 3 Pro, soporta Claude. |
| **Manus** | 🌐 `manus.ai` | 🔵 | Agente general, pitch decks, research. |
| **Claude Managed Agents** | 🌐 Anthropic Console | 🔵 | Prototipado no-code. |
| Paperclip / Rowboat | 🐙 varios | 🔵 | Verificar al llegar a F3. |

> Regla: se elige UNO en F3 tras comparar estrellas/commits/issues. Las demás quedan en reserva.

---

## B · Memoria, calidad de código y optimización
**Base F0: CLAUDE.md + Context7 + Superpowers + Claude-Mem.** Alternativas de optimización conviven.

| Herramienta | Repo / URL | Estado | Para qué |
|-------------|-----------|--------|----------|
| **CLAUDE.md** | archivo del repo | ✅ | Constitución. Primer archivo. Incluye regla `/rewind`. |
| **Context7** | 🔧 `npx @upstash/context7-mcp` | ✅ | Docs actualizadas → mata alucinaciones. |
| **Superpowers** | 🔧 `github.com/obra/superpowers` | ✅ | TDD + planificación. Incluye find-skills. |
| **Claude-Mem** | 🔧 `github.com/thedotmack/claude-mem` | ✅ | Memoria entre sesiones. |
| **gstack** | 🐙 `garrytan/gstack` | 🔵 | Slash-commands de roles (CEO/QA/Designer). |
| **ECC** | 🐙 `affaan-m/everything-claude-code` | 🔵 | Harness de skills/agentes. Evaluar solapamiento. |
| **Graphify** | 🐙 `safishamsi/graphify` | 🔵 | Grafo de código → ahorro tokens (repos 500+ archivos). |
| **skill-vault** | 🐙 `Hainrixz` | 🔵 | Gestor de skills. |
| Nativas Claude Code | `anthropics/claude-code` | ✅ | `/workflow`, `/rewind`, Ultraplan, Skill Creator, Security Review. |

---

## C · FreeEngine (modelos baratos / gratis)
**Puentes: OpenRouter + Bytez + NVIDIA/DeepSeek + Bedrock. Todos válidos, se rutea según costo.**

| Herramienta | Repo / URL | Capa |
|-------------|-----------|------|
| **AWS Bedrock ($200)** | 🌐 `aws.amazon.com/bedrock` | Capa 2 — razonamiento (Claude). |
| **DeepSeek vía NVIDIA** | 🌐 `build.nvidia.com` ⚠️ verificar modelo | Capa 3 — operativos $0. |
| **OpenRouter** | 🌐 `openrouter.ai` | Puente a Qwen, Kimi, GLM, Minimax, DeepSeek. |
| **Bytez** | 🌐 `bytez.com` (org `Bytez-com`) | 175-220k modelos + $200k créditos. |
| **Kimi Code** | 🌐 `kimi.ai` / OpenRouter | Ingeniería de volumen, barato. |
| free-claude-code | 🐙 `Alishahryar1/free-claude-code` | 🔵 Parkeado (opcional). |

---

## D · Automatización, WhatsApp y pagos
**Hub: n8n en Render (+ n8n MCP para construirlo con Claude). Gateway WhatsApp y pagos = alternativas.**

| Herramienta | Repo / URL | Estado | Para qué |
|-------------|-----------|--------|----------|
| **n8n (Render)** | 🐙 `n8n-io/n8n` | ✅ | Hub de automatización. Núcleo F1. |
| **n8n MCP** | 🐙 n8n MCP server | ✅ | Claude Code arma los flujos por terminal. |
| **PagoKit** | 🐙 `Hainrixz/agente-pagokit` | ✅ | Genera pagos (Mercado Pago/Stripe). Probar cobro test. |
| **whatsapp-agentkit** | 🐙 `Hainrixz/whatsapp-agentkit` | ✅ | "Cerebro" del vendedor WhatsApp. |
| **Evolution API** | 🐙 `EvolutionAPI/evolution-api` | 🔵 | Gateway WhatsApp alto rendimiento. |
| **OpenWA** | 🐙 `open-wa/wa-automate-nodejs` | 🔵 | Gateway WhatsApp alternativo. |
| YCloud / ManyChat | 🌐 | 🔵 | API oficial WhatsApp / DMs IG. |

---

## E · Generación y edición de video
**Elegir 1 motor + 1 backup AL PRODUCIR. No instalar todos juntos.**

| Herramienta | Repo / URL | Estado | Nota |
|-------------|-----------|--------|------|
| **Gemini Omni / Veo** | 🌐 `gemini.google.com` | 🔵 | Edición por instrucción, Google Cloud. |
| **Hunyuan Video** | 🐙 `Tencent/HunyuanVideo` | 🔵 | Potente y gratis (API). |
| **Nim Video / Higgsfield** | 🌐 | 🔵 | Product placement / UGC cinemático. |
| **editor-pro-max** | 🐙 `Hainrixz` | ✅ | Video por código (Remotion) — demos técnicas con datos. |
| **Odysser** | 🌐 `joinodysser.com` | ✅ | Edición rápida (subtítulos/overlays). |
| MiniMax / LTX / Invideo | 🌐/🐙 | 🔵 | Reservas. |

---

## F · Imagen, avatares y voz
**Producto: SAM 3 + Real-ESRGAN. Avatar de marca: LivePortrait + VibeVoice.**

| Herramienta | Repo / URL | Estado | Para qué |
|-------------|-----------|--------|----------|
| **SAM 3** | 🐙 `facebookresearch/segment-anything` | ✅ | Recorte de producto. F1. |
| **Real-ESRGAN** | 🐙 `xinntao/Real-ESRGAN` | ✅ | Upscale de fotos del mayorista. F1. |
| **LivePortrait** | 🐙 `KwaiVGI/LivePortrait` | ✅ | Animación del avatar de la agencia. |
| **VibeVoice** | 🐙 `microsoft/VibeVoice` | ✅ | Voz de marca $0. |
| **claude-banana** | 🐙 `Hainrixz` | 🔵 | Prompts de imagen. |
| Nano Banana / Personaplex | ⚠️ | 🔵 | Avatares (verificar). |

---

## G · Diseño web, UI y app
**F1: Page Pilot + claude-webkit. UI avanzada: 21st.dev + V0 + Open CoDesign (F3).**

| Herramienta | Repo / URL | Estado | Fase |
|-------------|-----------|--------|:----:|
| **Page Pilot AI** | 🌐 `pagepilot.ai` | ✅ | F1 |
| **claude-webkit** | 🐙 `Hainrixz/claude-webkit` | ✅ | F1/F2 |
| **21st.dev (Magic MCP)** | 🌐 `21st.dev` | ✅ | F3 |
| **the-architect** | 🐙 `Hainrixz` | 🔵 | F3 (blueprints) |
| V0.dev / Rork / Open CoDesign | 🌐/🐙 | 🔵 | F3 |

---

## H · E-commerce y dropshipping mayorista (foco F1)
**Foco: mayorista B2B (capital→provincia), high-ticket. NO minorista.**

| Herramienta | Repo / URL | Estado | Fase |
|-------------|-----------|--------|:----:|
| **Page Pilot AI** | 🌐 `pagepilot.ai` | ✅ | F1 |
| **Teemdrop** | 🌐 `teemdrop.com` | ✅ | F1 (comparar precios) |
| **TikTok scouting** | 🌐 | ✅ | F1 (qué pedir) |
| **DigitalPlat FreeDomain** | 🌐 `digitalplat.org` | ✅ | F0 |
| Proveedores mayoristas con catálogo automatizado | — | 🔵 | F1 (nodos de suministro; NO Combox/minorista) |

---

## I · Scraping, research y outreach
**Conviven: Playwright (estable) + Agent-Browser (bajo token) + Chrome DevTools MCP + Firecrawl.**

| Herramienta | Repo / URL | Estado | Fase |
|-------------|-----------|--------|:----:|
| **Playwright MCP** | 🐙 `microsoft/playwright` | ✅ | F1/F2 |
| **Firecrawl** | 🐙 `mendableai/firecrawl` | ✅ | F2 |
| **Chrome DevTools MCP** | 🐙 `ChromeDevTools/*` | 🔵 | F1/F2 |
| **Agent-Browser** | 🐙 `vercel-labs/agent-browser` | 🔵 | F1/F2 (bajo costo tokens) |
| **Humanizalo** | 🐙 `Hainrixz` | 🔵 | F2 (outreach por mail) |
| Comet (Perplexity) | 🌐 | ✅ | F1 (research) |

---

## J · Conocimiento (UCI), voz y memoria
**Ganadores: Gemini 1.5 Pro + NotebookLM + OpenWhispr + Gemini Embedding.**

| Herramienta | Repo / URL | Estado | Fase |
|-------------|-----------|--------|:----:|
| **Gemini 1.5 Pro** | 🌐 `aistudio.google.com` | ✅ | F2 (procesar videos) |
| **NotebookLM** | 🌐 `notebooklm.google.com` | ✅ | F2 |
| **OpenWhispr** | 🐙 `HeroTools/open-whispr` | ✅ | F1 (dictado CEO) |
| **Gemini Embedding** | 🌐 `ai.google.dev` | ✅ | F3 (memoria vectorial) |
| Kimi K2 | 🌐 OpenRouter | ✅ | F3 |

---

## K · Trading (manual + soporte de visión) — F4
**El trading lo opera Sergio a mano. No hay bots. Solo soporte.**

| Herramienta | Repo / URL | Estado | Fase |
|-------------|-----------|--------|:----:|
| Mark-XXXIX | ⚠️ verificar | 🔵 | F4 (visión de pantalla en MT5/Bookmap) |
| Databento | 🌐 `databento.com` | 🔵 | F4 (datos, bajo) |
| Maya / maia-skill | 🐙 `Hainrixz` | 🔵 | F4 (research, bajo) |

---

## L · Utilidades y referencia
Awesome-Selfhosted · LLM Council · Mureka · Napkin IA · Genspark — todos disponibles como utilidades puntuales.

---
**Ficha de cada recurso →** [[04 - Catalogo de Recursos]]
