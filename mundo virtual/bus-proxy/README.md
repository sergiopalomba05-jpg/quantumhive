# QuantumHive Agent Bus API

## Overview

El Agent Bus permite que agentes de diferentes VMs/entornos se comuniquen en tiempo real. Usa Convex como hub central y un proxy HTTP (Cloud Run) para acceso externo.

## URLs

- **Local**: `http://localhost:8080/api/`
- **Cloud Run**: `https://bus-proxy-xxxx-uc.a.run.app/api/`
- **Convex directo**: `https://your-project.convex.cloud`

## Endpoints

### Health Check
```
GET /api/health
```
Response:
```json
{ "status": "ok", "service": "quantumhive-bus-proxy", "timestamp": 1234567890 }
```

### Register Agent
```
POST /api/register
```
Body:
```json
{
  "agentId": "vertex-orchestrator-01",
  "agentName": "Hermes Orquestador",
  "role": "orchestrator",
  "source": "vertex-ai",
  "capabilities": ["dispatch", "monitor", "report"],
  "metadata": { "department": "trading-core" }
}
```

### Publish Event
```
POST /api/publish
```
Body:
```json
{
  "agentId": "vertex-orchestrator-01",
  "agentName": "Hermes Orquestador",
  "eventType": "task_started",
  "payload": {
    "task": "Analyze BTC/USDT pair",
    "assignedTo": "dev-01",
    "priority": "high"
  },
  "source": "vertex-ai",
  "target": "dev-01"
}
```

Event types:
- `status_update` — Cambio de estado del agente
- `task_started` — Empezó una tarea
- `task_complete` — Tarea completada
- `message` — Mensaje entre agentes
- `alert` — Alerta importante
- `heartbeat` — Keep-alive
- `error` — Error occurred
- `conversation_request` — Request para conversar
- `conversation_response` — Respuesta a request

### Send Heartbeat
```
POST /api/heartbeat
```
Body:
```json
{
  "agentId": "dev-01",
  "agentName": "Dev_01",
  "source": "vm-esta",
  "status": "online",
  "metadata": { "currentTask": "coding" }
}
```

### Get Events (polling)
```
GET /api/events?since=1234567890
```
Response:
```json
{
  "ok": true,
  "events": [
    {
      "_id": "xxx",
      "agentId": "dev-01",
      "agentName": "Dev_01",
      "eventType": "task_complete",
      "payload": { "result": "Deployed v2.1" },
      "timestamp": 1234567891,
      "source": "vm-esta"
    }
  ]
}
```

### Get Events for Agent
```
GET /api/events/dev-01?since=1234567890
```
Returns events targeted to this agent OR broadcast events.

### List Active Agents
```
GET /api/agents
```
Response:
```json
{
  "ok": true,
  "agents": [
    {
      "agentId": "dev-01",
      "agentName": "Dev_01",
      "role": "developer",
      "source": "vm-esta",
      "status": "online",
      "lastHeartbeat": 1234567890,
      "isAlive": true
    }
  ]
}
```

### Unregister Agent
```
POST /api/unregister
```
Body:
```json
{ "agentId": "dev-01" }
```

## Quick Start (Node.js)

```javascript
const BUS_URL = 'https://bus-proxy-xxxx-uc.a.run.app/api';

// 1. Register
await fetch(`${BUS_URL}/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'my-agent-01',
    agentName: 'My Agent',
    role: 'worker',
    source: 'vm-local',
  }),
});

// 2. Heartbeat every 30s
setInterval(async () => {
  await fetch(`${BUS_URL}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'my-agent-01',
      agentName: 'My Agent',
      source: 'vm-local',
      status: 'online',
    }),
  });
}, 30000);

// 3. Publish event
await fetch(`${BUS_URL}/publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'my-agent-01',
    agentName: 'My Agent',
    eventType: 'task_complete',
    payload: { result: 'Done!' },
    source: 'vm-local',
  }),
});

// 4. Poll for events
let lastCheck = Date.now();
setInterval(async () => {
  const res = await fetch(`${BUS_URL}/events?since=${lastCheck}`);
  const { events } = await res.json();
  for (const event of events) {
    console.log(`[${event.eventType}] ${event.agentName}: ${JSON.stringify(event.payload)}`);
  }
  lastCheck = Date.now();
}, 5000);
```

## Quick Start (Python)

```python
import requests
import time

BUS_URL = 'https://bus-proxy-xxxx-uc.a.run.app/api'

# Register
requests.post(f'{BUS_URL}/register', json={
    'agentId': 'my-agent-01',
    'agentName': 'My Agent',
    'role': 'worker',
    'source': 'vm-local',
})

# Heartbeat
while True:
    requests.post(f'{BUS_URL}/heartbeat', json={
        'agentId': 'my-agent-01',
        'agentName': 'My Agent',
        'source': 'vm-local',
        'status': 'online',
    })
    time.sleep(30)

# Publish
requests.post(f'{BUS_URL}/publish', json={
    'agentId': 'my-agent-01',
    'agentName': 'My Agent',
    'eventType': 'task_complete',
    'payload': {'result': 'Done!'},
    'source': 'vm-local',
})

# Poll events
last_check = int(time.time() * 1000)
while True:
    res = requests.get(f'{BUS_URL}/events?since={last_check}')
    for event in res.json()['events']:
        print(f"[{event['eventType']}] {event['agentName']}: {event['payload']}")
    last_check = int(time.time() * 1000)
    time.sleep(5)
```

## Deploy to Cloud Run

```bash
cd bus-proxy
gcloud run deploy quantumhive-bus \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars CONVEX_URL=https://your-project.convex.cloud \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 2
```
