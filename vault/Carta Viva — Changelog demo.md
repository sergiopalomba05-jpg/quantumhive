---
producto: Carta Viva
demo: https://quantumhive-qrcarta.hf.space
archivo: agencia/clientes/kansas/app.py
commit: 8ac7af9
actualizado: 2026-06-18
---

# Carta Viva — Changelog de la demo

> Lista de features para sumar a **la presentación**. Demo en vivo:
> **https://quantumhive-qrcarta.hf.space** (mismo QR de siempre — la URL no cambió).

## 🧭 Navegación y experiencia
- **"Atrás" por capas**: en el chat, el pedido o el cartel del mozo, "atrás" los cierra
  en vez de echar al comensal de la carta.
- En una **sección** del menú, "atrás" vuelve a la **principal**.
- En la principal, "atrás" abre un **cartel de salida** (Salir / Quedarme).
- **Botón "Detener"**: mientras la mesera habla, un toque corta la voz.
- **4 botones de acción rápida** alrededor del orbe (responden con voz):
  Especialidad · ¿Qué hay para picar? · Recomendame un vino · ¿Qué postre va bien?

## 🧾 Pedido (cierre del circuito)
- Chip **"Mesa: __"** + modal para tipear el número de mesa.
- Botón **"+"** en cada plato → carrito. En **vinos y espumantes**, "+" por **copa** y por
  **botella** por separado (cada variante suma su propia línea al pedido).
- Barra flotante **"Ver mi pedido (N) · $total"**.
- **Pantalla de pedido**: ítems con +/−, total estimado, campo de mesa y de WhatsApp.
- **"Realizar pedido"** → manda el pedido por WhatsApp (formato legible para cocina)
  + cartel "¡Listo! La mesera ya tomó tu pedido".
- **"Mostrar al mozo"** → cartel a pantalla completa con el pedido.
- **Carrito persistente** (localStorage): si se recarga la página, el pedido se restaura.
- **Despedida hablada** de la mesera al cerrar el pedido.

## ⭐ Valoración (reputación)
- Pantalla post-pedido con **3 notas**: la mesera virtual · el restaurante · QuantumHive.
- **CTA "Dejá tu reseña en Google"** (restaurante) y **"Seguí a QuantumHive"**:
  cableados y configurables, vacíos hasta conectar los links reales.
- Comentario/queja opcional.
- Guardado local + envío a `POST /feedback` (listo para Supabase a futuro).

## 🤖 La mesera guía y arma el pedido (lo nuevo)
- **Spotlight por voz (la carta es el escenario)**: sacamos el banner de texto. Mientras la
  mesera habla, la carta queda limpia y va **resaltando en dorado cada plato justo cuando
  lo nombra**, de a uno, al ritmo de su voz (cronometrado contra el audio de cada frase).
  Los platos nombrados **quedan resaltados** (se acumulan, no se apaga el anterior); solo
  el que está nombrando ahora "pulsa" y es seguido por el botón flotante.
  - Detección precisa por tokens contiguos (sin falsos positivos: si dice "Pizzeta de Pollo BBQ"
    no enciende también "Pollo BBQ").
  - Los **4 atajos** y el **orbe de voz** ya **no abren el chat**: la carta queda visible.
- **Botón "Agregar al pedido"**: el "+" de cada plato pasó a una pastilla **"Agregar"** (más
  clara). Y mientras el spotlight está sobre un plato, abajo aparece un botón grande
  **"Agregar al pedido · [plato]"** que sigue al spotlight.
- **Sugerencias contextuales**: al terminar de hablar, los 4 atajos se vuelven **sugerencias
  que propone la mesera** ("¿Y para tomar?", "Un postre rico"…) según lo que venías hablando.
- **Carga el pedido por voz/chat**: *"agregame una gaseosa"*, *"sacá la pizza"*, *"armame el
  pedido con lo que me recomendaste"*, *"borrá todo"* → la mesera **modifica el carrito de
  verdad** (con una línea técnica invisible; ella solo confirma hablando).
  - Resuelve el nombre contra la carta real ("coca"/"gaseosa" → "Gaseosa Línea Coca Cola").
  - **Vinos por voz**: si aclarás "la **botella** de Baron B" lo agrega; si no aclarás,
    **repregunta "¿copa o botella?"**.
- **Navegación por categoría**: si pedís "mostrame las **gaseosas**", la carta scrollea sola
  a esa sección (gaseosas→Bebidas, postres→Postres, etc.).

## ⚖️ Portada y descargo legal (blindaje)
- En la **portada** se agrandó el subtítulo: **"Te atiende un mozo virtual"**.
- **Descargo legal antes de entrar al chat** (la IA puede alucinar → riesgo de alergias):
  aclara que la mesera es una **guía informativa que puede equivocarse**, que ante
  **alergia/intolerancia/condición médica** hay que **confirmar con el personal** antes de pedir,
  y que la composición final del plato es responsabilidad del restaurante.
- **Recordatorio permanente** del mismo descargo dentro del chat (arriba de la charla).

## ✨ Detalles visuales (broche de oro)
- Burbujas del chat con entrada suave, barra del pedido con rebote, estrellas con "pop" al elegir.

## ⚙️ Backend
- Endpoint **`/feedback`** tolerante: persiste en Supabase si está configurado; si no, no rompe.
- Config `SUPABASE_*` por env vars del Space.

## ✅ Estado
- Todo en `agencia/clientes/kansas/app.py`.
- Verificado en navegador real (autoguiado, carrito por voz, pedido, valoración) — 0 errores.

---

## 🧱 Pendiente / roadmap (para la presentación-PWA y el molde)
- [ ] **Molde reutilizable**: separar el motor de la config (menú + marca + personalidad)
      para clonar la carta a otros rubros.
- [ ] **Cartas por rubro** con el mismo molde: bar · sushi · parrilla · cerveza artesanal.
- [ ] **Presentación de la carta QR** (`agencia/productos/carta-viva/carta-viva-definitiva.html`)
      que linkee y contenga todas las demos. _(Nota: "Cata Home" es OTRO proyecto, no mezclar.)_
