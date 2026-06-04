# Yas Papeo · Belleza Capilar — Plataforma de IA conversacional 🌸

**@yaspapeobeauty** · Arquitectura · Propuesta QuantumHive

Arquitectura para presentación. Cinco vistas:
1. **Embudo de conversión** — de Instagram al turno cobrado
2. **Capacidades en producción** — el módulo ya operativo
3. **Roadmap a la automatización integral** — próxima fase + requerimientos
4. **Arquitectura e infraestructura** — la plataforma que escala (con glosario "en criollo")
5. **Visión a futuro** — el ecosistema completo de la empresa

> Para presentarlo en la reunión, abrí `arquitectura.html` en el navegador.
> Las aclaraciones *(entre paréntesis e itálica)* explican cada término técnico en palabras simples.

---

## 1. Embudo de conversión (el corazón)

Toda la demanda se origina en **Instagram** y se canaliza, vía link, hacia el asistente con IA *(el que atiende solo)*, que la recibe en el momento y la lleva por el camino hasta el turno reservado y la seña cobrada.

```mermaid
flowchart LR
    subgraph CAP["🎯 Captación / Top of funnel"]
        ADS[📣 Meta Ads<br/>anuncios en IG + Facebook<br/>a las mujeres justas de la zona]
        IG[📸 Instagram<br/>perfil · posts · historias]
    end

    subgraph AT["🤖 Atención automatizada 24/7"]
        LINK[🔗 Deep link<br/>link que abre el chat directo]
        BOT[🌸 Asistente con IA conversacional<br/>atiende solo · entiende texto y voz]
    end

    subgraph CIE["💚 Conversión / cierre"]
        WABOT[📲 Agente de WhatsApp<br/>reserva · pasa precios · cobra seña]
        TURNO[📅 Turno reservado<br/>+ seña cobrada]
    end

    ADS --> IG
    IG --> LINK
    LINK --> BOT
    BOT -->|intención de turno| WABOT
    WABOT --> TURNO

    classDef cap fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef at fill:#ffe0ec,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef cie fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;

    class ADS,IG cap;
    class LINK,BOT at;
    class WABOT,TURNO cie;
```

---

## 2. Capacidades en producción (operativo)

Módulo ya desplegado y funcionando *(ya está hecho y prendido)*. Se puede probar en vivo desde el celular ahora mismo.

```mermaid
flowchart TD
    A([👩 Clienta inicia conversación<br/>por Telegram]) --> B{¿Texto o audio?}

    B -->|Texto 💬| BOT[🌸 Asistente con IA conversacional<br/>atiende en el momento, 24/7]
    B -->|Audio 🎤| BOT

    BOT --> G[🧠 Comprensión multimodal<br/>entiende el mensaje con la info<br/>del salón ya cargada]
    G --> R[Arma la respuesta<br/>voseo argentino · tono de marca]

    R --> Q{¿Cómo había escrito?}
    Q -->|Texto| T[💬 Responde en texto]
    Q -->|Audio| V[🔊 Síntesis de voz neuronal<br/>nota de voz que suena humana]

    T --> REC([👩 La clienta recibe<br/>la respuesta])
    V --> REC

    REC --> D{¿Quiere turno<br/>o precio?}
    D -->|Sí| W[📲 Deriva al agente de WhatsApp<br/>que agenda y cobra]
    D -->|Sigue conversando| A

    classDef cliente fill:#f9c5d1,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef bot fill:#ffe0ec,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef accion fill:#fff0f6,stroke:#e64980,stroke-width:1.5px,color:#5a1133;
    classDef deriva fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;

    class A,REC cliente;
    class BOT,G bot;
    class R,T,V accion;
    class W deriva;
```

**Características del módulo de atención:**

- 🤫 **Atención conversacional indistinguible de una asesora humana** *(nunca se nota que es un sistema).*
- 🎤 **Procesamiento multimodal** *(entiende y responde en texto y en voz, con voz que suena humana).*
- ⚡ **Disponibilidad 24/7/365** *(siempre disponible, sin horarios ni esperas).*
- 🧠 **Memoria contextual** *(sigue el hilo de la charla con cada clienta).*
- 📲 **Derivación inteligente** *(cuando hay que cerrar, pasa sola al WhatsApp que agenda y cobra).*
- 🚫 **Respuestas ancladas a la base de conocimiento real del salón** *(solo dice info verdadera, no inventa).*

---

## 3. Roadmap a la automatización integral (próxima fase)

El módulo de atención ya operativo es la primera capa. La siguiente fase suma **memoria, agenda y cobro autónomos** *(el sistema reserva el turno y cobra la seña solo, sin que nadie del salón toque el teléfono)*.

```mermaid
flowchart LR
    subgraph HOY["✅ En producción"]
        A1[🌸 Módulo de atención<br/>texto + voz · 24/7]
    end

    subgraph CONST["🔧 En construcción"]
        B1[📲 Agente de WhatsApp Business API<br/>la línea oficial automatizada]
        B2[📅 Motor de agendamiento<br/>reserva en la agenda del salón]
        B3[🧠 Memoria persistente por clienta<br/>recuerda historial y gustos]
    end

    subgraph META["🚀 Resultado"]
        C1[🤖 Agenda y cobra sola<br/>precio · medios de pago · seña<br/>sin intervención humana]
    end

    A1 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> C1

    classDef hoy fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;
    classDef con fill:#fff4e6,stroke:#f08c00,stroke-width:2px,color:#5c3c00;
    classDef meta fill:#ffe0ec,stroke:#d6336c,stroke-width:2.5px,color:#5a1133;

    class A1 hoy;
    class B1,B2,B3 con;
    class C1 meta;
```

### Ya desplegado ✅
- Módulo de atención conversacional *(atiende solo por chat)*
- Texto + voz neuronal *(escribe y manda audios naturales)*
- Personalidad de marca y base de conocimiento *(habla como el salón, con su info)*
- Disponibilidad 24/7 en tiempo real

### Requerido para automatización integral ▢
- **WhatsApp Business API** *(la línea oficial de WhatsApp habilitada para automatizar)*
- **Meta Ads** *(cuenta de empresa de Meta + plata para los anuncios)*
- **Integración con la agenda** *(conectar el calendario del salón)*
- **Pasarela de pagos** *(para cobrar la seña online)*
- **Catálogo de servicios y tarifario** *(cargar precios y tratamientos)*

---

## 4. Arquitectura e infraestructura (la plataforma que escala)

No es un asistente suelto: es una **plataforma de orquestación multi-agente** *(varios asistentes coordinados como un equipo, con un director)* sobre la que se monta toda la operación digital del negocio — y, a futuro, un enjambre de agentes especializados trabajando en conjunto.

```mermaid
flowchart TB
    subgraph OMNI["📥 Capa de ingesta omnicanal — recibe todos los canales"]
        IG2[📸 Instagram]
        TG2[💬 Telegram]
        WA2[📲 WhatsApp Business API]
    end

    subgraph CORE["🖥️ Servidor externo dedicado · GPU + placa de video · RAM y almacenamiento propios · entorno virtual aislado · prendido 24/7"]
        ORCH[[⚙️ Orquestador central propietario<br/>el director que reparte el trabajo - swarm]]
        MOTOR[[🧠 Núcleo de inferencia multimodal<br/>la inteligencia: texto · voz · imagen]]
        MEM[(🗄️ Memoria persistente por clienta<br/>recuerda a cada una a largo plazo)]
        KB[(📚 Base de conocimiento del salón<br/>servicios · políticas · tono de marca)]
    end

    subgraph ACC["🔌 Capa de integración y acciones — hace cosas en el mundo real"]
        AGENDA[📅 Motor de agendamiento]
        PAGO[💳 Pasarela de cobro]
        CRM[📇 CRM de clientas]
    end

    IG2 --> ORCH
    TG2 --> ORCH
    WA2 --> ORCH
    ORCH <--> MOTOR
    MOTOR <--> MEM
    MOTOR <--> KB
    ORCH --> AGENDA
    ORCH --> PAGO
    ORCH --> CRM

    classDef canal fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef core fill:#fff0f6,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef acc fill:#fff4e6,stroke:#f08c00,stroke-width:2px,color:#5c3c00;

    class IG2,TG2,WA2 canal;
    class ORCH,MOTOR,MEM,KB core;
    class AGENDA,PAGO,CRM acc;
```

### 🔎 Qué significa cada parte (en criollo)
- **Orquestación multi-agente** — varios asistentes trabajando coordinados como un equipo, dirigidos por un "director".
- **Núcleo de inferencia multimodal** — la inteligencia que entiende y responde texto, voz e imágenes.
- **Memoria persistente por clienta** — recuerda a cada clienta a largo plazo: qué se hizo, qué le gusta, cuándo vino.
- **Base de conocimiento** — toda la info real del salón cargada (servicios, estilo, reglas).
- **Capa de ingesta omnicanal** — un solo cerebro que recibe los mensajes de todos los canales (IG, Telegram, WhatsApp).
- **Servidor dedicado con GPU** — una máquina industrial potente, prendida siempre, exclusiva para esto.
- **Entorno virtual aislado · alta disponibilidad** — su propio espacio seguro, que funciona 24/7 sin caerse.
- **Enjambre (swarm) de agentes** — muchos asistentes especializados que se van sumando a medida que el negocio crece.

---

## 5. Visión a futuro — el ecosistema completo

Sobre esta misma base se construye **todo el ecosistema digital de la empresa**: presencia premium, una máquina de captación que trabaja sola, el equipo potenciado con IA y la estructura lista para escalar.

```mermaid
flowchart TB
    PLAT([🌸 Plataforma Yas Papeo<br/>el motor central que ya funciona])

    subgraph PRES["✨ Presencia digital premium"]
        WEB[🌐 Web profesional 3D]
        CAT[🧴 Catálogo vivo 3D<br/>con asistente integrado]
    end

    subgraph CAPT["🎯 Máquina de captación"]
        PROSP[🛰️ Agentes de prospección<br/>buscan clientas y arman propuestas]
        FUN[📣 Embudos de publicidad]
        CONT[🗓️ Plan de contenido y posts de IG]
    end

    subgraph EQ["👯 Equipo aumentado con IA"]
        ASIST[🤖 Un asistente por integrante<br/>todos interconectados]
        AV[🎭 Avatar humanizado de cada una<br/>publicidad y contenido en automático]
    end

    subgraph ESC["🏛️ Escala empresarial"]
        EMP[🏢 Estructura de empresa]
        EXP[🚀 Expansión masiva<br/>enjambre de agentes - swarm]
    end

    PLAT --> PRES
    PLAT --> CAPT
    PLAT --> EQ
    PLAT --> ESC

    classDef plat fill:#ffe0ec,stroke:#d6336c,stroke-width:2.5px,color:#5a1133;
    classDef pres fill:#f3e8ff,stroke:#7048e8,stroke-width:2px,color:#3d1a66;
    classDef capt fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef eq fill:#fff0f6,stroke:#e64980,stroke-width:2px,color:#5a1133;
    classDef esc fill:#fff4e6,stroke:#f08c00,stroke-width:2px,color:#5c3c00;

    class PLAT plat;
    class WEB,CAT pres;
    class PROSP,FUN,CONT capt;
    class ASIST,AV eq;
    class EMP,EXP esc;
```

- **🌐 Web profesional 3D** — una página premium con efectos 3D que impacta apenas entrás.
- **🧴 Catálogo vivo 3D con asistente integrado** — los tratamientos en 3D que se ven y giran, con el asistente respondiendo ahí mismo.
- **🛰️ Agentes de prospección** — asistentes que salen a buscar clientas nuevas y les arman la propuesta solos.
- **📣 Embudos de publicidad** — circuitos de anuncios que atraen clientas de forma constante.
- **🗓️ Plan de contenido y posts de IG** — un calendario de contenido pensado y producido para crecer en redes.
- **🤖 Un asistente por integrante, interconectado** — cada integrante del equipo con su propio asistente, todos conectados entre sí.
- **🎭 Avatar humanizado de cada una** — un avatar digital realista de cada una que hace publicidad y contenido en automático.
- **🏢 Estructura de empresa + 🚀 expansión masiva** — todo ordenado como empresa y listo para crecer en serie (el enjambre de agentes que opera el negocio).

**En una frase:** una **arquitectura de orquestación multi-agente propietaria** *(varios asistentes coordinados)*, desplegada en un **servidor externo dedicado con GPU y entorno virtual aislado** *(una máquina potente, prendida siempre, sólo para esto)*, unifica Instagram, Telegram y WhatsApp en un solo núcleo con **memoria persistente por clienta**: capta, atiende en el momento por texto y voz, agenda y cobra sola, y queda lista para escalar a un **ecosistema completo** —web 3D, avatares, captación automática y un enjambre de agentes— que opere todo el negocio.
