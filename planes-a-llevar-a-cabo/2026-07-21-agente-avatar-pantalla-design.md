# Agente General de Pantalla con Avatar (Screen Copilot Agent) — Documento de Diseño

> Fecha: 2026-07-21  
> Estado: Borrador / Brainstorming  
> Autor: Antigravity  
> Relacionado con: [[2026-07-08-motor-avatares-design]], [[2026-07-08-motor-voz]]

---

## 1. Visión General

El **Agente General de Pantalla** es un avatar interactivo en segundo plano que "flota" sobre el sistema operativo o aplicaciones específicas. Puede "ver" lo que el usuario tiene en pantalla, "escuchar" instrucciones de voz en tiempo real y "actuar" simulando interacciones humanas (clicks, scroll, escribir texto) en aplicaciones cotidianas como Google Maps, WhatsApp, navegadores, etc.

### Casos de Uso Clave:
1. **Google Maps:** El usuario activa el avatar y dice *"Buscame restaurantes de sushi cerca"*. El agente toma control de la app, escribe la búsqueda, filtra y le muestra opciones al usuario de viva voz.
2. **WhatsApp:** El usuario dice *"Contestale a Juan que llego en 10 minutos"*. El agente abre el chat correspondiente, escribe el mensaje y presiona enviar.
3. **Productividad/Navegación:** *"Leeme esta noticia"* o *"Comprame este pasaje con mis datos predeterminados"*.

---

## 2. Arquitectura de 3 Capas

Para que este agente funcione, requiere tres subsistemas principales:

```
┌────────────────────────────────────────────────────────┐
│                   CAPA DE INTERFAZ                     │
│      Avatar flotante (Overlay) - WebRTC/WebSocket      │
│      (Streaming de video/audio de LivePortrait)        │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    CAPA COGNITIVA                      │
│      Gemini Live API (Conversación y Voz Nativa)       │
│                           +                            │
│    Orquestador de Agentes (Llamadas a Herramientas)    │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    CAPA DE ACCIÓN                      │
│      Lectura de Pantalla + Simulación de Clicks        │
│    (Accessibility APIs / Computer Vision / DOM API)    │
└────────────────────────────────────────────────────────┘
```

### A. Capa de Interfaz (El Avatar)
*   **Representación Visual:** Un widget flotante animado (burbuja o personaje semi-transparente).
*   **Motor de Render:** Reutiliza el pipeline de **LivePortrait** + **F5-TTS** (Motor de Voz/Avatares existente) montado en la VM GPU.
*   **Transmisión:** Audio y video interactivo en tiempo real mediante WebSockets o WebRTC directo al overlay.

### B. Capa Cognitiva (El Cerebro)
*   **Motor Principal:** Gemini Live API (`gemini-2.5-flash-native-audio` o superior).
*   **Input:** Entrada de voz directa del usuario que se procesa con latencia ultra-baja.
*   **Planificación (Function Calling):** Gemini decide cuándo ejecutar acciones en la pantalla a través de herramientas (tools). Por ejemplo: `click_element(label)`, `scroll(direction)`, `type_text(text)`.

### C. Capa de Acción (Las Manos)
Es la capa más desafiante. Hay tres formas principales de implementarla según la plataforma elegida:

1.  **Vía Accessibility APIs (Estructurado - Altamente Recomendado para Móvil):**
    *   Usa los servicios de accesibilidad nativos del sistema operativo (Android Accessibility Service, macOS/Windows UI Automation).
    *   **Ventajas:** Permite leer la estructura exacta de la pantalla (árbol XML de nodos), hacer click por ID o texto de manera precisa y segura, e inyectar texto sin simular teclado físico.
2.  **Vía Visión por Computadora (Computer Use / Píxeles):**
    *   Toma capturas de pantalla periódicas, usa un VLM (Vision-Language Model como Gemini 2.0/3.5 o Claude 3.5 Sonnet) para calcular las coordenadas (X, Y) y simula clicks físicos mediante el OS.
    *   **Ventajas:** Funciona en absolutamente cualquier aplicación (incluso juegos o apps sin etiquetas de accesibilidad).
    *   **Desventajas:** Consumo alto de tokens, mayor latencia y propensión a fallos en interfaces muy dinámicas.
3.  **Vía DOM / Inyección (Web-Only):**
    *   Si se implementa como una Extensión de Chrome.
    *   **Ventajas:** Acceso directo al DOM de páginas web (WhatsApp Web, Google Maps Web). Súper rápido, económico y 100% fiable dentro del navegador.

---

## 3. Comparativa de Plataformas de Desarrollo

| Dimensión | Opción A: Extensión de Chrome (Web) | Opción B: Android App (Móvil) | Opción C: Desktop App (Win/Mac) |
| :--- | :--- | :--- | :--- |
| **Dificultad de Desarrollo** | Baja (JavaScript, CSS, DOM API) | Alta (Java/Kotlin, Servicios de Android) | Media-Alta (Tauri/Electron + Python OS simulation) |
| **Control de Apps** | Limitado al navegador (WhatsApp Web, Maps) | Completo en el teléfono (Apps nativas) | Completo en el escritorio (Apps nativas + Web) |
| **Privacidad / Permisos** | Permisos estándar de extensión | Permisos críticos de accesibilidad y overlay | Acceso total al OS (requiere instalación manual) |
| **Viabilidad del Avatar** | Muy simple (Inyección de iframe con video) | Compleja (Floating Window / Android Overlay Service) | Simple (Ventana Tauri con transparencia nativa) |
| **MVP Recomendado** | **Fase 1 (Validación Rápida)** | **Fase 2 (Target Principal)** | **Fase 3 (Power Users)** |

---

## 4. Plan de Implementación de un MVP (Chrome Extension)

Para validar la idea en **1 o 2 semanas** sin lidiar con las complejidades de compilación nativa en Android o permisos restrictivos en iOS, el camino más rápido es una **Extensión de Chrome** que interactúe con WhatsApp Web y Google Maps Web:

### Arquitectura del MVP
1.  **Frontend (UI del Avatar):**
    *   Una extensión de Chrome que inyecta un avatar flotante con CSS de lujo (cristal esmerilado, micro-animaciones en hover).
    *   Usa el micrófono del navegador para capturar la voz del usuario.
2.  **Orquestador (Background Service Worker):**
    *   Mantiene la conexión WebSocket con el backend de Gemini Live API y tu VM de Avatares.
    *   Cuando el usuario da una orden, el Service Worker analiza el contexto de la pestaña activa (si la URL contiene `web.whatsapp.com` o `google.com/maps`).
3.  **Content Script (La Capa de Acción):**
    *   Inyecta código en la página para interactuar con los elementos.
    *   *Ejemplo de WhatsApp Web:* Busca el selector `[contenteditable="true"]` del input de chat, escribe el texto y hace click en el botón de enviar.
    *   *Ejemplo de Google Maps:* Escribe en el buscador de Maps y lee los resultados del DOM para decírselos de vuelta al usuario a través del avatar.

---

## 5. Próximos Pasos & Preguntas de Diseño

Para aterrizar esta propuesta, necesitamos definir:
1.  **¿Cuál es tu plataforma objetivo inicial?** ¿Prefieres empezar con una **Extensión de Chrome** para validar rápido el comportamiento en web (WhatsApp Web, Google Maps Web) o querés ir directo a una **App de Android nativa** (con floating widget y Accessibility Service)?
2.  **¿Cómo se integrará con el "Motor de Avatares" actual?** ¿Querés que el avatar sea fotorrealista (LivePortrait animando una foto fija) o preferís un avatar 3D/ilustrado más liviano para evitar sobrecargar la GPU en fases iniciales?
3.  **Modo de Activación:** ¿Debería activarse por comando de voz (*"Hey Avatar"*), mediante un botón flotante persistente en pantalla, o un atajo de teclado?
