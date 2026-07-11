import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { VertexAI } from "@google-cloud/vertexai";
import { menuData } from "./src/menuData";
import { buildSystemPrompt } from "./src/systemPrompt";
import { WebSocketServer } from "ws";

// --- Vertex AI Configuration ---
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "project-aa5fb956-b08a-4e13-869";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

// Initialize Vertex AI client with ADC (Application Default Credentials)
const vertexAI = new VertexAI({ project: projectId, location: location });

// Get the generative model
const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 1024,
  },
});

console.log(`[Vertex AI] Project: ${projectId}, Location: ${location}`);

function isQuotaError(error: any): boolean {
  const errMsg = String(error?.message || error || "").toLowerCase();
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    errMsg.includes("quota") ||
    errMsg.includes("429") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("rate-limits") ||
    errMsg.includes("limit")
  );
}

function getQuotaFallbackMessage(): string {
  return "¡Uy, che, mil disculpas! Tuvimos tantos pedidos y clientes charlando hoy que se me cansó un poquito la garganta y me quedé sin señal. \n\n¿Te parece si vas mirando la carta y agregando lo que te guste al pedido? En un ratito ya vuelvo a estar lista para recomendarte de todo.\n\n#CHIPS# [\"Ver la carta\", \"¡Quiero postre!\", \"¿Y para tomar?\"]";
}

function getGeneralFallbackMessage(): string {
  return "Disculpame, che, estoy teniendo un problemita técnico para conectarme con la cocina. Pero no te preocupes, ¡la carta completa está acá en pantalla para que elijas lo que quieras!\n\n#CHIPS# [\"Ver la carta\", \"¡Quiero postre!\", \"¿Y para tomar?\"]";
}

async function streamFallbackMessage(res: any, message: string) {
  const chunkSize = 4;
  let index = 0;
  while (index < message.length) {
    const chunk = message.slice(index, index + chunkSize);
    res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    index += chunkSize;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  res.write("event: done\ndata: {}\n\n");
  res.end();
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "8080", 10);

  // Middlewares
  app.use(express.json({ limit: "50mb" }));

  // --- API ENDPOINTS ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      vertex_ai: true,
      project: projectId,
      location: location,
      gemini_model: "gemini-2.5-flash-preview",
    });
  });

  // Serve menu.json (both endpoints for compatibility)
  app.get("/menu.json", (req, res) => {
    res.json(menuData);
  });
  app.get("/api/menu", (req, res) => {
    res.json(menuData);
  });

  // Mocks for local persistence / feedback
  app.post("/api/feedback", (req, res) => {
    console.log("Feedback recibido:", req.body);
    res.json({ ok: true, stored: true });
  });

  app.post("/api/order", (req, res) => {
    console.log("Pedido recibido para mesa:", req.body.table, req.body.items);
    res.json({ ok: true, sent: true });
  });

  app.get("/api/cliente", (req, res) => {
    res.json({ conocido: false });
  });

  app.post("/api/cliente", (req, res) => {
    res.json({ ok: true, stored: true });
  });

  app.post("/api/evento", (req, res) => {
    res.json({ ok: true, stored: true });
  });

  // Text-To-Speech endpoint: triggers browser Synthesis API by returning JSON
  app.post("/api/tts", (req, res) => {
    const text = req.body.text || "";
    res.json({ speak: text, text: text });
  });

  // Speech-To-Text endpoint: transcribes client-side audio using Gemini
  app.post("/api/stt", async (req, res) => {
    const { audio_base64, mime_type } = req.body;
    if (!audio_base64) {
      res.status(400).json({ error: "Falta el archivo de audio base64" });
      return;
    }

    try {
      const cleanMimeType = mime_type || "audio/webm";
      const sttModel = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await sttModel.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcribí literalmente lo que se dice en este audio en español rioplatense. Devolvé SOLO el texto transcripto, sin comillas, sin comentarios, sin nada más. Si el audio está en silencio o no se entiende, devolvé una cadena vacía." },
              { inlineData: { mimeType: cleanMimeType, data: audio_base64 } },
            ],
          },
        ],
      });

      const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ text: text.trim() });
    } catch (error: any) {
      console.error("Error en STT:", error);
      res.status(500).json({ error: error.message || "Error al transcribir audio" });
    }
  });

  // Non-streaming chat endpoint
  app.post("/api/chat", async (req, res) => {
    console.log("[Chat] Received request:", { bodyKeys: Object.keys(req.body || {}), messagePreview: (req.body?.message || "").substring(0, 60) });
    const { message, history, cart, lowLatency, sessionId } = req.body;

    try {
      // Build cart context
      let cartNote = "";
      if (cart && cart.length > 0) {
        const itemsList = cart.map((i: any) => `${i.qty}x ${i.name}`).join(", ");
        cartNote = `\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n${itemsList}`;
      }

      const prompt = buildSystemPrompt() + cartNote;

      const contents = history.map((h: any) => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: h.text }],
      }));
      contents.push({ role: "user", parts: [{ text: message }] });

      const modelName = lowLatency ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
      const chatModel = vertexAI.getGenerativeModel({
        model: modelName,
        systemInstruction: prompt,
      });

      const streamingResult = await chatModel.generateContentStream({
        contents: contents,
        generationConfig: {
          temperature: 0.8,
        },
      });

      for await (const chunk of streamingResult.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write("event: done\ndata: {}\n\n");
      res.end();
    } catch (error: any) {
      console.error("Error en Chat Stream:", error);
      const fallback = isQuotaError(error) ? getQuotaFallbackMessage() : getGeneralFallbackMessage();
      await streamFallbackMessage(res, fallback);
    }
  });

  // --- CLIENT SERVING ---

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";
    console.log("[WS] Upgrade request for:", url);
    if (url.startsWith("/api/live")) {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        wss.emit("connection", clientWs, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs, req) => {
    const url = req.url || "";
    if (!url.includes("/api/live")) {
      clientWs.close();
      return;
    }

    const urlObj = new URL(url, "http://localhost");
    const tableParam = urlObj.searchParams.get("table") || "";
    const cartParam = urlObj.searchParams.get("cart") || "";
    let parsedCart: any[] = [];
    if (cartParam) {
      try {
        parsedCart = JSON.parse(decodeURIComponent(cartParam));
      } catch (e) {
        console.error("Error parsing cart parameter:", e);
      }
    }

    // Build cart context
    let cartNote = "";
    if (parsedCart && parsedCart.length > 0) {
      const itemsList = parsedCart.map((i: any) => `${i.qty}x ${i.name}`).join(", ");
      cartNote = `\n\n--- LO QUE EL CLIENTE YA TIENE EN EL PEDIDO ---\n${itemsList}`;
    }

    console.log("WebSocket client connected to Live API for table:", tableParam);

    try {
      // For Live API, we need to use the @google/genai SDK with vertexai: true
      // The official @google-cloud/vertexai doesn't support Live API yet
      console.log("[Live] Importing @google/genai SDK...");
      const { GoogleGenAI } = await import("@google/genai");
      console.log("[Live] SDK imported successfully");

      const ai = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
      });
      console.log("[Live] GoogleGenAI client created");

      console.log("[Live] Connecting to model: gemini-live-2.5-flash-preview");
      const session = await ai.live.connect({
        model: "gemini-live-2.5-flash-preview",
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: {
            parts: [{ text: "Sos la mesera de La Escaloneta, un restaurante en Buenos Aires. Respondés en español rioplatense casual, con onda. Sé breve y cálida. IMPORTANTE: Si el cliente activa la cámara, vas a poder VERLO. Cuando esto pase, saludalo con mucha onda, decile que sí la estás viendo, y hacelo un cumplido personal sobre su aspecto (su ropa, su estilo, su sonrisa, lo que veas). Sé natural, como si lo vieras en persona en el restaurante." }],
          },
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("[Live] Callback onopen fired");
          },
          onmessage: (message: any) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            const hasAudio = parts.some((p: any) => p.inlineData?.data);
            const hasText = parts.some((p: any) => p.text);
            const turnComplete = !!message.serverContent?.turnComplete;
            const interrupted = !!message.serverContent?.interrupted;
            console.log(`[Live] ← Model message: parts=${parts.length}, audio=${hasAudio}, text=${hasText}, turnComplete=${turnComplete}, interrupted=${interrupted}`);
            if (hasText) {
              const txt = parts.find((p: any) => p.text)?.text || "";
              console.log(`[Live] ← Text: "${txt.substring(0, 100)}"`);
            }
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ text: part.text }));
              }
            }
            if (turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
            if (interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            console.error("[Live] Callback onerror:", err);
          },
          onclose: (event: any) => {
            console.log("[Live] Callback onclose fired:", JSON.stringify(event));
          },
        },
      });

      console.log("[Live] Session connected successfully");
      clientWs.send(JSON.stringify({ connected: true }));

      let messageCount = 0;
      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          messageCount++;
          if (messageCount <= 5 || messageCount % 20 === 0) {
            console.log(`[Live] Received message #${messageCount}: audio=${!!parsed.audio}, text=${!!parsed.text}`);
          }
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (parsed.video) {
            session.sendRealtimeInput({
              media: { mimeType: "image/jpeg", data: parsed.video },
            });
          }
          if (parsed.text) {
            console.log(`[Live] Sending text to model: "${parsed.text.substring(0, 80)}"`);
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (err) {
          console.error("[Live] Error parsing/sending message:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client closed connection");
        if (session) {
          session.close();
        }
      });

      clientWs.on("error", (err) => {
        console.error("Client connection error:", err);
        if (session) {
          session.close();
        }
      });
    } catch (err: any) {
      console.error("[Live] Failed to connect to Live Agent:", err);
      console.error("[Live] Error message:", err?.message);
      console.error("[Live] Error stack:", err?.stack);
      const isQuota = isQuotaError(err);
      const errorMsg = isQuota ? "Quota Exceeded" : `No se pudo conectar con el agente de voz: ${err?.message || "unknown error"}`;
      clientWs.send(JSON.stringify({ error: errorMsg }));
      clientWs.close();
    }
  });
}

startServer();
