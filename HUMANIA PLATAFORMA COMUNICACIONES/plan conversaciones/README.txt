README: Plataforma QuantumHive (Mother Intelligence Core)
📖 Visión General
QuantumHive es un ecosistema de comunicación de próxima generación que fusiona interacciones sociales humanas con Inteligencia Artificial Multimodal en tiempo real.
No es un simple chatbot, es una red donde usuarios humanos y Avatares IA (con personalidades y profesiones específicas) conviven, colaboran y realizan videollamadas en salas individuales o grupales.

💡 Casos de Uso Principales (Verticales)
Salud y Bienestar: Terapia de parejas a distancia con un Psicólogo IA que modera la sesión en tiempo real.

Educación (Aulas Virtuales): Cursos donde múltiples alumnos se conectan a una misma videollamada interactuando con un Profesor IA.

Corporate & B2B: Integración de un "CEO Virtual" o Asistentes de RRHH en los grupos de chat de empleados para automatizar procesos de la empresa.

🛠️ Arquitectura y Conexiones (Integraciones)
Motor Base de Datos (Firebase Firestore & Auth): Gestiona los perfiles de usuarios humanos, el registro de cuentas y guarda el historial de todos los chats y transcripciones de videollamadas.

Sincronización Social (Google Contacts): Permite a los usuarios encontrar a sus colegas, parejas o amigos para armar grupos híbridos (Humanos + IA).

Gestión de Tiempo (Google Calendar): Los avatares pueden leer la disponibilidad de los usuarios y agendar sesiones (ej. la clase de las 17hs o la reunión de directorio).

Gestión de Datos (Google Docs / Sheets): Los avatares corporativos o educativos pueden exportar resúmenes de reuniones o planes de estudio directamente al Drive de los usuarios.

🗺️ Mapa de Usuario (Autoguía de la Plataforma)
Paso 1: Onboarding y Conexión Social
Acción: El usuario ingresa a QuantumHive y se loguea con su cuenta.

Sincronización: Se le pide acceso a Contactos. La interfaz le muestra a sus contactos reales que ya usan la app, dándole una sensación de familiaridad instantánea (estilo red de mensajería).

Paso 2: El "Hive Portal" (Directorio de Agentes)
Acción: El usuario navega por el directorio de "Servicios" o perfiles de IA disponibles (como se ve en el diseño de Stitch).

Selección: Puede elegir la Configuración Neural que necesita para ese momento: [PROFESIONAL] (para el Asistente Corporativo), [CREATIVO] (para el Profesor), o [ESTOICO] (para el Terapeuta).

Paso 3: Gestión de Memoria y Cómputo (Monetización)
Acción: Antes de iniciar llamadas largas, el usuario revisa su Tiempo de Cómputo Disponible.

Decisión: Puede usar los minutos gratuitos, o suscribirse al Quantum Memory Share para que los avatares recuerden sesiones anteriores, o comprar packs como el Quantum Executive para clases de 60 minutos.

Paso 4: La Sala Mixta (El Core de la Experiencia)
Acción: El usuario inicia un chat o videollamada. Puede invitar a su pareja (humano) y al Avatar Terapeuta (IA).

Interacción: Hablan de forma natural. El modelo Live procesa el audio de ambos humanos y el Avatar responde en tiempo real con latencia ultra-baja, mientras el backend guarda el registro en Firebase y agenda la próxima sesión en Calendar si se lo piden.