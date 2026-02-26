import { Hono } from "hono";
import { RoomManager } from "../rooms/room-manager.ts";
import { toClientState } from "../models/types.ts";

export function createApiRoutes(roomManager: RoomManager) {
  const api = new Hono();

  api.post("/rooms", (c) => {
    const game = roomManager.createRoom();
    return c.json({ roomCode: game.id });
  });

  api.get("/rooms/:code", (c) => {
    const code = c.req.param("code");
    const game = roomManager.getRoom(code);
    if (!game) {
      return c.json({ error: "Room not found" }, 404);
    }
    return c.json({
      roomCode: game.id,
      playerCount: game.players.length,
      phase: game.phase,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
      })),
    });
  });

  // Serve mp3 files
  api.get("/assets/mp3/soundtracks/:filename", async (c) => {
    const filename = c.req.param("filename");
    try {
      const filepath = `${import.meta.dir}/../assets/mp3/soundtracks/${filename}`;
      const file = Bun.file(filepath);
      const exists = await file.exists();
      if (!exists) {
        return c.json({ error: "File not found" }, 404);
      }
      return new Response(file, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    } catch (error) {
      return c.json({ error: "File not found" }, 404);
    }
  });

  return api;
}
