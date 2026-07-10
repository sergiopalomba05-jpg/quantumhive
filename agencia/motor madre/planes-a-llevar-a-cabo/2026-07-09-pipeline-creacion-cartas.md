# Pipeline de Creación Automatizada de Cartas — Plan Basic

> **Objetivo:** Automatizar la creación de cartas interactivas con avatar y videos pre-grabados.
> **Modelo de negocio:** Plan Basic = costo cero operativo (todo cacheado). Plan Premium = voz en vivo.

---

## 1. Flujo General del Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PANEL DE ADMIN (React)                              │
│  Nodo 1: Foto Carta → Nodo 2: Personalidad → Nodo 3: Avatar → Nodo 4: Voz │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE BACKEND (Cloud Run / Vertex AI)                 │
│                                                                             │
│  PASO 1: Extraer platos y precios de la foto de la carta                   │
│  PASO 2: Generar/mejorar fotos de cada plato                               │
│  PASO 3: Definir personalidad del mesero + identidad del restaurante       │
│  PASO 4: Crear avatar (foto/video o preset)                                │
│  PASO 5: Crear voz (audio grabado o preset)                                │
│  PASO 6: Generar videos del avatar hablando de cada plato                  │
│  PASO 7: Organizar chips + videos en cache                                 │
│  PASO 8: Deploy de la carta                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detalle de Cada Paso

### PASO 1: Extracción de Plato y Precios

**Entrada:** Foto de la carta del restaurante (subida por el usuario)
**Salida:** JSON estructurado con platos, precios, secciones

**Tecnología:**
- Vertex AI Gemini 2.5 Flash (vision) para OCR + extracción
- Prompt especializado en cartas de restaurantes

**Flujo:**
1. Usuario sube foto de la carta
2. Gemini analiza la imagen y extrae:
   - Nombre del plato
   - Descripción
   - Precio
   - Sección (entradas, principales, postres, bebidas, etc.)
3. Retorna JSON estructurado
4. Usuario puede editar/corregir antes de continuar

**Prompt ejemplo:**
```
Sos un experto en cartas de restaurantes argentinos. Analizá esta imagen de una carta
y extraé TODOS los platos con sus precios. Devolvé un JSON con esta estructura:
{
  "secciones": [
    {
      "nombre": "Entradas",
      "platos": [
        {
          "nombre": "Empanadas de carne",
          "descripcion": "Carne cortada a cuchillo, cebolla, huevo",
          "precio": 1200
        }
      ]
    }
  ]
}
Reglas:
- Si no ves el precio, poné null
- Si la descripción no es visible, dejala vacía
- Respetá los nombres tal cual aparecen
- Agrupá por secciones como aparecen en la carta
```

**Costo estimado:** ~$0.01 por imagen (Gemini Flash)

---

### PASO 2: Generación/Mejora de Fotos de Platos

**Entrada:** JSON de platos del paso 1 + foto original de la carta
**Salida:** Fotos de alta calidad de cada plato

**Opciones:**
- **Opción A (gratis):** El cliente sube fotos propias de cada plato
- **Opción B (costo bajo):** Gemini genera fotos estilo food photography
- **Opción C (mixto):** Si el cliente sube foto, se mejora; si no, se genera

**Tecnología:**
- Gemini 2.5 Flash Image Generation (para generar)
- Vertex AI Image Enhancement (para mejorar)
- Storage: Supabase Storage o Cloud Storage

**Flujo:**
1. Para cada plato del JSON:
   - Si hay foto subida → mejorar resolución + encuadre
   - Si no hay foto → generar con Gemini (prompt: "Plato de [nombre], estilo food photography profesional")
2. Guardar fotos en Storage con naming: `{restaurant_id}/{plato_id}.jpg`
3. Asociar cada foto con su plato en la base de datos

**Costo estimado:** ~$0.04 por imagen generada (Gemini Flash Image)

---

### PASO 3: Personalidad del Mesero + Identidad del Restaurante

**Entrada:** Formulario del usuario
**Salida:** System prompt personalizado + configuración visual

**Campos del formulario:**
```typescript
interface PersonalidadMesero {
  // Datos del restaurante
  nombreRestaurante: string;
  logo?: File;                    // Logo del restaurante
  fotosRestaurante?: File[];      // Fotos del local
  historia?: string;              // Historia opcional
  
  // Personalidad del mesero
  nombreMesero: string;           // Ej: "Sol", "Carlos", "La flaquita"
  tono: "casual" | "formal" | "divertido" | "profesional";
  genero: "masculino" | "femenino" | "neutro";
 特徴?: string[];                 // Ej: ["amigable", "sabe de vinos", "gracioso"]
  
  // Configuración técnica
  idioma: "es-AR" | "es-MX" | "es-ES" | "pt-BR" | "en-US";
  vozPreferida?: string;          // ID de voz preset
}
```

**Tecnología:**
- Vertex AI Gemini para generar el system prompt
- Templates de prompts por tipo de restaurante

**Flujo:**
1. Usuario completa el formulario
2. Gemini genera un system prompt personalizado basado en:
   - Tipo de restaurante (parrilla, sushi, pizzería, etc.)
   - Tono elegido
   - Historia del restaurante (si proporciona)
   - Reglas específicas (ej: "no recomendar mariscos si es parrilla")
3. Se guarda el prompt en la base de datos
4. Se genera la identidad visual (colores, tipografía) basada en el logo

**Costo estimado:** ~$0.005 por generación de prompt

---

### PASO 4: Creación del Avatar

**Entrada:** Foto/video del mesero o selección de preset
**Salida:** Avatar animado listo para usar

**Opciones:**
- **Opción A (preset):** Elegir de una galería de avatares prediseñados
- **Opción B (custom):** Subir foto/video y crear avatar personalizado
- **Opción C (IA):** Generar avatar con Gemini basado en descripción

**Tecnología:**
- LivePortrait (para animar fotos)
- Hedra o similar (para videos)
- Supabase Storage (para almacenar avatares)

**Flujo:**
1. **Si elige preset:**
   - Mostrar galería de avatares (10-15 opciones)
   - Seleccionar uno
   - Avatar listo (ya tiene los videos pre-renderizados)

2. **Si sube foto:**
   - Recibir foto del mesero
   - Procesar con LivePortrait:
     - Detectar landmarks faciales
     - Crear modelo 3D del rostro
     - Generar variaciones de expresión
   - Guardar avatar procesado

3. **Si sube video:**
   - Extraer frames del video
   - Entrenar modelo personalizado
   - Generar avatar animado

**Costo estimado:**
- Preset: $0
- Foto: ~$0.50 (procesamiento GPU)
- Video: ~$2.00 (entrenamiento)

---

### PASO 5: Creación de la Voz

**Entrada:** Audio grabado o selección de preset
**Salida:** Voz del mesero virtual

**Opciones:**
- **Opción A (preset):** Elegir de voces prediseñadas (Aoede, Kore, etc.)
- **Opción B (custom):** Grabar audio y clonar voz
- **Opción C (IA):** Generar voz con Gemini basado en descripción

**Tecnología:**
- Vertex AI Gemini TTS (para presets)
- ElevenLabs (para clonación de voz)
- MiniMax T2A (alternativa económica)

**Flujo:**
1. **Si elige preset:**
   - Mostrar galería de voces (10-15 opciones)
   - Reprecir muestra de cada voz
   - Seleccionar una
   - Voz lista (ya tiene los clips pre-generados)

2. **Si graba audio:**
   - Recibir 3-5 frases de ejemplo (30 segundos total)
   - Clonar voz con ElevenLabs:
     - Entrenar modelo personalizado
     - Generar voz sintética
   - Guardar modelo de voz

3. **Si genera con IA:**
   - Describir la voz deseada (edad, tono, acento)
   - Gemini genera voz que coincida con la descripción
   - Guardar modelo de voz

**Costo estimado:**
- Preset: $0
- Clonación: ~$1.00 (ElevenLabs)
- IA: ~$0.10 (Gemini TTS)

---

### PASO 6: Generación de Videos del Avatar

**Entrada:** Avatar (paso 4) + Voz (paso 5) + JSON de platos (paso 1) + Personalidad (paso 3)
**Salida:** Video del avatar hablando de cada plato

**Tecnología:**
- LivePortrait (para animar avatar con audio)
- FFmpeg (para combinar audio + video)
- Vertex AI (para generar scripts de cada plato)
- Cloud Storage (para almacenar videos)

**Flujo:**
1. Para cada plato del JSON:
   - Gemini genera una frase corta (10-15 segundos):
     ```
     "¡Hola! Soy [nombre del mesero]. Hoy te recomiendo los [nombre del plato].
     [Descripción corta]. ¡No te los pierdas!"
     ```
   - Se genera el audio con la voz del mesero (Gemini TTS o ElevenLabs)
   - Se anima el avatar con LivePortrait:
     - Entrada: foto/video del avatar + audio
     - Salida: video del avatar hablando
   - Se guarda el video con naming: `{restaurant_id}/{plato_id}.mp4`

2. **Optimización:**
   - Videos en 480x854 vertical (formato celular)
   - 24fps
   - Duración: 10-15 segundos por plato
   - Compresión: H.264, bitrate adaptativo

**Costo estimado:**
- Generación de scripts: ~$0.005 por plato (Gemini)
- TTS: ~$0.01 por plato (Gemini) o ~$0.05 (ElevenLabs)
- Renderizado: ~$0.10 por plato (GPU)
- **Total por carta de 30 platos:** ~$3.50

---

### PASO 7: Organización en Cache

**Entrada:** Videos generados + Configuración de la carta
**Salida:** Carta lista para servir

**Tecnología:**
- Supabase Storage (para videos)
- Supabase Database (para metadata)
- Cloudflare CDN (para distribución)

**Flujo:**
1. Crear registro de la carta en la DB:
   ```sql
   CREATE TABLE cartas (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     restaurant_id TEXT NOT NULL,
     nombre_restaurante TEXT NOT NULL,
     personalidad JSONB NOT NULL,
     config_visual JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   
   CREATE TABLE platos (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     carta_id UUID REFERENCES cartas(id),
     nombre TEXT NOT NULL,
     descripcion TEXT,
     precio DECIMAL(10,2),
     seccion TEXT NOT NULL,
     foto_url TEXT,
     video_url TEXT,
     chip_text TEXT,  -- Texto del chip (ej: "¡Quiero los empanadas!")
     orden INT NOT NULL
   );
   ```

2. Subir videos a Storage:
   - Bucket: `cartas-videos`
   - Path: `{restaurant_id}/{plato_id}.mp4`
   - Metadata: duración, tamaño, hash

3. Crear chips dinámicos:
   - Cada plato genera un chip
   - Chips se agrupan por sección
   - Formato: `["Ver entrada", "Recomendame algo", "¿Qué es lo más rico?"]`

4. Generar HTML/CSS de la carta:
   - Template base (React)
   - Inyectar datos de la DB
   - Deploy automático

**Costo estimado:**
- Storage: ~$0.02 por GB al mes
- CDN: ~$0.01 por 1000 requests
- **Total mensual por carta:** ~$0.50

---

### PASO 8: Deploy de la Carta

**Entrada:** Carta cacheada (paso 7)
**Salida:** URL funcional lista para usar

**Tecnología:**
- Cloud Run (para servir la carta)
- Cloud Build (para CI/CD)
- Cloudflare (para DNS y CDN)

**Flujo:**
1. Build automático:
   - Clonar repo
   - Instalar dependencias
   - Build de React
   - Build de server.ts (para Cloud Run)

2. Deploy automático:
   - Push a main branch
   - Cloud Build detecta el cambio
   - Build + deploy automático
   - Health check automático

3. Configuración:
   - URL: `https://carta-{restaurant_id}.app`
   - SSL automático
   - DNS: `carta.escueladeia.com`

**Costo estimado:**
- Cloud Run: ~$5/mes por carta activa
- Cloud Build: $0 (120 min/día gratis)
- **Total:** ~$5/mes por carta

---

## 3. Arquitectura Técnica

### Stack del Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     PANEL DE ADMIN (React)                       │
│  - Formularios multi-step                                        │
│  - Upload de archivos                                            │
│  - Preview en tiempo real                                        │
│  - Gestión de múltiples cartas                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API PIPELINE (Cloud Run)                        │
│                                                                  │
│  /api/pipeline/create                                            │
│  /api/pipeline/extract-menu     (Paso 1)                        │
│  /api/pipeline/generate-photos  (Paso 2)                        │
│  /api/pipeline/configure-personality (Paso 3)                   │
│  /api/pipeline/create-avatar    (Paso 4)                        │
│  /api/pipeline/create-voice     (Paso 5)                        │
│  /api/pipeline/generate-videos  (Paso 6)                        │
│  /api/pipeline/cache            (Paso 7)                        │
│  /api/pipeline/deploy           (Paso 8)                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS GCP                                  │
│                                                                  │
│  Vertex AI (Gemini + TTS)                                        │
│  Cloud Storage (fotos + videos)                                  │
│  Supabase (database + auth)                                      │
│  Cloud Run (servidor de cartas)                                  │
│  Cloud Build (CI/CD)                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Base de Datos (Supabase)

```sql
-- Tabla de restaurantes
CREATE TABLE restaurantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  fotos JSONB DEFAULT '[]',
  historia TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de cartas
CREATE TABLE cartas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  nombre TEXT NOT NULL,
  activa BOOLEAN DEFAULT true,
  personalidad JSONB NOT NULL,
  config_visual JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de platos
CREATE TABLE platos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_id UUID REFERENCES cartas(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2),
  seccion TEXT NOT NULL,
  foto_url TEXT,
  video_url TEXT,
  chip_text TEXT,
  orden INT NOT NULL,
  activo BOOLEAN DEFAULT true
);

-- Tabla de avatares
CREATE TABLE avatares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'preset' | 'custom' | 'generated'
  foto_url TEXT,
  video_url TEXT,
  modelo_url TEXT, -- Para avatares 3D
  configuracion JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de voces
CREATE TABLE voces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id UUID REFERENCES restaurantes(id),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'preset' | 'cloned' | 'generated'
  modelo_url TEXT, -- Modelo de voz (para clonación)
  configuracion JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de videos pre-generados
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plato_id UUID REFERENCES platos(id),
  avatar_id UUID REFERENCES avatares(id),
  voz_id UUID REFERENCES voces(id),
  url TEXT NOT NULL,
  duracion_segundos DECIMAL(5,2),
  size_bytes INT,
  hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de cache de respuestas
CREATE TABLE respuestas_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_id UUID REFERENCES cartas(id),
  hash TEXT NOT NULL,
  pregunta TEXT,
  respuesta JSONB NOT NULL,
  hits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carta_id, hash)
);

-- Índices
CREATE INDEX idx_platos_carta ON platos(carta_id, orden);
CREATE INDEX idx_videos_plato ON videos(plato_id);
CREATE INDEX idx_cache_carta ON respuestas_cache(carta_id, hash);
```

---

## 4. Costos Estimados por Carta

### Costo de Creación (único)

| Paso | Costo | Notas |
|------|-------|-------|
| Extracción de menú | $0.01 | Gemini Flash Vision |
| Fotos de platos (30) | $1.20 | Gemini Flash Image |
| Personalidad | $0.005 | Gemini Text |
| Avatar (preset) | $0 | Ya existe |
| Voz (preset) | $0 | Ya existe |
| Videos (30 platos) | $3.50 | TTS + LivePortrait |
| **Total creación** | **~$4.71** | |

### Costo Mensual (por carta activa)

| Servicio | Costo | Notas |
|----------|-------|-------|
| Cloud Run | $5.00 | 1 instancia básica |
| Storage | $0.50 | ~2GB (videos + fotos) |
| CDN | $0.10 | ~10K requests/mes |
| **Total mensual** | **~$5.60** | |

### Comparativa con Alternativas

| Alternativa | Costo inicial | Costo mensual |
|-------------|---------------|---------------|
| Desarrollador humano | $500-2000 | $100-500 |
| Plataforma SaaS | $100-500 | $50-200 |
| **Nuestro pipeline** | **$4.71** | **$5.60** |

**ROI:** En 1 mes, el pipeline ya es más barato que cualquier alternativa.

---

## 5. Roadmap de Implementación

### Fase 1: MVP (2-3 semanas)

**Objetivo:** Pipeline básico funcional para una carta

- [ ] **Semana 1:**
  - [ ] Crear estructura del proyecto
  - [ ] Implementar extracción de menú (Paso 1)
  - [ ] Implementar generación de fotos (Paso 2)
  - [ ] Crear formulario de personalidad (Paso 3)

- [ ] **Semana 2:**
  - [ ] Implementar creación de avatar (Paso 4)
  - [ ] Implementar creación de voz (Paso 5)
  - [ ] Crear generador de scripts (Paso 6)

- [ ] **Semana 3:**
  - [ ] Implementar generación de videos (Paso 6)
  - [ ] Crear sistema de cache (Paso 7)
  - [ ] Implementar deploy automático (Paso 8)
  - [ ] Testing end-to-end

### Fase 2: Optimización (2-4 semanas)

**Objetivo:** Reducir costos y mejorar calidad

- [ ] Optimizar rendering de videos (batch processing)
- [ ] Implementar cache inteligente (variantes rotativas)
- [ ] Agregar más avatares y voces presets
- [ ] Crear panel de administración básico
- [ ] Implementar métricas de uso

### Fase 3: Escala (4-8 semanas)

**Objetivo:** Soportar múltiples restaurantes

- [ ] Multi-tenant architecture
- [ ] Dashboard para dueños de restaurantes
- [ ] Sistema de planes (Basic/Premium)
- [ ] Integración con sistemas de pedidos
- [ ] Soporte multi-idioma

---

## 6. Tecnologías y Servicios

### Vertex AI (Google Cloud)

| Servicio | Modelo | Uso | Costo |
|----------|--------|-----|-------|
| Vision | gemini-2.5-flash | Extracción de menú | $0.01/imagen |
| Text | gemini-2.5-flash | Generación de scripts | $0.005/1K tokens |
| Image Gen | gemini-2.5-flash-image | Fotos de platos | $0.04/imagen |
| TTS | gemini-2.5-flash-tts | Voz del mesero | $0.01/1K chars |

### LivePortrait (GPU)

| Función | Hardware | Tiempo | Costo |
|---------|----------|--------|-------|
| Animar foto | L4 GPU | ~30s/plato | ~$0.003 |
| Animar video | L4 GPU | ~60s/plato | ~$0.006 |

### Supabase

| Servicio | Plan | Costo |
|----------|------|-------|
| Database | Free | $0 |
| Storage | Free (1GB) | $0 |
| Auth | Free | $0 |
| Edge Functions | Free | $0 |

### Cloud Run

| Configuración | Costo |
|---------------|-------|
| 1 instancia basic | $5/mes |
| 100K requests | $0.40 |
| 1GB transferencia | $0.12 |

---

## 7. APIs y Endpoints

### Pipeline API

```
POST /api/pipeline/create
  → Crea una nueva carta

POST /api/pipeline/extract-menu
  → Extrae platos de una foto

POST /api/pipeline/generate-photos
  → Genera fotos de platos

POST /api/pipeline/configure-personality
  → Configura personalidad del mesero

POST /api/pipeline/create-avatar
  → Crea avatar del mesero

POST /api/pipeline/create-voice
  → Crea voz del mesero

POST /api/pipeline/generate-videos
  → Genera videos de cada plato

POST /api/pipeline/deploy
  → Deploy de la carta
```

### Carta API (para clientes)

```
GET /api/carta/:restaurant_id
  → Obtiene la carta completa

GET /api/carta/:restaurant_id/platos
  → Obtiene los platos

GET /api/carta/:restaurant_id/video/:plato_id
  → Obtiene el video de un plato

POST /api/chat
  → Chat con el mesero virtual (texto)
WS /api/live
  → Chat por voz en vivo (Premium)
```

---

## 8. Seguridad y Mejores Prácticas

### Variables de Entorno

```bash
# Vertex AI
GOOGLE_CLOUD_PROJECT=project-aa5fb956-b08a-4e13-869
GOOGLE_CLOUD_LOCATION=us-central1

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_KEY=eyJxxx

# Storage
STORAGE_BUCKET=cartas-videos
CDN_URL=https://cdn.escueladeia.com

# Deploy
CLOUD_BUILD_TRIGGER=deploy-carta-viva
```

### Seguridad

- Nunca commitear `.env`
- Usar service accounts con permisos mínimos
- RLS en Supabase para cada restaurante
- Videos servidos con URLs firmadas (expiración)
- Rate limiting en APIs públicas

### Monitoreo

- Health checks automáticos
- Alertas de errores en Cloud Run
- Métricas de uso por carta
- Logs estructurados

---

## 9. Próximos Pasos Inmediatos

1. **Crear estructura del proyecto:**
   ```
   agencia/pipeline-cartas/
   ├── backend/
   │   ├── pipeline/
   │   │   ├── extract_menu.py
   │   │   ├── generate_photos.py
   │   │   ├── configure_personality.py
   │   │   ├── create_avatar.py
   │   │   ├── create_voice.py
   │   │   ├── generate_videos.py
   │   │   ├── cache.py
   │   │   └── deploy.py
   │   ├── api/
   │   │   └── main.py
   │   └── config.py
   ├── admin/
   │   ├── src/
   │   │   ├── components/
   │   │   │   ├── Step1ExtractMenu.tsx
   │   │   │   ├── Step2GeneratePhotos.tsx
   │   │   │   ├── Step3ConfigurePersonality.tsx
   │   │   │   ├── Step4CreateAvatar.tsx
   │   │   │   ├── Step5CreateVoice.tsx
   │   │   │   ├── Step6PreviewVideos.tsx
   │   │   │   └── Step7Deploy.tsx
   │   │   └── App.tsx
   │   └── package.json
   └── README.md
   ```

2. **Implementar extracción de menú (Paso 1)**
3. **Implementar generación de fotos (Paso 2)**
4. **Crear formulario de personalidad (Paso 3)**

---

*Documento creado: 2026-07-09*
*Última actualización: 2026-07-09*
