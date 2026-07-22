# QuantumCore Contexto Operativo

Este documento guarda la vision recuperada para que no se pierda en compactaciones de conversacion, cambios de agente o sesiones futuras.

## Definicion Central

QuantumCore es el software cerrado y privado de Sergio Palomba para dirigir un holding de proyectos, agentes, memorias, nubes, modelos, repositorios, automatizaciones y futuros frentes inmersivos.

QuantumCore no es un SaaS publico en esta etapa. No se construye para vender acceso masivo ahora. Es una nave nodriza privada, una fabrica, cerebro y torre de control interna.

Los productos publicos o comerciales salen desde QuantumCore, pero QuantumCore queda como nucleo cerrado.

## Problema Que Debe Resolver

El objetivo emocional y operativo principal es salir del caos de programacion y operacion actual:

- herramientas dispersas
- proyectos dispersos
- contexto perdido entre chats y agentes
- archivos y pruebas en lugares distintos
- decisiones no registradas
- tareas sin continuidad
- infraestructura probada de forma caotica
- perdida de foco por exceso de opciones tecnicas

QuantumCore debe devolver orden, centralizacion, memoria y paz mental para que el usuario pueda evolucionar sus proyectos de forma fluida.

## Rol De QuantumCore

QuantumCore debe ser:

- memoria central real
- orquestador propio de agentes
- mapa vivo de proyectos
- sistema de tareas
- registro de decisiones
- router de cerebros
- router de nubes
- panel de conexion con GitHub, GCP, Supabase, Cloud Run y futuros proveedores
- centro de mando del holding
- base tecnica para aplicar a programas de creditos cloud/startups

QuantumCore no debe ser todavia:

- una nube independiente
- una plataforma SaaS publica
- un reemplazo completo de GCP, Azure o AWS
- un N8N propio gigante
- un marketplace de agentes
- un sistema publico multiusuario
- una interfaz inmersiva antes de tener el nucleo funcional

## Productos Derivados

QuantumCore dirige y opera frentes derivados como:

- Empleados Virtuales
- HumanIA
- TraderBoos
- Direct Import
- Estudio Creativo
- futuros productos y experimentos
- experiencias 2D con Roblox Studio
- experiencias 3D con Unreal Engine 5

La frase guia es: QuantumCore no es el producto publico principal; QuantumCore es la fabrica, cerebro y torre de control de todos los productos.

Los productos derivados pueden tener marca, landing, experiencia y clientes propios, pero no deben duplicar el nucleo. Empleados Virtuales, HumanIA, TraderBoos, Direct Import y Estudio Creativo deben apoyarse en QuantumCore para agentes, memoria, modelos, permisos, tareas, auditoria, infraestructura y orquestacion.

QuantumCore debe crecer como sistema operativo unificado modular. Los modulos se agregan dentro de la misma plataforma y, a futuro, pueden desbloquearse por planes. No conviene separar plataformas hasta que un modulo tenga traccion propia suficiente para justificarlo.

## Modelo De Plataforma Y Modulos Desbloqueables

QuantumCore debe poder funcionar en dos modos de producto:

- modo privado: todos los modulos son herramientas internas de Sergio y QuantumHive
- modo comercial futuro: los clientes desbloquean modulos segun plan, necesidad y permisos

Modulos futuros posibles:

- Agent Builder
- Brain Router visual
- Workflow Builder
- Visual Studio
- Cloud Router
- VM / Remote Computer Manager
- Administrador de workers
- Repo / Code Assistant
- Knowledge Graph
- Avatar Live Platform Assistant
- Billing, planes y cuotas

El Agent Builder no es urgente como pantalla visual para Sergio, porque Dominus puede crear agentes por conversacion. Pero si es estrategico como modulo vendible futuro: convierte una necesidad comun en un agente configurado, con cerebro, permisos, memoria, herramientas y, si hace falta, infraestructura asociada.

## VMs, Escritorios Remotos Y Cloud Simplificada

QuantumCore puede ofrecer en el futuro maquinas virtuales, computadoras remotas y servidores privados creados sobre clouds externas. Esto no debe presentarse al usuario como GCP, Azure o AWS, sino como una experiencia simple:

```text
quiero una computadora remota / servidor / worker
  -> QuantumCore pregunta necesidad
  -> Dominus o agente de plataforma recomienda plantilla
  -> Cloud Router elige proveedor/region/tipo de maquina
  -> VM Manager crea y configura
  -> auditoria registra
  -> usuario entra con un click
```

Ejemplo comercial futuro: un usuario quiere usar una maquina remota porque su PC no le sirve para una tarea pesada. Entra a QuantumCore, pide una computadora remota, y el asistente la crea y configura sin que el usuario aprenda cloud empresarial.

Este modelo puede monetizarse cobrando por encima del costo real de la nube, pero el valor no debe ser solo la reventa de VM. El valor esta en simplicidad, plantillas, configuracion automatica, acceso con un click, seguridad, soporte, apagado automatico, monitoreo, integracion con agentes y experiencia guiada.

Reglas antes de abrirlo a terceros:

- limites de gasto por usuario
- apagado automatico
- cuotas por plan
- plantillas cerradas al principio
- auditoria completa
- aprobacion para acciones caras o riesgosas
- aislamiento por cliente
- control de credenciales
- monitoreo de abuso
- soporte operativo definido

La vision de largo plazo incluye un asistente de plataforma con avatar live y permisos controlados de mouse/teclado. El usuario puede hablarle al software y ver como el asistente mueve el mouse, configura la VM, abre herramientas o ejecuta flujos. Esto debe construirse primero de forma privada y con permisos estrictos antes de ofrecerlo publicamente.

## Arquitectura Base

La arquitectura correcta para esta etapa es un monolito modular, no microservicios prematuros:

```text
QuantumCore
  - Frontend
  - Backend
  - Agent Runtime
  - Memory
  - Brain Router
  - Cloud Router
  - VM / Remote Computer Manager
  - Jobs
  - Events
  - Tools
  - Approvals
  - Audit
```

Todo vive dentro de QuantumCore, separado por modulos claros. El sistema puede crecer, pero primero debe cerrar un circuito simple y verificable.

## Orquestador Propio

QuantumCore no depende de Hermes, N8N, LangGraph ni ningun runtime externo como centro.

N8N y LangGraph pueden existir despues como adaptadores opcionales o compatibilidad, pero no son fuente de verdad ni nucleo.

Los agentes viven como configuracion en la base de datos de QuantumCore. No conocen proveedores cloud ni modelos directamente. Usan el cuerpo/runtime comun de QuantumCore.

## Doble Router

Hay dos routers distintos y no deben mezclarse:

```text
Brain Router = que modelo/cerebro usar
Cloud Router = donde ejecutar o desplegar trabajo
```

Flujo conceptual:

```text
Mensaje del usuario
  -> QuantumCore
  -> Agent Runtime
  -> Context Pack
  -> Brain Router elige el cerebro
  -> respuesta del agente
  -> si necesita ejecutar algo
  -> Cloud Router elige la nube/worker
  -> job / accion / deploy / worker
  -> memoria / evento / auditoria
```

## Brain Router

El agente no es Vertex, OpenAI ni Azure. El agente pide inteligencia y QuantumCore decide que cerebro usar.

Cerebros posibles:

- GCP Vertex / Gemini
- Azure OpenAI
- AWS Bedrock
- NVIDIA
- Alibaba Cloud
- Cloudflare Workers AI
- modelos locales futuros
- otros proveedores futuros

Interfaz conceptual comun:

```text
BrainProvider
  - generate()
  - stream()
  - embeddings()
  - vision()
  - healthCheck()
  - estimateCost()
```

El primer MVP debe implementar la interfaz y conectar primero Vertex/Gemini. Despues se suman Azure, AWS, NVIDIA, Cloudflare y otros sin cambiar los agentes ni la UI.

## Cloud Router

QuantumCore tambien decide donde ejecutar infraestructura, jobs, deploys o tareas.

Nubes posibles:

- GCP
- Azure
- AWS
- Cloudflare
- Alibaba
- NVIDIA/GPU providers
- Supabase
- Render
- Vercel

Interfaz conceptual comun:

```text
CloudProvider
  - deploy()
  - runJob()
  - getLogs()
  - getStatus()
  - estimateCost()
```

El primer MVP debe usar GCP primero. Otros proveedores se agregan como adaptadores posteriores.

## Embajadores De Nubes

Cada nube importante puede tener un agente delegado especializado, conectado a QuantumCore, que actua como embajador tecnico de esa nube.

Arquitectura conceptual:

```text
QuantumCore
  -> Cloud Router
  -> GCP Cloud Agent
  -> GCP APIs / Cloud Run / Vertex / Storage / Logs / IAM
```

Y a futuro:

```text
QuantumCore
  -> GCP Agent
  -> Azure Agent
  -> AWS Agent
  -> Cloudflare Agent
  -> Supabase Agent
  -> GitHub Agent
```

Cada embajador conoce profundamente su plataforma, pero QuantumCore sigue siendo la autoridad central.

Responsabilidades posibles del embajador GCP:

- revisar recursos activos
- recomendar donde alojar funciones, APIs, jobs o modelos
- estimar costos
- leer logs
- detectar errores
- desplegar servicios
- crear jobs controlados
- conectar Vertex/Gemini
- preparar infraestructura
- sugerir apagado de recursos caros
- auditar permisos
- reportar estado a QuantumCore

Regla de seguridad: no usar permisos totales permanentes como norma. Cada embajador debe operar con service account propia, permisos minimos, escalado temporal cuando haga falta, auditoria y aprobacion humana para acciones sensibles.

Formula operativa:

```text
QuantumCore decide.
El embajador cloud recomienda o ejecuta.
La nube aloja la infraestructura.
La auditoria registra todo.
Sergio aprueba acciones sensibles.
```

Esta idea es central para la estrategia multinube: QuantumCore no reemplaza las nubes, las comanda mediante embajadores especializados.

## Arquitectura De Grafo Y Memoria

La memoria de QuantumCore debe simular mejor como funciona una cabeza humana: no leer todo en cada respuesta, sino activar el contexto relevante segun tema, proyecto, agente y tarea.

La arquitectura recomendada es hibrida:

```text
Grafo Global QuantumCore
  -> Subgrafos por proyecto / dominio / nube
  -> Perfil y memoria por agente
  -> Context Pack dinamico por tarea
```

No conviene crear un grafo completo aislado para cada agente desde el inicio, porque duplicaria informacion y volveria dificil mantener consistencia. Tampoco conviene tener un unico grafo plano con todo mezclado. La solucion sana es un grafo global con subgrafos conectados.

### Grafo Global QuantumCore

Representa el mapa general de la empresa y del sistema.

Debe contener:

- Sergio
- QuantumHive
- QuantumCore
- Dominus Prime
- proyectos
- productos
- decisiones estrategicas
- repositorios
- proveedores cloud
- agentes
- herramientas
- memorias importantes
- relaciones entre todos esos elementos

Ejemplos de relaciones:

```text
Direct Import -> usa -> Supabase
Direct Import -> deployado en -> Render
Dominus Prime -> coordina -> Agente SEO Direct Import
QuantumCore -> usa -> GCP
GCP Agent -> embajador de -> GCP
```

### Subgrafos

Cada proyecto, nube o dominio importante puede tener su subgrafo.

Ejemplo de subgrafo `Direct Import`:

- catalogo
- admin
- Supabase
- pedidos
- Render
- proveedores
- tareas
- bugs
- decisiones comerciales
- pendientes

Ejemplo de subgrafo `GCP`:

- Cloud Run
- Vertex
- service accounts
- costos
- logs
- permisos
- deploys
- agentes embajadores

### Perfil Y Memoria Por Agente

Cada agente debe tener una ficha propia, pero no debe copiar todo el grafo.

La memoria del agente contiene:

- identidad
- rol
- permisos
- estilo de respuesta
- herramientas autorizadas
- proyectos permitidos
- aprendizajes propios
- errores cometidos
- criterios de calidad
- historial de coordinacion

Ejemplo `dominus-prime`:

- rol: Orquestador General / CEO II operativo
- autoridad: delegada por Sergio
- estilo: espanol rioplatense ejecutivo
- permisos: crear tareas, proponer acciones, coordinar agentes, solicitar aprobaciones
- prohibiciones: inventar ejecuciones, actuar sin herramientas confirmadas, ejecutar acciones sensibles sin aprobacion

### Context Pack Dinamico

Los agentes no deben leer toda la constitucion, todo el grafo ni toda la memoria en cada llamada.

QuantumCore debe armar un paquete de contexto minimo y suficiente:

```text
Pregunta actual
  -> identificar proyecto / agente / dominio
  -> buscar nodos relevantes
  -> traer memorias y decisiones relacionadas
  -> incluir reglas necesarias de la constitucion
  -> armar Context Pack
  -> llamar al cerebro seleccionado
```

En criollo:

- el grafo global es el mapa de la empresa
- el subgrafo es el mapa de un barrio
- la memoria del agente es su experiencia personal
- el context pack es la hoja de ruta para la tarea actual

Esta estrategia reduce costo, evita saturar al modelo y hace mas probable que cada agente actue con rol correcto y contexto preciso.

## Ejemplo De Decision De Cerebro

Ejemplo: Agente SEO Carta Viva.

Configuracion:

- rol: SEO
- proyecto: Carta Viva
- prioridad: bajo costo
- privacidad: media
- necesita web search: si
- necesita vision: no

QuantumCore decide:

- tarea simple: Gemini Flash
- tarea larga: Gemini Pro / Claude / GPT, segun disponibilidad y costo
- tarea con Azure disponible: Azure OpenAI
- embeddings: proveedor mas barato y suficiente
- imagen/video: NVIDIA, GCP o AWS segun costo y disponibilidad

El agente no decide proveedor. El agente expresa necesidad. QuantumCore enruta.

## Estrategia De Evolucion

Orden sano:

1. Personal OS: ordenar proyectos, memorias, tareas, agentes y decisiones.
2. Operator OS: ejecutar tareas reales con GitHub, GCP, Supabase, deploys y reportes.
3. Holding OS: conectar todos los productos derivados.
4. Team OS: permitir que otra persona del equipo lo use con permisos.
5. License/SaaS: solo si algun dia conviene, no ahora.
6. Inmersion 2D: Roblox Studio como interfaz viva cuando el nucleo funcione.
7. Inmersion 3D: Unreal Engine 5 como nave nodriza visual cuando el sistema este maduro.

## Orden Tecnico Recomendado

1. Memoria central real.
2. Orquestador General real.
3. ChatCentral con contexto real.
4. Tareas, eventos, decisiones y auditoria.
5. GitHub conectado como herramienta interna.
6. GCP conectado como herramienta interna.
7. Router de cerebros multinube.
8. Router de nubes.
9. Automatizaciones externas opcionales.
10. Experiencias inmersivas 2D/3D.

## Primer Circuito Util

El primer circuito que debe funcionar de punta a punta:

```text
Usuario escribe:
  "Revisa Direct Import y decime que falta para vender mas"

QuantumCore:
  1. identifica proyecto Direct Import
  2. carga memorias, decisiones y tareas
  3. usa Orquestador General
  4. llama Vertex/Gemini via Brain Router
  5. crea tareas nuevas
  6. guarda resumen
  7. registra evento
  8. si hace falta, sugiere accion GitHub/GCP con aprobacion humana
```

Cuando ese circuito funcione, QuantumCore ya empieza a ser util de verdad.

## Principio Anti-Caos

No sumar complejidad para aparentar avance. Cada cambio debe acercar el sistema a centralizacion, memoria y utilidad real.

Si una opcion administrada resuelve un problema, primero validar esa opcion antes de crear infraestructura propia costosa. Ejemplo: para avatar/live/lip-sync, probar servicios administrados como Azure Voice Live antes de sostener pipelines locales con ComfyUI, MuseTalk, LivePortrait, LongCat, GPUs L4/A100 o Kubernetes.

No borrar investigaciones locales todavia, pero tratarlas como investigacion secundaria hasta validar caminos administrados mas simples.

## Programas Cloud Y Creditos

Tiene sentido aplicar a programas de startups/cloud credits para financiar la infraestructura de los frentes derivados:

- Google Cloud for Startups
- Microsoft for Startups
- AWS Activate
- NVIDIA Inception
- Cloudflare for Startups
- Alibaba Cloud Startup Program
- GitHub for Startups
- Supabase programs si aplica

Historia tecnica: QuantumCore es un AI operating system privado para orquestar multiples productos verticales de IA.

## Regla Para Agentes Futuros

Si un agente pierde contexto, debe leer primero:

1. `docs/QUANTUMCORE_VISION.md`
2. `docs/QUANTUMCORE_CONTEXTO_OPERATIVO.md`

Antes de proponer nuevas features debe verificar si ayudan al circuito funcional minimo. Si no ayudan, posponerlas.
