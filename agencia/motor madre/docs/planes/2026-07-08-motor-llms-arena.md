# Plan: Motor de LLMs (OpenRouter Local + Arena/Battle)

**Estado:** Pendiente de implementación
**Fecha:** 2026-07-8
**Fuente:** Documento "3 PLANES EN CONVERSACION"

---

## Resumen

Proxy unificado de LLMs tipo OpenRouter. Los usuarios envían un prompt y eligen qué modelo usar (GPT-4o, Claude, Gemini, Grok, Llama local). Incluye modo "Arena/Battle" para comparar dos modelos en pantalla side-by-side.

## Stack Técnico

| Componente | Tecnología | Notas |
|------------|-----------|-------|
| Proxy API | **FastAPI** (Python) | Cloud Run, compatible formato OpenAI |
| Modelos locales | **vLLM** | Llama 3.1 8B, Mistral 7B en GPU |
| Modelos comerciales | APIs directas | OpenAI, Anthropic, Google, xAI |
| Auth + Billing | **Supabase** | API Keys + créditos por usuario |
| GPU VM | comfyui-l4 (L4 24GB) | Ya existe, corre vLLM alongside ComfyUI |
| Frontend | React/Next.js | Arena comparativa + chat |

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  PWA (Cloud Run)                 │
│         Chat UI / Arena Battle / Auth            │
└──────────────────────┬──────────────────────────┘
                       │ POST /v1/chat/completions
                       ▼
┌─────────────────────────────────────────────────┐
│            Proxy Unificado (Cloud Run)            │
│    Valida API Key → Verifica créditos → Rutea    │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   [ OpenAI ]    [ Anthropic ]   [ Vertex AI ]  [ VM GPU ]
   GPT-4o        Claude 3.5      Gemini 1.5     vLLM
                                 /2.0          Llama 3.1
                                               Mistral 7B
```

## Proxy Unificado (FastAPI)

### POST /v1/chat/completions
Rutea al proveedor correcto según el modelo.

**Request (formato OpenAI):**
```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "Sos un asistente argentino."},
    {"role": "user", "content": "¿Qué onda?"}
  ],
  "temperature": 0.7,
  "stream": true
}
```

### Modelos Soportados

| Modelo | Proveedor | Endpoint |
|--------|-----------|----------|
| gpt-4o, gpt-4o-mini | OpenAI | api.openai.com |
| claude-3.5-sonnet, claude-3-opus | Anthropic | api.anthropic.com |
| gemini-1.5-pro, gemini-2.0 | Google Vertex AI | us-central1-aiplatform.googleapis.com |
| grok-2 | x.AI | api.x.ai |
| llama-3.1-8b, mistral-7b | vLLM local | VM GPU :8000 |

## Código Base (Proxy)

```python
import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict
from openai import OpenAI
import anthropic

app = FastAPI(title="LLM Arena API")

class ChatRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    stream: bool = True

def validar_cliente(api_key: str):
    if not api_key:
        raise HTTPException(status_code=401, detail="API Key requerida")
    # Query Supabase: select creditos from usuarios where api_key = ?

@app.post("/v1/chat/completions")
async def chat_unificado(request: ChatRequest, authorization: str = Header(None)):
    validar_cliente(authorization)

    # OpenAI
    if request.model.startswith("gpt"):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        def stream():
            response = client.chat.completions.create(
                model=request.model, messages=request.messages,
                stream=True, temperature=request.temperature
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        return StreamingResponse(stream(), media_type="text/event-stream")

    # Anthropic
    elif request.model.startswith("claude"):
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        def stream():
            with client.messages.stream(
                model=request.model, max_tokens=1024,
                messages=request.messages, temperature=request.temperature
            ) as s:
                for text in s.text_stream:
                    yield f"data: {{\"choices\":[{{\"delta\":{{\"content\":\"{text}\"}}}}]}}\n\n"
        return StreamingResponse(stream(), media_type="text/event-stream")

    # Google Gemini
    elif request.model.startswith("gemini"):
        # Vertex AI SDK
        pass

    # Grok
    elif request.model.startswith("grok"):
        client = OpenAI(api_key=os.getenv("XAI_API_KEY"), base_url="https://x.ai")
        def stream():
            response = client.chat.completions.create(
                model=request.model, messages=request.messages,
                stream=True, temperature=request.temperature
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        return StreamingResponse(stream(), media_type="text/event-stream")

    # Llama/Mistral local (vLLM)
    elif request.model.startswith("llama") or request.model.startswith("mistral"):
        client = OpenAI(api_key="internal", base_url="http://VM_GPU_IP:8000/v1")
        def stream():
            response = client.chat.completions.create(
                model=request.model, messages=request.messages,
                stream=True, temperature=request.temperature
            )
            for chunk in response:
                yield f"data: {chunk.model_dump_json()}\n\n"
        return StreamingResponse(stream(), media_type="text/event-stream")

    else:
        raise HTTPException(status_code=400, detail="Modelo no soportado")
```

## vLLM en VM GPU

### Comando de despliegue (Docker)
```bash
docker run --gpus all \
    -v ~/.cache/huggingface:/root/.cache/huggingface \
    -p 8000:8000 \
    --ipc=host \
    vllm/vllm-openai:latest \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --max-model-len 4096 \
    --quantization fp8
```

### Modelos en L4 (24GB VRAM)

| Modelo | VRAM | Puerto |
|--------|------|--------|
| Llama 3.1 8B (FP8) | ~9 GB | 8000 |
| Mistral 7B (FP8) | ~8 GB | 8001 |
| **Total** | ~17 GB | - |

Sobra ~7 GB para ComfyUI u otros procesos.

## Arena Battle (Comparación Side-by-Side)

### Flujo
1. Usuario escribe un prompt
2. Selecciona 2 modelos para comparar
3. Se envían las 2 peticiones en paralelo
4. Se muestran las respuestas lado a lado
5. Usuario vota cuál fue mejor

### Endpoint
```json
POST /v1/arena/battle
{
  "prompt": "Explicame qué es Blockchain",
  "model_a": "gpt-4o",
  "model_b": "claude-3.5-sonnet"
}
```

### Tabla Supabase
```sql
CREATE TABLE arena_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  prompt TEXT,
  model_a TEXT,
  model_b TEXT,
  response_a TEXT,
  response_b TEXT,
  winner TEXT, -- "a" | "b" | "tie"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Sistema de Créditos (Supabase)

### Tablas
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE,
  credits DECIMAL(10,6) DEFAULT 5.00,
  plan TEXT DEFAULT 'free'
);

CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  model TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  cost DECIMAL(10,8),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Cálculo de costos (markup 20%)

| Modelo | Costo real (por 1M tokens) | Precio usuario |
|--------|---------------------------|----------------|
| GPT-4o | $2.50 | $3.00 |
| Claude 3.5 | $3.00 | $3.60 |
| Gemini 1.5 Pro | $1.25 | $1.50 |
| Llama 3.1 local | $0 (GPU cubierta) | $0.50 |

## Monetización

| Tier | Créditos | Precio | Modelos |
|------|----------|--------|---------|
| Free | $5/mes | $0 | Solo Llama local |
| Pro | $50/mes | $15 | Todos los modelos |
| Enterprise | Ilimitado | Custom | API dedicada |

## Próximos Pasos

1. [ ] Instalar vLLM en VM GPU (comfyui-l4)
2. [ ] Levantar Llama 3.1 8B + Mistral 7B
3. [ ] Crear FastAPI proxy en Cloud Run
4. [ ] Integrar Supabase auth + credits
5. [ ] Crear frontend Arena Battle
6. [ ] Probar streaming end-to-end
7. [ ] Agregar rate limiting y monitoreo

## Notas

- vLLM es 100% compatible con la API de OpenAI
- fp8 cuantización reduce VRAM ~50% sin perder precisión
- El proxy traduce formatos entre proveedores (OpenAI ↔ Anthropic)
- Llama local = margen 100% (GPU ya está pagada)
- Arena Battle es el diferenciador vs OpenRouter
