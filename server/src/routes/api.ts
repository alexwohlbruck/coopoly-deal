import { Hono } from "hono";
import type { Context } from "hono";
import { timingSafeEqual } from "node:crypto";
import { RoomManager } from "../rooms/room-manager.ts";
import { sanitizeSettings, toClientState, type ServerNotice } from "../models/types.ts";
import { MAX_MESSAGE_LENGTH, NoticeService } from "../notice.ts";
import { track } from "../analytics.ts";

/** A notice can be announced at most this far ahead — a typo guard, mostly. */
const MAX_LEAD_MS = 7 * 24 * 60 * 60 * 1000;

export function createApiRoutes(roomManager: RoomManager, notices: NoticeService) {
  const api = new Hono();

  // The body is optional: a client may pass the settings and visibility it
  // remembers from the creator's last game so the lobby opens already
  // configured, rather than painting the defaults and correcting itself.
  api.post("/rooms", async (c) => {
    let body: unknown = null;
    try {
      body = await c.req.json();
    } catch {
      // No body, or not JSON — fall through to the defaults.
    }
    const prefs = (body ?? {}) as Record<string, unknown>;
    const game = roomManager.createRoom({
      settings: sanitizeSettings(prefs.settings),
      isPublic: prefs.isPublic === true,
    });
    track("room_created");
    return c.json({ roomCode: game.id });
  });

  // Public room browser. The lobby also subscribes over the WebSocket for
  // live updates; this covers the first paint and the manual refresh.
  api.get("/rooms/public", (c) => {
    return c.json({ rooms: roomManager.listPublicRooms() });
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

  // ── Server notice ──────────────────────────────────────────────────
  // The banner every connected client sees. Reads are public (the client
  // gets pushed the same thing over the WebSocket; this covers curl and
  // the deploy script). Writes need ADMIN_TOKEN, and without one set the
  // write routes do not exist at all, so a self-hosted instance exposes
  // nothing extra by upgrading.

  api.get("/notice", (c) => {
    return c.json({ notice: notices.get(), serverNow: Date.now() });
  });

  api.post("/notice", async (c) => {
    const denied = checkAdmin(c);
    if (denied) return denied;

    let body: unknown = null;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Expected a JSON body" }, 400);
    }
    const { minutes, at, message, durationMinutes, showCountdown } = (body ?? {}) as Record<string, unknown>;

    let scheduledAt: number;
    if (at != null) {
      scheduledAt = typeof at === "number" ? at : Date.parse(String(at));
    } else if (typeof minutes === "number" && Number.isFinite(minutes)) {
      scheduledAt = Date.now() + minutes * 60_000;
    } else {
      return c.json({ error: "Pass `minutes` (from now) or `at` (epoch ms or ISO)" }, 400);
    }
    if (!Number.isFinite(scheduledAt)) {
      return c.json({ error: "Could not read a time from `at`" }, 400);
    }
    if (scheduledAt - Date.now() > MAX_LEAD_MS) {
      return c.json({ error: "That is more than a week out — check the units" }, 400);
    }

    const text = typeof message === "string" ? message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    let expiresAt: number | undefined;
    if (durationMinutes != null) {
      if (typeof durationMinutes !== "number" || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return c.json({ error: "durationMinutes must be a positive number" }, 400);
      }
      expiresAt = Date.now() + durationMinutes * 60_000;
      if (expiresAt - Date.now() > MAX_LEAD_MS) {
        return c.json({ error: "durationMinutes cannot exceed one week" }, 400);
      }
    }
    const notice: ServerNotice = {
      id: crypto.randomUUID(),
      // Free text can't be translated, so it is only used when given. The
      // default reads in the player's own language.
      kind: text ? "custom" : "maintenance",
      scheduledAt,
      ...(text ? { message: text } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      ...(typeof showCountdown === "boolean" ? { showCountdown } : text ? { showCountdown: false } : { showCountdown: true }),
    };
    notices.set(notice);
    return c.json({ notice, serverNow: Date.now() });
  });

  api.delete("/notice", (c) => {
    const denied = checkAdmin(c);
    if (denied) return denied;
    notices.clear();
    return c.json({ notice: null, serverNow: Date.now() });
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

/**
 * Guards the notice write routes. Returns a response to send when the caller
 * should not get through, or null when it may proceed.
 *
 * With no ADMIN_TOKEN configured the answer is 404 rather than 401: an
 * instance that cannot take notices should look like one that never had the
 * feature, not like one whose password has yet to be guessed.
 */
function checkAdmin(c: Context) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return c.json({ error: "Not found" }, 404);

  const header = c.req.header("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!constantTimeEquals(supplied, expected)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return null;
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which leaks the length by
  // itself. Comparing against a fixed-length digest would avoid that; for a
  // deploy token typed by one person it is not worth the ceremony.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
