# Hermes — AGI de QuantumHive (Fase 1)

Asistente de QuantumHive que vive en Telegram, piensa con **Gemini**, con su identidad y
contexto en `SOUL.md`. Responde **solo a Sergio**. Es la mano derecha en planeacion y
arquitectura, y el dueno del catalogo de herramientas (Fase 2).

## Donde vive (en la PC real de Sergio)
- Instalacion: `%LOCALAPPDATA%\hermes\` (codigo en `hermes-agent\`).
- Config: `%LOCALAPPDATA%\hermes\config.yaml`, `.env` (keys), `SOUL.md` (identidad).
- Datos: `sessions\`, `logs\`, `cron\`, `memories\`, `skills\`.

## ⚠️ Leccion clave (sandbox de Claude Code)
Claude Code corre en un contenedor (MSIX) con `%LOCALAPPDATA%` redirigido. Instalar o correr
Hermes **desde Claude Code** lo mete en ese sandbox (no queda independiente, la red a Telegram
falla). **Hermes se instala y se corre desde la terminal propia de Sergio o la app Hermes
Desktop — NO desde Claude Code.** Claude Code construye y guia; Hermes corre en la maquina real.

## Config (sin secretos)
| Clave | Valor |
|---|---|
| `model.provider` | `gemini` |
| `model.default` | `gemini-2.5-flash` |
| `model.base_url` | `https://generativelanguage.googleapis.com/v1beta` |
| Telegram | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_USERS` (solo Sergio) en `.env` |
| Identidad | `SOUL.md` (ver copia en esta carpeta) |

Aplicar (en la terminal de Sergio):
```powershell
hermes config set model.provider gemini
hermes config set model.default gemini-2.5-flash
hermes config set model.base_url "https://generativelanguage.googleapis.com/v1beta"
```
Las keys van al `.env` real (ver `.env.ejemplo`). El gateway lo maneja la app Desktop
(barra de estado -> start), o `hermes gateway` en terminal (uno solo a la vez).

## Voz
- **STT** (te entiende): `faster-whisper` local, gratis, sin key.
  `& "$env:LOCALAPPDATA\hermes\hermes-agent\venv\Scripts\python.exe" -m pip install faster-whisper`
- **TTS** (te contesta hablado): **Edge TTS** (gratis, default). Activar en Telegram:
  `/voice on` (voz cuando mandas audio) o `/voice tts` (voz a todo).
- **Premium futura:** **Chatterbox** (Resemble AI, open-source) por **GPU cloud** — voz de marca
  clonada para bots y cartas QR (reemplaza ElevenLabs). No corre en la Mac 2015 (necesita GPU).

## Keys
Solo en `%LOCALAPPDATA%\hermes\.env`. NUNCA al repo (publico). Ver `.env.ejemplo`.

## Upgrade (PC nueva / VPS)
Reinstalar Hermes ahi (desde su propia terminal), copiar `SOUL.md` + aplicar la config, poner
las keys en `.env`. El catalogo (Fase 2) vive en Supabase, asi que no se migra nada de datos.
