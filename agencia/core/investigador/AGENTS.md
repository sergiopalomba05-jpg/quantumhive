# AGENTS.md — Agente Investigador

## Identidad

El primer agente de QuantumHive. Sirve para el onboarding de cualquier cliente nuevo. Reutilizable, es producto.

## Objetivo

Dado un **handle de Instagram** (ej. `yaspapeobeauty`), extraer todo el contenido público de esa cuenta y producir un documento estructurado (`perfil.md`) con:

1. **Datos del negocio**: bio, contacto, link en bio, servicios detectados, ubicación, métricas públicas.
2. **Esencia / personalidad de marca**: tono de voz, vocabulario típico, valores, estética visual, frases propias, argumentos de confianza, tipo de contenido, preguntas frecuentes de la audiencia.

Ese `perfil.md` es el **insumo del system prompt del bot** de cada cliente.

## Stack

| Capa | Herramienta | Por qué |
|------|-------------|---------|
| Scraping IG | **Apify** (Instagram Scraper actor oficial) | IG bloquea scraping directo con login wall + anti-bot. Apify lo resuelve por API. |
| Análisis | **Gemini 1.5 Pro** (vía API) | Contexto grande, multimodal, barato. Bueno para extraer tono/valores. |
| Output | `agencia/clientes/<handle>/perfil.md` | Archivo markdown estructurado. |

## Flujo de Ejecución

```
1. Input: handle (sin @)
2. Apify corre el scraper sobre la cuenta:
   - Bio + link + stats públicos
   - Lista de posts: caption + likes + comentarios + url + tipo
   - Lista de highlights (títulos + cantidad de stories)
3. Gemini 1.5 Pro recibe: bio + captions + comentarios
4. Gemini devuelve JSON estructurado
5. El script formatea el JSON como perfil.md y lo guarda
```

## Uso

```bash
cd agencia/core/investigador
pip install -r requirements.txt
cp .env.ejemplo .env
# Editar .env y llenar APIFY_API_TOKEN y GEMINI_API_KEY

python agente_investigador.py --handle yaspapeobeauty
python agente_investigador.py --handle yaspapeobeauty --max-posts 50
```

## Variables de Entorno

| Variable | Dónde se saca |
|----------|---------------|
| `APIFY_API_TOKEN` | https://console.apify.com/account/integrations |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

## Reglas

1. **NO scrapear de forma agresiva** (puede marcar la cuenta del cliente o de QuantumHive).
2. **NO usar los posteos como fuente de precios/horarios** (esa data la da el cliente cuando firma).
3. **NO usar el output como verdad absoluta** — es un insumo para el system prompt, no un reemplazo del cliente real.
4. **Si la cuenta es privada**, abortar y pedir acceso o información manual.
5. **Regla #6**: Verificar que el actor de Apify (`apify/instagram-scraper`) está vigente y mantenido antes de usar en producción.

## Output Esperado

El archivo `perfil.md` se guarda en `agencia/clientes/<handle>/perfil.md` y contiene:

- Datos del negocio (bio, link, contacto, servicios detectados)
- Esencia de marca (tono, vocabulario, valores, estética)
- Preguntas frecuentes de la audiencia
- Notas para el system prompt del bot

## Estado

- [x] Brief definido
- [ ] Código Python del agente
- [ ] Verificar actor vigente de Apify (regla #6)
- [ ] Probar con @yaspapeobeauty
- [ ] Probar con cliente 2 (mayorista, cuando definamos su IG)
