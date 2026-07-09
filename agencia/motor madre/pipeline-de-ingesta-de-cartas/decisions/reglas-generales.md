# Reglas del Pipeline

---

## Regla 1: El Pipeline es Repetible

**Cada restaurante pasa por las mismas 8 fases.** Lo único que cambia son los datos de entrada:
- Foto de la carta → platos distintos
- Logo y colores → identidad distinta
- Avatar → imagen distinta
- Voz → audio de referencia distinto
- Nombre de platos y precios → datos distintos

El código, los flujos y las herramientas son **los mismos siempre**.

---

## Regla 2: Costo Cero para el Plan Basic

Todo el pipeline debe poder ejecutarse sin costo adicional:
- GPU: créditos GCP cubiertos
- Gemini Vision: free tier de Vertex AI
- Unsplash: 50 requests/hora gratis
- Supabase: free tier (500MB DB, 1GB storage)
- Cloud Run: free tier
- F5-TTS + LivePortrait: GPU propia

**Si algo requiere pago, documentar por qué y buscar alternativa gratis.**

---

## Regla 3: El Cliente No Ve el Pipeline

El cliente solo ve:
1. El admin panel (subir datos)
2. La carta final (resultado)

**No ve:**
- Procesamiento de frames
- Generación de audio
- Lip-sync
- Cache de videos
- Build y deploy

El pipeline es transparente. El cliente sube datos y recibe una carta lista.

---

## Regla 4: Los Videos Quedan en Cache

Los videos generados (avatar hablando de cada plato) se cachean:
- Se generan una vez
- Se guardan en Supabase Storage
- Se sirven desde CDN
- **Costo $0 por reproducción**

Si el cliente cambia un plato, se regenera solo ese video.

---

## Regla 5: El Proceso de Generación es el Mismo

Para CADA restaurante:
1. Fase 1: Admin panel → datos
2. Fase 2: OCR → platos
3. Fase 3: Fotos → platos con imagen
4. Fase 4: Colores → tema visual
5. Fase 5: Avatar → sin fondo
6. Fase 6: Voz → clonada
7. Fase 7: Videos → por plato
8. Fase 8: Ensamblar → PWA lista

**No hay atajos. No se salta ninguna fase.**

---

## Regla 6: Primero resolver lo Básico

El orden de prioridad es:
1. **Resolver la app actual** (motoragregarllm)
2. **Documentar el proceso** (para no cometer errores)
3. **Construir el pipeline** (automatización)
4. **Agregar features premium** (voz en vivo, videollamada)

No se salta al premium sin tener el básico funcionando.

---

## Regla 7: Galería de Avatares y Voces se Crea a Medida

Los presets (avatars y voces) se van creando a medida que se hacen demos:
- Primer avatar: **"Sol"** (ya creado)
- Primeras voces: **"Sol Femenina"**, **"Sol Masculina"**
- Cada rubro tiene sus presets (gastronomía, retail, servicios)

**No se crea la galería completa de una.** Se va poblando con cada demo.

---

## Regla 8: Documentar Todo

Cada paso del pipeline se documenta:
- Qué se hizo
- Cómo se hizo
- Qué errores salieron
- Cómo se resolvieron

Esto evita cometer los mismos errores en el futuro.

---

## Regla 9: El Admin Panel es una App Nueva

El admin panel NO se mezcla con la app de motoragregarllm:
- **motoragregarllm** → PWA del restaurante (carta + chat + avatar)
- **admin panel** → App nueva para que los clientes carguen datos

Son dos apps distintas que se comunican por API.

---

## Regla 10: El Dominio es quantumhive.com.ar

```
quantumhive.com.ar/
├── empleados-virtuales/
│   └── gastronomia-y-bares/
│       ├── la-escaloneta     → Carta de La Escaloneta
│       ├── el-gaucho         → Carta de El Gaucho
│       └── ...
└── admin/                    → Panel de administración
```
