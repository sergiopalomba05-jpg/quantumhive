# Bloqueos Actuales

Documentación de todo lo que falta resolver para que el pipeline funcione.

---

## Bloqueo 1: VM GPU sin Acceso SSH

**Problema:** La VM `comfyui-l4` (34.73.247.22) solo tiene acceso por RDP. No se puede ejecutar comandos remotamente desde la terminal.

**Impacto:** No se puede:
- Instalar F5-TTS
- Instalar LivePortrait
- Ejecutar workflows de ComfyUI remotamente
- Procesar videos por plato

**Solución temporal:** Usar `rembg` localmente (CPU, lento pero funciona)

**Solución definitiva:** Abrir puerto SSH en la VM o usar IAP tunneling de GCP

**Estado:** Pendiente

---

## Bloqueo 2: F5-TTS No Instalado

**Problema:** F5-TTS (motor de voz) no está instalado en ninguna VM.

**Impacto:** No se puede:
- Clonar voces
- Generar audio con voz del avatar
- Procesar videos por plato (Fase 7)

**Solución temporal:** Usar Google TTS (ya integrado en el chat) para greetings

**Solución definitiva:** Instalar F5-TTS en VM comfyui-l4

**Estado:** Pendiente

---

## Bloqueo 3: LivePortrait No Instalado

**Problema:** LivePortrait (lip-sync) no está instalado en ninguna VM.

**Impacto:** No se puede:
- Generar videos del avatar hablando
- Sincronizar labios con audio

**Solución temporal:** Usar avatar estático (WebP sin animación de labios)

**Solución definitiva:** Instalar LivePortrait en VM comfyui-l4

**Estado:** Pendiente

---

## Bloqueo 4: ffmpeg Sin Soporte VP9 Alpha

**Problema:** ffmpeg en Windows no puede codificar WebM VP9 con canal alpha (transparencia).

**Impacto:** No se puede:
- Convertir video sin fondo a WebM con audio
- Crear videos por plato con transparencia

**Solución temporal:** Usar WebP animado (sin audio) o MP4 con fondo

**Solución definitiva:** Usar ffmpeg en la VM GPU (Linux) que sí soporta VP9 alpha

**Estado:** Pendiente

---

## Bloqueo 5: No Hay Admin Panel

**Problema:** No existe la app de administración para que los clientes carguen datos.

**Impacto:** No se puede:
- Recibir foto de carta
- Recibir datos del restaurante
- Recibir avatar/voz del cliente
- Activar el pipeline

**Solución:** Crear la app nueva (Fase 1 del pipeline)

**Estado:** No iniciado

---

## Bloqueo 6: No Hay Tablas en Supabase

**Problema:** No hay schema de base de datos para:
- Restaurantes
- Platos
- Avatares
- Voces
- Videos

**Impacto:** No se puede:
- Guardar datos del pipeline
- Cachear videos
- Multi-tenancy

**Solución:** Crear las tablas (documentadas en Fase 1)

**Estado:** No iniciado

---

## Bloqueo 7: Menú Hardcodeado

**Problema:** El menú actual está hardcodeado en `menuData.ts` (65 platos de La Escaloneta).

**Impacto:** No se puede:
- Cambiar platos dinámicamente
- Agregar restaurantes
- Personalizar cartas

**Solución:** Generar `menuData.ts` dinámicamente desde Supabase (Fase 8)

**Estado:** Pendiente

---

## Resumen de Bloqueos

| # | Bloqueo | Impacto | Solución | Estado |
|---|---------|---------|----------|--------|
| 1 | VM GPU sin SSH | No instalar tools | Abrir SSH o IAP | Pendiente |
| 2 | F5-TTS no instalado | Sin voz | Instalar en VM | Pendiente |
| 3 | LivePortrait no instalado | Sin lip-sync | Instalar en VM | Pendiente |
| 4 | ffmpeg sin VP9 alpha | Sin video transparente | Usar VM Linux | Pendiente |
| 5 | No hay admin panel | Sin formulario | Crear app nueva | No iniciado |
| 6 | No hay tablas Supabase | Sin persistencia | Crear schema | No iniciado |
| 7 | Menú hardcodeado | Sin personalización | Generar dinámicamente | Pendiente |

---

## Orden de Resolución Recomendado

1. **Abrir SSH en VM GPU** (desbloquea todo lo demás)
2. **Instalar F5-TTS + LivePortrait** (desbloquea videos por plato)
3. **Crear admin panel** (permite recibir datos de clientes)
4. **Crear tablas Supabase** (permite persistencia)
5. **Generar menú dinámicamente** (permite multi-restaurantes)
