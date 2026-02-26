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
