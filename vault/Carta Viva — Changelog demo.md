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
- Botón **"+"** en cada plato → carrito.
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

## ⚙️ Backend
- Endpoint **`/feedback`** tolerante: persiste en Supabase si está configurado; si no, no rompe.
- Config `SUPABASE_*` por env vars del Space.

## ✅ Estado
- Todo en `agencia/clientes/kansas/app.py`, commit `8ac7af9`, pusheado a GitHub.
- Verificado en navegador real (carrito, pedido, WhatsApp, valoración) — 0 errores.

---

## 🧱 Pendiente / roadmap (para la presentación-PWA y el molde)
- [ ] **Molde reutilizable**: separar el motor de la config (menú + marca + personalidad)
      para clonar la carta a otros rubros.
- [ ] **Cartas por rubro** con el mismo molde: bar · sushi · parrilla · cerveza artesanal.
- [ ] **Presentación de la carta QR** (`agencia/productos/carta-viva/carta-viva-definitiva.html`)
      que linkee y contenga todas las demos. _(Nota: "Cata Home" es OTRO proyecto, no mezclar.)_
