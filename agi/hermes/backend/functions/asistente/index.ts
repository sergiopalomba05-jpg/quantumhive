// Edge Function "asistente" — el cerebro de QuantumHive en la web (mismo que Hermes).
// La PWA le habla; responde con Gemini cargando la identidad de QuantumHive + el catálogo
// entero como contexto. Las keys viven como secrets del lado servidor (no se exponen).
//
// Secrets necesarios (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY            (la cargás vos)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (los inyecta Supabase solo)
// Modelo configurable: GEMINI_CHAT_MODEL (default gemini-2.5-flash).
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_CHAT_MODEL") ?? "gemini-2.5-flash";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SOUL = `Sos el asistente de QuantumHive, la infraestructura/motor de IA de Sergio (Olivos, Argentina).
Hablás en español rioplatense, conciso y cálido, pero cuando explicás una herramienta sos DIDÁCTICO:
qué hace, cuándo conviene usarla, sus ventajas, y CÓMO aplicarla (pasos concretos).
Tu base de conocimiento es el CATÁLOGO de herramientas de IA de QuantumHive (más abajo), organizado
por OBJETIVO (qué querés crear) y subdivisiones (cada parte del proceso).
Reglas:
- Recomendá SIEMPRE desde el catálogo primero; priorizá las de estado 'usar' y los ganadores del stack.
- Si el catálogo no tiene algo para la tarea, decílo y sugerí buscar/sumar una herramienta (no inventes nombres ni URLs).
- Cuando te piden "qué uso para crear X", mapealo a la división/subdivisión y listá las herramientas con para qué sirve cada una.
- Si te falta info de una herramienta o te piden algo que no está en el catálogo, USÁ la búsqueda web y aclará que esa parte es info de la web.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function buildCatalogContext(sb: ReturnType<typeof createClient>) {
  const [{ data: divs }, { data: subs }, { data: maps }] = await Promise.all([
    sb.from("divisiones").select("id,nombre").order("orden"),
    sb.from("subdivisiones").select("id,division_id,nombre").order("orden"),
    sb.from("herramienta_subdivision").select("subdivision_id,herramientas(nombre,para_que,estado)"),
  ]);
  const bySub: Record<string, string[]> = {};
  for (const m of maps ?? []) {
    const h = (m as any).herramientas;
    if (!h) continue;
    (bySub[(m as any).subdivision_id] ||= []).push(`${h.nombre} [${h.estado}]: ${h.para_que ?? ""}`);
  }
  let out = "";
  for (const d of divs ?? []) {
    out += `\n## ${(d as any).nombre}\n`;
    for (const s of (subs ?? []).filter((x: any) => x.division_id === (d as any).id)) {
      const tools = bySub[(s as any).id] ?? [];
      if (!tools.length) continue;
      out += `- ${(s as any).nombre}: ${tools.join(" | ")}\n`;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!GEMINI_KEY) throw new Error("Falta el secret GEMINI_API_KEY en la Edge Function.");
    const { messages } = await req.json();
    const sb = createClient(SB_URL, SB_KEY);
    const catalog = await buildCatalogContext(sb);
    const system = `${SOUL}\n\n=== CATÁLOGO DE QUANTUMHIVE ===${catalog}`;
    const contents = (messages ?? []).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.6 },
    };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const j = await r.json();
    const reply = j?.candidates?.[0]?.content?.parts?.[0]?.text
      ?? "No pude generar respuesta. Probá de nuevo.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
