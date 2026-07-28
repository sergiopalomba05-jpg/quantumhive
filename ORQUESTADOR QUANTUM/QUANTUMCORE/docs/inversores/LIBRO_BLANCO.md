# QuantumCore — Libro Blanco Técnico v1.0

## Resumen Ejecutivo
QuantumCore es un Sistema Operativo de Inteligencia Artificial Empaquetado diseñado para orquestar múltiples agentes autónomos, herramientas y proyectos desde un motor centralizado multi-nube. A diferencia de los chatbots o asistentes de IA tradicionales, QuantumCore actúa como el sistema nervioso central de una operación completa de desarrollo de software y negocios.

## Arquitectura Técnica

### Motor de Orquestación (Core Engine)
- **Stack:** Node.js + TypeScript + Express
- **Frontend:** React + Vite (SPA)
- **Base de Datos:** Supabase (PostgreSQL) con arquitectura Multi-Database Router
- **Memoria Semántica:** Memanto (Python sidecar con FastAPI)
- **Contenedorización:** Docker (Multi-stage build)
- **Cloud Provider:** Google Cloud Run (portable a AWS/Azure/DO)

### Componentes Principales

#### 1. Brain Router (Router de Cerebros)
Sistema que permite conectar dinámicamente múltiples proveedores de IA:
- Google Vertex AI (Gemini 2.5 Flash / Pro)
- OpenAI (GPT-4o, o1)
- OpenRouter (acceso a cientos de modelos)
- Proveedores Custom (cualquier API compatible con OpenAI)

#### 2. Worker Manager (Orquestación Multi-Agente)
Arquitectura CEO/Workers que permite al agente principal delegar tareas en segundo plano a subagentes autónomos con su propio ciclo de vida.

#### 3. MCP Engine (Model Context Protocol)
Implementación del estándar MCP de Anthropic para conectar herramientas universales de forma agnóstica al modelo de IA.

#### 4. Cloud Executor + Quantum Runner
- **Cloud Executor:** Ejecuta skills directamente en la nube sin dependencia del entorno local.
- **Quantum Runner:** Agente local (PM2) que da acceso al filesystem y herramientas del dispositivo del usuario.

#### 5. Multi-Database Router
Permite al motor conectarse a múltiples bases de datos Supabase según el proyecto, manteniendo la orquestación centralizada.

#### 6. Memanto (Memoria Dual)
Capa de memoria semántica con resolución de conflictos, clasificación tipada (13 categorías) y búsqueda sub-90ms.

## Diferenciadores Técnicos
| Feature | ChatGPT | Claude | Cursor | QuantumCore |
|---------|---------|--------|--------|-------------|
| Multi-agente background | ❌ | ❌ | ❌ | ✅ |
| Multi-proveedor de IA | ❌ | ❌ | ❌ | ✅ |
| MCP nativo | ❌ | ✅ | ✅ | ✅ |
| Ejecución local + nube | ❌ | ❌ | Local only | ✅ Híbrido |
| Multi-database/proyecto | ❌ | ❌ | ❌ | ✅ |
| Portable multi-cloud | ❌ | ❌ | ❌ | ✅ Docker |
| Memoria semántica tipada | ❌ | ❌ | ❌ | ✅ Memanto |
| Auto-documentación inversores | ❌ | ❌ | ❌ | ✅ |

## Modelo de Deployment
```
                    ┌──────────────────────────┐
                    │     DOCKER CONTAINER      │
                    │                            │
                    │  ┌──────────────────────┐  │
                    │  │ Node.js (Port 8080)  │  │
                    │  │ QuantumCore Engine    │  │
                    │  └──────────┬───────────┘  │
                    │             │               │
                    │  ┌──────────▼───────────┐  │
                    │  │ Memanto (Port 8000)   │  │
                    │  │ Python FastAPI        │  │
                    │  └──────────────────────┘  │
                    └──────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Supabase DB     Supabase DB     Supabase DB
         (Core)          (Ingesta)       (Proyecto X)
```

## Roadmap
- **Q3 2026:** Lanzamiento de QuantumCore OS v1.0 (actual)
- **Q4 2026:** Marketplace de Skills + Agentes
- **Q1 2027:** SDK público para desarrolladores
- **Q2 2027:** Enterprise tier + SLA

---
*Documento generado automáticamente por el Agente Documentador para Inversores de QuantumCore.*
