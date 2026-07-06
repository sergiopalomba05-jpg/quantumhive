import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "7860", 10);

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

// ---------------------------------------------------------------------------
// GoogleGenAI client (Vertex AI with service account)
// ---------------------------------------------------------------------------
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const SA_PATH = path.join(process.cwd(), "gcp-service-account.json");
    if (SERVICE_ACCOUNT_JSON) {
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: GCP_PROJECT_ID,
        location: GCP_LOCATION,
        googleAuthOptions: { credentials: JSON.parse(SERVICE_ACCOUNT_JSON) },
      });
    } else if (fs.existsSync(SA_PATH)) {
      const saKey = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: GCP_PROJECT_ID,
        location: GCP_LOCATION,
        googleAuthOptions: { credentials: saKey },
      });
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Set GEMINI_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON or place gcp-service-account.json");
      aiClient = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "hf-spaces" } } });
    }
  }
  return aiClient;
}

// ---------------------------------------------------------------------------
// Menu data
// ---------------------------------------------------------------------------
const menuPath = path.join(process.cwd(), "src/menu.json");
let menuDataCache: any = null;
function getMenuData() {
  if (!menuDataCache) {
    const raw = fs.readFileSync(menuPath, "utf8");
    menuDataCache = JSON.parse(raw);
  }
  return menuDataCache;
}

// Serve static files from dist/
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// API: GET /menu.json
app.get("/menu.json", (_req, res) => {
  try {
    res.json(getMenuData());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: GET /health
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    vertex_ai: !!GCP_PROJECT_ID,
    agent_id: AGENT_ID,
    cartesia_key_set: !!CARTESIA_API_KEY,
    model: "gemini-3.5-flash",
  });
});

// API: POST /chat/stream (SSE streaming via Vertex AI agent)
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
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.text }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents,
      config: { temperature: 0.7 },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
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

// API: POST /chat — Non-streaming fallback
app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = getGenAI();
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.text }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: { temperature: 0.7 },
    });
    res.json({ reply: response.text || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: POST /tts — Cartesia TTS
app.post("/tts", async (req, res) => {
  try {
    let { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    text = text
      .replace(/(\d+)\s*grs?\b/gi, "$1 gramos")
      .replace(/(\d+)\s*kgs?\b/gi, "$1 kilos")
      .replace(/(\d+)\s*(cc|cm3)\b/gi, "$1 centímetros cúbicos")
      .replace(/(\d+)\s*ml\b/gi, "$1 mililitros")
      .replace(/(\d+)\s*lts?\b/gi, "$1 litros")
      .replace(/\bbifes\b/gi, "bifés")
      .replace(/\bbife\b/gi, "bifé");

    if (!CARTESIA_API_KEY) return res.json({ useBrowserTTS: true, text });

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
      console.error("Cartesia error:", response.status);
      return res.json({ useBrowserTTS: true, text });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length === 0) return res.json({ useBrowserTTS: true, text });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-TTS-Provider", "cartesia");
    return res.send(audioBuffer);
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.json({ useBrowserTTS: true, text: req.body.text });
  }
});

// API: POST /stt
app.post("/stt", async (req, res) => {
  try {
    const { audio_base64, mime_type } = req.body;
    if (!audio_base64) return res.status(400).json({ error: "Missing audio" });
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType: mime_type || "audio/webm", data: audio_base64 } },
        { text: "Transcribí literalmente lo que se dice en este audio en español rioplatense. Devolvé SOLO el texto transcripto." },
      ],
    });
    res.json({ text: (response.text || "").trim() });
  } catch (error: any) {
    console.error("STT Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: POST /feedback
app.post("/feedback", (_req, res) => res.json({ ok: true }));
// API: POST /order
app.post("/order", (_req, res) => res.json({ ok: true }));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HF Spaces server running on http://0.0.0.0:${PORT}`);
});
