# Yas Papeo — Cómo funciona el bot 🌸

Diagrama de arquitectura para presentación. Dos vistas:
1. **El recorrido de la clienta** (lo que le importa a Jazz)
2. **Cómo está hecho por dentro** (la parte técnica)

> Para presentarlo lindo en la reunión, abrí `arquitectura.html` en el navegador.

---

## 1. El recorrido de la clienta

```mermaid
flowchart TD
    A([👩 La clienta escribe<br/>por Telegram]) --> B{¿Mandó texto<br/>o audio?}

    B -->|Texto 💬| BOT[🌸 Bot de Yas Papeo<br/>atiende al instante, 24/7]
    B -->|Audio 🎤| BOT

    BOT --> G[🧠 Entiende el mensaje<br/>con la personalidad y las<br/>reglas del salón cargadas]
    G --> R[Arma una respuesta cálida<br/>en voseo argentino]

    R --> Q{¿Cómo había<br/>escrito la clienta?}
    Q -->|Había escrito texto| T[💬 Le responde en texto]
    Q -->|Había mandado audio| V[🔊 Convierte la respuesta a voz<br/>y le manda una nota de audio]

    T --> REC([👩 La clienta recibe<br/>la respuesta])
    V --> REC

    REC --> D{¿Quiere turno<br/>o precio?}
    D -->|Sí| W[📲 La deriva con cariño<br/>al WhatsApp oficial del salón]
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

---

## 2. Las reglas de oro del bot (lo que NUNCA hace)

- 🤫 **Nunca dice que es un bot.** Atiende como "quien atiende el chat del salón".
- 💲 **Nunca da precios.** Cada cabello necesita diagnóstico → deriva a las chicas.
- 📅 **Nunca agenda turnos.** Los turnos se coordinan por el WhatsApp oficial.
- 🧠 **Se acuerda de la conversación** de cada clienta mientras chatean.
- 🛟 **Si se corta la conexión, responde en personaje** ("se me trabó un segundito, ¿me lo repetís?") — la clienta nunca ve un error feo.
- 🚫 **No inventa.** Si no sabe algo, pide una foto y deriva a Yas o Cami.

---

## 3. Cómo está hecho por dentro (la parte técnica)

```mermaid
flowchart LR
    subgraph TG[Telegram]
        U([👩 Clienta])
    end

    subgraph CR["☁️ Google Cloud Run — corre 24/7, siempre prendido"]
        WH[Servidor del bot<br/>recibe los mensajes]
        H[/health<br/>chequeo de salud/]
        PROMPT[[system_prompt<br/>personalidad + reglas]]
    end

    subgraph GOOGLE["🧠 Google AI (Gemini)"]
        CHAT[Gemini<br/>entiende texto y audio]
        TTS[Gemini TTS<br/>genera la voz argentina]
    end

    WA([📲 WhatsApp oficial<br/>del salón])

    U <-->|mensajes| WH
    WH --> PROMPT
    WH <-->|consulta| CHAT
    WH <-->|texto a voz| TTS
    WH -.->|deriva turnos/precios| WA

    classDef tg fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px,color:#0b2545;
    classDef cr fill:#fff0f6,stroke:#d6336c,stroke-width:2px,color:#5a1133;
    classDef g fill:#fff9db,stroke:#f08c00,stroke-width:2px,color:#5c3c00;
    classDef wa fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px,color:#143601;

    class U tg;
    class WH,H,PROMPT cr;
    class CHAT,TTS g;
    class WA wa;
```

**En una frase:** la clienta escribe (o manda audio) por Telegram, un servicio que vive prendido 24/7 en Google entiende el mensaje con la inteligencia de Gemini —siguiendo la personalidad y las reglas del salón—, y le contesta al instante en texto o en voz, derivando al WhatsApp cuando quiere reservar.
