import { describe, it, expect, afterEach } from "bun:test";
import { RoomManager } from "./room-manager.ts";
import { GamePhase } from "../models/types.ts";

const managers: RoomManager[] = [];

/** RoomManager owns two intervals, so every instance must be torn down. */
function makeManager(): RoomManager {
  const manager = new RoomManager();
  managers.push(manager);
  return manager;
}

afterEach(() => {
  while (managers.length) managers.pop()!.destroy();
});

/** A public room whose game has ended, with one player still sitting on the
 *  end screen. */
function finishedPublicRoom() {
  const manager = makeManager();
  const room = manager.createRoom();
  manager.joinRoom(room.id, "Alexis");
  manager.joinRoom(room.id, "Henri");
  manager.setRoomVisibility(room.id, true);
  manager.startGame(room.id);
  const loser = room.players[1]!;
  manager.getEngine().resignPlayer(room, loser.id);
  return { manager, room };
}

describe("RoomManager", () => {
  describe("public room browser", () => {
    it("lists a finished game as joinable", () => {
      const { manager, room } = finishedPublicRoom();
      expect(room.phase).toBe(GamePhase.Finished);

      const listed = manager.listPublicRooms().find((r) => r.roomCode === room.id);

      expect(listed).toBeDefined();
      expect(listed!.joinable).toBe(true);
    });

    it("does not list an in-progress game as joinable", () => {
      const manager = makeManager();
      const room = manager.createRoom();
      manager.joinRoom(room.id, "Alexis");
      manager.joinRoom(room.id, "Henri");
      manager.setRoomVisibility(room.id, true);
      manager.startGame(room.id);

      const listed = manager.listPublicRooms().find((r) => r.roomCode === room.id);

      expect(listed).toBeDefined();
      expect(listed!.joinable).toBe(false);
    });

    it("drops a finished room once everyone has left", () => {
      const { manager, room } = finishedPublicRoom();
      for (const player of room.players) {
        manager.getEngine().removePlayer(room, player.id);
      }

      expect(
        manager.listPublicRooms().find((r) => r.roomCode === room.id),
      ).toBeUndefined();
    });
  });

  describe("joining", () => {
    it("lets a new player join a game sitting on the end screen", () => {
      const { manager, room } = finishedPublicRoom();

      const { player } = manager.joinRoom(room.id, "Newcomer");

      expect(player.name).toBe("Newcomer");
      expect(room.players).toHaveLength(3);
      expect(room.phase).toBe(GamePhase.Finished);
    });

    it("deals a player who joined after the game into the rematch", () => {
      const { manager, room } = finishedPublicRoom();
      const { player } = manager.joinRoom(room.id, "Newcomer");

      manager.getEngine().rematchGame(room);

      expect(room.phase).toBe(GamePhase.Playing);
      expect(player.hand.length).toBeGreaterThan(0);
    });

    it("still refuses to add a player to a game in progress", () => {
      const manager = makeManager();
      const room = manager.createRoom();
      manager.joinRoom(room.id, "Alexis");
      manager.joinRoom(room.id, "Henri");
      manager.startGame(room.id);

      expect(() => manager.joinRoom(room.id, "Newcomer")).toThrow(
        "Game already started",
      );
    });

    it("reconnects a player who left, rather than seating them twice", () => {
      const manager = makeManager();
      const room = manager.createRoom();
      manager.joinRoom(room.id, "Alexis");
      manager.joinRoom(room.id, "Henri");
      manager.joinRoom(room.id, "alex");
      manager.startGame(room.id);
      const alex = room.players.find((p) => p.name === "alex")!;
      manager.getEngine().removePlayer(room, alex.id);
      expect(alex.connected).toBe(false);

      const { player } = manager.joinRoom(room.id, "alex");

      expect(player.id).toBe(alex.id);
      expect(player.connected).toBe(true);
      expect(room.players).toHaveLength(3);
    });
  });
});
