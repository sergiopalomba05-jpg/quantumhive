# QuantumHive — Nuevo Enfoque (4 jun 2026)

> Documento vivo. Reemplaza la lectura anterior de "3 frentes en paralelo".

## La tesis

**QuantumHive es un software multiagéntico.** Los "frentes" (antes: B2B, agencia, trading) son **clientes del software**, no negocios paralelos. Sergio es su propio cliente a la vez.

El software conecta y resuelve. Se aplica a muchos verticales, con conocimiento real de cada rubro (porque Sergio los vivió: construcción, ventas, interior, trading, etc.).

## Lo que se descarta de la versión anterior

- ❌ Estructura de "3 frentes en paralelo" (`directimport/`, `agencia/`, `trading/` como peers).
- ❌ El orden secuencial F1→F2→F3→F4 ya no aplica — se enciende **por cliente**, no por fase.
- ❌ El repo viejo `quantumhive-algorithmictrading` queda **descartado** (sin rescate, sin copia).

## Estructura nueva del repo

```
quantumhive/
├── CLAUDE.md                ← constitución (sin cambios)
├── README.md
├── .env.ejemplo             ← plantilla de keys (vacías)
├── .gitignore
├── contexto actualizado/    ← doc espejo de la bóveda (decisiones, clientes, briefs)
│   ├── README.md            ← este archivo
│   ├── cliente-1-yas-papeo.md
│   └── agente-investigador-brief.md
└── agencia/                 ← el producto: software multiagéntico
    ├── agentes/             ← código de cada agente
    │   └── investigador/    ← Agente Investigador (paso 1)
    └── clientes/            ← configuración y artefactos por cliente
        └── yas-papeo/
            └── perfil.md    ← salida del agente investigador
```

## Clientes activos

| # | Cliente | Rubro | Estado | Stack principal |
|---|---------|-------|--------|-----------------|
| 1 | **Yas Papeo** (@yaspapeobeauty) | Salón de belleza, Olivos | Prototipo en construcción | Telegram bot + Claude API |
| 2 | Mayorista (socio directimport) | B2B mayorista | Negociación de acuerdo | n8n + agente de catálogo |

## Decisiones tomadas en la conversación con Claude (3 jun 2026)

1. **El prototipo del salón se construye con** Telegram + Claude API + system prompt. Sin scraper agresivo de IG. Sin clonar voz para el prototipo (sí para premium, con consentimiento escrito).
2. **El primer paso antes del bot** es el **Agente Investigador**: extrae el contenido público del IG del cliente y produce un `perfil.md` con (a) datos del negocio y (b) esencia de marca. Es producto, no descartable — se reusa para cada cliente nuevo.
3. **La información factual** (precios, horarios, FAQ) se la pedimos a la clienta cuando firma, no antes.
4. **El cliente 2 (mayorista) es socio**, no cliente. Modelo: él pone capital + logística, QuantumHive pone tecnología + llegada a revendedores. Margen repartido (ej. 50/50 sobre el spread).
5. **El bot real vive en WhatsApp** (la clienta del salón ya tiene `walink.co` en su bio). El demo para probar puede ser Telegram/web.
6. **Stack confirmado del investigador**: Apify (IG scraper) + Gemini 1.5 Pro (análisis) → `agencia/clientes/<handle>/perfil.md`.

## Lo que NO se hace (viene de la conversación)

- ❌ Sobre-ingeniería del prototipo: el demo se construye con Telegram + Claude API. No OpenClaw ni orquestadores complejos en esta etapa.
- ❌ Scraping agresivo de IG (puede marcar la cuenta). Manual o Apify con cuidado.
- ❌ Clonar voz sin consentimiento escrito. Para el prototipo: texto cálido; para premium: voz clonada con contrato.

## Siguiente paso inmediato

Construir el **Agente Investigador** (código Python) en `agencia/agentes/investigador/`. Skeleton funcional + instrucciones para correrlo con Apify + Gemini.
