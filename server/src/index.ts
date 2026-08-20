import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { RoomManager } from "./rooms/room-manager.ts";
import { createApiRoutes } from "./routes/api.ts";
import { createWebSocketHandlers } from "./ws/websocket-handler.ts";
import { FileRoomStore, NullRoomStore } from "./rooms/room-store.ts";

const PORT = Number(process.env.PORT) || 3000;

// Live rooms are snapshotted to disk so a deploy doesn't end everyone's game.
// Set ROOM_PERSISTENCE=false to keep the old in-memory-only behaviour.
const ROOM_SNAPSHOT_PATH = process.env.ROOM_SNAPSHOT_PATH || "./data/rooms.json";
const roomStore =
  process.env.ROOM_PERSISTENCE === "false"
    ? new NullRoomStore()
    : new FileRoomStore(ROOM_SNAPSHOT_PATH);

// Rooms are snapshotted on the way down, not on a timer. Set a millisecond
// value here to also snapshot periodically, trading steady disk writes for
// surviving a kill the process never sees coming.
const SNAPSHOT_INTERVAL_MS = Number(process.env.ROOM_SNAPSHOT_INTERVAL_MS) || 0;

const roomManager = new RoomManager(roomStore, undefined, SNAPSHOT_INTERVAL_MS);
const { handlers: wsHandlers, resumeBotTurns, stopBroadcasting } =
  createWebSocketHandlers(roomManager);

// Pick up where the previous process left off. Clients reconnect on their own
// (the socket retries after 2s and re-sends JOIN_ROOM from stored credentials),
// so all that's needed here is having the rooms back before they arrive.
const restoredRooms = roomManager.restore();
resumeBotTurns(restoredRooms);

const app = new Hono();

// API routes
app.route("/api", createApiRoutes(roomManager));

// Health check
app.get("/health", (c) => c.json({ status: "ok", rooms: roomManager.getRoomCount() }));

// Serve static frontend files (only in production, not when Vite dev server is running)
const isDev = process.env.NODE_ENV !== "production";
if (!isDev) {
  app.use("/*", serveStatic({ root: "./public" }));
  app.use("/*", serveStatic({ root: "./public", path: "index.html" }));
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0", // Listen on all network interfaces
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: {
          playerId: null,
          roomCode: null,
          spectatingRoom: null,
          watchingLobby: false,
        },
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

console.log(`Monopoly Deal server running on:`);
console.log(`  Local:   http://localhost:${server.port}`);
console.log(`  Network: http://${localIP}:${server.port}`);

function shutdown() {
  console.log("Shutting down...");
  // Snapshot before anything else: stopping the server closes every socket,
  // and each close is handled as a player leaving — which empties lobbies and
  // marks players gone. Persist the state players actually left behind.
  roomManager.persist();
  stopBroadcasting();
  roomManager.destroy();
  server.stop();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
