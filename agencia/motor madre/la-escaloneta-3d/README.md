---
title: La Escaloneta 3D Menu
emoji: 🍽️
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# La Escaloneta — Menú 3D Interactivo

Mesera virtual 3D con voz (Cartesia TTS) y cerebro AI (Vertex AI / Gemini).

## Features

- Avatar 3D reactivo con lip-sync al audio
- Chat con streaming SSE
- Speech-to-Text (Gemini)
- Text-to-Speech (Cartesia)
- Carrito de pedidos integrado
- Menú dinámico desde `menu.json`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID |
| `GCP_LOCATION` | Yes | GCP region (default: us-west1) |
| `AGENT_ID` | Yes | Vertex AI agent ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Service account JSON as string |
| `CARTESIA_API_KEY` | Yes | Cartesia API key |
| `CARTESIA_VOICE_ID` | Yes | Cartesia voice ID |
