# Motor de Avatares — Documento de Diseño v2

> Fecha: 2026-07-08
> Estado: Borrador — requiere aprobación del usuario
> Caso de uso: Avatar conversacional para restaurantes (mientras el comensal espera)

## Resumen Ejecutivo

Plataforma de avatares conversacionales para restaurantes. El comensal escanea un QR en la mesa, abre una PWA, y conversa con un avatar mientras espera su pedido. El avatar puede recomendar platos, contar historias del restaurante, o simplemente entretener.

**Diferenciador vs. HeyGen:** No es un tool de video. Es una experiencia de UX para restaurantes. HeyGen no hace interacción en tiempo real con clientes finales.

## Stack Técnico

### Lo que ya existe y se reutiliza
- PWA (React + Vite) → se extiende con página de avatar
- Supabase → auth, datos de restaurantes, historial de conversaciones
- Render → hosting de la PWA
- VM GPU (L4) → backend de inferencia

### Lo que se construye
- Backend Python (FastAPI) en la VM GPU
- Integración Gemini Live API (cerebro + voz)
- LivePortrait (lip-sync en GPU)
- WebSocket server (comunicación en tiempo real)
- Nueva página en la PWA (avatar view)

## Arquitectura

```
┌──────────────────────┐
│   PWA (Móvil)        │
│   React + Vite       │
│   ┌────────────────┐ │
│   │ Avatar View    │ │
│   │ - Cámara/Mic   │ │
│   │ - WebSocket    │ │
│   │ - Video Player │ │
│   └────────────────┘ │
└──────────┬───────────┘
           │ WebSocket (audio/video)
           ▼
┌──────────────────────┐
│   FastAPI Server     │
│   (VM GPU - L4)      │
│   ┌────────────────┐ │
│   │ audio_handler  │◄├──── Gemini Live API (WebSocket)
│   │ avatar_render  │ │
│   │ ws_manager     │ │
│   └────────────────┘ │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│   Supabase           │
│   - restaurantes     │
│   - avatares_config  │
│   - conversaciones   │
│   - feedback         │
└──────────────────────┘
```

## Flujo de Datos

1. Comensal escanea QR → abre PWA → selecciona "Hablar con el avatar"
2. PWA pide permisos de cámara/micrófono
3. PWA abre WebSocket al servidor GPU
4. Servidor inicia sesión con Gemini Live API
5. Comensal habla → audio se envía por WebSocket → servidor reenvía a Gemini
6. Gemini responde con audio → servidor lo recibe
7. Servidor pasa audio a LivePortrait → genera frames del avatar hablando
8. Servidor envía frames + audio de vuelta a la PWA
9. PWA muestra video del avatar hablando + reproduce audio
10. Cuando el comensal se va, se guarda resumen de la conversación

## Especificaciones Técnicas

### Backend (FastAPI)
- **Framework:** FastAPI + uvicorn
- **WebSockets:** websockets library
- **Gemini:** google-genai SDK (streaming)
- **Avatar:** LivePortrait (inference pipeline)
- **GPU:** NVIDIA L4 (24GB VRAM)
- **Resolución avatar:** 480x854 (vertical, optimizado para móvil)
- **FPS:** 24fps (suficiente para lip-sync natural)
- **Formato audio:** PCM 16kHz (Gemini output)

### Frontend (PWA)
- **Conexión:** WebSocket (no WebRTC en Fase 1)
- **Video:** MediaSource Extensions (MSE) o ImageSequence
- **Audio:** Web Audio API
- **Cámara:** getUserMedia() (solo para efectos, no se envía al servidor)
- **Micrófono:** getUserMedia() con AudioWorklet

### Gemini Live API
- **Modelo:** gemini-2.5-flash-native-audio
- **Modo:** streaming bidireccional
- **System prompt:** Personalizado por restaurante (menú, historia, tono)
- **Idioma:** Español (configurable)
- **Tiempo máximo de sesión:** 15 minutos

### LivePortrait
- **Modelo:** LivePortrait (optimizado para L4)
- **Input:** Foto fija del avatar + audio chunk
- **Output:** Secuencia de frames (24fps)
- **Latencia:** ~50-100ms por chunk de 20ms de audio
- **VRAM:** ~4-6GB por instancia

## Base de Datos (Supabase)

### Nuevas tablas

```sql
-- Configuración de avatares por restaurante
CREATE TABLE avatares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  nombre TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  personalidad TEXT, -- "amigable", "profesional", "divertido"
  system_prompt TEXT,
  idioma TEXT DEFAULT 'es',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones de conversación
CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES avatares(id),
  usuario_id UUID, -- opcional, puede ser anónimo
  mesa_numero INTEGER,
  duracion_segundos INTEGER,
  resumen TEXT,
  feedback_rating INTEGER, -- 1-5
  feedback_comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de mensajes (para analytics)
CREATE TABLE mensajes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID REFERENCES conversaciones(id),
  rol TEXT, -- 'user' o 'avatar'
  contenido TEXT,
  duracion_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Seguridad

- WebSocket connections autenticadas con JWT de Supabase
- Rate limiting por IP (máximo 1 sesión simultánea por QR)
- Audio no se almacena (solo metadata y resumen)
- CORS configurado solo para el dominio de la PWA
- API keys de Gemini en variables de entorno (nunca en código)

## Escalabilidad

### Fase 1: 1 restaurante, 1 mesa a la vez
- 1 VM GPU (L4)
- 1 instancia FastAPI
- Costo: ~$0.70/hora de GPU

### Fase 2: 5-10 restaurantes, 10-20 mesas simultáneas
- 2-3 VMs GPU con load balancer
- WebSocket affinity por IP
- Costo: ~$50-100/día de GPU activo

### Fase 3: 50+ restaurantes
- GKE con autoscaling
- LiveKit para WebRTC SFU
- TensorRT para optimizar LivePortrait
- Costo: variable según demanda

## Costos Estimados

| Concepto | Fase 1 | Fase 2 | Fase 3 |
|----------|--------|--------|--------|
| GPU L4 (VM) | $500/mes | $1,500/mes | $3,000+/mes |
| Gemini Live API | $50/mes | $200/mes | $1,000+/mes |
| Supabase | $25/mes | $25/mes | $25/mes |
| Cloud Run (PWA) | $0 (gratis) | $10/mes | $50/mes |
| **Total** | **~$575/mes** | **~$1,735/mes** | **~$4,075+/mes** |

## Roadmap

| Fase | Duración | Objetivo | Costo |
|------|----------|----------|-------|
| 0 | 1-2 sem | Validar con 5 restaurantes | $0 |
| 1 | 2-4 sem | Prototipo funcional (1 restaurante) | $575/mes |
| 2 | 4-8 sem | Multi-usuario (5-10 restaurantes) | $1,735/mes |
| 3 | 8-16 sem | Escala (50+ restaurantes) | $4,075+/mes |
