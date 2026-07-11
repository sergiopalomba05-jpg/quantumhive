# AGENTS.md — PWA Unificada de Orquestación de Agentes

## Visión General

PWA que unifica Paperclip + OpenJarvis + Hermes + OpenClaw + Vertex AI Live en una sola interfaz.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    PWA UNIFICADA (Frontend)                     │
│                    Next.js + React + Tailwind CSS               │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  🎤 Chat     │ │  👥 Org      │ │  📋 Kanban   │           │
│  │  (Voz/Texto) │ │  Chart       │ │  Board       │           │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘           │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   Backend Unificador  │                          │
│              │   (FastAPI)           │                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Vertex AI Live │ │  Paperclip  │ │   OpenJarvis    │
│  (Voz + Chat)   │ │  (Org)      │ │   (Kanban)      │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORQUESTADOR CENTRAL                          │
│                    (Hermes + OpenClaw)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Stack

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Frontend | Next.js 14 + React | SSR, PWA ready, TypeScript |
| UI | Tailwind CSS + shadcn/ui | Rápido, moderno, responsive |
| Estado | Zustand | Ligero, fácil de usar |
| Voz | Vertex AI Live API | WebSocket, tiempo real |
| Backend | FastAPI (Python) | Para orquestación |
| Base de datos | Supabase | PostgreSQL + real-time |

## Estructura del Proyecto

```
agencia/pwa-agentes/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Dashboard principal
│   │   ├── chat/page.tsx         ← Chat con voz
│   │   ├── org/page.tsx          ← Org chart (Paperclip)
│   │   ├── kanban/page.tsx       ← Kanban board
│   │   └── settings/page.tsx     ← Configuración
│   ├── components/
│   │   ├── VoiceChat.tsx         ← Componente de voz
│   │   ├── OrgChart.tsx          ← Organigrama visual
│   │   ├── KanbanBoard.tsx       ← Tablero Kanban
│   │   └── AgentCard.tsx         ← Tarjeta de agente
│   ├── lib/
│   │   ├── vertex-ai.ts          ← Cliente Vertex AI Live
│   │   ├── paperclip-api.ts      ← API de Paperclip
│   │   ├── openjarvis-api.ts     ← API de OpenJarvis
│   │   └── orchestrator.ts       ← Orquestador central
│   └── types/
│       └── agent.ts              ← Tipos de TypeScript
├── public/
├── package.json
└── next.config.js
```

## Fases de Desarrollo

| Fase | Días | Descripción |
|------|------|-------------|
| FASE 1 | 1-2 | Instalación de dependencias ✅ |
| FASE 2 | 3-5 | Diseño de la PWA |
| FASE 3 | 5-7 | Integración Vertex AI Live |
| FASE 4 | 3-5 | Integración Paperclip |
| FASE 5 | 3-5 | Integración OpenJarvis |
| FASE 6 | 5-7 | Orquestador central |
| FASE 7 | 2-3 | Deploy |

## APIs a Integrar

### Paperclip (localhost:3100)
```typescript
// Org chart
GET /api/companies/current/orgchart

// Tickets
POST /api/tickets
GET /api/tickets
```

### OpenJarvis (Vault local)
```python
# Brain query
python jarvis.py "pregunta"

# Brain feeder
python brain_feeder.py
```

### Vertex AI Live
```typescript
// WebSocket para voz en tiempo real
wss://us-central1-aiplatform.googleapis.com/...
```

## Reglas de Desarrollo

1. **TypeScript estricto** — no `any`, tipar todo.
2. **Componentes funcionales** — usar hooks, no clases.
3. **Tailwind CSS** — no CSS custom a menos que sea necesario.
4. **Zustand para estado** — no React Context para estado global.
5. **API routes** — cualquier llamada a backend pasa por `/api/`.
6. **PWA first** — diseñar para mobile, escalar a desktop.
