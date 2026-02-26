import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { RoomManager } from "./rooms/room-manager.ts";
import { createApiRoutes } from "./routes/api.ts";
import { createWebSocketHandlers } from "./ws/websocket-handler.ts";

const PORT = Number(process.env.PORT) || 3000;

const roomManager = new RoomManager();
const wsHandlers = createWebSocketHandlers(roomManager);

const app = new Hono();

// API routes
app.route("/api", createApiRoutes(roomManager));

// Health check
app.get("/health", (c) => c.json({ status: "ok", rooms: roomManager.getRoomCount() }));

// Serve static frontend files in production
app.use("/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ root: "./public", path: "index.html" }));

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0", // Listen on all network interfaces
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { playerId: null, roomCode: null },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return app.fetch(req, { ip: server.requestIP(req) });
  },
  websocket: wsHandlers,
});

// Get local network IP
const networkInterfaces = require("os").networkInterfaces();
let localIP = "localhost";
for (const name of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[name]) {
    if (iface.family === "IPv4" && !iface.internal) {
      localIP = iface.address;
      break;
    }
  }
}

console.log(`Co-Opoly Deal server running on:`);
console.log(`  Local:   http://localhost:${server.port}`);
console.log(`  Network: http://${localIP}:${server.port}`);
