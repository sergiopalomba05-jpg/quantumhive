// Edge Function "crear-contenido" — genera un reel branded de una herramienta.
// Combina: la herramienta (detalle) + la receta del reel original (guion/visual/formato) + tu marca
// → devuelve guion + prompt + visual listos para grabar TU versión (no idéntica al original).
// Secrets: GEMINI_API_KEY (la cargás vos); SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Supabase los inyecta).
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
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
    if (!GEMINI_KEY) throw new Error("Falta el secret GEMINI_API_KEY en la Edge Function.");
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

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const j = await r.json();
    const contenido = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No pude generar el contenido.";
    return new Response(JSON.stringify({ contenido, herramienta: h.nombre }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
