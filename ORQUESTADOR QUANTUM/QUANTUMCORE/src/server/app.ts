import express from "express";
import path from "path";
import { chatRouter } from "./routes/chat";
import { visionRouter } from "./routes/vision";
import { providersRouter } from "./routes/providers";
import { githubRouter } from "./routes/github";
import { graphRouter } from "./routes/graph";
import { videoIngestRouter } from "./routes/videoIngest";

export const app = express();

const workspaceRoot = path.resolve(process.cwd(), "..", "..");
const graphifyStaticPath = process.env.GRAPHIFY_STATIC_PATH || path.join(workspaceRoot, "graphify-out");
const catalogPwaStaticPath = process.env.CATALOGO_PWA_STATIC_PATH || path.join(workspaceRoot, "agencia", "productos", "catalogo-pwa");

app.use(express.json({ limit: "50mb" }));

// Register routes
app.use("/api", chatRouter);
app.use("/api", visionRouter);
app.use("/api", providersRouter);
app.use("/api", githubRouter);
app.use("/api", graphRouter);
app.use("/api", videoIngestRouter);

// Vite middleware for development or Static files for production
export async function setupFrontendRoutes() {
  app.use("/graphify-out", express.static(graphifyStaticPath));
  app.use("/catalogo-pwa", express.static(catalogPwaStaticPath));

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
