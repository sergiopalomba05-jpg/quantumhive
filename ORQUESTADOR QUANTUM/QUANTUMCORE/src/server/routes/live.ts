import { WebSocketServer } from "ws";
import { Server } from "http";
import { ai } from "../../core/providers/ai";
import { Modality } from "@google/genai";

export function setupLiveWebSocket(server: Server) {
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

  return wss;
}
