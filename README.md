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

## Graceful Updates

Games live in memory. On `SIGTERM` — which is what a deploy sends — the server
writes its live rooms to a single JSON file and exits; the next process reads
them back on boot. Clients reconnect on their own within a couple of seconds and
reclaim their seats, so a deploy looks like a brief "Reconnecting…" rather than
a lost game.

There is no periodic snapshot. Writing every few seconds on the chance the
process dies unexpectedly costs a great deal of disk churn to insure against
something far rarer than a deploy, so the default is one write per release. Set
`ROOM_SNAPSHOT_INTERVAL_MS` if you would rather also survive a kill the process
never sees coming (OOM, `SIGKILL`, the host going down), at that cost.

A game nobody is connected to is **suspended, not abandoned**. A restart marks
every seat absent at once — that is the server leaving, not the players — so
while the room is empty the turn clock stops rather than running down, and
whoever comes back gets the time that was left on it. Players have 90 seconds to
reclaim a seat before it is treated as having dropped.

Under Docker the snapshot lives on the `coopoly-data` volume — mount something
at `/app/data` or the rooms won't outlive the container. The file is rewritten
in place and never accumulates: no history, no rotation, at most the server's
room cap (100) of live rooms at roughly 8 KB each, and it is deleted outright
whenever no games are running. Finished games, empty lobbies and bot-only rooms
are never written. Nothing about a game is kept once it ends.

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
| `ROOM_SNAPSHOT_INTERVAL_MS` | `0` (off)   | Also snapshot on a timer. Off by default — rooms are written once, on shutdown. |

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
