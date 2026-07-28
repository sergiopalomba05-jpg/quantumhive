# QuantumHive Visual Workflow Builder Design

## Objetivo

QuantumHive debe tener un canvas visual propio para disenar agentes, workflows, herramientas, memoria, approvals y workers sin depender de N8N como core. N8N queda como compatibilidad opcional para importar/exportar flujos cuando un usuario ya tenga workflows en N8N. LangGraph queda como motor backend para orquestacion AI con estado, no como UI principal ni reemplazo del producto.

## Decision principal

Usar una combinacion de opcion 2 y opcion 5:

- Frontend: canvas embebido propio con React Flow (`@xyflow/react`).
- Backend: runtime propio en Cloud Run para workflows simples.
- AI orchestration: LangGraph en backend para workflows inteligentes, multi-agente y con loops.
- N8N: adaptador opcional de import/export y fuente de templates, no dependencia central.

## Principios

- QuantumHive es el source of truth.
- El canvas propio representa la intencion del usuario y el grafo operativo.
- N8N no es el corazon del sistema.
- LangGraph no se usa para CRUD simple ni acciones directas.
- Acciones destructivas, deploys reales, emails externos, CLI real y gasto pago pasan por Approval Queue.
- Las credenciales reales viven en backend/Secret Manager/N8N credentials, nunca en frontend.
- El MVP puede ejecutar en modo simulado/localStorage, pero debe modelar los datos como si fueran productivos.

## Arquitectura conceptual

```text
Usuario
  -> QuantumHive UI
  -> Visual Workflow Canvas
  -> Workflow Definition JSON
  -> Backend Workflow Runtime
  -> Simple Executor o LangGraph Adapter
  -> Workers / Tools / N8N opcional
  -> Audit Log + Memory + Approval Queue
```

## Capas del sistema

### 1. Canvas Visual Propio

El canvas permite armar flujos de agentes con nodos y conexiones visuales. Debe estar dentro de la app, no en una instancia externa.

Nodos iniciales:

- `trigger`: idea, webhook, manual, schedule, video, email, voice.
- `agent`: agente QuantumHive.
- `brain`: proveedor/modelo, por ejemplo Vertex/Gemini.
- `worker`: OpenCode, Cloud Run Worker, Local Desktop Worker, GPU VM, N8N Worker.
- `tool`: MCP, API connector, CLI tool.
- `memory`: guardar o leer memoria.
- `approval`: aprobacion humana.
- `condition`: bifurcacion simple.
- `output`: tarea, memoria, proyecto, workflow, daily brief.
- `n8n`: nodo compatible con import/export N8N.

### 2. Workflow Model Propio

El flujo visual se guarda como JSON propio:

- `workflowDefinition`
- `workflowNode`
- `workflowEdge`
- `workflowRun`
- `workflowRunStep`
- `workflowTemplate`
- `workflowCredentialRequirement`

Este modelo propio permite exportar a otros sistemas sin quedar atados a N8N.

### 3. Runtime Simple

Para el MVP, el runtime simple ejecuta pasos deterministas:

- crear tarea,
- crear memoria,
- crear evento,
- crear approval,
- registrar audit log,
- marcar paso como simulado.

No necesita LangGraph.

### 4. LangGraph Adapter

LangGraph se usa solo cuando un workflow requiere razonamiento AI con estado:

- analizar una idea,
- planificar subtareas,
- decidir siguiente nodo,
- llamar herramientas,
- esperar aprobacion,
- reintentar,
- guardar memoria,
- continuar un loop.

LangGraph vive en backend. El frontend nunca ejecuta LangGraph directamente.

### 5. N8N Adapter Opcional

N8N se trata como compatibilidad externa:

- buscar templates de `https://n8n.io/workflows`,
- importar templates como referencia,
- mapear workflows N8N a nodos QuantumHive cuando sea posible,
- exportar un workflow QuantumHive a JSON N8N cuando haya equivalencias,
- desplegar a una instancia N8N real solo con credenciales backend y aprobacion.

La conexion real con N8N queda para despues. La instancia N8N actual esta vieja/no responde y se reemplazara por una nueva con correo corporativo si hace falta.

## Pestañas afectadas

### Visual Planner

Debe evolucionar hacia el canvas principal de workflows.

### Agent Builder

Debe poder crear agente + workflow base asociado.

Ejemplo:

```text
Crear agente -> elegir cerebro -> elegir worker -> elegir MCP/tools -> crear workflow inicial -> guardar template del agente
```

### MCP / API / CLI Hub

Debe listar herramientas disponibles y permitir arrastrarlas/agregarlas al workflow.

### Worker Registry

Debe proveer cuerpos disponibles para nodos worker.

### Brain Registry

Debe proveer cerebros/modelos disponibles para nodos brain.

### N8N Workflows

Puede ser una nueva seccion o subpestana dentro de MCP Hub/Visual Planner. Debe incluir biblioteca de templates, import/export y estado de conexion.

## Asistentes contextuales

Cada pestana compleja debe mostrar una ayuda emergente que dirija al asistente contextual.

Ejemplo Agent Builder:

```text
Queres que la plataforma te ayude a crear tu agente?
Puedo recomendar rol, cerebro, worker, herramientas, permisos y workflow inicial.
```

Botones:

- `Abrir asistente`
- `Explicame esta seccion`
- `No mostrar de nuevo`

La ayuda se muestra una vez por seccion y se puede resetear desde ayuda/onboarding.

## Estado MVP

El MVP debe permitir:

1. Crear un workflow visual propio.
2. Agregar nodos desde una biblioteca inicial.
3. Conectar nodos.
4. Guardar el workflow en localStorage/Zustand.
5. Asociar el workflow a un agente.
6. Ejecutar una simulacion segura.
7. Generar tareas, memorias, approvals y audit logs simulados.
8. Exportar el workflow como JSON QuantumHive.
9. Ver templates N8N como inspiracion/catalogo.
10. Dejar N8N real y LangGraph real como fases posteriores.

## Fuera de alcance del primer MVP

- Ejecutar workflows reales en N8N.
- Guardar credenciales reales desde frontend.
- Ejecutar CLI real.
- Controlar mouse/teclado real.
- Ejecutar LangGraph productivo sin backend dedicado.
- Reemplazar todo el store local por Firestore en el mismo paso.

## Orden recomendado

1. Copiar los asistentes contextuales utiles del clon y agregar popups por pestana.
2. Ampliar workers y MCP servers visuales.
3. Instalar React Flow.
4. Crear modelo propio de workflows.
5. Crear biblioteca de nodos QuantumHive.
6. Implementar canvas MVP en Visual Planner o nueva pagina `Workflow Builder`.
7. Conectar Agent Builder para crear workflow inicial.
8. Crear simulador de ejecucion.
9. Crear export JSON QuantumHive.
10. Crear catalogo N8N templates sin conexion real.
11. Planificar backend runtime y LangGraph adapter.

## Criterio de exito

La primera demo cerrada debe ser:

```text
Crear agente -> abrir asistente -> generar workflow inicial -> ver canvas -> simular ejecucion -> crear tarea/memoria/audit log -> exportar JSON
```

Si esa demo funciona, QuantumHive ya tiene el loop base de idea a orquestacion visual.

## Self-review

- No hay dependencia obligatoria de N8N.
- LangGraph esta limitado a backend y workflows AI.
- El MVP queda acotado a canvas, modelo propio y simulacion segura.
- La conexion real N8N queda explicitamente fuera del primer MVP.
- Las acciones sensibles pasan por approval y audit log.
