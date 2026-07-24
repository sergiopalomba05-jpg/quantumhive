import { app, setupFrontendRoutes } from "./src/server/app";
import { setupLiveWebSocket } from "./src/server/routes/live";
import { getServerPort } from "./src/lib/runtime";

async function startServer() {
  const PORT = getServerPort(process.env);

  // Initialize frontend rendering (Vite or Static)
  await setupFrontendRoutes();

  // Start HTTP server
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Start WebSocket Live API
  setupLiveWebSocket(server);
}

startServer();
