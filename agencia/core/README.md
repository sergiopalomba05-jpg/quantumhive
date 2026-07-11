# agencia/core — Agentes QuantumHive

Los agentes que motorizan la agencia. Cada uno tiene su `AGENTS.md` con la documentación completa.

## Agentes

| Agente | Estado | Descripción |
|--------|--------|-------------|
| [Hermes](hermes/AGENTS.md) | ✅ Activo | Mano derecha de Sergio. Planeación, arquitectura, catálogo de herramientas. |
| [Investigador](investigador/AGENTS.md) | 🔨 Dev | Onboarding de clientes: scrapea IG → produce `perfil.md` para el bot. |
| [Voz](voz/AGENTS.md) | 🔨 Dev | Motor de voz (STT/TTS) para bots de clientes. |

## Orquestación

- **Paperclip** (`motor madre/paperclip-ai/`) — Org charts, tickets, budgets.
- **OpenJarvis** (`motor madre/openjarvis/`) — Cerebro de conocimiento.
- **PWA Unificada** (`pwa-agentes/`) — Frontend que une todo.

## Reglas

1. Todo pasa por **Hermes** antes de ejecutarse.
2. No borrar agentes sin confirmación explícita.
3. Cada agente tiene su `.env.ejemplo` — nunca subir `.env` real.
4. Documentar cambios en el `README.md` de cada agente.
