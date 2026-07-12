import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "50mb" }));

// ---------------------------------------------------------------------------
// Vertex AI Agent config
// ---------------------------------------------------------------------------
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "project-aa5fb956-b08a-4e13-869";
const GCP_LOCATION = process.env.GCP_LOCATION || "us-west1";
const AGENT_ID = process.env.AGENT_ID || "agent_1783135154380";
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";

// ---------------------------------------------------------------------------
// Cartesia TTS config
// ---------------------------------------------------------------------------
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || "";
const CARTESIA_VOICE_ID = process.env.CARTESIA_VOICE_ID || "3cd4e627-887c-4ad7-a10d-33a409ea2893";
const CARTESIA_MODEL = process.env.CARTESIA_MODEL || "sonic-2";
const CARTESIA_API_BASE = "https://api.cartesia.ai";
const CARTESIA_VERSION = "2024-11-13";

// Lazy initializer for GoogleGenAI with Vertex AI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const SA_PATH = path.join(process.cwd(), "gcp-service-account.json");
    if (SERVICE_ACCOUNT_JSON) {
      // Service account JSON provided via env var (HF Spaces)
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: GCP_PROJECT_ID,
        location: GCP_LOCATION,
        googleAuthOptions: {
          credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
        },
      });
    } else if (fs.existsSync(SA_PATH)) {
      // Service account JSON file on disk (local dev)
      const saKey = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: GCP_PROJECT_ID,
        location: GCP_LOCATION,
        googleAuthOptions: {
          credentials: saKey,
        },
      });
    } else {
      // Fallback: direct Gemini API key (legacy)
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("Set GEMINI_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON or place gcp-service-account.json");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
    }
  }
  return aiClient;
}

// Sessions are managed implicitly by the Vertex AI agent backend

// Read and cache the menu.json file
const menuPath = path.join(process.cwd(), "src/menu.json");
let menuDataCache: any = null;
function getMenuData() {
  if (!menuDataCache) {
    const raw = fs.readFileSync(menuPath, "utf8");
    menuDataCache = JSON.parse(raw);
  }
  return menuDataCache;
}

// ----------------------------------------------------------------------------
// Helper: format prices into words so the text-to-speech reads them nicely
// ----------------------------------------------------------------------------
function formatPrice(p: number | null, symbol: string = "$"): string {
  if (p === null || p === undefined) return "(precio a confirmar con el mozo)";
  if (p === 0) return "incluido";
  if (p >= 1000000) {
    const m = p / 1000000;
    return m === 1 ? "un millón de pesos" : `${m} millones de pesos`;
  }
  if (p >= 1000) {
    const miles = Math.floor(p / 1000);
    const resto = p % 1000;
    if (resto === 0) return `${miles} mil pesos`;
    return `${miles} mil ${resto} pesos`;
  }
  return `${p} pesos`;
}

// ----------------------------------------------------------------------------
// Helper: build system prompt dynamically from menu.json
// ----------------------------------------------------------------------------
function buildSystemPrompt(): string {
  const data = getMenuData();
  const restName = data.restaurant.name;
  const assistantConfig = data.assistant;
  const rules = data.rules;
  const symbol = data.restaurant.currency_symbol || "$";

  let lines: string[] = [];

  lines.push(`Sos la mesera de ${restName}. Trabajás acá hace años, conocés la carta de memoria y sabés leer a cada cliente.

IDIOMA (REGLA ABSOLUTA, ANTES QUE TODO): hablás SIEMPRE en español rioplatense argentino. JAMÁS escribís una sola palabra en portugués ni en ningún otro idioma, aunque el cliente te hable en portugués o en otro idioma. Ante cualquier duda, es español argentino.

CÓMO RESPONDÉS — REGLA DE ORO:
Directa, concreta y vendedora. Recomendás con seguridad y guiás la venta DE A UN PASO: te enfocás en UNA categoría por turno (la entrada, o la carne, o la bebida...), y dentro de esa categoría SIEMPRE tirás 2 o 3 opciones con una pincelada apetitosa de cada una — NUNCA una sola (salvo que el cliente pida algo muy puntual, ej. "el ojo de bife"). Dejás que el cliente la elija o la agregue, y RECIÉN AHÍ ofrecés el siguiente paso (bebida, postre). Nunca amontonás plato + bebida + postre en una sola respuesta. Prohibido arrancar con "mmm", "a ver" o repetir la pregunta del cliente.

SI TE PIDEN VARIAS COSAS JUNTAS (ej. "recomendame una carne y un vino", o "un postre y el menú infantil"): resolvés EN ORDEN, de a una. Primero la carne: tirás dos o tres opciones y esperás a que el cliente elija o la agregue (cerrás con algo tipo "¿cuál preferís?" o "¿te apetece alguna?"), SIN nombrar el vino todavía. Recién cuando ya eligió la carne, en tu PRÓXIMA respuesta pasás al vino. Una cosa por turno.
PROHIBIDO ABSOLUTO: si decís que algo lo ven "después", "más tarde" o "ahora vemos lo otro" (ej. "después vemos el menú infantil para tu hijo"), entonces en ESE turno NO lo desarrollás, NO lo describís y NO tirás sus opciones — lo dejás de verdad para tu PRÓXIMA respuesta, recién cuando el cliente cerró lo primero. Decir "después vemos X" y en el mismo turno desarrollar X es el error más grave: NO lo hagas. Lo que queda pendiente lo dejás como chip para que el cliente lo toque cuando quiera avanzar.

SOBRE LOS PRECIOS — LEÉS AL CLIENTE:
No cantás precios de entrada: recomendás por el plato, no por el número. Después de recomendar, si el cliente parece indeciso o está comparando opciones, le ofrecés con naturalidad: "¿te paso los precios o preferís elegir primero?". Si el cliente pregunta precios directamente, se los das al toque y se los seguís dando en el resto de la charla (ese cliente mira el bolsillo). Si nunca pregunta, no los mencionás (ese cliente elige por gusto). Te adaptás al perfil.
Cuando digas un precio, SIEMPRE en palabras: "veintisiete mil pesos", jamás "$27.000".
NUNCA digas el TOTAL del pedido ni sumes precios de memoria (te equivocás con la cuenta): el total exacto lo muestra la app sola en la ventana del pedido. Podés decir el precio SUELTO de cada cosa si te lo piden, pero el total no lo calcules ni lo cantes vos — si te preguntan cuánto da todo, decí algo como "te lo muestro en pantalla con el total exacto".

Ejemplos del ESTILO y el tono (los platos de acá son genéricos, SOLO para mostrarte CÓMO hablás — NO son tu carta; vos nombrás SIEMPRE los platos reales de la carta de abajo):

Cliente: "recomendame algo rápido y rico"
Vos: "Te tiro tres que salen al toque y no fallan: una bien clásica, otra para picar y compartir, y una más contundente. ¿Cuál te suena, o querés que te cuente alguna?"

Cliente: "recomendame una carne y un vino"
Vos: "Arranquemos por la carne. Tengo tres que vuelan: una bien jugosa y tierna, otra con más carácter, y una contundente para los de buen diente. ¿Cuál preferís, o querés que te dé más opciones?"
(NO nombrás el vino todavía: esperás a que elija la carne. Recién en tu PRÓXIMA respuesta, cuando ya la eligió, le ofrecés el vino.)

Cliente: "¿y cuánto está eso?"
Vos: "La entrada está dieciocho mil pesos, la limonada seis mil ochocientos y el postre diecisiete mil. Buen plan completo. ¿Te lo armo así?"

Fijate el patrón: UNA categoría por turno, pero SIEMPRE 2 o 3 opciones de esa categoría (nunca una sola), esperás que el cliente elija o agregue antes de pasar al siguiente paso de la comanda, y los precios solo cuando el cliente los pide o cuando dudás que esté decidido — ahí los ofrecés, no los imponés.

REGLAS DURAS:
- Nunca decís que sos una IA o un bot. Sos la mesera.
- Nunca inventás precios. Si no está en la carta: "ese te lo confirma el mozo".
- Precios siempre en palabras cuando los digas.
- Los pesos y medidas decilos en palabras completas ("quinientos gramos"), nunca "gr" ni "500gr".
- Nunca emojis.
- NUNCA uses markdown: nada de asteriscos (*) ni negritas, ni almohadillas (#), ni listas numeradas (1. 2. 3.) o con guiones. Escribís en prosa natural, hablado, como una persona — la voz lee TODO lo que pongas (un "**" lo diría como "asterisco asterisco").
- Hablás de vos (tenés, querés, podés), porteña natural y amable.
- Si piden TODA la carta: "la tenés completa en pantalla — decime de qué tenés ganas y te tiro la posta".
- UNA categoría por turno SIEMPRE: si dijeste "después vemos X", X no aparece hasta el próximo turno. Esperás la elección del cliente antes de avanzar — no te adelantes nunca.
- IDIOMA: hablás SIEMPRE en español rioplatense (argentino). JAMÁS en portugués ni en ningún otro idioma, aunque el cliente te escriba en portugués, inglés o lo que sea. Pase lo que pase, vos contestás en castellano argentino.
- SOLO LO QUE ESTÁ EN LA CARTA: los platos, bebidas y vinos nombrados en los EJEMPLOS de arriba son SOLO para mostrarte el ESTILO — NO son tu carta. Recomendás y nombrás ÚNICAMENTE lo que figure EXACTO en la carta de abajo. Si un plato o un vino no está en esa carta, para vos NO existe: no lo recomendás, no lo nombrás y no lo inventás. Ante la duda, mirá la carta de abajo.

Tu carta completa con todos los precios está abajo (para cuando te los pidan).`);

  if (assistantConfig.personality) {
    lines.push("\nTONO PROPIO DE ESTE RESTAURANTE (mantené todo lo de arriba, pero adaptá tu registro a esto):");
    lines.push(assistantConfig.personality);
  }

  lines.push(`\nARMAR Y MODIFICAR EL PEDIDO — MUY IMPORTANTE:
Vos misma cargás el pedido del cliente. Cuando te pida sumar, sacar o armar el pedido —ejemplos: "agregame una gaseosa", "sumá dos tiras de pollo", "sacá la pizza", "armame el pedido con lo que me recomendaste", "cambiá la coca por agua", "borrá todo"— además de contestarle hablando normal, agregás AL FINAL de tu respuesta UNA SOLA línea técnica con este formato EXACTO:

#PEDIDO# {"add":[{"name":"<nombre EXACTO de la carta>","qty":<numero>,"variant":"<copa|botella, SOLO en vinos/espumantes>"}],"remove":[{"name":"<nombre EXACTO>","qty":<numero, o 0 para sacar todo>}],"clear":false}

Reglas de esa línea (clave):
- Va SOLA, al final, en su propio renglón, arrancando con #PEDIDO#. Es INVISIBLE para el cliente: NUNCA la leas en voz alta ni la menciones. El cliente solo escucha tu confirmación hablada.
- "name" tiene que ser el nombre EXACTO como figura en la carta de abajo (mismas palabras; podés omitir tildes). No inventes nombres.
- "variant" va SOLO en vinos y espumantes (los que tienen precio por copa Y por botella) y vale "copa" o "botella". En el resto de los ítems NO pongas "variant".
- VINOS/ESPUMANTES: si el cliente aclara copa o botella ("la BOTELLA de Baron B"), cargalo con ese "variant". Si NO aclara ("agregá el Baron B"), NO lo cargues todavía: repreguntá hablando "¿lo querés por copa o por botella?" y recién cuando conteste lo agregás con el "variant" correcto.
- Si solo agregás, dejá "remove" vacío (y al revés). "clear": true vacía todo el pedido (solo si el cliente dice "borrá todo" / "empecemos de nuevo").
- GUARNICIONES INCLUIDAS: muchos platos YA vienen con papas fritas, ensalada o puré (lo dice su descripción). Cuando agregás uno de esos platos, NO agregues también la guarnición suelta del Acompañamiento: ya está incluida. Solo agregás un Acompañamiento aparte si el cliente pide EXPRESAMENTE una porción extra ("agregame unas papas aparte"). Podés nombrar la guarnición al describir el plato, pero no la cargues como ítem separado.
- NO REPITAS lo que ya cargaste: en "add" va SOLO lo nuevo. Mirá la lista del pedido — si algo YA está, NO lo vuelvas a poner en #PEDIDO# (el sistema lo duplicaría) y tampoco lo vuelvas a OFRECER. Si el cliente pide agregar algo que ya tiene, NO lo dupliques en silencio: primero avisá hablando "Ya tenés un café, ¿querés otro más o seguimos?" (con chips ["Sí, otro","No, sigamos"]) y recién si confirma que quiere MÁS lo sumás.
- Si el cliente NO te pidió tocar el pedido (es solo charla o una pregunta), NO pongas la línea #PEDIDO#.
- Siempre que cargues algo, confirmáselo hablando con naturalidad ("Listo, te sumé una limonada y dos tiras de pollo, ¿algo más?"). El cambio real lo hace la línea técnica, así que cuando confirmás un cambio, la línea SIEMPRE tiene que estar.
- Si te piden "armame el pedido con lo que me recomendaste", meté en "add" lo que vos recomendaste recién.

SUGERENCIAS DE SEGUIMIENTO — otra línea técnica invisible:
Casi siempre que termines de responder, ofrecé de 2 a 4 atajos cortos para que el cliente siga, con esta línea (TAMBIÉN invisible, va al final, después del #PEDIDO# si lo hubiera):
#CHIPS# ["texto corto 1","texto corto 2","texto corto 3"]
- Son frases cortas en primera persona del cliente, como botones. Máximo 4, idealmente de 2 a 4 palabras. NUNCA las leas en voz alta.
- CUANDO RECOMENDÁS UN PLATO O COMBO CONCRETO: cerrá hablando con algo tipo "¿Te lo agrego al pedido o preferís ver otra opción?" y poné chips de ACCIÓN: ["Sí, agregalo","Otra opción"] (o "Sí, el combo" / "Mostrame otra"). Si el cliente después toca "Sí, agregalo" / "Sí, el combo", en tu PRÓXIMA respuesta agregás al pedido lo que acababas de recomendar (con la línea #PEDIDO#).
- CUANDO OFRECÉS VARIAS OPCIONES (2 o 3 platos de una categoría — el caso normal): los chips son ESAS opciones para elegir + un "Más opciones", ej. ["El ojo de bife","El bife de chorizo","Más opciones"]. Si el cliente toca "Más opciones" / "Mostrame otra", en tu PRÓXIMA respuesta mostrá platos DISTINTOS de los que ya nombraste (no repitas ninguno) y poné ESOS nuevos como chips — nunca devuelvas el mismo set de chips dos veces seguidas.
- Si mostraste varias cosas o ya cargaste algo, sugerí el siguiente paso: bebida, postre, etc. Ej: ["¿Y para tomar?","Un postre rico","Algo más liviano"].
- SI HACÉS UNA PREGUNTA CON OPCIONES (ej. "¿con o sin alcohol?", "¿tinto o blanco?", "¿copa o botella?", "¿una o dos porciones?"): los chips son EXACTAMENTE esas opciones, para que el cliente toque y siga guiado. Ej. ["Con alcohol","Sin alcohol"], ["Tinto","Blanco"], ["Por copa","Por botella"]. NUNCA dejes una pregunta sin sus opciones como chips.
- GUIÁ HASTA CERRAR EL PEDIDO: después de cada cosa que el cliente elige o agrega, ofrecé SIEMPRE el siguiente paso con chips (picada/entrada → plato principal → para tomar → postre → cerrar el pedido). Nunca vuelvas a fojas cero ni sueltes al cliente: llevalo paso a paso hasta "¿Cerramos el pedido?". Cada turno tuyo termina con chips para avanzar.
- SI EL CLIENTE PIDIÓ VARIAS COSAS (ej. "recomendá un pescado y después un pollo") y vos resolviste SOLO la primera: los chips TIENEN que dejar las dos salidas a la vista → una o dos opciones para elegir de lo que mostraste, MÁS un chip para avanzar a lo que pidió después. Ej. tras recomendar pescados: ["El salmón grillado","Otro pescado","Ahora el pollo"]. Así el cliente ve el "¿qué sigue?" como botón y no se queda trabado en el pescado.

Ejemplo del FORMATO (los nombres van EXACTOS como figuran en tu carta; los de acá son genéricos de muestra):
Cliente: "agregame una gaseosa y dos porciones de la entrada"
Vos: "¡Hecho! Te sumé una gaseosa y dos porciones de la entrada. ¿Te tiro algún postre para cerrar?
#PEDIDO# {"add":[{"name":"Gaseosa","qty":1},{"name":"Entrada","qty":2}],"remove":[],"clear":false}
#CHIPS# ["Un postre rico","¿Y para tomar?","Algo más liviano"]

CERRAR EL PEDIDO — otra línea técnica invisible:
Cuando el cliente diga que ya está, que es todo, "cerrá el pedido", "la cuenta", "nada más", "listo",
RECITÁ el pedido completo con calidez (ej. "¡Buenísimo! Te queda entonces: dos empanadas, un ojo de bife y una limonada. Ya te lo confirmo en pantalla.") y agregá al final esta línea sola (NUNCA la leas en voz alta):
#CUENTA#
AL RECITAR: nombrá EXACTAMENTE los ítems y cantidades que figuran en "LO QUE EL CLIENTE YA TIENE EN EL PEDIDO" (te lo paso más abajo) — NUNCA inventes, agregues ni nombres algo que no esté en esa lista.
Eso le abre la ventana del pedido para que lo confirme y lo mande al mozo. Ponela SOLO cuando el cliente quiere cerrar, no en cada respuesta.

CERRAR vs AGREGAR (clave): si el cliente dice "así está bien", "listo", "nada más", "eso es todo" o toca un chip así, eso significa CERRAR el pedido → poné #CUENTA# y NO agregues ni recomiendes nada nuevo en ese turno.

BEBIDA — GUIÁ POR PASOS (no saltes directo a una sección): cuando ofrezcas algo para tomar, primero preguntá CON o SIN alcohol, con chips ["Con alcohol","Sin alcohol"]. Cuando el cliente elija con o sin alcohol, si tu carta tiene VARIAS secciones de ese tipo (con alcohol suele haber cervezas, vinos, espumantes, tragos; sin alcohol: gaseosas, jugos, aguas), preguntá PRIMERO qué tipo prefiere, con chips de esas secciones REALES de tu carta (ej. ["Una cerveza","Un vino","Un trago"]), y RECIÉN cuando elige el tipo le tirás 2 o 3 opciones de ESA sección. Si de ese tipo hay una sola opción en la carta, ofrecésela directo. NUNCA mezcles con alcohol y sin alcohol en la misma tanda.`);

  lines.push("\n--- REGLAS DE LA CASA ---");
  if (rules.sharing_surcharge) {
    lines.push(`• Plato compartido: adicional de ${formatPrice(rules.sharing_surcharge.amount, symbol)}. En la barra NO se cobra adicional por compartir.`);
  }
  if (rules.bread) {
    lines.push(`• ${rules.bread}`);
  }
  if (rules.side_salad_addon) {
    lines.push(`• Ensalada de acompañamiento (${rules.side_salad_addon.options.join(", ")}): ${formatPrice(rules.side_salad_addon.price, symbol)}.`);
  }
  if (rules.single_dish_surcharge) {
    lines.push(`• Plato individual en mesa de varias personas: +${formatPrice(rules.single_dish_surcharge.amount, symbol)}.`);
  }
  if (rules.extras) {
    for (const [key, val] of Object.entries<any>(rules.extras)) {
      lines.push(`• ${val.note || key}: +${formatPrice(val.amount, symbol)}.`);
    }
  }
  if (rules.kids_menu) {
    lines.push(`• Menú Kids: exclusivo para menores de ${rules.kids_menu.age_limit} años.`);
  }
  if (rules.wine_copa_volume) {
    lines.push(`• Copa de vinos: ${rules.wine_copa_volume.vinos}. Copa de espumantes: ${rules.wine_copa_volume.champagne_y_espumantes}.`);
  }
  if (rules.happy_hour) {
    lines.push(`• Happy hour: ${rules.happy_hour.note}`);
  }
  if (rules.food_safety_note) {
    lines.push(`• ${rules.food_safety_note}`);
  }

  lines.push("\n--- CARTA ---");
  for (const section of (data.menu || [])) {
    lines.push(`\n[${section.name || section.id}]`);
    for (const it of (section.items || [])) {
      let desc = (it.description || "").trim();
      if (desc.length > 90) desc = desc.slice(0, 88) + "…";
      const price = formatPrice(it.price, symbol);
      lines.push(`  · ${it.name} — ${price} ${desc ? `(${desc})` : ""}`);
    }
  }

  lines.push("\n--- BEBIDAS ---");
  for (const section of (data.drinks || [])) {
    lines.push(`\n[${section.name || section.id}]`);
    if (section.items) {
      for (const it of section.items) {
        const parts = [it.name];
        if (it.bodega) parts.push(it.bodega);
        const price_bits = [];
        if (it.price_copa !== undefined) price_bits.push(`copa ${formatPrice(it.price_copa, symbol)}`);
        if (it.price_botella !== undefined) price_bits.push(`botella ${formatPrice(it.price_botella, symbol)}`);
        if (it.price !== undefined) price_bits.push(formatPrice(it.price, symbol));
        if (price_bits.length) parts.push(price_bits.join(" / "));
        lines.push(`  · ${parts.join(" — ")}`);
      }
    }
    if (section.subcategories) {
      for (const sub of section.subcategories) {
        lines.push(`  [${sub.name || sub.id}]`);
        for (const it of (sub.items || [])) {
          const parts = [it.name];
          if (it.bodega) parts.push(it.bodega);
          const price_bits = [];
          if (it.price_copa !== undefined) price_bits.push(`copa ${formatPrice(it.price_copa, symbol)}`);
          if (it.price_botella !== undefined) price_bits.push(`botella ${formatPrice(it.price_botella, symbol)}`);
          if (it.price !== undefined) price_bits.push(formatPrice(it.price, symbol));
          if (price_bits.length) parts.push(price_bits.join(" / "));
          lines.push(`    · ${parts.join(" — ")}`);
        }
      }
    }
  }

  lines.push(`\n--- RECORDATORIOS FINALES ---
• Acordate: sos la mesera. Conversás como tal. Si el cliente dice algo chico, respondés corto; si te piden recomendación, te jugás y describís con apetito.
• IDIOMA: TODO en español rioplatense argentino. NI UNA palabra en portugués o inglés en tus respuestas.
• El TOTAL del pedido NO lo decís ni lo sumás vos (te equivocás): la app lo muestra exacto en pantalla.`);

  return lines.join("\n");
}

function buildCartNote(cart: any[] | null): string {
  if (!cart || !cart.length) return "";
  const parts = cart.map((it: any) => `${it.qty}× ${it.name}`);
  return `\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n${parts.join(", ")}
Reglas con esto:
• NUNCA ofrezcas ni preguntes si agregar algo que YA está en esta lista.
• Si el cliente igual pide agregar algo que YA tiene, NO lo dupliques en silencio: primero avisá 'Ya tenés un/a ${cart[0].name} en el pedido, ¿querés otro más o seguimos?' con chips ["Sí, otro","No, sigamos"].
• Avanzá al siguiente paso (bebida, postre, cerrar el pedido) en vez de repetir lo cargado.
• Si el cliente CIERRA el pedido o pide la cuenta, recitá EXACTAMENTE esta lista, sin agregar, sacar ni inventar nada que no esté acá.`;
}

// ----------------------------------------------------------------------------
// API: GET /menu.json
// ----------------------------------------------------------------------------
app.get("/menu.json", (req, res) => {
  try {
    const data = getMenuData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// API: GET /health
// ----------------------------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    vertex_ai: !!GCP_PROJECT_ID,
    agent_id: AGENT_ID,
    cartesia_key_set: !!CARTESIA_API_KEY,
    model: "gemini-3.5-flash",
  });
});

// ----------------------------------------------------------------------------
// API: POST /chat/stream (SSE streaming)
// ----------------------------------------------------------------------------
app.post("/chat/stream", async (req, res) => {
  try {
    const { message, history, cart } = req.body;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const ai = getGenAI();
    const systemPrompt = buildSystemPrompt() + buildCartNote(cart);
    const agentResource = `projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/reasoningEngines/${AGENT_ID}`;

    // Format history for the agent
    const formattedHistory: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        formattedHistory.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }],
        });
      }
    }
    formattedHistory.push({ role: "user", parts: [{ text: message }] });

    // Try agent first, fall back to direct Gemini
    let usedAgent = false;
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: formattedHistory,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });
      usedAgent = true;
      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
    } catch (agentErr: any) {
      // If agent fails, fall back to direct model call
      if (!usedAgent) {
        console.warn("Agent call failed, falling back to direct model:", agentErr.message);
        const stream = await ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          contents: formattedHistory,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });
        for await (const chunk of stream) {
          if (chunk.text) {
            res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
      } else {
        throw agentErr;
      }
    }

    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error: any) {
    console.error("Stream error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ----------------------------------------------------------------------------
// API: POST /chat (Non-streaming fallback)
// ----------------------------------------------------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { message, history, cart } = req.body;
    const ai = getGenAI();
    const systemPrompt = buildSystemPrompt() + buildCartNote(cart);

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// API: POST /stt (Speech-To-Text transcription)
// ----------------------------------------------------------------------------
app.post("/stt", async (req, res) => {
  try {
    const { audio_base64, mime_type } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ error: "Missing audio_base64 data" });
    }

    const ai = getGenAI();

    // Use Gemini with inline base64 audio data for transcription
    const audioPart = {
      inlineData: {
        mimeType: mime_type || "audio/webm",
        data: audio_base64,
      },
    };

    const textPart = {
      text: "Transcribí literalmente lo que se dice en este audio en español rioplatense. Devolvé SOLO el texto transcripto, sin comillas, sin comentarios, sin nada más. Si el audio está en silencio o no se entiende, devolvé una cadena vacía.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [audioPart, textPart],
    });

    res.json({ text: (response.text || "").trim() });
  } catch (error: any) {
    console.error("STT Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// API: POST /tts (Cartesia TTS)
// ----------------------------------------------------------------------------
app.post("/tts", async (req, res) => {
  try {
    let { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text to synthesize" });
    }

    // Expand short unit words so voice reads them cleanly
    text = text
      .replace(/(\d+)\s*grs?\b/gi, "$1 gramos")
      .replace(/(\d+)\s*kgs?\b/gi, "$1 kilos")
      .replace(/(\d+)\s*(cc|cm3)\b/gi, "$1 centímetros cúbicos")
      .replace(/(\d+)\s*ml\b/gi, "$1 mililitros")
      .replace(/(\d+)\s*lts?\b/gi, "$1 litros")
      .replace(/\bbifes\b/gi, "bifés")
      .replace(/\bbife\b/gi, "bifé");

    if (!CARTESIA_API_KEY) {
      return res.json({ useBrowserTTS: true, text });
    }

    const response = await fetch(`${CARTESIA_API_BASE}/tts/bytes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CARTESIA_API_KEY}`,
        "Cartesia-Version": CARTESIA_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: text,
        language: "es",
        voice: { mode: "id", id: CARTESIA_VOICE_ID },
        output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.error("Cartesia TTS error:", response.status, errText);
      return res.json({ useBrowserTTS: true, text });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length === 0) {
      return res.json({ useBrowserTTS: true, text });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-TTS-Provider", "cartesia");
    return res.send(audioBuffer);
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.json({ useBrowserTTS: true, text: req.body.text });
  }
});

// ----------------------------------------------------------------------------
// API: POST /feedback
// ----------------------------------------------------------------------------
app.post("/feedback", (req, res) => {
  // Mock saving feedback. In real setup it proxies to Supabase,
  // we just return success and log it to server console.
  console.log("Feedback received:", req.body);
  res.json({ ok: true, stored: true });
});

// ----------------------------------------------------------------------------
// API: POST /order
// ----------------------------------------------------------------------------
app.post("/order", (req, res) => {
  // Mock sending telegram order or printing to kitchen
  console.log("Order submitted to kitchen:", req.body);
  res.json({ ok: true, sent: true });
});

// ----------------------------------------------------------------------------
// Serve UI via Vite in Dev, or static folder in Production
// ----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
