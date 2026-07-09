# Roadmap de Construcción

---

## Sprint 0: Resolver Bloqueos Fundamentales (2-3 días)

**Objetivo:** Desbloquear todo lo que impide avanzar.

- [ ] Abrir puerto SSH en VM comfyui-l4 (34.73.247.22)
- [ ] Verificar acceso SSH desde máquina local
- [ ] Instalar F5-TTS en VM GPU
- [ ] Instalar LivePortrait en VM GPU
- [ ] Verificar que ffmpeg en VM soporta VP9 alpha

**Resultado:** Se puede ejecutar comandos en la VM remotamente.

---

## Sprint 1: Admin Panel - Estructura Base (3-4 días)

**Objetivo:** Crear la app nueva de administración.

- [ ] Crear proyecto nuevo (React + TypeScript + Tailwind)
- [ ] Configurar Supabase (auth + storage + DB)
- [ ] Crear tablas: restaurants, menu_items, avatars, voices, avatar_videos
- [ ] Formulario multi-step (6 pantallas)
- [ ] Upload de archivos a Supabase Storage
- [ ] Deploy a Cloud Run

**Resultado:** App funcional donde el cliente puede cargar datos.

---

## Sprint 2: Extracción de Carta + Fotos (2-3 días)

**Objetivo:** Automatizar la extracción de platos desde la foto.

- [ ] Endpoint `/api/extract-menu` con Gemini Vision
- [ ] Prompt optimizado para cartas de restaurantes
- [ ] Validación de JSON extraído
- [ ] Búsqueda de fotos en Unsplash
- [ ] Fallback a fotos genéricas
- [ ] Edición manual en el admin panel

**Resultado:** El cliente sube una foto y获得 platos organizados con fotos.

---

## Sprint 3: Identidad Visual + Avatar (2-3 días)

**Objetivo:** Extraer colores del logo y crear avatar sin fondo.

- [ ] Extracción de colores con colorthief
- [ ] Generación de CSS variables
- [ ] Crear avatar "Sol" preset (ya existe WebP)
- [ ] Endpoint para quitar fondo (rembg local)
- [ ] Integración con ComfyUI en VM (cuando haya SSH)
- [ ] Galería de avatares preset

**Resultado:** La PWA tiene colores del restaurante y avatar sin fondo.

---

## Sprint 4: Voz + Videos por Plato (5-7 días) ⭐

**Objetivo:** El paso clave - generar videos del avatar hablando de cada plato.

- [ ] F5-TTS funcionando en VM GPU
- [ ] Endpoint `/api/clone-voice`
- [ ] Endpoint `/api/generate-dish-video`
- [ ] Pipeline: texto → F5-TTS → audio
- [ ] Pipeline: audio + foto → LivePortrait → video
- [ ] Batch processing en paralelo
- [ ] Cache de videos en Supabase Storage
- [ ] Reproducción de videos en la PWA

**Resultado:** Cada plato tiene un video del avatar hablando de él.

---

## Sprint 5: Ensamblar + Deploy Automático (2-3 días)

**Objetivo:** Generar la carta final y deployar automáticamente.

- [ ] Generador de `menuData.ts` dinámicamente
- [ ] Generador de `systemPrompt.ts` dinámicamente
- [ ] Generador de chips del autoguided flow
- [ ] Build automático de la PWA
- [ ] Deploy automático a Cloud Run
- [ ] Routing multi-tenant (quantumhive.com.ar/.../restaurante)

**Resultado:** El cliente publica y la carta está online.

---

## Sprint 6: Testing + Primera Demo (2-3 días)

**Objetivo:** Probar end-to-end con un restaurante real.

- [ ] Elegir restaurante de prueba
- [ ] Cargar datos reales en el admin panel
- [ ] Probar todo el pipeline
- [ ] Medir tiempos y costos
- [ ] Corregir bugs
- [ ] Documentar aprendizajes

**Resultado:** Primera carta funcional con video del avatar.

---

## Resumen de Sprints

| Sprint | Qué | Días | Dependencias |
|--------|-----|------|-------------|
| 0 | Resolver bloqueos (SSH, tools) | 2-3 | Ninguna |
| 1 | Admin panel (app nueva) | 3-4 | Sprint 0 |
| 2 | OCR + fotos de platos | 2-3 | Sprint 1 |
| 3 | Identidad visual + avatar | 2-3 | Sprint 1 |
| 4 | Voz + videos por plato ⭐ | 5-7 | Sprint 0 |
| 5 | Ensamblar + deploy | 2-3 | Sprints 1-4 |
| 6 | Testing + primera demo | 2-3 | Todos |
| **Total** | | **18-26 días** | |

---

## Camino Crítico

```
Sprint 0 (Bloqueos)
    │
    ├──> Sprint 1 (Admin Panel) ──> Sprint 2 (OCR) ──┐
    │                                                  │
    └──> Sprint 4 (Voz + Videos) ─────────────────────┤
                                                       │
                                                       ▼
                                               Sprint 5 (Ensamblar)
                                                       │
                                                       ▼
                                               Sprint 6 (Testing)
```

**El Sprint 0 es bloqueante para todo.** Sin acceso a la VM GPU, no se puede instalar F5-TTS ni LivePortrait, y sin esos no se pueden generar videos.

**Nota:** Sprints 1-3 pueden avanzar en paralelo con Sprint 4 si el admin panel no depende de la VM.
