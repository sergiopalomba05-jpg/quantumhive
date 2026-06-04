# Yas Papeo — Sistema de venta y atención automática 🌸

Mapa de negocio para presentación. Cuatro vistas:
1. **El embudo de venta** — de Instagram al turno cobrado
2. **Qué hace el asistente hoy** — lo que ya funciona
3. **Cómo lo llevamos al 100% automático** — roadmap + qué hace falta activar
4. **La infraestructura empresarial** — la base que escala

> Para presentarlo lindo en la reunión, abrí `arquitectura.html` en el navegador.

---

## 1. El embudo de venta (el corazón)

Todo arranca en **Instagram**: la clienta ve un post o una historia, toca el link y cae directo en el asistente, que la atiende sola y la lleva hasta el turno reservado y pago.

```mermaid
flowchart LR
    subgraph CAP["🎯 Captación"]
        ADS[📣 Meta Ads<br/>Instagram + Facebook<br/>para llegar a más mujeres]
        IG[📸 Instagram<br/>perfil · posts · historias]
    end

    subgraph AT["🤖 Atención automática 24/7"]
        LINK[🔗 Link en la bio<br/>o en la historia]
        BOT[🌸 Asistente Yas Papeo<br/>responde al instante<br/>por texto y por audio]
    end

    subgraph CIE["💚 Cierre de venta"]
        WABOT[📲 Bot de WhatsApp<br/>agenda el turno · da precios<br/>y medios de pago]
        TURNO[📅 Turno reservado<br/>+ seña cobrada]
    end

    ADS --> IG
    IG --> LINK
    LINK --> BOT
    BOT -->|la clienta quiere turno| WABOT
    WABOT --> TURNO

    classDef cap fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef at fill:#ffe0ec,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef cie fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;

    class ADS,IG cap;
    class LINK,BOT at;
    class WABOT,TURNO cie;
```

---

## 2. Qué hace el asistente hoy (ya funciona)

```mermaid
flowchart TD
    A([👩 La clienta escribe<br/>por Telegram]) --> B{¿Mandó texto<br/>o audio?}

    B -->|Texto 💬| BOT[🌸 Asistente Yas Papeo<br/>atiende al instante, 24/7]
    B -->|Audio 🎤| BOT

    BOT --> G[🧠 Entiende el mensaje<br/>con la personalidad y la info<br/>del salón cargadas]
    G --> R[Arma una respuesta cálida<br/>en voseo argentino]

    R --> Q{¿Cómo había<br/>escrito la clienta?}
    Q -->|Texto| T[💬 Le responde en texto]
    Q -->|Audio| V[🔊 Le responde con una<br/>nota de voz natural]

    T --> REC([👩 La clienta recibe<br/>la respuesta])
    V --> REC

    REC --> D{¿Quiere turno<br/>o precio?}
    D -->|Sí| W[📲 La pasa al bot de WhatsApp<br/>que agenda y cobra]
    D -->|Sigue charlando| A

    classDef cliente fill:#f9c5d1,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef bot fill:#ffe0ec,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef accion fill:#fff0f6,stroke:#e64980,stroke-width:1.5px,color:#5a1133;
    classDef deriva fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;

    class A,REC cliente;
    class BOT,G bot;
    class R,T,V accion;
    class W deriva;
```

**Cómo atiende (las reglas del asistente):**

- 🤫 **Nunca dice que es un bot.** Atiende como una asesora más del salón.
- 🎤 **Entiende y responde por texto y por audio**, en voseo argentino cálido.
- ⚡ **Responde al instante, 24/7, los 365 días.** Ninguna clienta queda sin respuesta.
- 🧠 **Se acuerda de la conversación** de cada clienta mientras chatean.
- 📲 **Cuando quiere turno o precio, la pasa al bot de WhatsApp** que agenda y cobra.
- 🚫 **No inventa.** Trabaja siempre con la info real del salón.

---

## 3. Cómo lo llevamos al 100% automático (roadmap)

El asistente que ya atiende es el primer ladrillo. El siguiente salto es que **agende el turno solo y cobre la seña**, sin que nadie del salón tenga que tocar el teléfono.

```mermaid
flowchart LR
    subgraph HOY["✅ Funcionando hoy"]
        A1[🌸 Asistente en Telegram<br/>texto + audio · 24/7]
    end

    subgraph CONST["🔧 Lo que construimos"]
        B1[📲 Bot oficial de WhatsApp]
        B2[📅 Calendario / agenda<br/>conectado en vivo]
        B3[🧠 Memoria real de cada clienta<br/>historial · gustos · turnos]
    end

    subgraph META["🚀 Resultado"]
        C1[🤖 Agenda el turno sola,<br/>da precio y cobra la seña<br/>sin intervención humana]
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

### Ya está listo ✅
- Asistente que atiende por Telegram
- Texto y audio, voz argentina natural
- Personalidad del salón cargada
- Responde 24/7 al instante

### Para activar la automatización total ▢
- **WhatsApp oficial** (número verificado + proveedor)
- **Meta Ads** (Business Manager + presupuesto de pauta)
- **Calendario / agenda** del salón conectado en vivo
- **Pasarela de cobro** para la seña (medios de pago)
- **Lista de precios y servicios** para cargar al bot

---

## 4. La infraestructura empresarial (la base que escala)

No es "un bot suelto": es la base sobre la que se monta **toda la operación digital del salón** (y mañana, varios bots trabajando juntos como un enjambre).

```mermaid
flowchart LR
    subgraph CANALES["📥 Canales de la clienta"]
        IG2[📸 Instagram]
        TG2[💬 Telegram]
        WA2[📲 WhatsApp]
    end

    subgraph SERVIDOR["🖥️ Servidor externo dedicado — placa de video + GPU, RAM y almacenamiento propios · prendido 24/7 en su entorno virtual"]
        MOTOR[[🧠 Motor de IA pro<br/>inteligencia + memoria<br/>persistente multimodal]]
        BOTS[🤖 Todos los bots de la empresa<br/>corriendo en el mismo entorno]
    end

    IG2 --> SERVIDOR
    TG2 --> SERVIDOR
    WA2 --> SERVIDOR
    MOTOR --- BOTS

    classDef canal fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef serv fill:#fff0f6,stroke:#d6336c,stroke-width:2px,color:#5a1133;

    class IG2,TG2,WA2 canal;
    class MOTOR,BOTS serv;
```

**En una frase:** la clienta llega desde Instagram, un **motor de IA pro con memoria persistente multimodal** la atiende al instante por texto o voz, y la lleva hasta el turno agendado y la seña cobrada por WhatsApp — todo corriendo en un **servidor externo dedicado con GPU propia**, listo para escalar a una **agencia de bots automatizados (swarm)** que opere todo el negocio sola.
