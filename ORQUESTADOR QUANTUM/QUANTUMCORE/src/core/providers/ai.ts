import { GoogleGenAI } from "@google/genai";

// Detectar con 100% de seguridad si estamos en Cloud Run
const isCloudRun = !!process.env.K_SERVICE;

const aiConfig = isCloudRun
  ? {
      // Pasamos la config a vertexai...
      vertexai: { project: "bubbly-stone-502214-u7", location: "us-central1" },
      // ...y TAMBIÉN en la raíz para que pase la validación interna del SDK
      project: "bubbly-stone-502214-u7",
      location: "us-central1",
    }
  : { apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-crash" };

export const ai = new GoogleGenAI({
  ...(aiConfig as any),
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});
