# Dominus + Brain Router Hibrido Visual - Design

Fecha: 2026-07-22

## Objetivo

Conectar el chat central de QuantumCore con Dominus Prime como agente real, usando su system core, constitucion y memoria de Supabase, y agregar un Brain Router hibrido visual que permita elegir libremente el cerebro/modelo para cada conversacion.

La primera version debe priorizar utilidad privada para Sergio y dejar preparada la arquitectura para modelos/proveedores futuros sin construir billing, planes, consejo multiagente completo ni Agent Builder avanzado.

## Estado Actual Confirmado

Dominus Prime ya existe como agente seed y como fila remota en Supabase.

ID estable: `11111111-1111-4111-8111-111111111111`.

Supabase remoto ya tiene columnas avanzadas en `agents` para brain provider, modelo default, memoria, permisos, policy, rutas de docs y metadata.

Dominus tiene una memoria inicial real vinculada por `agent_id`.

Los documentos base existen en:

- `docs/DOMINUS_PRIME_SYSTEM_CORE.md`
- `docs/DOMINUS_PRIME_CONSTITUTION.md`
- `docs/QUANTUMCORE_VISION.md`
- `docs/QUANTUMCORE_CONTEXTO_OPERATIVO.md`

El chat actual (`ChatCentral.tsx`) selecciona agente visualmente, pero el backend recibe solo `{ message }` y no sabe que esta hablando con Dominus.

Los endpoints actuales `/api/chat` y `/api/think` llaman Gemini directamente sin cargar agente, memoria ni constitucion.

## Decisiones De Producto

Dominus Prime es el orquestador estable. El cerebro/modelo es intercambiable.

El Brain Router debe ser hibrido:

- `Auto`: Dominus recomienda el cerebro segun intencion.
- `Manual`: Sergio elige libremente el modelo exacto.
- `Consejo`: modo futuro para consultar varios cerebros y sintetizar una decision.

La UI debe sentirse visual, inspirada por catalogos tipo Microsoft Foundry:

- tarjetas/miniaturas de cerebros favoritos visibles en el chat
- selector para ver mas modelos
- estado de disponibilidad por modelo
- etiqueta de recomendacion, sin bloquear la eleccion manual
- fallback visible si el modelo elegido todavia no esta conectado

No debe quedar atado rigidamente que planificacion use GPT, contexto use Gemini o codigo use Claude/Kimi. Esas asociaciones son recomendaciones, no reglas. Sergio puede elegir libremente.

## Alcance De Esta Primera Version

Incluido:

- crear endpoint `POST /api/agents/:agentId/chat`
- enviar desde `ChatCentral` el `agentId`, `message`, `brainMode` y `modelId`
- cargar agente desde Supabase
- cargar memorias del agente desde Supabase
- leer docs locales de system core y constitucion segun rutas del agente
- armar un context pack compacto
- llamar Gemini/Vertex como proveedor real inicial
- mostrar selector visual simple de cerebros en el chat
- mostrar fallback cuando un modelo elegido todavia no esta conectado
- devolver `memoryProposal` si el backend detecta algo que conviene guardar
- no guardar memoria automaticamente

No incluido todavia:

- conectar OpenAI/GPT real
- conectar Claude real
- conectar Kimi real
- modo Consejo con 3 llamadas reales
- Agent Builder visual avanzado
- asignar cerebros por agente desde Agent Builder
- billing, planes o modulos bloqueados
- avatar live o control de mouse
- escritura automatica de memoria sin aprobacion

## Modelos Iniciales En UI

La UI puede mostrar cerebros favoritos aunque solo Gemini este conectado realmente.

Catalogo inicial sugerido:

- `gemini-2.5-flash`: disponible, proveedor `vertex`, recomendado para contexto y uso general
- `gemini-2.5-pro`: disponible, proveedor `vertex`, recomendado para thinking alto
- `gpt-chat-latest`: no conectado, proveedor futuro `openai`, recomendado para planificacion
- `claude-sonnet-5`: no conectado, proveedor futuro `anthropic`, recomendado para codigo
- `kimi-k2.6`: no conectado, proveedor futuro `kimi`, recomendado para codigo largo/alternativo

Si Sergio elige un modelo no conectado, el backend debe responder usando Gemini y agregar metadata de fallback.

## Backend Design

Nuevo endpoint:

```text
POST /api/agents/:agentId/chat
```

Request:

```json
{
  "message": "texto del usuario",
  "brainMode": "auto | manual | council",
  "modelId": "gemini-2.5-flash"
}
```

Response:

```json
{
  "text": "respuesta del agente",
  "brain": {
    "mode": "manual",
    "requestedModelId": "claude-sonnet-5",
    "usedModelId": "gemini-2.5-flash",
    "provider": "vertex",
    "fallbackUsed": true,
    "fallbackReason": "Modelo elegido todavia no conectado"
  },
  "memoryProposal": {
    "title": "titulo sugerido",
    "content": "contenido sugerido",
    "type": "Contexto",
    "importance": "alta",
    "tags": ["dominus", "quantumcore"]
  }
}
```

El endpoint debe validar que exista `message` y que exista el agente. Si falta algo, debe devolver error claro.

El endpoint debe construir el prompt con esta estructura:

```text
SYSTEM CORE
<contenido de DOMINUS_PRIME_SYSTEM_CORE.md>

CONSTITUCION RELEVANTE
<contenido acotado de DOMINUS_PRIME_CONSTITUTION.md>

MEMORIAS DEL AGENTE
<memorias criticas/altas primero>

INSTRUCCION DE MEMORIA
Si detectas una decision, contexto importante, proxima accion o riesgo que conviene guardar, proponelo como memoryProposal. No afirmes que fue guardado.

MENSAJE DEL USUARIO
<message>
```

Para esta version, la constitucion puede cargarse completa si el tamaño se mantiene razonable. Si crece demasiado, se reemplaza por fragmentos relevantes.

## Frontend Design

En `ChatCentral`, arriba del area de mensajes del agente activo, agregar un selector visual compacto.

Elementos:

- selector de modo: `Auto`, `Manual`, `Consejo`
- tarjetas de cerebros favoritos con icono/miniatura, nombre, proveedor y estado
- modelo seleccionado resaltado
- recomendacion visual para el modelo sugerido
- texto de fallback cuando aplique

El chat debe enviar el modelo elegido al nuevo endpoint.

Si el backend devuelve `memoryProposal`, mostrarla como bloque destacado en la respuesta:

```text
Memoria sugerida: <titulo>
<contenido>
```

No se agrega boton de aprobar memoria en esta version. Solo se deja claro que es una propuesta.

## Data Flow

```text
Sergio escribe mensaje
  -> ChatCentral envia agentId + brainMode + modelId + message
  -> Backend carga agente desde Supabase
  -> Backend carga memorias vinculadas al agente
  -> Backend lee system core y constitucion desde docs
  -> Brain Router resuelve modelo real/fallback
  -> Gemini/Vertex responde con contexto de Dominus
  -> Backend devuelve texto + metadata del cerebro + memoryProposal opcional
  -> ChatCentral muestra respuesta, fallback y memoria sugerida
```

## Error Handling

Si Supabase falla, el endpoint debe devolver error 500 con mensaje controlado y log server-side.

Si el agente no existe, devolver 404.

Si el modelo elegido no esta conectado, usar fallback Gemini y avisar en metadata.

Si falla Gemini, devolver 500 y el frontend muestra error de comunicacion con backend.

## Testing

Agregar tests unitarios para:

- resolver modelo disponible vs fallback
- construir context pack de Dominus con system core, constitucion y memoria
- detectar que un modelo no conectado cae a Gemini
- mantener `memoryProposal` como propuesta y no escritura automatica

Verificacion final:

- `npm run lint`
- `npm test`
- `npm run build`

## Futuro No Implementado Ahora

Agent Builder visual debe permitir elegir cerebros permitidos por agente, cerebro default, fallbacks y restricciones por tarea. Esto queda como modulo futuro dentro de QuantumCore, no como plataforma separada.

Modo Consejo debe consultar varios cerebros solo cuando Sergio lo pida o cuando Dominus escale una decision importante. No debe ser default por costo, latencia y ruido.

VM / Remote Computer Manager, Avatar Live Assistant y modulos comerciales quedan documentados en la vision, pero no forman parte de esta implementacion.

## Criterio De Aceptacion

Dominus debe responder desde el chat usando su identidad, constitucion y memoria real.

Sergio debe poder elegir visualmente un cerebro/modelo en el chat.

Si el modelo elegido no esta conectado, el sistema debe usar Gemini como fallback y decirlo claramente.

La memoria no se guarda automaticamente; solo se propone.
