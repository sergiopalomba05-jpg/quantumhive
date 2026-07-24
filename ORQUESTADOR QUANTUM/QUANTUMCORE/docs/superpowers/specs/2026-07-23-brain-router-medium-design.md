# Brain Router Medio Design

## Goal
Implementar la opcion media: header de chat responsive, V.S 2 Cerebros real con Gemini Flash + Gemini Pro, y una pantalla inicial de Proveedores de IA / APIs sin manejo de secrets reales en frontend.

## Scope
- Header `/chat` debe estirarse cuando se colapsa el menu lateral.
- `V.S 2 Cerebros` debe ejecutar dos modelos Vertex disponibles en paralelo y sintetizar una respuesta final.
- La respuesta debe exponer metadata segura de los cerebros usados, sin prompts completos ni secretos.
- Crear ruta `/api-providers` y link lateral `Proveedores de IA / APIs` dentro de `F. Inteligencia y Automatizacion`.
- La pantalla muestra providers iniciales: Vertex AI, OpenAI API, Azure OpenAI, Claude via Vertex Garden, NVIDIA NIM.
- No se guardan API keys reales desde frontend en esta fase.

## Out Of Scope
- Secret Manager CRUD real.
- Conectar OpenAI/Azure/NVIDIA/Claude real.
- Cost analytics real.
- Persistencia Supabase para providers.

## Safety
- No mostrar ni guardar secrets en localStorage, prompts, logs ni Supabase plano.
- Providers no conectados quedan como `pendiente` o `no_conectado`.
