# Pipeline de Ingesta de Cartas

**Objetivo:** Automatizar la creación de cartas interactivas para restaurantes. El cliente sube datos básicos → todo lo demás se crea automáticamente.

**Dominio:** `quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/{restaurante}`

**Costo del pipeline:** $0 (GPU cubierta por créditos GCP, todo open-source)

---

## Estructura de la Carpeta

```
pipeline-de-ingesta-de-cartas/
├── README.md                    # Este archivo (visión general)
├── fases/
│   ├── 01-admin-panel.md        # Formulario del cliente
│   ├── 02-extraccion-carta.md   # OCR + Vision → platos
│   ├── 03-fotos-platos.md       # Generar/mejorar fotos
│   ├── 04-identidad-visual.md   # Colores, logo, estilo
│   ├── 05-crear-avatar.md       # Avatar sin fondo
│   ├── 06-crear-voz.md          # Clonación de voz
│   ├── 07-videos-por-plato.md   # Avatar hablando de cada plato
│   └── 08-ensamblar-carta.md    # Armar PWA final
├── decisions/
│   ├── reglas-generales.md      # Reglas del pipeline
│   └── bloqueos-actuales.md     # Qué falta resolver
└── roadmap.md                   # Sprint de construcción
```

---

## Flujo General

```
┌─────────────────────────────────────────────────────────────────┐
│                     APP DE ADMIN (NUEVA)                         │
│                                                                  │
│  1. Foto de la carta del restaurante                             │
│  2. Datos: nombre, tagline, logo, fotos, moneda                  │
│  3. Personalidad del avatar (nombre, género, trato)              │
│  4. Avatar: foto/video O preset "Sol"                            │
│  5. Voz: grabar audio O voz preset                               │
│  6. Revisar → Publicar                                           │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PIPELINE BACKEND (AUTOMÁTICO)                    │
│                                                                  │
│  FASE 1: OCR → Extraer platos, precios, secciones               │
│  FASE 2: Fotos de platos (Unsplash / upload / IA)               │
│  FASE 3: Identidad visual (colores del logo → CSS)              │
│  FASE 4: Avatar sin fondo (ComfyUI RMBG en VM GPU)             │
│  FASE 5: Voz clonada (F5-TTS en VM GPU)                        │
│  FASE 6: Videos por plato (F5-TTS + LivePortrait) ⭐           │
│  FASE 7: Ensamblar carta final + deploy automático              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PWA DEL RESTAURANTE (Resultado)                     │
│                                                                  │
│  quantumhive.com.ar/empleados-virtuales/gastronomia-y-bares/    │
│  {nombre-restaurante}                                            │
│                                                                  │
│  ✅ Carta interactiva con secciones                              │
│  ✅ Chips de recomendación (autoguided)                          │
│  ✅ Avatar animado (splash + flotante)                           │
│  ✅ Videos cacheados (avatar hablando de cada plato)            │
│  ✅ Chat con Gemini (recomendaciones)                            │
│  ✅ Carrito + pedido                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## El Proceso es Repetible

**Lo que cambia por restaurante:**
- Foto de la carta → platos distintos
- Logo y colores → identidad distinta
- Avatar → imagen distinta
- Voz → audio de referencia distinto
- Nombre de platos y precios → datos distintos

**Lo que NO cambia (el pipeline es el mismo):**
- FASE 1: OCR con Gemini Vision → siempre igual
- FASE 2: Fotos de platos → mismo proceso
- FASE 3: Extracción de colores → mismo código
- FASE 4: Quitar fondo del avatar → mismo ComfyUI
- FASE 5: Clonar voz → mismo F5-TTS
- FASE 6: Generar videos → mismo pipeline F5-TTS + LivePortrait
- FASE 7: Ensamblar y deployar → mismo script

---

## Stack Técnico

| Capa | Tecnología | Dónde corre |
|------|-----------|-------------|
| Admin Panel | React + TypeScript | Cloud Run |
| OCR/Vision | Gemini 2.5 Flash | Vertex AI (gratis) |
| Fotos platos | Unsplash API | Externa (gratis) |
| Avatar RMBG | ComfyUI + BriaRemoveBackground | VM GPU (comfyui-l4) |
| Voz | F5-TTS | VM GPU (comfyui-l4) |
| Lip-sync | LivePortrait | VM GPU (comfyui-l4) |
| LLM Chat | Gemini 2.5 Flash | Vertex AI (gratis) |
| DB + Storage | Supabase | Supabase (gratis) |
| PWA Frontend | React + TypeScript | Cloud Run |
| Deploy | Cloud Build → Cloud Run | GCP |

---

## Estado Actual

| Fase | Estado | Notas |
|------|--------|-------|
| Admin Panel | ❌ No existe | Hay que crear la app nueva |
| Extracción de carta | ⚠️ Parcial | Gemini Vision funciona, falta el form |
| Fotos de platos | ⚠️ Parcial | Unsplash hardcodeado, falta pipeline |
| Identidad visual | ❌ No existe | Hay que implementar |
| Avatar sin fondo | ⚠️ Parcial | WebP creado manualmente, falta pipeline |
| Voz | ❌ No existe | F5-TTS no instalado en VM |
| Videos por plato | ❌ No existe | F5-TTS + LivePortrait no configurados |
| Ensamblar carta | ⚠️ Parcial | Hardcodeado, falta generación dinámica |
