# QuantumCore Mapa de Agentes con Dominus

## Objetivo

Crear en QuantumCore una estructura simple, liviana y potente para representar agentes internos alrededor de Dominus. Dominus sera la entrada unica desde Telegram y la UI, filtrara todo lo que llegue y derivara trabajo a agentes secundarios. La interfaz inicial sera un mapa radial liviano, no un grafo 2D pesado ni una experiencia 3D.

El sistema debe quedar preparado para que mas adelante Roblox Studio o Unreal Engine 5 puedan usar los mismos datos como base para una visualizacion inmersiva.

## Principios

- Todo lo visible para Sergio y usuarios debe estar en espanol.
- Dominus es la cara visible y el filtro principal.
- Los agentes secundarios existen dentro de QuantumCore y trabajan por debajo.
- Telegram debe tener un solo bot gateway para el MVP.
- Los tokens y secretos no se guardan en frontend, localStorage, codigo ni capturas.
- QuantumCore debe guardar datos limpios, no depender de una UI especifica.
- La UI debe ser liviana: tarjetas, nodos simples y detalle bajo demanda.
- Ningun recurso entra al catalogo final sin aprobacion humana.

## Agentes Iniciales

### Dominus

Orquestador central. Recibe mensajes desde Telegram y desde el panel, entiende la intencion, consulta memoria/catalogo/Graphify si hace falta y deriva trabajo a agentes internos.

Responsabilidades:

- Filtrar todo lo que entra.
- Responder en espanol.
- Derivar a agentes secundarios.
- Crear tareas, memorias o eventos cuando corresponda.
- Pedir aprobacion antes de acciones sensibles.

Estado inicial: ya existe como `Dominus Prime`, pero en la UI puede mostrarse como `Dominus`.

### Ingesta de Videos y Recursos

Agente interno para procesar reels, videos, links, audios y mensajes con herramientas o ideas.

Responsabilidades:

- Detectar plataforma: Instagram, YouTube, TikTok, X, web u otro origen.
- Extraer titulo, resumen, herramienta detectada, pasos accionables y tags.
- Preparar borradores para Capa 3/catalogo con estado `pending_review`.
- Incluir curaduria basica dentro del mismo flujo.

No se crea un agente separado llamado Curador de Catalogo en el MVP. La curaduria vive como etapa interna de este agente.

### Explorador de Recursos

Agente interno para buscar herramientas gratis, free-tier, modelos open-source, APIs, creditos cloud, datasets y fuentes utiles para QuantumCore.

Responsabilidades:

- Registrar hallazgos como candidatos.
- Clasificar por utilidad: video, codigo, modelos, cloud, automatizacion, marketing, datos u otros.
- Mandar candidatos a revision antes de publicarlos.
- Responder consultas de Dominus sobre herramientas disponibles.

### Fabrica de Agentes

Agente interno para crear y configurar agentes dentro de QuantumCore.

Responsabilidades:

- Crear agentes internos con nombre, rol, permisos, modelo, worker, memoria y herramientas.
- Crear o actualizar `CommunicationChannel` y `AgentChannelBinding` cuando corresponda.
- Registrar bots Telegram ya creados manualmente con BotFather.
- No automatizar BotFather ni guardar tokens visibles.

### Memoria Viva

Agente interno para mantener contexto operativo.

Responsabilidades:

- Guardar decisiones, aprendizajes, riesgos y proximas acciones.
- Mantener memoria por proyecto, agente y canal.
- Ayudar a Dominus a responder preguntas con contexto historico.

### Guardian de Seguridad

Agente interno para proteger acciones sensibles.

Responsabilidades:

- Revisar permisos, tokens, webhooks, secretos y acciones riesgosas.
- Bloquear o pedir aprobacion para operaciones destructivas.
- Crear eventos/auditoria cuando aparezcan tokens expuestos o configuraciones inseguras.

### Ejecutor Dev

Agente interno para ejecutar cambios tecnicos cuando haya plan aprobado.

Responsabilidades:

- Implementar codigo bajo aprobacion.
- Usar repo, workers y pruebas.
- No ejecutar acciones destructivas sin autorizacion.

## Mapa de Orquestacion

La vista inicial sera un mapa simple de nodos:

- Dominus aparece como nodo principal.
- Los agentes secundarios aparecen como nodos satelite.
- Cada nodo muestra nombre, rol corto, estado, ultima actividad y conexiones.
- Al seleccionar un nodo se abre un panel de detalle.
- Las relaciones se muestran como lineas simples o agrupaciones, no como un grafo fisico complejo.

Estados recomendados:

- `activo`: ya puede operar.
- `simulado`: existe en UI/store pero no ejecuta acciones reales.
- `requiere_configuracion`: falta token, webhook, worker o secret.
- `pausado`: existe pero no participa del ruteo.

## Flujo Telegram

El MVP usa un solo bot Telegram como gateway de Dominus.

Flujo:

1. Sergio manda un mensaje, link o reel al grupo autorizado.
2. Telegram envia el update al webhook de QuantumCore.
3. Dominus valida el chat permitido.
4. Dominus clasifica la intencion.
5. Dominus deriva internamente si corresponde.
6. El agente secundario procesa y devuelve resultado a Dominus.
7. Dominus responde en espanol.
8. Si hay recurso para catalogo, queda como borrador pendiente de revision.

Ruteo inicial:

- Reels, videos y links de herramientas: `Ingesta de Videos y Recursos`.
- Preguntas sobre herramientas gratis o alternativas: `Explorador de Recursos`.
- Creacion/configuracion de agentes: `Fabrica de Agentes`.
- Decisiones o contexto importante: `Memoria Viva`.
- Tokens, permisos o riesgo: `Guardian de Seguridad`.
- Cambios de codigo aprobados: `Ejecutor Dev`.

## Datos y Contratos Existentes

El diseno debe reutilizar los tipos existentes de QuantumCore:

- `Agent`: agente interno con nombre, rol, modelo, permisos, memoria, skills y canales.
- `CommunicationChannel`: canal externo o interno como Telegram.
- `AgentChannelBinding`: relacion entre agente y canal.
- `VideoInboxItem`: entrada de video/recurso pendiente de analisis o revision.
- `ToolSkill`: herramienta o skill descubierta.
- `Memory`, `Task`, `SystemEvent`, `AuditLog`: trazabilidad operativa.

No se debe crear un sistema paralelo para agentes. Los agentes nuevos se agregan como seeds/datos iniciales y luego pueden editarse desde QuantumCore.

## Creacion Inicial de Agentes

Los agentes secundarios todavia no existen como entidades completas en QuantumCore. La implementacion debe crearlos como agentes internos iniciales usando el contrato `Agent` existente.

Reglas de creacion:

- Si `Dominus Prime` ya existe, no crear otro Dominus; mostrarlo como `Dominus` en la UI si hace falta.
- Crear `Ingesta de Videos y Recursos`, `Explorador de Recursos`, `Fabrica de Agentes`, `Memoria Viva`, `Guardian de Seguridad` y `Ejecutor Dev` si no existen.
- Asignar `macroDivision: 'General'` por defecto salvo que una responsabilidad pertenezca claramente a otra division.
- Asignar `preferredModel: 'vertex'` por defecto para agentes de razonamiento.
- Mantener `status: 'active'` o `status: 'paused'` segun el tipo `AgentStatus` actual.
- El estado visual del mapa (`activo`, `simulado`, `requiere_configuracion`, `pausado`) debe ser derivado en UI, no reemplazar directamente `AgentStatus`.
- No crear bots Telegram adicionales para estos agentes en el MVP.

## UI Inicial

La UI debe mantenerse simple:

- Pantalla `Mapa de Agentes` o seccion dentro del creador/orquestador actual.
- Tarjetas/nodos en una composicion radial o jerarquica.
- Busqueda y filtro por estado cuando haya mas agentes.
- Panel lateral de detalle.
- Acciones basicas: ver rol, ver conexiones, ver ultima actividad, abrir configuracion.

No usar D3 ni canvas pesado en esta fase. Si se dibujan conexiones, deben ser SVG/CSS simple o layout con tarjetas.

## Preparacion para Roblox o Unreal Engine 5

QuantumCore debe guardar la arquitectura como datos exportables:

- Agentes como nodos.
- Relaciones como edges simples.
- Estados como propiedades.
- Proyectos/canales/memorias como metadata.

En una fase futura, Roblox o Unreal pueden representar:

- Dominus como nucleo, avatar o sala central.
- Agentes como salas, terminales, nodos o NPCs.
- Relaciones como caminos, cables, portales o lineas de energia.
- QuantumCore como backend/cerebro y el motor 3D como interfaz visual.

No se implementa 3D en esta fase.

## Seguridad

- Si aparece un token en una captura o mensaje, se considera comprometido.
- El sistema debe indicar revocar token y generar uno nuevo.
- Los tokens Telegram deben guardarse en GCP Secret Manager.
- El frontend solo muestra metadata del bot/canal, nunca el secreto.
- El webhook debe validar `TELEGRAM_ALLOWED_CHAT_ID`.
- Acciones de escritura, publicacion o ejecucion deben quedar auditadas.

## Testing Esperado

- Verificar que los agentes iniciales se creen con nombres en espanol.
- Verificar que Dominus exista como nodo principal.
- Verificar que el mapa use datos livianos y no dependa de D3/canvas pesado.
- Verificar que Telegram enrute un link de video hacia `Ingesta de Videos y Recursos`.
- Verificar que una pregunta sobre herramientas gratis enrute hacia `Explorador de Recursos`.
- Verificar que ningun texto visible nuevo quede en ingles salvo campos tecnicos existentes.

## Fuera de Alcance

- Crear varios bots Telegram para el grupo.
- Automatizar BotFather.
- Guardar tokens en frontend o localStorage.
- Implementar Roblox Studio o Unreal Engine 5.
- Crear un grafo 2D pesado.
- Publicar recursos automaticamente en catalogo sin revision.

## Resultado Esperado

QuantumCore tendra agentes internos reales y visibles, organizados alrededor de Dominus. Sergio seguira hablando con Dominus como entrada unica, mientras los agentes secundarios trabajan por debajo. La estructura sera simple para operar ahora y suficientemente ordenada para convertirse mas adelante en una visualizacion 2D avanzada o 3D inmersiva.
