import express from "express";
import path from "path";
import { chatRouter } from "./routes/chat";
import { visionRouter } from "./routes/vision";

export const app = express();

app.use(express.json({ limit: "50mb" }));

// Register routes
app.use("/api", chatRouter);
app.use("/api", visionRouter);

// Vite middleware for development or Static files for production
export async function setupFrontendRoutes() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
}
