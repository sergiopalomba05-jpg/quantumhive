---
proyecto: QuantumHive
tipo: catalogo
version: "3.1"
fecha: 2026-06-01
tags: [quantumhive/catalogo, fase/referencia]
---

# 04 · Catálogo Completo de Recursos — v3.1 (archivo único)

⬅️ [[00 - Mapa Maestro]] · Ganadores: [[03 - Stack Definitivo por Categoria]] · Plan: [[02 - Plan Cronologico]]

> [!success] Principio
> Biblioteca completa: **nada se descarta** (salvo duplicados exactos y lo que no es herramienta). **Tener ≠ usar**: la herramienta se elige al aplicar. Las alternativas conviven. Sin restricciones de seguridad/IP.
> **143 videos − ~30 duplicados ≈ ~113 recursos.** 🆕 = sesión 2 (repo verificado 1-Jun).
> Estado: ✅ usar · 🔵 alternativa · ⚠️ verificar · ❌ descartado · 🔁 duplicado/fusionado.

---

## 🧱 Cimientos / FreeEngine / optimización (F0)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 5 | **CLAUDE.md** | archivo del repo | Constitución. Primer archivo. Incluye regla `/rewind`. | ✅ |
| — | **GitHub MCP** | `github.com/modelcontextprotocol` | Commits automáticos. | ✅ |
| 21 | **Context7** | `npx @upstash/context7-mcp` | Docs actualizadas → anti-alucinación. | ✅ |
| 7 | **Superpowers** | `github.com/obra/superpowers` | TDD + planificación. Incluye find-skills. | ✅ |
| 7 | **Claude-Mem** | `github.com/thedotmack/claude-mem` | Memoria entre sesiones. | ✅ |
| 20 | **AWS Bedrock ($200)** | `aws.amazon.com/bedrock` | FreeEngine capa 2 (Claude). DolarApp. | ✅ |
| 14 | **DeepSeek vía NVIDIA** | `build.nvidia.com` | FreeEngine capa 3. ⚠️ verificar nombre modelo. | ⚠️ |
| 53 | **OpenRouter** | `openrouter.ai` | Puente a Qwen/Kimi/GLM/Minimax/DeepSeek. | ✅ |
| 2 | **find-skills** | en Superpowers | App store de skills. | ✅ |
| 7 | **Security Review** | `github.com/anthropics/claude-code-security-review` | Escaneo (nativo Claude Code). | ✅ |
| 29 | **Reglas Karpathy** | patrón → CLAUDE.md | Reglas de elite. | ✅ |
| 8 | **Obsidian + Claude Code** | `obsidian.md` | Esta bóveda. | ✅ |
| 63 | **OpenCode Go** | `github.com/sst/opencode` | CLI alternativa bajo costo. | ✅ |
| 87 | 🆕 **gstack** | `github.com/garrytan/gstack` (106k★) | Slash-commands de roles. Opcional. | 🔵 |
| 88 | 🆕 **ECC** | `github.com/affaan-m/everything-claude-code` | Harness skills/agentes (13 ag/43 skills). | 🔵 |
| 89 | 🆕 **Graphify** | `github.com/safishamsi/graphify` | Grafo de código → tokens (repos 500+). | 🔵 |
| 90 | 🆕 **Bytez** | `bytez.com` (org `Bytez-com`) | 175-220k modelos + $200k créditos. | ✅ |
| 91 | 🆕 **free-claude-code** | `github.com/Alishahryar1/free-claude-code` | Proxy a modelos baratos. Parkeado. | 🔵 |
| 92 | 🆕 **Kimi Code** | `kimi.ai` / OpenRouter | Ingeniería de volumen barata. | ✅ |
| 93 | 🆕 **skill-vault** | `github.com/Hainrixz` | Gestor de skills. | 🔵 |
| 94 | 🆕 **Nativas Claude Code** | `github.com/anthropics/claude-code` | `/workflow`, `/rewind`, Ultraplan, Skill Creator, Opus 4.8. | ✅ |
| 121 | 🆕 **Protocolo de Optimización de Tokens** | Claude-Mem + `/model opusplan` + reglas concisas en CLAUDE.md | "Ley de economía de tokens". **Aplicar solo la capa simple en F0** (ver caveat abajo). | 🔵 |
| 72 | GitHub Store | — | Redundante con GitHub MCP. | ❌ |
| 65 | Spec Kit | — | Fusionado en Superpowers. | 🔁 |

> [!warning] Token-saving: la cañería sí, el cerebro no
> Ahorrar tokens en la **cañería** es ganancia pura: Claude-Mem (no re-leer el repo), `/rewind`, no cargar archivos de más, CLAUDE.md conciso. **Eso va en F0.**
> Ahorrar tokens **gagueando el cerebro** es falsa economía y SÍ limita funciones: reglas "caveman" que le prohíben al modelo planificar/razonar dan **peor código** (el modelo piensa mejor cuando planifica), y delegar tareas con lógica a modelos débiles para ahorrar centavos genera más errores → más vueltas → más tokens. La concisión es para el **chat**, no para el **razonamiento**.

---

## 🤖 Orquestación de agentes (elegir 1 en F3 — conviven hasta entonces)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 31 | **OpenClaw** | Peter Steinberger (~300k★) | Agente 24/7, Telegram/WhatsApp, memoria, cron. | 🔵 |
| 96 | 🆕 **Hermes Agent** | `github.com/NousResearch/hermes-agent` (143k★) | Self-improving, `/goal`+judge, 22 plataformas, Termux. | 🔵 |
| 97 | 🆕 **Antigravity (Google)** | `antigravity.google` | IDE agéntico + orquestación. Gemini 3 Pro. | 🔵 |
| 3 | **Paperclip AI** | `github.com/paperclipai/paperclip` | CEO Agent jerárquico. Verificar. | ⚠️ |
| 1 | **Rowboat / RuFlo** | `github.com/rowboatlabs/rowboat` | Orquestador visual. | ⚠️ |
| 98 | 🆕 **Manus** | `manus.ai` | Agente general, pitch decks. | 🔵 |
| 99 | 🆕 **Claude Managed Agents** | Anthropic Console | Prototipado no-code. | 🔵 |
| 100 | 🆕 **the-architect** | `github.com/Hainrixz` | Diseña blueprints antes de construir. | 🔵 |
| 16 | **Agency-Agents** | `github.com/msitarzewski/agency-agents` | 147 plantillas de agentes. | ✅ |
| 12 | **LLM Council** | `github.com/aiwithremy/claude-skills-llm-council` | 5 IAs debaten. | ✅ |
| 83 | **Jules (Google)** | `jules.google.com` | Agente autónomo (complementa). | ⚠️ |
| 64 | Wingman | — | No encontrado. | ❌ |
| 20 | AutoClaw | — | Fusionado con OpenClaw. | 🔁 |

---

## 💵 Automatización, WhatsApp y pagos (F1)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 11 | **n8n (Render)** | `github.com/n8n-io/n8n` | Hub de automatización. Núcleo F1. | ✅ |
| 101 | 🆕 **n8n MCP** | n8n MCP server | Claude Code arma los flujos por terminal. | ✅ |
| 86b | **whatsapp-agentkit** | `github.com/Hainrixz/whatsapp-agentkit` | Cerebro del vendedor WhatsApp. | ✅ |
| 103 | 🆕 **PagoKit** | `github.com/Hainrixz/agente-pagokit` | Pagos (Mercado Pago/Stripe). Probar cobro test. | ✅ |
| 102 | 🆕 **Evolution API** | `github.com/EvolutionAPI/evolution-api` | Gateway WhatsApp alto rendimiento. | 🔵 |
| 51 | **OpenWA** | `github.com/open-wa/wa-automate-nodejs` | Gateway WhatsApp. | 🔵 |
| 51 | **YCloud** | `ycloud.com` | WhatsApp API oficial. | 🔵 |
| 35 | **ManyChat** | `manychat.com` | DMs IG → embudo. | ✅ |

---

## 🛒 E-commerce y dropshipping MAYORISTA B2B (foco F1)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 37 | **Page Pilot AI** | `pagepilot.ai` | Landing por lote en ~60s. | ✅ |
| 86a | **claude-webkit** | `github.com/Hainrixz/claude-webkit` | Landings técnicas Next.js. | ✅ |
| 37 | **Teemdrop** | `teemdrop.com` | Comparar precios proveedores. | ✅ |
| 40 | **TikTok scouting** | `tiktok.com` | Qué pedir / tendencias. | ✅ |
| 82 | **DigitalPlat FreeDomain** | `digitalplat.org` | Dominios gratis. | ✅ |
| 39 | **Modelaje virtual (Kling)** | `kling.ai` | Mostrar producto sin sesión de fotos. | ✅ |
| — | Proveedores mayoristas con catálogo | — | Nodos de suministro. **NO Combox (minorista).** | 🔵 |

---

## 🎬 Video (elegir 1 + backup al producir)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 105 | 🆕 **Gemini Omni / Flash / Veo** | `gemini.google.com` | Edición por instrucción, Google Cloud. | 🔵 |
| 17 | **Hunyuan Video** | `github.com/Tencent/HunyuanVideo` | Potente y gratis (API). | 🔵 |
| 106 | 🆕 **Nim Video (Seedance)** | `nim.video` | Product placement por plantilla. | 🔵 |
| 107 | 🆕 **Higgsfield** | `higgsfield.ai` | UGC/cinemático + CLI/MCP. | 🔵 |
| 109 | 🆕 **editor-pro-max** | `github.com/Hainrixz` | Video por código (Remotion), demos técnicas. | ✅ |
| 108 | 🆕 **Odysser** | `joinodysser.com` | Edición rápida (subtítulos/overlays). | ✅ |
| 47 | **MiniMax / Hailuo** | `minimax.io` | Backup "luxury". | 🔵 |
| 39 | **LTX** | `github.com/Lightricks/LTX-Video` | Rápido, reserva. | 🔵 |
| 40 | **Invideo** | `invideo.io` | Flujo automático. | 🔵 |
| 55 | **Apify (fábrica contenido)** | `apify.com` | Pipeline YouTube. | ✅ |

---

## 🖼️ Imagen, avatares y voz

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 73 | **SAM 3** | `github.com/facebookresearch/segment-anything` | Recorte de producto. F1. | ✅ |
| 34 | **Real-ESRGAN** | `github.com/xinntao/Real-ESRGAN` | Upscale fotos mayorista. F1. | ✅ |
| 111 | 🆕 **LivePortrait** | `github.com/KwaiVGI/LivePortrait` | Avatar de la agencia. | ✅ |
| 110 | 🆕 **VibeVoice** | `github.com/microsoft/VibeVoice` | Voz de marca $0. | ✅ |
| 112 | 🆕 **claude-banana** | `github.com/Hainrixz` | Prompts de imagen. | 🔵 |
| 36 | **Nano Banana / Mindsift** | ⚠️ verificar | Avatares. | ⚠️ |
| 33 | **Personaplex** | ⚠️ verificar | Avatar de marca. | ⚠️ |
| 41 | **Napkin IA** | `napkin.ai` | Diagramas para contenido. | ✅ |

---

## 🌐 Web, UI y app

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 75 | **V0.dev** | `v0.dev` | Componentes React/Tailwind. | ✅ |
| 113 | 🆕 **21st.dev (Magic MCP)** | `21st.dev` | Componentes UI alta gama vía MCP. | ✅ |
| 32 | **Open CoDesign** | `github.com/OpenCoworkAI/open-codesign` | Prompt → prototipo/slides. | ✅ |
| 81 | **Rork** | `rork.app` | Apps nativas iOS/Android. | ✅ |
| 100 | 🆕 **the-architect** | `github.com/Hainrixz` | Blueprints de software. | 🔵 |
| 86c | **Claude SEO Audit** | `github.com/AgricDaniel/claude-seo` | Auditoría SEO. | ✅ |
| 66 | **Google Stitch** | `labs.google/stitch` | UI desde lenguaje natural. | ⚠️ |
| 74 | **WebGL Magic / UI UX Pro Max** | técnica de prompting | Estética premium F4. | ✅ |
| 28 | Blink | — | Reemplazado por Open CoDesign/V0. | ❌ |

---

## 🔎 Scraping, research y outreach (conviven)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 11 | **Playwright MCP** | `github.com/microsoft/playwright` | Navegador estable. Outreach. | ✅ |
| 15 | **Firecrawl** | `github.com/mendableai/firecrawl` | Scraping/clonar competencia. | ✅ |
| 115 | 🆕 **Chrome DevTools MCP** | `github.com/ChromeDevTools/*` | Scraping de webs dinámicas. | 🔵 |
| 116 | 🆕 **Agent-Browser** | `github.com/vercel-labs/agent-browser` | Navegación bajo costo de tokens. | 🔵 |
| 117 | 🆕 **Humanizalo** | `github.com/Hainrixz` | Evita filtros "texto IA" en outreach. | 🔵 |
| 73 | **Comet (Perplexity)** | `perplexity.ai/comet` | Research de Sergio. | ✅ |

---

## 🧠 Conocimiento (UCI) y modelos

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 19 | **Gemini 1.5 Pro** | `aistudio.google.com` | Procesar videos (2M tokens). | ✅ |
| 77 | **NotebookLM** | `notebooklm.google.com` | Base de conocimiento consultable. | ✅ |
| 73 | **OpenWhispr** | `github.com/HeroTools/open-whispr` | Dictado voz CEO. | ✅ |
| 118 | 🆕 **Gemini Embedding** | `ai.google.dev` | Memoria vectorial multimodal. | ✅ |
| 56 | **Kimi K2** | OpenRouter | Volumen de datos. | ✅ |
| 10 | **Ecosistema chino (Qwen/GLM/Minimax)** | OpenRouter | No instalar sueltos. | ✅ |
| 32 | **Mureka** | `mureka.ai` | Música para Reels. | ✅ |
| 43 | Ollama / LM Studio | `github.com/ollama/ollama` | Local liviano (no modelos grandes en Mac 2015). | ⚠️ |

---

## 🖥️ Trading manual + soporte (F4 — sin bots)

| # | Recurso | Repo / URL | Para qué | Estado |
|---|---------|-----------|----------|:------:|
| 22 | **Mark-XXXIX** | ⚠️ verificar | Visión de pantalla en MT5/Bookmap. | 🔵 |
| 120 | 🆕 **Databento** | `databento.com` | Datos institucionales (bajo). | 🔵 |
| 119 | 🆕 **Maya / maia-skill** | `github.com/Hainrixz` | Research de inversiones (bajo). | 🔵 |
| 25 | **Genspark / Kimi Claw** | `genspark.ai` | Reportes Excel/PPT. | ✅ |

---

## 📦 Inputs de negocio (NO son herramientas)

| Recurso | Veredicto |
|---------|-----------|
| **Combox y similares** | Fuera del foco: **minorista**. @directimport420 es **mayorista B2B**. Lo útil: proveedores mayoristas con catálogo. |
| **Carta QR inteligente / agente en menú** | Producto del Frente 2 (agencia IA, tesis PyME). |
| **B2B mayorista high-ticket** | Modelo de negocio (Frente 1). |
| **Canal IG de recursos/servicios IA** | Embudo del Frente 2 (agencia). Contenido original mostrando builds reales. |
| **Lead scraper local / Nexum sequence** | Metodologías. |

---

## ❌ Descartados

| Recurso | Motivo |
|---------|--------|
| Agent-Browser como reemplazo de Playwright | Conviven; Playwright sigue primario. (Agent-Browser queda como alternativa.) |
| Deep Hat | Fuera de scope. |
| `--dangerously-skip-permissions` | PROHIBIDO — borró bots. |
| Oracle VPS | → Render. |
| Wingman / Blink / GitHub Store | No encontrados / redundantes. |
| Bot de trading (Atlas) | Trading = manual. |
| Combox | Minorista (foco mayorista). |

---
**Stack →** [[03 - Stack Definitivo por Categoria]] · **Plan →** [[02 - Plan Cronologico]]
