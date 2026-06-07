# PLAN DE CONSTRUCCIÓN ORDENADO — Directimport

> Compañero de `BRIEF_DIRECTIMPORT.md`. El **brief dice QUÉ** se construye; **este plan dice EN QUÉ ORDEN**, con el **gate** (criterio de aceptación) que habilita pasar a la etapa siguiente.
> Objetivo: que Claude Code construya **por etapas sobre una base completa**, sin armar todo junto (eso es el Frankenstein). Cada etapa se cierra con un gate ✓ y la aprobación de Sergio antes de avanzar.
> Las referencias §X apuntan a las secciones del brief.

---

## Reglas que valen en TODAS las etapas

- **`CLAUDE.md` + `BRIEF_DIRECTIMPORT.md` leídos enteros antes de tocar nada, en cada sesión.**
- **Un paso a la vez.** Si el anterior no está estable, no se avanza.
- **`git push` antes de dar una etapa por cerrada.** Si no está en GitHub, no existe.
- **Verificar URL/repo y que esté mantenido antes de integrar cualquier herramienta** (regla #6). No adoptar repos a ciegas; las librerías 3D (R3F/Drei/Zustand) se instalan por npm, no se forkean tiendas ajenas.
- **Nunca `--dangerously-skip-permissions`.**
- **Sergio aprueba cada etapa antes de avanzar / deployar.**
- **Keys solo en `.env` local + env de producción (HuggingFace/Railway/Vercel). Nunca al repo.** Al repo solo `.env.ejemplo`.
- **El modelo de datos nace COMPLETO en la Etapa 1** (multi-tenant + RLS, campos `padre_id`/`nivel`/`zona` nullable para Ultra, plantillas de atributos por rubro, `proveedor_id`, estado de stock, capas de precio). Así las etapas siguientes **enchufan, no reescriben**.
- **Pagos: el flujo se construye en SANDBOX.** El dinero real y la verificación fina de MP (recargo de tarjeta vs efectivo en Argentina, regla #6) van en la etapa de publicación. Que el pago no frene el resto.
- **En paralelo desde el día uno (trámite, no código):** iniciar el **D-U-N-S** + la **cuenta de organización de Google Play** (tardan días — §7).

---

## Etapa 0 — Cimientos

**Objetivo:** entorno limpio donde Claude Code tenga reglas, memoria y la base técnica en blanco.

**Qué se construye/configura:**
- Repo con `CLAUDE.md` + `BRIEF_DIRECTIMPORT.md` + este plan adentro.
- Proyecto **Supabase** (base de datos, Auth, Storage). `.env` local + `.env.ejemplo`, `.gitignore`.
- Esqueleto **Next.js sobre Vercel** para el panel admin (web).
- Scaffold **Capacitor** web-first para la app (que después se prueba como PWA y se envuelve para las tiendas).
- Disciplina de keys verificada.

**🚦 GATE 0:** el repo corre y hace su primer commit; Claude Code arranca leyendo `CLAUDE.md` + el brief; Supabase conectado; la app (web/PWA) y el panel admin levantan en blanco. **Trámite D-U-N-S + cuenta de organización de Play iniciados en paralelo.**

---

## Etapa 1 — Núcleo data-driven + panel admin (catálogo) · `[BUILD v1]`

**Objetivo:** el catálogo maestro y el panel desde donde Sergio lo maneja, con el **modelo de datos completo desde ya**. (§3.1, §3.4, §4)

**Qué se construye:**
- **Modelo de datos completo** (§4): rubros + sub-filtros, **plantillas de atributos por rubro**, productos (con `rubro`, `proveedor_id`, precio base, atributos, fotos/video, **estado de stock**, métrica configurable), tabla `proveedores`, capas de precio, planes/permisos, scoring, pedidos, suscripciones, memoria del agente, demanda no satisfecha. Campos **`padre_id`/`nivel`/`zona` nullable** ya presentes (Ultra dormido).
- **Permisos multi-tenant con Supabase RLS** desde el arranque — el corazón del sistema; diseñar con cuidado (§7).
- **Panel admin web (rol admin):** ABM de productos, rubros, sub-filtros, precios base, fotos/videos (pipeline **Photoroom**), métrica por rubro, tiras de virales/ofertas. Cabina de logística con `proveedor_id` y contacto del proveedor (§3.4).
- **Catálogo con navegación de 2 niveles** (Nivel 1 rubros + tiras; Nivel 2 sub-filtros del rubro) (§3.1).
- **Identidad visual / design system establecido acá** (paleta negro/azul-casi-gris/dorado, panales — §8), usando la disciplina de la skill `frontend-design`, para que toda la UI nazca pro y coherente.

**🚦 GATE 1:** Sergio (admin) carga un producto con foto procesada, rubro, sub-filtro, atributos, precio base, `proveedor_id` y estado de stock; el catálogo lo muestra con la navegación de 2 niveles y la métrica del rubro; **RLS base probada** (un rol no ve lo que no le corresponde).

---

## Etapa 2 — App + registro/login + tienda del revendedor (capa de precios) + link · `[BUILD v1]`

**Objetivo:** que un revendedor arme su tienda y que un comprador entre por su link y vea solo esa tienda. (§2, §3.2, §3.5)

**Qué se construye:**
- **Registro/login** con id/email + contraseña (Supabase Auth; OTP por teléfono opcional). Roles admin/revendedor/comprador (§3.5).
- **Tienda/vidriera del revendedor:** capa de precios propia sobre el catálogo maestro; **link/código único** (§3.2).
- **Binding por link:** el comprador entra por el link → queda atado a ese revendedor → ve **solo** esa tienda. **Dos links = dos tiendas separadas, no se mezclan** (§3.2).
- **RLS reforzada y probada fuerte:** ningún revendedor ve datos de otro; ningún comprador ve precios de otra tienda (§7).

**🚦 GATE 2:** un revendedor se registra, arma su tienda con sus precios y obtiene su link; un comprador entra por el link y ve solo esa tienda; con dos links se ven dos tiendas separadas; **RLS probada sin fugas entre revendedores**.

---

## Etapa 3 — Pedido de punta a punta + pago (sandbox) · `[BUILD v1]` → cierra la REBANADA FINA

**Objetivo:** completar el círculo (§5) de extremo a extremo. **Esta etapa entrega la primera app funcional real.**

**Qué se construye:**
- **Carrito y creación de orden** con estado de pago; cada renglón arrastra su `proveedor_id` (§4, §5).
- **Una sola función de pago en SANDBOX** (tarjeta / Mercado Pago / efectivo), la **misma** para el revendedor que compra y para el cliente que compra en la tienda; **toda la caja a una sola cuenta** (§3.6, §6.2). El ruteo automático por revendedor queda diferido (§9).
- **Cabina de logística:** el panel parte la orden por proveedor con su contacto; refleja que **la logística la maneja Álvaro** (paso de despacho) (§3.4, §5).
- **"Mis pedidos"** con estado y "repetir pedido" (§3.1).

**🚦 GATE 3 (= rebanada fina funcionando):** comprador arma carrito → paga en sandbox con medios AR → se crea la orden con estado de pago → el panel la parte por proveedor con contacto → el estado avanza a enviado → el revendedor lo ve en "Mis pedidos". **Spine de punta a punta andando.**

---

## Etapa 4 — Suscripción + trial 7 días + código de referido · `[BUILD v1]`

**Objetivo:** monetizar el acceso del revendedor y escalarlo automático. (§3.7, §3.8, §6.3)

**Qué se construye:**
- **Planes como flags de permiso:** Básico (solo comprar) · Pro (vende, edita precios) · Pro Plus (white-label) · **Ultra definido pero bloqueado**. (§6.3)
- **Suscripción recurrente** (Mercado Pago, sandbox) (§3.6).
- **Trial en cascada:** cada nivel da 7 días del siguiente (Básico→Pro, Pro→Pro Plus). **Ultra no entra en el trial** (§6.3).
- **Código de referido:** llave del trial + ata el revendedor a Álvaro o a Sergio (50/50) (§3.8).
- **Suspensión sin borrado:** al no pagar, no entra, pero la tienda queda y se recupera al reactivar (§3.8).

**🚦 GATE 4:** un revendedor entra con código de referido → 7 días free → cobro recurrente (sandbox) → al no pagar se suspende sin borrar la tienda → al reactivar la recupera; los planes funcionan como flags de permiso.

---

## Etapa 5 — Personalización + white-label + Agente de Stock · `[BUILD v1]`

**Objetivo:** identidad de la tienda del revendedor y catálogo siempre disponible. (§3.1, §3.2)

**Qué se construye:**
- **Personalización (Pro):** colores, logo y nombre del negocio (scope chico) (§3.2).
- **White-label (Pro Plus):** se saca la marca "powered by Directimport" (§3.2, §6.3).
- **Agente de Stock:** oculta/anula del catálogo los productos sin stock y los rehabilita cuando vuelven (§3.1).
- **Métrica configurable por rubro** terminada (§3.1).

**🚦 GATE 5:** un Pro personaliza colores/logo/nombre; un Pro Plus aparece sin marca de Directimport; el Agente de Stock oculta lo sin stock y lo rehabilita al reponer.

---

## Etapa 6 — Timón (agente de chat de la app) · `[BUILD v1]`

**Objetivo:** el asistente que atiende, recomienda y captura demanda. (§3.3)

**Qué se construye:**
- **Texto + audio (entra y sale) + foto (visión → atributos → match en el catálogo).** (§3.3)
- **Flujo "no lo tengo":** registra el pedido, avisa a Sergio con la foto, responde al usuario y recomienda algo parecido que sí haya → **data de demanda** (§3.3).
- **Escáner por cámara** = misma entrada de imagen al motor de visión (NO "Lens en vivo" — §9).
- **Memoria por usuario** atada a su ID (§3.3).
- **Orbe tipo Jarvis** en audio (front-end) (§3.3, §8).
- Timón responde sobre catálogo/conocimiento, **no inventa** (§3.3).

**🚦 GATE 6:** Timón responde por texto, audio y foto; busca por atributos; el flujo "no lo tengo" registra demanda y avisa a Sergio; el escáner por cámara funciona; hay memoria por usuario; el orbe late en audio.

---

## Etapa 7 — Legal (Agente Legal + clickwrap + pestaña T&C) · `[BUILD v1]`

**Objetivo:** cubrir lo legal de cara al usuario antes del lanzamiento. (§3.10, §6.6)

**Qué se construye:**
- **Agente Legal** (componente reusable, build-time): genera T&C, Privacidad, Acuerdo de Suscripción y Devoluciones, fundados en leyes argentinas, con jurisdicción como parámetro (§3.10).
- **Clickwrap** antes de pagar la suscripción (§3.10).
- **Pestaña de T&C** que muestra el texto (§3.10).
- **Timón responde dudas legales** con los T&C como conocimiento, derivando lo que no esté escrito (§3.10).

**🚦 GATE 7:** documentos generados; clickwrap antes de pagar; pestaña de T&C visible; Timón responde dudas legales desde el texto. *(El contrato de sociedad con Álvaro y la cláusula de propiedad del software quedan para revisión humana — fuera del software, §6.6.)*

---

## Etapa 8 — Capa visual / 3D + pulido final · `[BUILD v1]` (prioridad alta)

**Objetivo:** el impacto visual que marca la diferencia (la lógica ya está; lo visual diferencia). (§8)

**Qué se construye:**
- **3D liviano:** fondo / íconos con profundidad / elemento hero animado (R3F + Drei), **solo en el hero, con lazy-load** (§8).
- **Animaciones del mockup:** barras, filtros que reaccionan, chat (§3.1, §8).
- **Pipeline de fotos de estudio (Photoroom)** afinado (§8).
- Paleta y panales pulidos sobre el design system de la Etapa 1 (§8).

**🚦 GATE 8:** la app aplica la paleta y los panales; el 3D del hero corre con lazy-load sin hacer lenta la pantalla; las fotos de estudio y las animaciones están; **"se ve pro, no genérica"**.

---

## Etapa 9 — v1 completa: hardening + prueba interna · `[BUILD v1]`

**Objetivo:** juntar todo y pasar el checklist de "Terminado" del brief (§10) con la **compra simulada Sergio + Álvaro**.

**Qué se construye/verifica:**
- Recorrer y tildar el **checklist de la §10** completo.
- **RLS hardening + testeo fuerte** (sin fuga de datos entre revendedores ni precios entre tiendas) (§7, §10).
- Tests en sandbox de PagoKit en verde + checklist de producción a mano (§3.6, §10).

**🚦 GATE 9 (= v1 lista para probar):** la **§10 entera en ✓**; compra simulada de punta a punta con Sergio + Álvaro funcionando.

---

## Etapa 10 — Publicación: PWA → Android → iOS · `[BUILD v1]`

**Objetivo:** salir a producción y a las tiendas. (§7)

**Qué se construye/configura:**
- **PWA en producción primero** (validar con gente real, sin trámites) (§7).
- **Build Android** con Capacitor → **Play Store** (cuenta de organización; D-U-N-S ya tramitado; USD 25) (§7).
- **iOS vía Codemagic** (compilación/firma en la nube, sin usar el Mac 2015) → **App Store** (USD 99/año) (§7).
- **Go-live de pagos reales:** pasar de sandbox a producción y **verificar contra la doc de MP el recargo de tarjeta vs efectivo en Argentina** (regla #6) (§3.6, §6.2, §7).

**🚦 GATE 10:** PWA en producción; app publicada en Play Store; iOS en App Store vía Codemagic; pagos reales con MP verificados y andando.

---

## Lo que NO se construye (queda diseñado y dormido — `[MODELADO]`, §9)

Ya contemplado en el modelo de datos (feature flags + campos nullable desde la Etapa 1); se prende más adelante sin reescribir:

- **Maquinaria de Ultra** (panel de distribuidor, gestión de cartera, margen/comisión por nivel, `zona`).
- **Capa marketplace tipo Mercado Libre** (mayoristas con cuenta/panel/upload/despacho, stock sync, ruteo, split 1:N, OAuth por mayorista, reputación, disputas) y la **suscripción para mayoristas**.
- **Ruteo automático de pagos a la cuenta de cada revendedor** (Split/OAuth de MP) y la **cuenta bancaria/reparto fino** (se ve sobre la marcha).
- **Escáner "Lens en vivo"** (tiempo real + vectorización del catálogo).
- **Importación directa (Alan)** y el segundo frente de proveedores.
- **Otras apps/verticales** de QuantumHive sobre el mismo motor.

---

## Resumen de la secuencia

```
Etapa 0  Cimientos
Etapa 1  Núcleo data-driven + panel admin (catálogo)        ┐
Etapa 2  App + login + tienda del revendedor + link          │ REBANADA FINA
Etapa 3  Pedido de punta a punta + pago (sandbox)            ┘ (primera app funcional)
Etapa 4  Suscripción + trial 7 días + código de referido
Etapa 5  Personalización + white-label + Agente de Stock
Etapa 6  Timón (texto/audio/foto, memoria, escáner, orbe)
Etapa 7  Legal (Agente Legal + clickwrap + T&C)
Etapa 8  Capa visual / 3D + pulido
Etapa 9  v1 completa: hardening + prueba interna (§10)
Etapa 10 Publicación: PWA → Android → iOS
         + (dormido: Ultra, marketplace, ruteo por revendedor, Lens, importación)
```
