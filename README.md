# Co-Opoly Deal

A multiplayer online card game inspired by Monopoly Deal. Seize the means of property collection.

## Quick Start

### Docker (recommended for self-hosting)

```bash
docker compose up --build
```

The app will be available at `http://localhost:3000`.

### Local Development

You need [Bun](https://bun.sh/) installed.

**Start the backend:**

```bash
cd server
bun install
bun dev
```

**Start the frontend (in another terminal):**

```bash
cd client
bun install
bun dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API/WebSocket requests to the backend on port 3000.

## Surviving Restarts

Games live in memory, but they are snapshotted to a single JSON file so a deploy
or crash doesn't end everyone's session. On boot the server reloads the rooms
the previous process was serving; clients reconnect on their own within a couple
of seconds and rejoin their seat by name. In practice a restart looks like a
brief "Reconnecting…" flicker rather than a lost game.

Under Docker the snapshot lives on the `coopoly-data` volume — mount something
at `/app/data` or the rooms won't outlive the container.

See `ROOM_SNAPSHOT_PATH` and `ROOM_PERSISTENCE` under
[Configuration](#configuration).

The file is rewritten in place and never accumulates: no history, no rotation,
at most the server's room cap (100) of live rooms at roughly 8 KB each, and it
is deleted outright whenever no games are running. Finished games, empty
lobbies and bot-only rooms are never written. Nothing about a game is kept once
it ends.
## Configuration

| Variable            | Default             | Description                                                                 |
| ------------------- | ------------------- | --------------------------------------------------------------------------- |
| `PORT`              | `3000`              | HTTP/WebSocket port.                                                          |
| `UMAMI_WEBSITE_ID`  | _(unset)_           | Umami website ID for server-side game events. **Analytics are off unless this is set** — self-hosted instances never report anywhere. |
| `UMAMI_API_URL`     | Umami Cloud         | Collector endpoint, for a self-hosted Umami.                                  |
| `ANALYTICS_ENABLED` | `true`              | Set to `false` to force analytics off even with a website ID set.              |
| `ANALYTICS_DEBUG`   | `false`             | Log each event send and its response.                                          |
| `ROOM_SNAPSHOT_PATH` | `./data/rooms.json` | Where live rooms are snapshotted so they survive a restart.                   |
| `ROOM_PERSISTENCE`  | `true`              | Set to `false` to keep rooms in memory only.                                   |

Browser-side analytics are additionally restricted by `data-domains` on the
Umami script tag in `client/index.html`, so a self-hosted or local build sends
no pageviews.

## How to Play

1. One player creates a room and shares the 6-digit code
2. Other players join with the code (2-6 players)
3. The host starts the game
4. Be the first to collect 3 complete property sets!

See [docs/GAME_RULES.md](docs/GAME_RULES.md) for the full rules reference.

## Tech Stack

- **Backend:** Bun + Hono + WebSockets
- **Frontend:** React + TypeScript + Vite + TailwindCSS + Framer Motion
- **State Management:** Zustand
- **Deployment:** Single Docker container
