// Edge Function "crear-contenido" — genera un reel branded de una herramienta.
// Combina: la herramienta (detalle) + la receta del reel original (guion/visual/formato) + tu marca
// → devuelve guion + prompt + visual listos para grabar TU versión (no idéntica al original).
// Secrets: VERTEX_PROJECT_ID, VERTEX_LOCATION (opcional); SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Supabase los inyecta).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { VertexAI } from "npm:@google-cloud/vertexai@1.9.3";

const PROJECT_ID = Deno.env.get("VERTEX_PROJECT_ID") ?? "";
const LOCATION = Deno.env.get("VERTEX_LOCATION") ?? "us-central1";
const MODEL = Deno.env.get("GEMINI_CONTENIDO_MODEL") ?? "gemini-2.5-flash";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!PROJECT_ID) throw new Error("Falta el secret VERTEX_PROJECT_ID en la Edge Function.");
    const { herramienta_id } = await req.json();
    if (!herramienta_id) throw new Error("Falta herramienta_id.");
    const sb = createClient(SB_URL, SB_KEY);

    const { data: h } = await sb.from("herramientas")
      .select("nombre,para_que,detalle,categoria").eq("id", herramienta_id).single();
    if (!h) throw new Error("Herramienta no encontrada.");
    const { data: recetas } = await sb.from("contenido_herramienta")
      .select("guion,descripcion_visual,formato,notas").eq("herramienta_id", herramienta_id)
      .order("creado_en", { ascending: false }).limit(1);
    const receta: any = recetas?.[0] ?? {};
    const { data: m } = await sb.from("marca").select("*").eq("id", 1).single();
    const marca: any = m ?? {};

    const prompt = `Sos el productor de contenido de la marca de Sergio (academia de IA de QuantumHive).
Generá un REEL de Instagram para ENSEÑAR la herramienta "${h.nombre}" (${h.para_que ?? ""}. ${h.detalle ?? ""}).
MARCA (usá su sello, NO copies el original idéntico): nombre=${marca.nombre ?? "(definir)"}, avatar=${marca.avatar ?? "(definir)"}, tono=${marca.tono ?? "(definir)"}, estilo=${marca.estilo ?? "(definir)"}, CTA=${marca.cta ?? "(definir)"}, idioma=${marca.idioma ?? "es-AR"}.
RECETA DEL REEL ORIGINAL (solo inspiración de formato): guion="${receta.guion ?? ""}"; visual="${receta.descripcion_visual ?? ""}"; formato="${receta.formato ?? ""}".
Adaptalo al avatar/nombre/forma de transmitir de Sergio. Devolvé en markdown, conciso y accionable:
## Título
## Hook (primeros 3s)
## Guion (lo que dice, escena por escena)
## Visual (qué mostrar en cada escena / capturas / b-roll)
## Prompt de generación (listo para la herramienta de video/avatar)
## CTA (hacia la academia)
## Hashtags`;

    const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const genModel = vertex.getGenerativeModel({
      model: MODEL,
      generationConfig: { temperature: 0.8 },
    });
    const result = await genModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const contenido = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
      ?? "No pude generar el contenido.";
    return new Response(JSON.stringify({ contenido, herramienta: h.nombre }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
