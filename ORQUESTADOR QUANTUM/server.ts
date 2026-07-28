import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel } from "@google/genai";
import { WebSocketServer } from "ws";
import multer from "multer";
import { getServerPort } from "./src/lib/runtime";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = getServerPort(process.env);

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // 1. Google Search Data (gemini-3.5-flash)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      const text = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      res.json({ text, chunks });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. High Thinking (gemini-3.1-pro-preview)
  app.post("/api/think", async (req, res) => {
    try {
      const { message } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: message,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      res.json({ text: response.text, parts });
    } catch (error: any) {
      console.error("Think error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Analyze Video (gemini-3.1-pro-preview)
  app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No video file uploaded");
      const base64Data = req.file.buffer.toString("base64");
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: {
          parts: [
            { text: "Analyze this video and describe the key events." },
            { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
          ]
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Video analyze error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Analyze Image (gemini-3.1-pro-preview)
  app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No image file uploaded");
      const base64Data = req.file.buffer.toString("base64");
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: {
          parts: [
            { text: "Analyze this image and describe what you see." },
            { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
          ]
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Image analyze error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
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

  // Live API WebSocket Setup
  const wss = new WebSocketServer({ server, path: "/live" });
  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a helpful assistant.",
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      });
      
      clientWs.on("close", () => {
        // Handle cleanup if possible
      });
    } catch (error) {
      console.error("Live API connection error:", error);
      clientWs.close();
    }
  });
}

startServer();
