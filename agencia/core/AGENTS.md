# AGENTS.md — Agentes QuantumHive

## Visión General

QuantumHive es la agencia de IA de Sergio Palomba. Todos los agentes viven aquí y son orquestados por Hermes.

## Agentes Activos

| Agente | Ubicación | Estado | Descripción |
|--------|-----------|--------|-------------|
| **Hermes** | `hermes/` + `%LOCALAPPDATA%\hermes\` | ✅ Activo | Mano derecha de Sergio. Planeación, arquitectura, catálogo de herramientas. |
| **Investigador** | `investigador/` | 🔨 En desarrollo | Onboarding de clientes: scrapea IG → produce `perfil.md` para el bot. |
| **Voz** | `voz/` | 🔨 En desarrollo | Motor de voz (STT/TTS) para bots de clientes. |
| **OpenJarvis** | `motor madre/openjarvis/` | ✅ Activo | Cerebro de conocimiento: absorbe info diaria, responde desde tu vault. |
| **Paperclip** | `motor madre/paperclip-ai/` | ✅ Activo | Orquestación visual: org charts, tickets, budgets, governance. |

## Fluxo de Trabajo

```
Sergio → Hermes (planeación/decisión)
    ↓
Hermes → Investigador (onboarding cliente nuevo)
    ↓
Hermes → Claude Code (ejecución de código)
    ↓
Paperclip → Organización y tracking
    ↓
OpenJarvis → Conocimiento acumulado
    ↓
OpenClaw → Alertas por Telegram
```

## Reglas Generales

1. **Todo pasa por Hermes** antes de ejecutarse. Hermes es el cerebro de planeación.
2. **Los agentes no se borran** sin confirmación explícita de Sergio.
3. **Cada agente tiene su `.env.ejemplo`** — nunca subir `.env` real al repo.
4. **Documentar cambios** en el `README.md` de cada agente.
5. **Antes de integrar** cualquier servicio externo, verificar que está vigente (regla #6).
