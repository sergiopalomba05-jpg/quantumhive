# FASE 1: Admin Panel (App Nueva)

**Objetivo:** Formulario multi-step donde el cliente carga todos los datos de su restaurante.

---

## Flujo del Formulario

```
Pantalla 1: Foto de Carta
    │
    ▼
Pantalla 2: Datos del Restaurante
    │
    ▼
Pantalla 3: Personalidad del Avatar
    │
    ▼
Pantalla 4: Crear Avatar (foto/video o preset)
    │
    ▼
Pantalla 5: Crear Voz (grabar audio o preset)
    │
    ▼
Pantalla 6: Revisar y Publicar
    │
    ▼
Pipeline automático se activa
```

---

## Pantalla 1: Foto de Carta

**Campo obligatorio.** Sin esto no puede avanzar.

| Elemento | Tipo | Notas |
|----------|------|-------|
| Foto de la carta | Upload (imagen) | JPG, PNG. Arrastrar o cámara |
| Opcional: varias fotos | Multi-upload | Si la carta tiene varias páginas |

**Validaciones:**
- Mínimo 1 imagen
- Tamaño máximo: 10 MB por imagen
- Formatos: JPG, PNG, WEBP

**Qué pasa después:**
- Se guarda en Supabase Storage bucket `cartas/{restaurant_id}/`
- Se envía a Gemini Vision para extraer platos (Fase 2)
- Mientras se procesa, muestra spinner "Analizando tu carta..."

---

## Pantalla 2: Datos del Restaurante

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Nombre del restaurante | Text | ✅ | Ej: "La Escaloneta" |
| Tagline | Text | ❌ | Ej: "Cocina casera con alma" |
| Logo | Upload imagen | ✅ | Para identidad visual |
| Fotos del restaurante | Multi-upload | ❌ | Para mostrar en el frontend |
| Dirección | Text | ❌ | Opcional |
| Teléfono | Text | ❌ | Para WhatsApp |
| Moneda | Select | ✅ | ARS, USD, EUR, etc. |
| País/Región | Select | ✅ | Para acento del avatar |

---

## Pantalla 3: Personalidad del Avatar

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Nombre del mesero/avatar | Text | ✅ | Ej: "Sol", "Mateo" |
| Género | Radio | ✅ | Femenino / Masculino / No-binario |
| Trato | Radio | ✅ | Voseo (argentino) / Tuteo (neutral) / Usted (formal) |
| Personalidad | Select | ✅ | Amigable / Formal / Divertido / Profesional |
| Historia del restaurante | Textarea | ❌ | Para el system prompt del LLM |
| Acento del avatar | Select | ✅ | Porteño / Cordobés / Mexicano / Español / Neutro |

**Lógica:**
- El `trato` + `acentos` + `personalidad` se combinan para generar el `systemPrompt` del LLM
- Ejemplo: "Sos Sol, una mesera amigable argentina que habla con voseo y acento porteño..."

---

## Pantalla 4: Crear Avatar

### Opción A: Subir foto/video del cliente
- Upload de imagen (foto del avatar)
- O upload de video (el pipeline quita el fondo automáticamente)
- **Recomendación:** Foto frontal, fondo liso, buena luz

### Opción B: Elegir avatar preset
- Galería de avatares pre-creados
- Primer preset: **"Sol"** (el que ya tenemos)
- Cada rubro tiene sus presets (gastronomía, retail, servicios, etc.)
- Los presets se van creando a medida que se hacen demos

### Opción C: Generar con IA (futuro)
- Descripción textual → generación de imagen del avatar
- Consistencia facial con IP-Adapter en ComfyUI

---

## Pantalla 5: Crear Voz

### Opción A: Grabar audio (micrófono)
- Botón "Grabar"
- Grabar 5-15 segundos de audio
- Transcript automático del audio (para referencia)
- Se guarda como `voices/{voice_id}_ref.wav`

### Opción B: Subir archivo de audio
- Upload de WAV o MP3
- Mismas condiciones: 5-15 segundos, limpio, sin ruido

### Opción C: Elegir voz preset
- Galería de voces pre-clonadas
- Primeras voces: "Sol Femenina", "Sol Masculina"
- Cada preset tiene un `voice_id` y un audio de referencia

**Validaciones del audio:**
- Duración: 5-15 segundos
- Formato: WAV, MP3, OGG
- Calidad: sin ruido de fondo, sin música
- NO WhatsApp (comprime y baja calidad)

---

## Pantalla 6: Revisar y Publicar

**Preview de la carta generada:**
- Lista de platos extraídos (con fotos y precios)
- Secciones organizadas
- Avatar seleccionado
- Voz seleccionada
- Datos del restaurante

**Acciones:**
- Editar platos (corregir nombre, precio, sección)
- Cambiar foto de un plato
- Reordenar secciones
- Botón "Publicar" → activa el pipeline completo

---

## Datos que se Guardan en Supabase

### Tabla `restaurants`
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  currency TEXT DEFAULT 'ARS',
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `menu_items`
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  section TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  sort_order INT
);
```

### Tabla `avatars`
```sql
CREATE TABLE avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT,
  gender TEXT,
  accent TEXT,
  personality TEXT,
  image_url TEXT,
  video_url TEXT,
  is_preset BOOLEAN DEFAULT false
);
```

### Tabla `voices`
```sql
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  voice_id TEXT UNIQUE,
  ref_audio_url TEXT,
  ref_text TEXT,
  is_preset BOOLEAN DEFAULT false
);
```

### Tabla `avatar_videos` (cache de videos por plato)
```sql
CREATE TABLE avatar_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  menu_item_id UUID REFERENCES menu_items(id),
  video_url TEXT,
  audio_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, ready, error
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Tech Stack del Admin Panel

| Componente | Tecnología |
|------------|-----------|
| Frontend | React + TypeScript + Tailwind |
| Backend | FastAPI (Python) |
| DB | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (email/password) |
| Deploy | Cloud Run |

---

## Bloqueos Actuales

1. **No existe la app de admin** → Hay que crear desde cero
2. **No hay tablas en Supabase** → Hay que crear el schema
3. **No hay auth** → Hay que configurar Supabase Auth
4. **No hay upload de archivos** → Hay que configurar Supabase Storage
