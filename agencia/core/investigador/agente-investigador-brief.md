# Agente Investigador — Brief técnico

> El primer agente de QuantumHive. Sirve para el onboarding de cualquier cliente nuevo. Reutilizable, es producto.

## Objetivo

Dado un **handle de Instagram** (ej. `yaspapeobeauty`), extraer todo el contenido público de esa cuenta y producir un documento estructurado (`perfil.md`) con dos secciones:

1. **Datos del negocio:** bio, contacto, link en bio, servicios detectados, ubicación, antiguedad de la cuenta, métricas públicas.
2. **Esencia / personalidad de marca:** tono de voz, vocabulario típico, valores, estética visual, frases propias, argumentos de confianza, tipo de contenido, preguntas frecuentes de la audiencia.

Ese `perfil.md` es el **insumo del system prompt del bot** de cada cliente.

## Por qué es importante

- Es el paso 1 **antes** de armar el bot de cualquier cliente.
- Sin este insumo, el bot es genérico y frío. Con este insumo, el bot tiene la voz y esencia del cliente.
- Reutilizable para N clientes: el mismo código corre con cualquier handle.

## Stack

| Capa | Herramienta | Por qué |
|------|-------------|---------|
| Scraping IG | **Apify** (Instagram Scraper actor oficial) | IG bloquea scraping directo con login wall + anti-bot. Apify lo resuelve por API. |
| Análisis de captions/comentarios | **Gemini 1.5 Pro** (vía API) | Contexto grande, multimodal, barato. Bueno para extraer tono/valores. |
| Transcripción de reels (opcional) | **yt-dlp + Whisper** o **Apify** (actor de transcripción) | Solo para los N reels más vistos. No todos. |
| Output | `agencia/clientes/<handle>/perfil.md` | Archivo markdown estructurado. |

## Regla #6 de CLAUDE.md: verificar antes de integrar

Antes de usar el actor de Apify, **verificar** que el actor "Instagram Scraper" está vigente (no abandonado, no deprecado). Buscar el actor oficial de Apify, leer los últimos issues, confirmar que funciona. Si está roto, buscar alternativa (otro actor de la comunidad) o cambiar de approach.

## Flujo de ejecución

```
1. Input: handle (sin @)
2. Apify corre el scraper sobre la cuenta:
   - Bio + link + stats públicos
   - Lista de posts: caption + likes + comentarios + url + tipo (foto/video/reel)
   - Lista de highlights (títulos + cantidad de stories)
3. (Opcional) yt-dlp baja los N reels con más views/likes
4. Whisper o Apify transcribe el audio de esos reels
5. Gemini 1.5 Pro recibe:
   - bio + captions + comentarios + transcripciones
   - un prompt de extracción que pide: identidad, tono, vocabulario, valores, servicios, FAQ, estética
6. Gemini devuelve JSON estructurado
7. El script formatea el JSON como `perfil.md` y lo guarda
```

## Estructura del `perfil.md` (output esperado)

```markdown
# Perfil de @<handle>

## Datos del negocio
- Nombre comercial:
- Rubro:
- Ubicación:
- Bio:
- Link en bio (canal de venta actual):
- Seguidores / seguidos / posts:
- Antigüedad estimada:
- Servicios detectados:
- Horarios (si aparecen en posts):
- Contacto (si aparece):

## Esencia de marca
### Tono de voz
- Personalidad general:
- Vocabulario típico:
- Frases propias (textuales):
- Tratamiento (tú/usted/vos):

### Valores y propuesta
- Argumentos de confianza:
- Diferencial detectado:
- Público objetivo inferido:

### Estética
- Paleta de colores:
- Tipo de contenido (educativo, ventas, lifestyle):
- Hashtags propios (si los tiene):

### Preguntas frecuentes de la audiencia
- ...
- ...
- ...

## Notas para el system prompt del bot
- Personalidad: ...
- Tono: ...
- No inventar: ...
- Derivar a humano si: ...
```

## Restricciones / cuidados

- **NO scrapear de forma agresiva** (puede marcar la cuenta del cliente o de QuantumHive). Apify con rate limits razonables.
- **NO usar los posteos como fuente de precios/horarios** (esa data la da el cliente cuando firma).
- **NO usar el output como verdad absoluta** — es un insumo para el system prompt, no un reemplazo del cliente real.
- Si la cuenta es privada, abortar y pedir acceso o información manual.

## Variables de entorno necesarias

```bash
APIFY_API_TOKEN=<token de apify>
GEMINI_API_KEY=<api key de google ai studio>
```

## Cómo correrlo (skeleton)

```bash
cd agencia/agentes/investigador
pip install -r requirements.txt
cp .env.ejemplo .env  # llenar las keys
python agente_investigador.py --handle yaspapeobeauty
```

## Estado

- [x] Brief definido
- [ ] Código Python del agente
- [ ] Verificar actor vigente de Apify (regla #6)
- [ ] Probar con @yaspapeobeauty
- [ ] Probar con cliente 2 (mayorista, cuando definamos su IG)

## Próximo paso

Construir el código Python del agente en `agencia/agentes/investigador/agente_investigador.py`. Skeleton funcional que use Apify + Gemini y produzca el `perfil.md`.
