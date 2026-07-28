# Solución de Despliegue en Cloud Run con Vertex AI y @google/genai

**Fecha:** 21 de Julio 2026
**Contexto:** Despliegue de QuantumCore en Google Cloud Run.
**Error:** Al arrancar el contenedor en Cloud Run, la aplicación crasheaba con el error:
`Error: Authentication is not set up. Please provide either a project and location, or an API key, or a custom base URL.`

## ¿Por qué ocurría esto?
1. **Falta de variables de desarrollo en Producción (Vite):** Originalmente, el servidor fallaba porque intentaba cargar la librería `vite` en producción, pero Docker la había omitido porque estaba en `devDependencies`. Esto tiraba un error `MODULE_NOT_FOUND`. Se solucionó haciendo que la importación de `vite` sea dinámica (`await import("vite")`) y solo corra si NO estamos en producción.
2. **El capricho de validación del SDK de Google (`@google/genai` v2.x):** Al intentar inicializar **Vertex AI** usando las credenciales por defecto de Cloud Run (ADC), le pasábamos el objeto de configuración así:
   ```typescript
   new GoogleGenAI({ vertexai: { project: "mi-proyecto", location: "us-central1" } });
   ```
   Lógicamente, eso debería ser suficiente. Sin embargo, el código fuente del SDK de Google tiene una validación de seguridad estricta y sincrónica que revisa si el `project` y la `location` están **en la raíz** del objeto de opciones. Al no encontrarlos ahí, lanzaba el error de autenticación inmediatamente y crasheaba el servidor antes de siquiera intentar conectarse a Google Cloud.

## ¿Cómo se solucionó?
1. **Detección robusta de la nube (K_SERVICE):** En lugar de depender de `NODE_ENV` (que a veces Cloud Run o esbuild pueden comportarse raro con él), usamos `process.env.K_SERVICE`. Esta es una variable inyectable, obligatoria e imborrable que Cloud Run siempre pone en sus contenedores. Si existe, sabemos 100% que estamos en Cloud Run.
2. **Duplicar los parámetros de Vertex AI:** Para engañar al validador del SDK de Google, le inyectamos `project` y `location` tanto dentro del objeto `vertexai` como en la raíz de la configuración. 

### Código final funcional:
```typescript
  // Detectar con 100% de seguridad si estamos en Cloud Run
  const isCloudRun = !!process.env.K_SERVICE;
  
  const aiConfig = isCloudRun 
    ? { 
        // Pasamos la config a vertexai...
        vertexai: { project: "bubbly-stone-502214-u7", location: "us-central1" }, 
        // ...y TAMBIÉN en la raíz para que pase la validación interna del SDK
        project: "bubbly-stone-502214-u7", 
        location: "us-central1" 
      }
    : { apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-crash" };

  const ai = new GoogleGenAI({
    ...aiConfig,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
```

## Aprendizaje para el futuro
- **Siempre que un SDK de Google lance un error ilógico de autenticación en la nube**, hay que mirar el código fuente del paquete NPM. Muchas veces las validaciones sincrónicas son más torpes que la autenticación asincrónica de la nube.
- **`K_SERVICE` es el santo grial** para saber si tu código se está ejecutando dentro de Google Cloud Run. Es mucho más confiable que `NODE_ENV`.
