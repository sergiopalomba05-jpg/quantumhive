# BRIEF MAESTRO — Directimport

> Documento de arquitectura para QuantumHive. Plan de acción para el equipo de construcción (Claude Code).
> **Fuente única:** 3 conversaciones de planificación. Trazabilidad citada en cada punto como (archivo 1), (archivo 2), (archivo 3).
> **archivo 1** = primera conversación de planificación (llegó dividida en dos partes; aquí se cita como un solo archivo).
> **archivo 2** = `planifiacion_directimport_2.txt`.
> **archivo 3** = `planificacion_directimport_3.txt`.
> **Leyenda de fase:** `[BUILD v1]` = se construye y prueba en la primera versión · `[MODELADO]` = queda contemplado en el modelo de datos / arquitectura pero dormido (no se construye en v1).
> Este documento NO contiene código. Es planificación.

---

## 1. Norte / Visión

Directimport es una **app/marketplace mayorista B2B multi-tenant para Argentina**: un solo software (un motor con un solo backend) sobre el que Sergio carga y cura un catálogo de productos por rubros y desde el que cada revendedor monta su propia tienda con sus precios y su marca para venderle a sus compradores. Es el **primer frente ("primera piel") de la plataforma estructural multiagéntica QuantumHive**: directimport es un cliente del software, pero Sergio sigue siendo el dueño del software, que mañana se reviste con otra piel para otros verticales (apps de servicios, tipo Shopify, tipo Mercado Libre) sin reescribirse (archivo 1; archivo 2; archivo 3). El producto no compite por precio sino por **facilidad**: le da al revendedor catálogo + proveedor + pago + confianza + tienda llave en mano en un solo lugar, resolviéndole el problema de tener que buscar y negociar con varios proveedores (archivo 1).

---

## 2. Actores y roles

Glosario fijado de forma explícita para que no se mezclen los términos (archivo 1, archivo 2). "Mayorista" = proveedor; **nunca** se usa "mayorista" para referirse al socio.

- **Sergio — dueño del software y de la plataforma; cabeza del equipo.** Pone la tecnología y el marketing. Es **admin**: carga y cura el catálogo (research de producto + precio), arma las publicaciones (foto profesional, video, descripción) y las sube él; controla rubros, sub-filtros, productos, precios, fotos/videos, tiras de virales/ofertas, textos, personalidad de Timón y beneficios de cada nivel (archivo 1, archivo 2, archivo 3).
- **Álvaro — socio.** Pone capital (incluida la publicidad), conoce la movida y trae su red de revendedores. Es el **nexo con los revendedores** y maneja la **logística** (compra al proveedor y hace enviar, como ya hace hoy; cómo arregla la plata con sus proveedores es interno suyo). **Es proveedor de La Salada**, así que sus clientes actuales (revendedores del interior) son la primera camada de usuarios. Reparto **50/50** con Sergio en todo (archivo 2, archivo 3).
- **Alan — hermano de Álvaro, licenciado en comercio exterior, con contactos políticos/aduana.** Es el **nexo con la importación** (upstream). Abre la fase de importación directa, que es la precondición del nivel Ultra y del segundo frente tipo Mercado Libre. **No entra en el lanzamiento**: se incorpora acotado a la importación cuando esa capa se active, idealmente como operación de suministro aparte que alimenta el catálogo (archivo 3).
- **Mayoristas (= proveedores).** A quienes Sergio les compra el producto; son varios y distintos. En v1 **NO participan en la app** (no tienen cuenta ni panel): son solo la fuente del producto; Sergio cura y sube todo. Quedan registrados internamente para la logística (ver `proveedor_id`). Que los proveedores tengan cuenta propia y suban/despachen ellos = la app futura tipo Mercado Libre, diferida (archivo 1, archivo 2, archivo 3).
- **Revendedores.** Usan la plataforma con su suscripción para (a) comprar directo del catálogo y (b) armar su propia tienda/vidriera con su precio y su marca para venderle a sus compradores. Cada uno queda atado a Álvaro o a Sergio mediante su código de referido (para el 50/50) (archivo 1, archivo 2, archivo 3).
- **Compradores finales.** El cliente del revendedor. Entra a la tienda de un revendedor por el link de ese revendedor, ve solo los precios de ese revendedor, y compra (archivo 1, archivo 3).

**Los tres niveles de permiso (una sola app, no apps separadas) (archivo 1):**
- **Admin (Sergio):** control total. Agrega/edita/borra productos, rubros, sub-filtros, precio base, todo. No es una app aparte ni un "modo desarrollador" que se prende: es el rol admin de su cuenta; al entrar con su cuenta se le abre el panel de gestión que revendedores y compradores no ven. Ese panel conviene que sea **web, en la compu** (cargar catálogo/precios/fotos es más cómodo en pantalla grande) (archivo 1, archivo 3).
- **Revendedor:** ve la misma app; **solo puede tocar los precios** (y, según el plan, la personalización de marca). Arma su tienda con sus precios sobre el catálogo que cargó Sergio. No agrega ni borra productos ni pestañas (archivo 1).
- **Comprador final:** vista estática. No cambia nada. Entra a la tienda de su revendedor por el link y compra a los precios que ese revendedor puso (archivo 1).

---

## 3. Inventario completo de features

### 3.1 Catálogo y navegación
- **Catálogo vivo:** grilla de productos + filtros que reordenan la grilla + tira de tendencias/virales + modelo/producto destacado + infografías de propiedades (barras animadas) + agente conversacional. El "movimiento" base = barras, filtros que reaccionan y chat (no requiere herramientas de animación externas para eso). `[BUILD v1]` (archivo 1).
- **Navegación en dos niveles** para no sobrecargar la pantalla `[BUILD v1]` (archivo 3):
  - **Nivel 1 — Rubros/Categorías (nichos):** Zapatillas, Ropa, Tecnología, Bicicletas y motos, y los que se sumen. Viven en el inicio como una sección de Categorías (fila o grilla) + las tiras curadas (Tendencias / Virales / Lo más vendido). Sumar un rubro = sumar una tarjeta.
  - **Nivel 2 — Sub-filtros dentro de un rubro:** al entrar a un rubro aparecen sus pestañas propias (Zapatillas: Todo, Mujer, Varón, Urbanas, Niños, Running, Clásicas; Ropa: Camperas, Remeras, Pantalones; etc.). Cada rubro tiene sus propios sub-filtros. Sumar un sub-filtro = sumar una pestaña.
- **Barra de navegación inferior de la app:** Catálogo · Ofertas · Mis pedidos · Perfil. `[BUILD v1]` (archivo 1, reafirmado en archivo 3).
  - **Ofertas:** promos, productos hot/de mayor demanda y las ofertas del nivel del revendedor (scoring) (archivo 3).
  - **Mis pedidos:** últimos pedidos con estado y "repetir pedido" (archivo 1).
  - **Perfil / dashboard del revendedor:** sus métricas (archivo 1).
- **Tira de virales:** en el inicio; puede ser automática (sale de las ventas) o curada por Sergio. `[BUILD v1]` (archivo 3).
- **Métrica/atributo configurable por rubro** (la barra que en el prototipo dice "Comodidad"): es un atributo configurable y conviene que cambie por rubro (zapatillas: comodidad / índice de reventa; tech: potencia / garantía; ropa: calidad / temporada). Sergio define qué métrica muestra cada rubro. `[BUILD v1]` (archivo 3).
- **Atributos de producto flexibles** (plantillas por rubro): una remera tiene talle/color; una moto tiene año/cilindrada/financiación. El producto nace con campos genéricos / plantillas de atributos por rubro, para que un rubro con propiedades distintas entre como contenido, no como cirugía. `[BUILD v1]` (modelado para escalar) (archivo 2).
- **Estado de stock + Agente de Stock:** cada producto tiene estado de stock; los productos sin stock se **anulan/ocultan automáticamente del catálogo** hasta reponerse, y se rehabilitan cuando vuelve el stock. Lo mantiene un **Agente de Stock** que controla la disponibilidad. El catálogo se renueva y abastece constantemente (Sergio saca lo que no está y sube lo nuevo). `[BUILD v1]` (instrucción de Sergio).

### 3.2 Tiendas de los revendedores (multi-tenant)
- **Tienda/vidriera por revendedor:** cada revendedor (Pro/Pro Plus) arma su tienda con su precio sobre el catálogo maestro. No es una copia aparte: es la misma app/motor con permisos distintos y una capa de precios propia encima. Cuando Sergio suma un producto o pestaña, aparece automáticamente en la tienda de todos los revendedores; cada uno solo decide su precio. `[BUILD v1]` (archivo 1).
- **Link/código único por revendedor:** cada revendedor obtiene un link único (lo pone en su bio de IG, lo manda por WhatsApp). El comprador entra por ESE link y la app lo ata a ese revendedor; a partir de ahí el comprador ve SOLO la tienda de ese revendedor (sus precios, su marca); los precios de los demás no los ve nunca. El link hace la unión, sin que el revendedor tenga que fabricar usuarios a mano. **Si un comprador tiene los links de dos revendedores, ve dos tiendas-ventana distintas y separadas (una por link); no se mezclan.** `[BUILD v1]` (archivo 3; aclaración de Sergio).
- **Personalización de la tienda del revendedor (scope chico):** colores, logo y nombre del negocio. Nada más, para no meterle complejidad al código. `[BUILD v1]` (archivo 1).
- **Marca "powered by Directimport":** marca discreta presente en el plan Básico/Pro; se saca en el plan Pro Plus (white-label). `[BUILD v1]` (archivo 1, archivo 3).

### 3.3 Timón (agente de chat que vive en la app)
- **Nombre del agente: Timón** (archivo 3).
- **Modalidades: texto + audio (entra y sale) + foto (visión).** `[BUILD v1]` (archivo 3):
  - **Texto:** responde consultas y recomienda productos sobre la lista real de stock (archivo 1, archivo 3).
  - **Audio:** el usuario manda un audio, se transcribe, Timón responde; puede contestar también en audio. Es un paso del pipeline del bot, no pesa la arquitectura (archivo 3).
  - **Foto:** el usuario sube la foto de un producto; Timón "la ve", identifica de qué se trata (ej. "campera de jean oversize azul") y busca en el catálogo por esos atributos. Si hay match, lo muestra; si no, ejecuta el flujo de "no lo tengo" (abajo) (archivo 3).
- **Flujo "no lo tengo":** si la foto/búsqueda no matchea, Timón registra el pedido, le avisa a Sergio con la foto, y le dice al usuario algo como "esto no lo tenemos, pero nuestro equipo de soporte se contacta si lo conseguimos"; puede recomendar algo parecido que sí haya. **Cada foto sin match es data de demanda** (qué conviene conseguir o importar). `[BUILD v1]` (archivo 3).
- **Escáner / cámara — versión práctica:** abre la cámara, captura, y va al mismo motor de visión que la foto subida (identifica, busca en el catálogo, y si no está, mismo flujo de "no lo tengo" o recomienda algo parecido). Casi sin peso extra: la cámara es solo otra forma de entrar la imagen. `[BUILD v1]` (archivo 3).
- **Memoria por usuario:** se guarda el contexto de cada usuario (qué pidió, preferencias, su nivel, historial) en la base atado a su ID, y se carga en el prompt cada vez. Se configura en el system del bot. Definir qué conviene recordar para que sea útil. `[BUILD v1]` (archivo 3).
- **Regla de no-invención:** Timón responde sobre el catálogo/conocimiento, no inventa (mismo principio que el bot del salón) (archivo 3).
- **Orbe tipo Jarvis:** un orbe/onda que late mientras se graba audio o mientras Timón "habla". Es animación del cliente (front-end), no backend; impacto visual barato. `[BUILD v1]` (archivo 3).

### 3.4 Panel de administración (de Sergio)
- **Panel de gestión web (rol admin), no una app aparte.** Desde él Sergio maneja, en vivo y sin tocar código: rubros, sub-filtros, productos, precios, fotos/videos, tiras de virales/ofertas, textos, personalidad de Timón, beneficios de cada nivel, y la métrica configurable por rubro. `[BUILD v1]` (archivo 1, archivo 3).
- **Cabina de logística (vista por proveedor):** cada producto arrastra un `proveedor_id` invisible al público pero visible y filtrable en el panel. Cuando entra un pedido, el panel lo parte por proveedor con su contacto ("este fardo de camperas → proveedor A, contacto X; este de remeras → proveedor B, contacto Y"). El panel no es solo editor de productos: es cabina de logística (pedidos que entran, partidos por proveedor, con contacto y qué pedir a cada uno). `[BUILD v1]` (archivo 2).
- **Límite del panel:** lo que NO se cambia desde el panel es la estructura de la interfaz (layout, pantallas, navegación) = el motor; eso se evoluciona con desarrollo planeado cuando se quiere una función nueva. Los textos y el contenido sí; la estructura es el motor (archivo 3).

### 3.5 Registro, login y cuentas
- **Login del usuario con id/email + contraseña** (Supabase Auth; también código por teléfono/WhatsApp OTP si se quiere — para Argentina, teléfono es natural). `[BUILD v1]` (archivo 1, archivo 3).
- **El comprador se registra con SU propio mail/teléfono + contraseña** (su login, no se lo da el revendedor) cuando entra por el link del revendedor. `[BUILD v1]` (archivo 3).
- **En el alta se captura** nombre, negocio, zona y teléfono; eso alimenta el sistema de niveles (cada cliente atado a sus pedidos e historial). `[BUILD v1]` (archivo 1).
- **Registro simple, NO reconocimiento facial:** el face-ID se descartó explícitamente para esto (sobre-ingeniería, fricción, costo y peso legal de datos biométricos). No se consigue ni se usa ese skill ahora. (archivo 1).

### 3.6 Pagos (ver detalle de reglas en §6 y resolución en Apéndice de contradicciones)
- **Una sola función de pago dentro de la app, con todos los medios de Argentina: tarjeta (de los bancos), Mercado Pago y efectivo.** La misma función se usa en las dos transacciones: cuando el **revendedor compra** del catálogo y cuando el **cliente final compra** en la tienda-ventana del revendedor. `[BUILD v1]` (instrucción de Sergio; alineado con archivo 1 y archivo 3).
- **Toda la caja entra a una sola cuenta: la de la app/Directimport.** El reparto (la comisión 50/50 con Álvaro y el pago a Álvaro por el producto) se resuelve **sobre la marcha**, por fuera del checkout. No es bloqueante para construir. `[BUILD v1]` / setup operativo (instrucción de Sergio).
- **El ruteo automático de la plata a la cuenta de cada revendedor (Split/OAuth de Mercado Pago) NO va en v1** — queda diferido (ver §9). En v1 todo entra a la cuenta de la app y el reparto es interno/manual.
- **Detalle de implementación (no de diseño):** al integrar pagos, confirmar contra la doc de MP cómo se carga el recargo de tarjeta vs efectivo en Argentina (regla #6). No frena el build.
- **Suscripción cobrada aparte de las ventas:** lo que el revendedor paga por ser Pro/Pro Plus va a Directimport (50/50 con Álvaro) por el módulo de **cobros recurrentes de Mercado Pago**; es un flujo separado del pago de cada comprador. `[BUILD v1]` (archivo 1, archivo 3).
- **PagoKit** (plugin de Claude Code, de Hainrixz; verificado vigente) se usa para cablear la integración de pagos (frontend + checkout + webhook firmado + migración + portal de cliente + reembolsos + tests en sandbox + checklist de producción); soporta Mercado Pago. Genera la conexión a la pasarela; no es una pasarela. `[BUILD v1]` (archivo 1).

### 3.7 Niveles de suscripción (cuatro)
Ver definiciones y números en §6. Escalera: **Básico → Pro → Pro Plus → Ultra** (archivo 1, archivo 3).
- **Básico, Pro, Pro Plus** = flags de permiso en una tabla (comprar / editar-precios / personalizar-básico / white-label); sumar, partir o renombrar niveles es configuración, no código. `[BUILD v1]` (archivo 1, archivo 3).
- **Trial en cascada:** cada nivel da 7 días de prueba del nivel siguiente (Básico → prueba de Pro; Pro → prueba de Pro Plus), para empujar el escalamiento automático antes de que paguen. **Excepto Ultra**, que no entra en el molde de "probalo 7 días". `[BUILD v1]` (archivo 2, archivo 3).
- **Ultra (el nivel y su candado):** el nivel existe, sus reglas y el scoring que lo destraba se definen y construyen; **la maquinaria de distribuidor con su propia red queda `[MODELADO]` dormida tras un feature flag** (ver §6 y §9) (archivo 2, archivo 3).

### 3.8 Trial / código de referido
- **Trial de 7 días con código de referido:** el revendedor entra, completa la suscripción y carga el **código de referido** que le pasa Álvaro o Sergio; ese código lo entra a la app con 7 días gratis. A los 7 días la app avisa que debe pagar. `[BUILD v1]` (archivo 2).
- **El código de referido cumple doble función:** llave del trial + ata al revendedor a Álvaro o a Sergio para el reparto 50/50 (archivo 2).
- **Suspensión sin borrado:** si no paga, la suscripción se cancela y no puede entrar, pero la tienda **no se borra**; queda, y al reactivar la suscripción la recupera (patrón SaaS estándar). `[BUILD v1]` (archivo 2).

### 3.9 Scoring / fidelidad
- **Sistema de scoring desde el día uno** (aunque Ultra esté apagado, se recolectan los datos). Mide: **volumen de producto vendido (acumulado y sostenido), antigüedad en la plataforma, constancia/recurrencia de pedidos, y compradores que entran por su tienda**, más el monto de inversión para subir de nivel. `[BUILD v1]` (recolección + dashboard) (archivo 1, archivo 2).
- **Dashboard gamificado:** experiencia tipo juego con progreso visible (estrellas, barra que carga, niveles que destraban beneficios) que motive a vender; el objetivo central es que el revendedor migre todo su flujo de clientes a su tienda, no que use la app solo para comprar. `[BUILD v1]` (archivo 2).
- **Regla dura — el scoring premia VENTA DE PRODUCTO, nunca reclutamiento.** Si el puntaje subiera por "cuántos revendedores trajiste", cruzaría a esquema piramidal ilegal. El monto de inversión para subir tiene que comprar algo real (stock a precio importador / licencia de distribución atada a producto), no "una cuota para entrar y ganar del downline" (archivo 2).
- **Beneficios que destraba el scoring:** ofertas del nivel; y **servicios de QuantumHive (automatización de IG/embudo) con descuento** (ej. 50%) para el revendedor que llega a cierto nivel — cruza directimport con la agencia y se retroalimenta (más clientes a su tienda → más ventas por la plataforma → más score). Premios por nivel: pack de publicidad para su IG, fotos/contenido pro, acceso anticipado, productos digitales. (Porcentajes y escalera concreta = parámetros a definir después). `[BUILD v1]` el mecanismo / números pendientes (archivo 2).

### 3.10 Legal
- **Agente Legal — componente reusable de QuantumHive** (mismo patrón que el Agente Investigador), que corre en build-time (no vive en la app) y genera los documentos: **Términos y Condiciones, Política de Privacidad, Acuerdo de Suscripción y Política de Devoluciones**, fundados en las leyes argentinas que aplican (defensa del consumidor, protección de datos personales). Toma la **jurisdicción como parámetro** y consulta referencias actualizadas al correr (Context7 o web), no leyes hardcodeadas. Sale en markdown estructurado, listo para enchufar en el flujo de "acepto los términos" antes de pagar. Puede correr justo antes del lanzamiento. `[BUILD v1]` (como entregable previo al lanzamiento) (archivo 1).
- **Pestaña de Términos y Condiciones en la app:** pantalla estática que muestra el texto generado. `[BUILD v1]` (archivo 1).
- **Dudas legales en vivo = el mismo asistente nativo (Timón), NO un agente legal aparte:** se le pasan los T&C como conocimiento; responde según lo escrito y deriva a soporte lo que no esté escrito (no improvisa interpretaciones legales). `[BUILD v1]` (archivo 1).
- **Clickwrap antes de pagar la suscripción:** cubre qué incluye cada plan, uso aceptable, reglas de edición de precios y de marca por nivel, cancelación y reembolsos, manejo de datos y privacidad, límite de responsabilidad, y el reconocimiento de que el revendedor usa una plataforma con licencia, propiedad de Sergio/QuantumHive, sin adquirir titularidad sobre el software. `[BUILD v1]` (archivo 1).
- **Lo que el clickwrap NO cubre:** la relación con Álvaro (es socio, no un usuario que clickea); eso es el acuerdo de sociedad, por ahora de palabra, fuera del alcance del software (ver §6 y §9) (archivo 1).

### 3.11 Visual / 3D (capa de impacto — prioridad explícita del brief)
Ver detalle en §8. Resumen de features: fondo 3D / íconos con profundidad / elemento hero animado (R3F + Drei) cargado solo en el hero con lazy-load; orbe tipo Jarvis en audio; fotos de estudio (Photoroom); animaciones del mockup (barras, filtros que reaccionan, chat). `[BUILD v1]` (archivo 3).

### 3.12 Insumos de oferta y demanda (operación, no arquitectura)
- **Listas de proveedores (~17 por rubro, p. ej. bazar, tecnología):** son el lado de la oferta; alimentan la tabla de proveedores y el catálogo curado. Sirven en v1. `[BUILD v1]` (insumo) (archivo 3).
- **Programa de scraping de negocios (mapa con teléfono, ubicación, web por rubro):** es el lado de la demanda (encontrar revendedores). Es marketing, no toca la arquitectura. **Caveat real:** el contacto masivo quema cuentas (baneo de WhatsApp) y hay reglas de protección de datos en Argentina → usar dirigido y prolijo; verificar que el repo ande. Fuera del código (operación) (archivo 3).
- **La Salada como go-to-market del lanzamiento:** Álvaro es proveedor de La Salada; sus clientes actuales (revendedores del interior) son la primera camada de usuarios — base tibia y concentrada. El gancho real: pedir desde el interior sin viajar + tener su propia tienda. **Caveat:** La Salada es mayormente informal y en efectivo; la adopción no es automática. Operación/lanzamiento (archivo 3).

---

## 4. Modelo de datos (entidades, campos y relaciones — descripción conceptual, sin código)

> La app es **data-driven**: rubros, proveedores, productos, atributos, planes, permisos, niveles, capas de precio, etc. viven en tablas; la pantalla dibuja lo que haya. Agregar contenido = agregar una fila. El único límite es una **función** nueva (comportamiento que el motor no tiene), que es desarrollo planeado (archivo 2). Las entidades de abajo surgen del texto de las conversaciones.

- **Rubros / Categorías** (Nivel 1): nombre del rubro, sub-filtros asociados, plantilla de atributos del rubro, métrica(s) configurable(s) del rubro. Relación 1‑a‑N con Productos (archivo 2, archivo 3).
- **Sub-filtros** (Nivel 2): pertenecen a un rubro (archivo 3).
- **Proveedores** (tabla, uso interno de admin): nombre, contacto, condiciones, plazos. Relación 1‑a‑N con Productos vía `proveedor_id` (invisible al público; visible/filtrable en el panel). Semilla de la futura app tipo Mercado Libre (archivo 2).
- **Productos:** nombre, `rubro` (categoría), `proveedor_id`, **precio base** (el que pone Sergio, ya con su comisión metida), atributos flexibles según plantilla del rubro (ej. talle/color; año/cilindrada/financiación), fotos, video, **estado de stock** (si no hay, el Agente de Stock lo oculta/anula del catálogo hasta reponer), descripción, métrica(s) del rubro (ej. comodidad / índice de reventa). El precio publicado se calcula sobre el precio base (archivo 1, archivo 2, archivo 3; estado de stock por instrucción de Sergio).
- **Catálogo maestro:** el conjunto de productos con su precio base, propiedad de Sergio (archivo 1).
- **Capa de precios por revendedor:** por cada revendedor y producto, su propio precio encima del catálogo maestro. El comprador final ve el precio de su revendedor; el resto (productos, fotos, rubros, estructura) sale del catálogo central (archivo 1).
- **Usuarios / cuentas:** datos de alta (nombre, negocio, zona, teléfono), credenciales (id/email + contraseña; OTP por teléfono opcional), **rol** (admin / revendedor / comprador). Manejado por Supabase Auth (archivo 1, archivo 3).
- **Revendedores:** plan/nivel (Básico / Pro / Pro Plus / Ultra), estado (activo / pausado / cancelado / en trial), fecha de alta, próxima renovación, personalización (colores, logo, nombre), link/código único, **código de referido / a quién está atado (Álvaro o Sergio)**, datos de scoring. Campos para la capa Ultra dormida: `padre_id` (nullable) y `nivel` (nullable) y `zona`. Conexión OAuth a su cuenta de Mercado Pago (para el cobro por su tienda) (archivo 1, archivo 2, archivo 3).
- **Planes / niveles:** definición de cada plan como flags de permiso (comprar / editar-precios / personalizar-básico / white-label / [Ultra: gestionar cartera, capa de margen propia]) + precio del plan (placeholder) (archivo 1, archivo 2, archivo 3).
- **Permisos:** configuración por rol y por plan (archivo 1, archivo 2).
- **Scoring:** por revendedor — volumen de producto vendido (acumulado/sostenido), antigüedad, constancia/recurrencia de pedidos, compradores que entran por su tienda, monto de inversión; umbrales pendientes de datos reales (archivo 1, archivo 2).
- **Suscripciones / pagos de suscripción:** fecha, monto, plan, estado (pagado/pendiente/fallido), próxima facturación; vía cobros recurrentes de Mercado Pago (archivo 1).
- **Pedidos / órdenes:** revendedor (o comprador), producto(s), cantidad, precio unitario de venta, total, comisión, estado de pago, estado del pedido (pendiente / pagado / enviado), y **cada renglón arrastra su `proveedor_id`** (para que el panel parta el pedido por proveedor) (archivo 1, archivo 2).
- **Estado de pago / método de pago:** método elegido (tarjeta / Mercado Pago / todos los medios de Argentina), quién absorbe el costo de MP (ver §6), estado (archivo 1, archivo 3).
- **Memoria del agente (Timón):** contexto por usuario (qué pidió, preferencias, su nivel, historial), atado al ID del usuario, cargado en el prompt (archivo 3).
- **Demanda no satisfecha (flujo "no lo tengo"):** registro de las fotos/búsquedas sin match (qué pidió el usuario que no hay), como data de demanda para qué conseguir/importar (archivo 3).

---

## 5. El círculo completo (flujo de punta a punta)

Paso a paso, con los casos borde mencionados (archivo 1, archivo 2, archivo 3):

1. **Alta del revendedor.** El revendedor entra, se registra (id/email + contraseña; OTP por teléfono opcional), completa la suscripción y carga el **código de referido** de Álvaro o de Sergio → queda atado a quien lo trajo (para el 50/50) y entra con **7 días gratis** de prueba.
2. **Configuración de su tienda.** Según su plan (Pro/Pro Plus), arma su vidriera: define **sus precios** sobre el catálogo maestro y personaliza colores/logo/nombre. Obtiene su **link/código único**.
3. **Catálogo.** El revendedor (o, por su link, el comprador) navega: Nivel 1 (rubros/categorías + tiras de virales/ofertas) → Nivel 2 (sub-filtros del rubro). Puede también pedirle a **Timón** por texto/audio/foto/escáner ("mostrame camperas", o sube/escanea una foto).
   - **Caso borde — foto/escáner sin match:** Timón registra el pedido, avisa a Sergio con la foto, le dice al usuario "no lo tenemos, soporte te contacta si lo conseguimos" y/o recomienda algo parecido que sí haya. Queda como **data de demanda**.
4. **El comprador entra por el link del revendedor** → la app lo ata a ese revendedor → ve **solo** la tienda de ese revendedor (sus precios, su marca). Se registra con su propio mail/teléfono + contraseña.
5. **Carrito y pedido.** El comprador arma el pedido en la tienda del revendedor.
6. **Pago (estado de pago).** Paga **por la app** con tarjeta / Mercado Pago / efectivo (todos los medios de Argentina), con la **misma función de pago** que usa el revendedor cuando compra. **Toda la caja entra a una sola cuenta (la de la app/Directimport)**; el reparto 50/50 con Álvaro y el pago del producto se resuelven por fuera, sobre la marcha. (El ruteo automático por revendedor vía Split/OAuth de MP queda diferido — ver §9.)
   - **Costo de MP:** lo absorbe quien elige pagar con MP (se suma arriba del precio, no se descuenta del margen). La comisión de Sergio y de Álvaro queda intocable. El revendedor decide si come la comisión o la suma al precio.
7. **Confirmación.** Se confirma el pago; el pedido pasa de pendiente → pagado.
8. **Ruteo por proveedor y despacho.** En el **panel** de Sergio, el pedido se parte por `proveedor_id` con el contacto de cada proveedor. **La logística la maneja Álvaro** (compra al proveedor y hace enviar, por sus medios o usando la logística del proveedor). El comprador no sabe que hay distintos proveedores; un mismo pedido puede combinar fardos de proveedores distintos (ej. camperas del proveedor A + remeras del proveedor B) y se entrega como uno solo.
9. **Estado del pedido.** El pedido pasa a enviado; el revendedor lo ve en "Mis pedidos" (con estado y "repetir pedido").

**Flujo de suscripción (paralelo al de ventas, no se mezcla):** revendedor paga su plan (Básico/Pro/Pro Plus) por cobros recurrentes de MP → ingreso de Directimport (50/50 con Álvaro). A los 7 días del trial, si no paga, se suspende (la tienda no se borra; al reactivar la recupera) (archivo 2, archivo 3).

---

## 6. Reglas de negocio

### 6.1 Precio y margen
- **Markup sobre el precio que se consigue** (tuyo, del mayorista/proveedor, del importador directo o de fábrica): se le suma **10% o 20% según convenga en cada caso**, manteniéndolo en valor mayorista y conveniente para el revendedor que compra en bulto (archivo 1, archivo 3).
- **Remarcada chica por unidad, ganancia por volumen:** 1–2 USD por par de zapatillas, 0,50 por remera; la ganancia escala con el volumen — una curva de 1000 remeras a 0,50 = **500 USD en una sola movida**. Negocio de pasamano por volumen, no de remarcada grande (archivo 3).
- **El precio base ya lleva la comisión metida** y no lo ve el comprador como recargo (archivo 1).
- **Reparto interno con Álvaro (50/50)** sobre el markup: se arregla por fuera del checkout; no lo hace Mercado Pago en el split. En el checkout hay dos partes: el revendedor y Directimport (archivo 1, archivo 3). *Nota histórica: en el archivo 1 se mencionó un esquema 5%/5% sobre un markup del 10% con el precio del producto 100% para el socio; quedó luego unificado en "todo 50/50" (archivo 1, archivo 2).*

### 6.2 Estados de pago / método de pago
- **Una sola función de pago en la app, con todos los medios de Argentina (tarjeta de bancos / Mercado Pago / efectivo), igual para el revendedor que compra y para el cliente que compra en la tienda del revendedor.** Toda la caja entra a una sola cuenta (la de la app/Directimport) y el reparto 50/50 con Álvaro se resuelve por fuera, sobre la marcha. El ruteo automático por revendedor (Split/OAuth de MP) queda diferido a una etapa posterior (ver §9). `[BUILD v1]` (instrucción de Sergio; alineado con archivo 1 y archivo 3).
- **El costo de Mercado Pago lo paga quien elige pagar con MP** (se suma al total, no sale del margen). La comisión de Sergio y de Álvaro no se toca. Por defecto, el revendedor le paga a Álvaro/Directimport en efectivo o transferencia (gratis); igual lógica para el revendedor con su comprador (archivo 1).
- **El costo de MP es un costo, no un ingreso** (lo cobra MP; cuanto menor el plazo de acreditación, mayor el costo; no incluye IVA ni retenciones). El precio publicado tiene que contemplarlo para no comer el margen (archivo 1).
- **Transferencia bancaria / CVU = medio sin comisión** (manual, sin confirmación automática, sin tarjeta/cuotas); encaja para revendedor → Álvaro (B2B). La pasarela MP es para la tienda del comprador final donde se quiere tarjeta/cuotas (archivo 1).
- **Sergio NO es procesador de pagos** (es inviable regulatoriamente); usa MP (archivo 1).
- **DollarApp NO es pasarela** — es la cuenta para guardar/mover la ganancia en USD; no se mezcla con cómo pagan los clientes (archivo 1).

### 6.3 Planes / niveles (cuatro)
- **Básico:** solo **comprar** en la app. No edita precios, no tiene tienda de cara al cliente, no personaliza. Acceso al catálogo para comprar, nada más. Precio: placeholder histórico **$20/mes** (a redefinir) (archivo 3).
- **Pro:** **vende** a través de la app — su tienda, edita precios, personaliza color/nombre/foto, pero conserva la marca "powered by Directimport". Precio: placeholder histórico **$50/mes** (a redefinir) (archivo 1, archivo 3).
- **Pro Plus (nivel nuevo):** le saca la marca de Directimport (**white-label total**) + más personalización, para que el comprador final lo vea como un mayorista directo. **No** tiene su propia red de revendedores todavía (archivo 3).
- **Ultra:** distribuidor con su **propia red (asignada, no reclutada)**. Bloqueado, se destraba por **scoring** + **condición de negocio** (precios más bajos directo del importador / importación propia) + **contrato de territorio**. No es un trial de 7 días: se califica y se activa (archivo 1, archivo 2, archivo 3).
- **Cobro de suscripción del socio Álvaro: no paga** — es socio (pone capital, producto, red), no cliente (archivo 1).
- **Trial en cascada:** Básico → 7 días de Pro; Pro → 7 días de Pro Plus. Empuja el escalamiento (aversión a la pérdida: una vez que probó el white-label y sus clientes vieron su marca, volver a "powered by Directimport" se siente como bajar de categoría). **Ultra no entra en el molde de trial.** `[BUILD v1]` (archivo 2, archivo 3).
- **Los precios $20/$50 son placeholders/ficticios** — quedaron cortos para la propuesta real (tienda llave en mano + catálogo multi-proveedor + pago + logística resuelta + dashboard). Se fijan por valor con comparables reales, no al aire — más adelante, con datos (archivo 2). Ver Apéndice "Sin fase explícita" / §9 sobre números pendientes.

### 6.4 Scoring (regla detallada)
- **Mide:** volumen de producto vendido (acumulado y sostenido), antigüedad en la plataforma, constancia/recurrencia de pedidos, compradores que entran por su tienda, monto de inversión para subir (archivo 1, archivo 2).
- **Dos llaves para Ultra:** el scoring define **quién** califica; la condición de negocio (precios de importador) define **cuándo** se prende la función (archivo 2).
- **Nunca por reclutamiento.** El monto de inversión tiene que comprar algo real (stock a precio importador / licencia de distribución atada a producto) (archivo 2).
- **Umbrales exactos:** se definen cuando haya datos reales de cómo venden; ponerlos a ojo ahora sería inventar (archivo 2).

### 6.5 Capa Ultra (regla de negocio + arquitectura)
- **Dos puertas a Ultra, sobre la misma estructura:** (1) **ganada** (un revendedor sube por scoring y cumple la condición); (2) **asignada por Sergio** (encuentra un distribuidor para una zona y lo pone directo en Ultra con su cartera, sin escalar) (archivo 2).
- **Red asignada de arriba hacia abajo, nunca reclutada:** Sergio asigna a un Ultra un grupo de revendedores que ya están adentro (distribución gestionada, B2B legítimo). Diferencia técnica: una regla de permiso — el vínculo lo crea **solo Sergio**, no el revendedor (archivo 2).
- **Ultra como distribuidor de zona** (para llegar a provincia): alguien con camión que compra mercadería, la retira, la lleva a su zona y la despliega a sus revendedores por la plataforma. Exclusividad por zona (un Ultra por zona; sus revendedores colgados; no pueden ser Ultra ni ser de otro distribuidor cercano) = **cláusula de territorio en su contrato de distribución**. En el modelo: campos `zona` + `padre_id`/`nivel`. Lo que se define al activar son los términos comerciales del territorio (qué se lleva, qué pasa si no rinde, si un revendedor se puede reasignar) — eso es acuerdo, no código (archivo 2, archivo 3).
- **Construcción:** el nivel, sus reglas, el scoring y el candado se definen y construyen; **la maquinaria real (panel de distribuidor para gestionar su cartera + lógica de margen por nivel) se escribe en el MISMO código detrás de un feature flag, dormida**, hasta que giren las dos llaves. No es un clon ni "cargar código suelto después": un solo codebase, base que contempla Ultra desde el día uno (`padre_id`, `nivel`, `zona`, relaciones), función prendida cuando llega el momento, leyendo la misma base, sin clon/fork/reescritura/puente (archivo 2). `[MODELADO]` la maquinaria.
- **Lenguaje:** no usar "piramidal" ni internamente. El modelo es **red de distribución / multinivel de venta real** y es legal **siempre que** el ingreso del distribuidor venga de la **venta de PRODUCTO** de su red, no de cuotas de inscripción ni de reclutar. Blindaje: facturar y declarar la comisión (archivo 2).

### 6.6 Legal (qué genera el Agente Legal, condiciones)
- **Genera:** Términos y Condiciones, Política de Privacidad, Acuerdo de Suscripción, Política de Devoluciones, fundados en leyes argentinas (defensa del consumidor, protección de datos personales), con la jurisdicción como parámetro y referencias actualizadas al correr (archivo 1).
- **El clickwrap (antes de pagar) cubre a los usuarios** (revendedores y compradores): qué incluye cada plan, uso aceptable, reglas de precios y marca por nivel, cancelación/reembolsos, datos/privacidad, límite de responsabilidad, y el reconocimiento de que usan una plataforma con licencia propiedad de Sergio/QuantumHive sin titularidad sobre el software (archivo 1).
- **No cubre al socio Álvaro:** la sociedad (50/50; que el software es 100% de Sergio) es un acuerdo aparte, por ahora **de palabra**, y es lo único donde una revisión profesional (abogado argentino) suma de verdad. Fuera del software (archivo 1, archivo 2).
- **Límite del Agente Legal:** cubre lo de cara al usuario (clickwrap); el contrato de sociedad y el nivel Ultra/multinivel los valida un **abogado argentino real**, no el agente (archivo 1, archivo 2).
- **Separación de propiedad** (punto legal central): dejar por escrito que Álvaro es socio del **negocio Directimport** (reparto de la ganancia de ese negocio), **no** dueño del software ni de QuantumHive (100% de Sergio). Eso protege poder sacar después las apps tipo Shopify y tipo Mercado Libre por cuenta de Sergio (archivo 1).

---

## 7. Stack y restricciones técnicas

**Stack elegido (de las conversaciones):**
- **Backend, base de datos, auth y storage: Supabase** (ya lo tiene Sergio). NO un backend Node/Prisma aparte (archivo 1, archivo 3).
- **App de un solo código para iOS + Android: Capacitor** (envuelve la app web en apps reales de las dos tiendas). Rork queda como alternativa (React Native/Expo) si aparece una razón. Se eligió **Capacitor** para que la secuencia "PWA → tiendas" sea sin reescribir (archivo 1, archivo 3).
- **Canal:** se construye **web-first** y se prueba primero en **modo PWA** (gratis, sin trámites, validar con gente real ya); el **mismo código** se sube luego a **Play Store + App Store** como app nativa. **Una sola app en las tiendas** (la de Directimport); adentro vive la personalización por login. No una app por revendedor (archivo 1, archivo 3).
- **Panel admin: web en Next.js sobre Vercel** (cargar catálogo/precios/fotos es más cómodo en pantalla grande) (archivo 1, archivo 3).
- **Pagos: Mercado Pago** (Checkout Pro para arrancar simple; Checkout API/Bricks para que el pago no salga de la app). **PagoKit** cablea la integración. **Cobros recurrentes** de MP para las suscripciones. **Modelo marketplace/Split** de MP para rutear al revendedor (archivo 1, archivo 3).
- **Fotos de catálogo: Photoroom API** (fondo de estudio, sombra, nitidez; 1.000 imágenes gratis en sandbox para arrancar) (archivo 1).
- **Agente (Timón): Claude o Gemini** sobre la lista real de productos (archivo 1, archivo 3).
- **3D: React Three Fiber + Drei + Zustand**, instaladas **como librerías dentro de la propia app** (archivo 3).

**Restricciones y disciplinas técnicas (de las conversaciones):**
- **Permisos multi-tenant con Supabase RLS (Row Level Security):** es el corazón del sistema y donde viven los bugs de "se filtró data de un revendedor a otro / permiso abierto". Diseñar con cuidado y **testear fuerte temprano** (archivo 2).
- **iOS + Mac 2015 = límite real.** Compilar/firmar iOS pide Xcode actual → macOS reciente que el Mac 2015 (tope Monterey; además corriendo Windows por Boot Camp) probablemente no soporta. No es "instalar algo": es el techo del SO. **Salida: servicio de compilación en la nube (Codemagic)** que compila y firma iOS sin usar el Mac; Claude Code lo configura. Alternativa: arrancar con **Android + PWA** y dejar iOS para una segunda etapa. Sergio confirmó sumar iOS vía nube (archivo 2, archivo 3).
- **Disciplina de keys:** las claves van solo en env vars de producción y en un `.env` local en `.gitignore`; nunca al repo (no por paranoia de seguridad, sino para no drenar créditos pagos). *(Disciplina general del proyecto; reforzada por el contexto de las conversaciones.)*
- **NO forkear tiendas ajenas** (pmndrs/shop, Vercel Commerce): te imponen una arquitectura/backend single-tenant que pelea con el multi-tenant + Supabase. Se **cosecha la capa 3D como librería**, no se adopta el repo (archivo 3).
- **Rechazar swaps de stack** propuestos por listas externas: "Node + Prisma" (va Supabase) y "Stripe" (va Mercado Pago; Stripe no opera bien en pesos en Argentina) (archivo 3).
- **NO el stack empresarial pesado** (Medusa/Bagisto + ERP + SSO + multi-país/moneda): es para otra escala; adoptarlo es el Frankenstein. Solo mirar cómo modelan B2B (flujos de pedido, precios por grupo) como referencia, no adoptar (archivo 3).
- **Regla #6 — verificar antes de integrar:** confirmar URL exacta y mantenimiento de cualquier repo/herramienta antes de usarlo (los repos 3D sueltos —threed-garden, "templates"— huelen a personales/abandonados; no se necesitan si se usan las librerías por npm) (archivo 3).
- **A verificar contra documentación al integrar (regla #6), no ahora:**
  - El **mecanismo exacto de Mercado Pago** (marketplace, Split 1:1, OAuth por cuenta, comisiones, requisitos; si el comprador puede pagar con tarjeta/cuotas dentro del split o solo con saldo de MP en Argentina) (archivo 1, archivo 3).
  - El **trial de 7 días** vía preapproval/cobros recurrentes de MP ("cargar medio de pago ahora, primer cobro a los 7 días" / período de prueba nativo o primera fecha de cobro futura) (archivo 2).
  - El **recargo de tarjeta/cuotas vs efectivo** (reglas de las redes/MP en Argentina) (archivo 1).
  - Implicancias **AFIP / monotributo / IVA** de cobrar fees/comisión (lo ve un contador) (archivo 2).
- **Construcción por etapas sobre base completa:** primero una **rebanada fina de punta a punta** (catálogo + panel + una tienda de revendedor + un pedido funcionando), después las capas (suscripción → scoring/dashboard → personalización → zonas/Ultra dormido). La base contempla todo; el código entra en orden. Lo que se controla es **cuántas funciones se construyen a la vez**, no la cantidad de parámetros (los parámetros son la flexibilidad data-driven funcionando) (archivo 2).
- **No hay impedimento técnico de fondo:** el stack (Supabase + Next.js/Vercel + Capacitor + MP) es estándar para exactamente esto (e-commerce multi-tenant con suscripciones); el riesgo es alcance y orden, no factibilidad (archivo 2).
- **Trámites a arrancar ya:** **D-U-N-S** + cuenta de **organización** de Google Play (tardan días); ver §6/§8 sobre costos de tiendas (archivo 2, archivo 3).

**Datos de publicación (de las conversaciones):**
- **Google Play:** la regla de **12 testers durante 14 días continuos** aplica solo a **cuentas personales nuevas** creadas después del **13 de noviembre de 2023**; las **cuentas de organización/empresa están exentas** → QuantumHive registra cuenta de organización y se saltea el portón. La cuenta de organización pide un **D-U-N-S** (gratis, tarda unos días). Play: **USD 25 una sola vez** (archivo 1).
- **Apple/iOS:** **USD 99 por año**; no tiene regla de testers, pero revisa la app (App Review, uno o dos días por subida) (archivo 1).
- **Producto físico → ni Google ni Apple cobran su comisión** (el 30% es solo para bienes digitales); Mercado Pago va libre dentro de la app (archivo 1).

---

## 8. Dirección visual / marca

**Prioridad explícita:** el brief pone el acento en lo visual. La lógica y la arquitectura están resueltas; **lo visual es lo que marca la diferencia** entre una app genérica y una app profesional con tecnología de último nivel (archivo 3).

- **Paleta:** **negro + azul muy oscuro casi gris + dorado, con el dorado mandando.** Es una **insinuación de Boca** para el inconsciente de Alan y Álvaro (son de Boca), **sin ser Boca**: nada de amarillo ni azul fuerte; el azul aparece apenas (en fondos y acentos), el resto es premium. Debe verse muy profesional (archivo 3).
- **Elementos que dan el aire "tecnología de último nivel":** profundidad de las tarjetas, dorado metálico y **patrón de panales** (identidad QuantumHive) (archivo 3).
- **3D (capa visual, no cimiento):** **fondo 3D / íconos con profundidad / elemento hero animado** — NO modelar los 50 productos (el costo del 3D no es el código, es el modelo 3D de cada producto: una pelota es fácil, una remera difícil, una figurita es plana y casi no suma). Es **R3F/Drei en su mejor uso** (ambient, shaders, geometría flotante): liviano y de alto impacto. **El 3D (WebGL) dentro de Capacitor en celular pesa → va cargado solo en el hero y con lazy-load**, para no hacer lenta la pantalla principal. Si hubiera 3D de producto, reservado a 1–2 modelos estrella (ej. sección hot/Mundial: pelotas, etc.) y verificando viabilidad del asset (archivo 1, archivo 3).
- **Orbe tipo Jarvis:** orbe/onda que late mientras se graba audio o mientras Timón "habla"; puro front-end, barato, recomendado (archivo 3).
- **El salto a "profesional" lo da el conjunto:** diseño coherente + **fotos de estudio (Photoroom)** + animaciones del mockup (barras, filtros que reaccionan, chat) + la firma 3D arriba de eso. El 3D es la firma high-tech, no lo único que lo sostiene (archivo 3).
- **Nombres:**
  - **Wordmark: "Directimport"**, con la **D mayúscula** (archivo 3).
  - **Agente de chat de la app: "Timón"** (archivo 3).
- **Logo:** el del prototipo es un **placeholder**; el logo en serio es su propia tarea de marca, aparte, para hacerla bien (archivo 3).
- **Tono / esencia:** app profesional, premium, de impacto visual; tecnología de último nivel (archivo 3).

---

## 9. Fuera de alcance del v1 (lista "dormido" — `[MODELADO]`)

Todo esto queda contemplado en el modelo de datos / la arquitectura pero **no se construye** en la primera versión:

- **Maquinaria de la capa Ultra:** el panel de distribuidor para gestionar su cartera de revendedores y la lógica de **margen/comisión por nivel** (sub-revendedores). Queda dormida tras un **feature flag**, con los campos `padre_id`, `nivel` y `zona` ya en la base, lista para prenderse sin reescribir (archivo 2, archivo 3).
- **Capa marketplace tipo Mercado Libre** (que los mayoristas/proveedores participen en la app): cuentas de mayorista, su propio panel para subir catálogo, **sincronización de stock, ruteo de pedidos a cada uno, pago con retención/split 1:N y OAuth de MP por mayorista, reputación y manejo de disputas**. Es la capa más pesada; el modelo ya la contempla con el `proveedor_id` dormido. Se prende cuando el catálogo curado esté probado y se quiera escalar la oferta sin curar uno por uno (archivo 2, archivo 3).
- **Suscripción para mayoristas** (que publiquen sus catálogos directamente): es la misma capa marketplace de arriba; diferida (archivo 3).
- **Importación directa (Alan):** ser el importador directo (mejor margen) y abrir el frente donde los mayoristas compran a Directimport. Necesita capital real, navegar aduana/dólar de Argentina y la maquinaria marketplace. Es la precondición de Ultra y del segundo frente. Aun importando, habrá **mezcla** (importado + doméstico) → no se tira la estructura multi-proveedor. Diferido; Alan entra acotado a importación, idealmente como operación de suministro aparte (archivo 3).
- **Escáner "Google Lens en vivo"** (apuntar y reconocer en tiempo real sobre la pantalla): requiere reconocimiento en tiempo real + vectorizar todo el catálogo para matchear con precisión. Es un proyecto serio; upgrade futuro. (En v1 va la versión práctica: cámara como otra forma de entrar la imagen al mismo motor de visión.) (archivo 3).
- **Split automático 1:N de Mercado Pago** (repartir un mismo pago entre varios vendedores a la vez): solo disponible para cuentas de cartera asesorada vía el equipo comercial de MP; no se necesita en v1 (cada orden es de un proveedor/revendedor) (archivo 1).
- **Ruteo automático de pagos a la cuenta de cada revendedor (Split / OAuth de Mercado Pago por revendedor):** diferido. En v1 toda la caja entra a una sola cuenta (la de la app) y el reparto es interno/manual; el ruteo automático y la conexión OAuth de cada revendedor se evalúan más adelante, sobre la marcha (instrucción de Sergio).
- **Niveles de personalización más profundos / planes Pro superiores** más allá de lo definido: se suman como configuración cuando haya demanda (archivo 1, archivo 3).
- **Otras apps/verticales de QuantumHive** sobre el mismo motor reusable (servicios profesionales, tipo Shopify "que venda lo suyo", tipo Mercado Libre, la app del salón Jas Papeo de turnos/servicios, etc.): el núcleo (multi-tenant, login/registro, pagos, suscripciones, panel admin, personalización de marca, Agente Legal) es reusable; cambia la capa de arriba. Registrado, no se mezcla con directimport ahora (archivo 1, archivo 3).
- **Uso del scraper de negocios para ofrecer servicios/apps de QuantumHive** (no directimport): otra etapa (archivo 3).

---

## 10. Definición de "Terminado" (checklist para habilitar la primera prueba interna)

La primera prueba interna es **Sergio + Álvaro haciendo una compra simulada del círculo completo**. Se construye primero la **rebanada fina de punta a punta** (archivo 2). El v1 está "terminado" para probar cuando todo esto esté en ✓ (derivado de las conversaciones):

- ☐ Sergio (admin) puede **cargar un producto** desde el panel web con foto (procesada por Photoroom), rubro, sub-filtro, atributos, **precio base** y `proveedor_id`.
- ☐ El **catálogo vivo** muestra el producto con navegación de dos niveles (rubros → sub-filtros), tira de virales/ofertas y la métrica configurable del rubro.
- ☐ Un **revendedor** puede registrarse (id/email + contraseña), cargar su **código de referido** (queda atado a Álvaro/Sergio) y entrar con **trial de 7 días**.
- ☐ El revendedor puede **armar su tienda**: fijar su **precio** sobre el catálogo maestro y personalizar colores/logo/nombre, y obtener su **link/código único**.
- ☐ Un **comprador** entra por el **link del revendedor**, queda atado a ese revendedor, se registra con su propio mail/teléfono + contraseña, y ve **solo** los precios y la marca de ese revendedor.
- ☐ El comprador puede **armar el carrito** y **pagar por la app** con Mercado Pago (en sandbox), con los medios de pago de Argentina disponibles; el **costo de MP lo absorbe quien elige MP** y la comisión queda intocable.
- ☐ Se crea la **orden** con su **estado de pago** (pendiente → pagado) y **cada renglón arrastra su `proveedor_id`**.
- ☐ El **panel** parte la orden **por proveedor** con su contacto (cabina de logística), reflejando que **la logística la maneja Álvaro** (paso de despacho).
- ☐ El **estado del pedido** avanza a enviado y el revendedor lo ve en "Mis pedidos" con "repetir pedido".
- ☐ La **suscripción + trial de 7 días** funciona (cobro recurrente de MP en sandbox; suspensión sin borrado al no pagar; la tienda se recupera al reactivar).
- ☐ **Timón** responde por **texto** (mínimo) y, en alcance, por **audio y foto**, con el **flujo "no lo tengo"** registrando demanda; con **memoria por usuario**.
- ☐ El **orbe tipo Jarvis** y el **3D liviano del hero** funcionan sin hacer lenta la pantalla principal (lazy-load).
- ☐ **RLS verificado**: ningún revendedor ve datos de otro; ningún comprador ve precios de otra tienda (probado fuerte).
- ☐ La app **corre como PWA** (y build de **Android**; iOS vía Codemagic queda para la etapa de tiendas).
- ☐ El **Agente Legal** generó los documentos y se muestran en la **pestaña de T&C**, con el **clickwrap** antes de pagar la suscripción.
- ☐ **PagoKit** dejó los **tests en sandbox** en verde y el **checklist de producción** a mano.
- ☐ Trámites en marcha: **D-U-N-S** + cuenta de organización de Play iniciados.

> Números pendientes a propósito (no bloquean la prueba, se cierran con datos reales / abogado / Álvaro): precios de los planes, umbrales del scoring, porcentajes de beneficios, texto legal final, y los términos escritos con Álvaro.

---

## APÉNDICE A — Sin fase explícita

Features que aparecen en las conversaciones sin una fase `[BUILD v1]`/`[MODELADO]` indicada de forma clara:

- **Fee por transacción** (un porcentaje chico, ej. 0,10%, en cada transacción para bancar los costos del software sin tocar la ganancia): Sergio lo propuso y Claude lo marcó como "si lo querés, es un parámetro más, pero dimensionado en serio" — quedó sin fase definida. Pendiente de decisión y de número (archivo 2).
- **Modelaje virtual (Kling)** mencionado en el catálogo del archivo 1 ("mostrar producto sin sesión de fotos"): aparece como recurso disponible sin fase asignada para directimport (archivo 1).
- **Marcas/números concretos del sistema de premios por nivel** (qué premio exacto da cada nivel): el mecanismo es `[BUILD v1]` pero los premios concretos y sus umbrales no tienen fase/valor definidos (archivo 2).

---

## APÉNDICE B — Contradicciones a revisar

- **Circuito de pago / dónde transacciona el comprador final.**
  - **archivo 2** (`planifiacion_directimport_2.txt`): el comprador final **NO toca el rail** de la plataforma; el revendedor le muestra el catálogo pero le vende por fuera (efectivo/sus medios); por la plataforma pasa solo revendedor → Álvaro (producto con la comisión metida) + la suscripción; **sin MP Split en v1**.
  - **archivo 3** (`planificacion_directimport_3.txt`): el comprador **paga por la app** entrando por el **link del revendedor**, con **Split de Mercado Pago** que rutea la plata a la cuenta de ese revendedor (OAuth de MP por revendedor) y Directimport se queda su comisión en el mismo movimiento. (El **archivo 1** también plantea el pago por la app con MP Split 1:1.)
  - **Resolución (instrucción directa de Sergio) — RESUELTA Y CERRADA:** el cobro va **por la app**, con **una sola función de pago — tarjeta (bancos) / Mercado Pago / efectivo — usada en todas las transacciones** (revendedor que compra y cliente que compra en la tienda del revendedor). **Toda la caja entra a una sola cuenta (la de la app/Directimport)** y el reparto 50/50 con Álvaro se resuelve por fuera, sobre la marcha. El **ruteo automático por revendedor (Split/OAuth de MP) queda diferido** (ver §9). El planteo del archivo 2 (comprador fuera del rail / sin split en v1) queda superado. Único detalle de implementación pendiente: confirmar contra la doc de MP el recargo de tarjeta vs efectivo en Argentina (regla #6) — no es bloqueante.
