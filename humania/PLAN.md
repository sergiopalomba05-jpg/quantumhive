# HUMANIA — Acompañante Virtual con Avatar en Tiempo Real

> **Fecha:** 2026-07-12
> **Estado:** Plan Maestro — Listo para implementación
> **Objetivo:** Plataforma de avatares conversacionales con memoria, lip-sync en tiempo real, y capacidad de escala global.

---

## Resumen Ejecutivo

**Humania** es un producto propio de **acompañante virtual humanizado** — no es la mesera de la carta, sino un amigo/asesor virtual que:
- Charla sobre cualquier tema
- Da consejos y compañía
- Recuerda conversaciones anteriores (memoria)
- Se adapta a la personalidad del usuario
- Está disponible 24/7

**Diferenciador vs. competencia (HeyGen, D-ID, Anam):**
- **Open source** — sin vendor lock-in
- **GPU propia** — costo operativo mínimo
- **Memoria persistente** — no empieza de cero cada vez
- **Personalidad configurable** — se adapta a cada cliente

---

## Stack Técnico

### Componentes principales

| Componente | Tecnología | Función |
|------------|------------|---------|
| **Cerebro + Voz** | Gemini Live API (Vertex AI) | IA conversacional + voz nativa |
| **Lip-sync** | Lip Forcing 1.3B | Generación de frames del avatar en tiempo real |
| **Backend** | FastAPI + WebSocket | Orquestación + comunicación |
| **Frontend** | PWA React | Interfaz de usuario |
| **Memoria** | Supabase | Conversaciones + preferencias |
| **Infra** | Docker + Kubernetes (GCP) | Deploy y escala |

### Stack omitido (por diseño)

- **LiveKit** — innecesario para 1 usuario/conexión
- **CyberVerse** — demasiada complejidad para nuestro caso
- **Duix.Avatar** — offline only, no es streaming real
- **D-ID/Anam/HeyGen** — servicios de pago, queremos control total

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  PWA "Humania" (React)                                      │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ AvatarCanvas  │  │ AudioPlayer  │  │ ChatInput        │ │
│  │ (512x512)     │  │ (Web Audio)  │  │ (Mic + Text)     │ │
│  └───────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│          └─────────────────┼───────────────────┘            │
│                            │ WebSocket                      │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Server (VM GPU — L4)                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ avatar_pipeline.py (Orquestador)                       │ │
│  │  ├─ gemini_handler.py  → Gemini Live API               │ │
│  │  ├─ lip_sync.py        → Lip Forcing 1.3B              │ │
│  │  ├─ memory.py          → Supabase                      │ │
│  │  └─ ws_manager.py      → WebSocket connections         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  Gemini Live API     │    │  Lip Forcing 1.3B            │
│  (Vertex AI)         │    │  (GPU L4 — 24GB VRAM)        │
│  ├─ Cerebro IA       │    │  ├─ Imagen ref + Audio       │
│  ├─ Voz nativa       │    │  ├─ Frames 512x512 @ 31fps   │
│  └─ Streaming bidi   │    │  └─ Latencia sub-ms          │
└──────────────────────┘    └──────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase                                                   │
│  ├─ conversaciones (historial)                              │
│  ├─ usuarios (preferencias)                                 │
│  └─ avatares_config (personalidad)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

1. **Usuario abre la PWA** → selecciona "Hablar con mi companion"
2. **PWA solicita permisos** de micrófono
3. **WebSocket se conecta** al servidor GPU
4. **Servidor inicia sesión** con Gemini Live API
5. **Usuario habla** → audio PCM se envía por WebSocket
6. **Gemini procesa** → responde con audio + texto
7. **Lip Forcing genera frames** basándose en el audio de Gemini
8. **Servidor envía** frames + audio al cliente
9. **PWA muestra** avatar hablando + reproduce audio sincronizado
10. **Conversación se guarda** en Supabase para memoria

---

## Modelos de Lip-Sync: Comparativa

| Modelo | FPS | Latencia | VRAM | Resolución | Calidad |
|--------|-----|----------|------|------------|---------|
| **Lip Forcing 1.3B** | **31fps** | **sub-ms** | ~8GB | 512x512 | **Excelente** |
| Lip Forcing 14B | 15fps | sub-ms | ~24GB | 512x512 | Máxima |
| MuseTalk v1.5 | 15-30fps | ~100ms+ | ~4-6GB | 256x256 | Buena |
| FlashHead Lite | 25fps | ~50ms | ~8GB | 512x512 | Alta |
| Wav2Lip | 25fps | ~50ms | ~2GB | 256x256 | Media |

**Ganador: Lip Forcing 1.3B** — mejor relación calidad/velocidad, 1 sola GPU.

---

## Base de Datos (Supabase)

### Tablas necesarias

```sql
-- Usuarios del companion
CREATE TABLE companion_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT,
  preferencias JSONB, -- {"tono": "amigable", "temas": ["deportes", "cocina"]}
  avatar_config_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversaciones
CREATE TABLE companion_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES companion_users(id),
  duracion_segundos INTEGER,
  resumen TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensajes (log para memoria)
CREATE TABLE companion_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID REFERENCES companion_conversaciones(id),
  rol TEXT, -- 'user' o 'companion'
  contenido TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración de avatares
CREATE TABLE companion_avatares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  personalidad TEXT, -- "amigable", "profesional", "divertido"
  system_prompt TEXT,
  idioma TEXT DEFAULT 'es',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Infraestructura

### Docker

```dockerfile
# Multi-stage build
FROM nvidia/cuda:12.8.0-runtime-ubuntu24.04 AS base
# Python 3.12 + PyTorch 2.10 + Lip Forcing
# FastAPI + uvicorn
# Health checks
```

### Kubernetes

- **Deployment:** GPU scheduling (nvidia.com/gpu)
- **HPA:** Basado en conexiones WebSocket
- **Service:** ClusterIP + Ingress
- **Secrets:** API keys (Gemini, Supabase)

---

## Fases de Implementación

### FASE 0: Setup de infraestructura (1-2 días)

| Task | Archivos | Descripción |
|------|----------|-------------|
| 0.1 | `humania/.gitignore`, `README.md` | Estructura base |
| 0.2 | `humania/backend/requirements.txt` | Dependencias Python |
| 0.3 | `humania/Dockerfile` | Multi-stage build CUDA |
| 0.4 | VM GPU setup | Configurar L4 en GCP |

### FASE 1: Validación de componentes (3-5 días)

| Task | Descripción |
|------|-------------|
| 1.1 | Validar Gemini Live API (conexión, streaming) |
| 1.2 | Validar Lip Forcing en L4 (inferencia, FPS, VRAM) |
| 1.3 | Validar WebSockets en FastAPI |

### FASE 2: Backend completo (1-2 semanas)

| Task | Archivos |
|------|----------|
| 2.1 | `main.py` — FastAPI + WebSocket server |
| 2.2 | `gemini_handler.py` — Integración Gemini Live |
| 2.3 | `lip_sync.py` — Motor de Lip Forcing |
| 2.4 | `avatar_pipeline.py` — Orquestador |
| 2.5 | `memory.py` — Integración Supabase |

### FASE 3: Frontend PWA (1-2 semanas)

| Task | Componentes |
|------|-------------|
| 3.1 | `AvatarCanvas.tsx` — Renderizado de frames |
| 3.2 | `AudioPlayer.tsx` — Web Audio API |
| 3.3 | `ChatInput.tsx` — Micrófono + texto |
| 3.4 | `useWebSocket.ts` — Hook de conexión |

### FASE 4: Integración y testing (1 semana)

| Task | Descripción |
|------|-------------|
| 4.1 | Test end-to-end completo |
| 4.2 | Optimización de latencia |
| 4.3 | Error handling y fallbacks |

### FASE 5: Deploy y producción (1 semana)

| Task | Descripción |
|------|-------------|
| 5.1 | Dockerfile optimizado |
| 5.2 | Kubernetes manifests |
| 5.3 | Monitoreo y métricas |

---

## Estimación de Tiempos

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 0 | 1-2 días | VM GPU disponible |
| Fase 1 | 3-5 días | Gemini API key |
| Fase 2 | 1-2 semanas | Fase 1 OK |
| Fase 3 | 1-2 semanas | Fase 2 OK |
| Fase 4 | 1 semana | Fase 2+3 OK |
| Fase 5 | 1 semana | Fase 4 OK |
| **Total** | **5-8 semanas** | |

---

## Costos Estimados (GCP)

| Recurso | Costo/Mes |
|---------|-----------|
| VM GPU L4 (provisioned) | ~$500 |
| Gemini Live API (1M tokens) | ~$20 |
| Supabase | $25 |
| **Total MVP** | **~$545/mes** |

---

## Seguridad

- WebSocket connections autenticadas con JWT
- Audio no se almacena (solo metadata y resumen)
- API keys en variables de entorno (nunca en código)
- CORS configurado solo para el dominio de la PWA
- Rate limiting por IP

---

## Roadmap

| Hito | Objetivo |
|------|----------|
| **MVP** | Avatar funcional con 1 usuario |
| **v1.0** | Multi-usuario (10+ concurrentes) |
| **v1.5** | Multi-idioma |
| **v2.0** | Cuerpo completo (brazos, gestos) |
| **v2.5** | Marketplace de avatares |

---

## Archivos del Proyecto

```
humania/
├── PLAN.md                          # Este archivo
├── .gitignore
├── README.md
├── Dockerfile
├── docker-compose.yml
├── backend/
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── models.py
│   ├── ws_manager.py
│   ├── gemini_handler.py
│   ├── lip_sync.py
│   ├── avatar_pipeline.py
│   └── memory.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
├── config/
│   └── avatar_default.jpg
└── k8s/
    ├── deployment.yaml
    ├── service.yaml
    └── ingress.yaml
```

---

## Reglas del Repo (AGENTS.md) aplicadas

- Preguntar antes de acción destructiva
- No subir credenciales
- Commitear después de cada milestone
- Usar ramas feature/ para desarrollo
