# Provider Manager + GitHub Repo Connector Design

## Objetivo

Convertir QuantumCore en un cockpit de proveedores y repositorios: Dominus debe poder elegir cerebros por proveedor, cambiar de cerebro con fallback, y usar un repositorio GitHub activo como contexto del chat. Este bloque no incluye runners locales/VM; queda preparado para agregarlos despues.

## Alcance Del Paso 1

El MVP debe entregar una experiencia funcional para Sergio:

- Agregar y ver proveedores de IA desde una seccion `Proveedores`.
- Mostrar metodos de conexion tipo OpenCode: API, cloud, browser y headless.
- Conectar proveedores API/cloud estables primero.
- Registrar proveedores browser/headless como flujos disponibles para activacion manual posterior.
- Mostrar cerebros/modelos por proveedor.
- Usar el proveedor/modelo seleccionado desde el chat de Dominus.
- Aplicar fallback automatico cuando un modelo no este disponible.
- Conectar GitHub como fuente de repositorios.
- Elegir un repo activo para que Dominus lo use como contexto.

Fuera de alcance para este bloque:

- Ejecutar comandos locales en PC o VM.
- Control remoto de escritorio.
- Runners locales/VM.
- Edicion directa de archivos locales.
- Automatizacion real de sesiones browser/headless de ChatGPT o Claude desde Cloud Run.

## Concepto De Producto

QuantumCore tendra un `Provider Manager` parecido al selector de OpenCode, pero persistente, cloud-first y conectado a memoria. El usuario podra registrar proveedores pagados, gratuitos, cloud o personales. Dominus no dependera de Gemini por defecto: usara un router que decide por disponibilidad, prioridad, costo y tarea.

El conector GitHub dara a Dominus un repo activo. En esta fase el repo aporta metadata y contexto inicial; la ejecucion local vendra despues con runners.

## Tipos De Proveedor

### API Directa

Para proveedores con API key o endpoint compatible:

- OpenAI API.
- Anthropic API.
- OpenRouter.
- Gemini API.

Estado posible:

- `needs_secret`: falta cargar secreto.
- `connected`: secreto presente y smoke test exitoso.
- `failed`: secreto presente pero el test fallo.
- `limit_reached`: proveedor respondio limite/cupo.
- `disabled`: apagado por el usuario.

### Cloud Provider

Para nubes con credenciales o identidad administrada:

- Vertex AI.
- Azure OpenAI.
- AWS Bedrock.

Vertex en Cloud Run debe usar service account/ADC, no API key en frontend. Azure y AWS quedan listos para registrar endpoint, region y secreto server-side.

### Plan Browser/Headless

Para cuentas personales tipo:

- ChatGPT Pro/Plus browser.
- ChatGPT Pro/Plus headless.
- Claude Pro browser.
- Claude Pro headless.

En este bloque aparecen en el menu y se pueden registrar como `needs_login`, pero la ejecucion real queda bloqueada hasta runners, porque Cloud Run no es un lugar confiable para guardar cookies personales o correr sesiones web persistentes.

### Local/VM

Reservado para runners futuros:

- Ollama.
- vLLM.
- LM Studio.
- GPU VM.

En esta fase se muestran como tipo futuro, no ejecutable.

## Modelo De Datos

### Provider

Campos minimos:

- `id`: identificador estable.
- `name`: nombre visible.
- `kind`: `api`, `cloud`, `browser`, `headless`, `local`.
- `vendor`: `openai`, `anthropic`, `google`, `azure`, `aws`, `openrouter`, `ollama`.
- `status`: estado operativo.
- `priority`: prioridad del router.
- `costTier`: `free`, `low`, `medium`, `high`, `unknown`.
- `secretRef`: referencia segura, nunca valor del secreto.
- `models`: lista de modelos/cerebros.
- `notes`: texto operativo para UI.

### Model

Campos minimos:

- `id`: id usado por el proveedor.
- `displayName`: nombre visible.
- `providerId`: proveedor dueño.
- `status`: `available`, `candidate`, `needs_login`, `not_connected`, `limit_reached`.
- `routerReady`: si Dominus puede usarlo ya.
- `capabilities`: `code`, `reasoning`, `vision`, `audio`, `video`, `fast`, `cheap`, `long_context`.
- `recommendedFor`: tareas recomendadas.

### GitHub Repo

Campos minimos:

- `id`: repo interno.
- `provider`: `github`.
- `owner`: owner GitHub.
- `name`: repo.
- `defaultBranch`: branch principal.
- `url`: URL publica o privada.
- `status`: `connected`, `needs_auth`, `failed`.
- `lastIndexedAt`: ultima indexacion/contexto.
- `active`: si es el repo activo del chat.

## API Backend

Endpoints minimos:

- `GET /api/providers`: lista proveedores y modelos sin secretos.
- `POST /api/providers`: crea proveedor metadata.
- `POST /api/providers/:id/test`: smoke test del proveedor.
- `PATCH /api/providers/:id`: actualiza prioridad, estado o metadata.
- `GET /api/providers/:id/models`: lista modelos detectados o registrados.
- `POST /api/agents/:agentId/chat`: acepta `providerId`, `modelId`, `repoId` y `brainMode`.
- `POST /api/github/connect`: registra GitHub token/app metadata de forma segura.
- `GET /api/github/repos`: lista repos conectados.
- `POST /api/github/repos`: agrega repo por URL/owner/name.
- `PATCH /api/github/repos/:id/active`: selecciona repo activo.
- `GET /api/github/repos/:id/context`: devuelve contexto resumido para Dominus.

## UI

### Proveedores

La pagina `Proveedores de IA / APIs` pasa a tener:

- Boton `Agregar proveedor`.
- Selector de tipo: API, Cloud, Browser, Headless, Local/VM.
- Cards por proveedor con estado, modelos y costo estimado.
- Acciones: `Probar`, `Activar`, `Desactivar`, `Editar prioridad`.
- Indicacion clara de que secretos no se guardan en frontend.

### Chat Dominus

Abajo del chat debe existir una barra compacta:

- `Modo`: Auto, Manual, V.S 2, Dev, Low Cost.
- `Proveedor`: GPT, Gemini, Claude, OpenRouter, Azure, Vertex.
- `Cerebro`: modelos disponibles segun proveedor.
- `Repo`: repo GitHub activo.
- Estado de fallback: por ejemplo `GPT limitado -> Gemini fallback`.

### GitHub

Una pagina o panel `Repositorios` debe permitir:

- Conectar GitHub.
- Agregar repo por URL.
- Ver repos conectados.
- Elegir repo activo.
- Ver ultimo contexto/indexacion.

## Router De Dominus

El router debe resolver en este orden:

1. Si el usuario eligio modelo manual y esta `routerReady`, usarlo.
2. Si el usuario eligio modelo manual pero no esta disponible, usar fallback y reportarlo.
3. En `Auto`, elegir por tarea: codigo, razonamiento, vision, bajo costo, contexto largo.
4. Si el proveedor alcanza limite o falla, rotar al siguiente proveedor activo.
5. Si todo falla, usar Vertex Gemini verificado como fallback conservador.

El router no debe usar modelos `browser/headless` hasta que exista un executor seguro. Puede mostrarlos como `needs_login` o `requires_runner`.

## Seguridad

Reglas obligatorias:

- No guardar API keys, tokens, cookies ni secretos en frontend/localStorage.
- El frontend solo recibe `secretRef` y estado.
- Secretos reales deben vivir en env backend, Secret Manager o almacenamiento cifrado server-side.
- Los proveedores browser/headless no deben guardar cookies personales en Cloud Run en este bloque.
- GitHub token debe ser server-side.
- Cada respuesta del backend debe filtrar campos sensibles.

## Error Handling

Casos principales:

- Proveedor sin secreto: mostrar `needs_secret`.
- Login browser/headless pendiente: mostrar `needs_login`.
- Modelo no disponible: fallback con `fallbackReason`.
- Limite alcanzado: marcar `limit_reached` temporal y rotar proveedor.
- GitHub token invalido: repo queda `needs_auth`.
- Repo privado sin permiso: mostrar error accionable.

## Testing

Tests minimos:

- Registry no expone secretos.
- Provider Manager lista tipos API/cloud/browser/headless/local.
- Router solo usa modelos `routerReady`.
- Router aplica fallback si el modelo manual no esta conectado.
- Chat acepta `providerId`, `modelId` y `repoId`.
- GitHub connector registra repo y permite seleccionarlo activo.
- UI no contiene formularios que guarden secrets en localStorage.

## Entrega Esperada

Al terminar el bloque:

- QuantumCore tendra menu de proveedores tipo OpenCode.
- Dominus podra seleccionar proveedor/modelo desde chat.
- OpenAI/API-cloud podran conectarse como proveedores reales si hay secreto.
- Vertex seguira funcionando por Cloud Run service account.
- Browser/headless quedara modelado y visible, pero marcado como pendiente de runner.
- GitHub repo connector dejara de ser mock y podra registrar repos reales.
- El paso siguiente sera runners locales/VM para ejecutar browser/headless, Ollama y pipelines locales.
