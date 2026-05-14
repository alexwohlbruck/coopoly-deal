import { Hono } from "hono";
import { RoomManager } from "../rooms/room-manager.ts";
import { toClientState } from "../models/types.ts";
import { track } from "../analytics.ts";

export function createApiRoutes(roomManager: RoomManager) {
  const api = new Hono();

  api.post("/rooms", (c) => {
    const game = roomManager.createRoom();
    track("room_created");
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

  // Serve mp3 files (with Range-request support for HTMLAudioElement)
  api.get("/assets/mp3/soundtracks/:filename", async (c) => {
    const filename = c.req.param("filename");
    try {
      const filepath = `${import.meta.dir}/../assets/mp3/soundtracks/${filename}`;
      const file = Bun.file(filepath);
      const exists = await file.exists();
      if (!exists) {
        return c.json({ error: "File not found" }, 404);
      }

      const fileSize = file.size;
      const rangeHeader = c.req.header("range");

      if (rangeHeader) {
        // Parse Range: bytes=start-end
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1]!, 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          return new Response(file.slice(start, end + 1), {
            status: 206,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(chunkSize),
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
            },
          });
        }
      }

      return new Response(file, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
        },
      });
    } catch (error) {
      return c.json({ error: "File not found" }, 404);
    }
  });

  return api;
}
