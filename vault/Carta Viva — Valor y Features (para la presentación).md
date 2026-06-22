# Carta Viva — Valor y Features (material para la presentación)

> Resumen del valor REAL que aporta la mesera hoy, para actualizar el pitch. La app creció mucho:
> esto es lo que de verdad se vende. (Lo marcado *(próximamente)* es roadmap, no prometer como actual.)

---

## El problema que resuelve
- Cartas estáticas (PDF/QR) que no venden ni asesoran.
- Mozos saturados: el cliente espera para preguntar, dudar o pedir.
- **Upselling perdido:** nadie sugiere la bebida, la entrada o el postre en el momento justo.
- El restaurante no tiene **datos** de qué mira, qué pide y qué duda el cliente.

## La solución
**Carta QR con una mesera virtual por voz** que atiende, asesora, recomienda y arma el pedido —
hablando, como una mesera real, desde el celular del cliente. Escanea el QR de la mesa y listo.

## Qué hace la mesera (hoy, real)
- **Atiende por voz** (natural, en español rioplatense) y también por texto y por botones.
- **Recomienda y vende** de a un paso: entrada → plato → bebida → postre → cierre, guiando sin abrumar.
- **Arma el pedido sola**: "sumá dos empanadas y una gaseosa" → lo carga; resalta cada plato en la carta
  mientras habla (auto-guiado visual).
- **Flujo guiado por botones**: el cliente avanza tocando, sin tener que escribir — intuitivo y rápido.
- **No se equivoca con el pedido**: no duplica, no recomienda lo que ya pediste, no inventa platos
  fuera de la carta.
- **Cierra el pedido** y lo manda al mozo (interno) o lo muestra en pantalla; se despide.
- **Mesa automática por QR** (un QR por mesa) — el cliente no escribe el número.
- **Valoración al final** + invitación a dejar **reseña en Google**.
- **Responsive**: pensada para el celular, en cualquier tamaño de pantalla.
- **Tono adaptable** a cada local (parrilla casera, cervecería joven, sushi formal).

## Por qué le conviene al restaurante (beneficios)
- **Sube el ticket promedio**: upselling inteligente y constante (siempre ofrece el siguiente paso).
- **Descarga a los mozos**: resuelve dudas y arma pedidos sin ocupar personal.
- **Más reseñas en Google** = mejor reputación y posicionamiento.
- **Datos reales** (Premium): qué tocan, qué piden, dónde se cortan, cuántos vuelven.
- **Experiencia diferencial**: el cliente se acuerda del lugar "donde te atiende una IA por voz".
- **Costo operativo casi nulo**: el caché hace que el flujo guiado (la mayoría del uso) cueste **$0**.

## Planes
| | **Básico** | **Premium** |
|---|---|---|
| Mesera conversacional por voz | ✅ | ✅ |
| Arma el pedido + auto-guiado | ✅ | ✅ |
| Reseñas en Google | ✅ | ✅ |
| **Memoria** (te reconoce al volver) | — | ✅ |
| **Métricas + panel** del restaurante | — | ✅ *(panel: próximamente)* |
| **Voz premium** (ElevenLabs) | — | *(próximamente)* |
| **Autoguiado dirigido** (empujar platos de margen) | — | *(próximamente)* |

## Diferenciadores técnicos (lo que lo hace barato y escalable)
- **Caché híbrido**: las respuestas y la voz de los botones se guardan → la 2ª vez salen **$0** e
  instantáneas. La carta se "paga sola" en velocidad y costo a medida que se usa.
- **Variantes rotativas**: no repite siempre la misma recomendación (variedad sin gastar de más).
- **Aislado y multi-inquilino**: 50 clientes a la vez, varios restaurantes, sin cruzarse.
- **Replicable**: una carta nueva = editar un bloque + el menú. Listo para escalar a muchos locales.

## Lo que viene (roadmap, para mostrar visión)
- Voz premium ElevenLabs, panel de métricas para el dueño, autoguiado dirigido a conveniencia del
  local, reseñas Google directas por cliente Premium, memoria de gustos/preferencias.

---
*Detalle técnico completo en `Carta Viva — Arquitectura y Replicación.md`.*
