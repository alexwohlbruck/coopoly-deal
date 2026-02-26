# Co-Opoly Deal — Implementation Steps

Detailed breakdown of all implementation steps for the Co-Opoly Deal project.

---

## Phase 1: Game Rules Documentation [DONE]

- [x] Compile all Monopoly Deal rules from official sources
- [x] Document card types, quantities, and values
- [x] Document rent values per color/property count
- [x] Document all action card mechanics
- [x] Document payment rules (who chooses, where cards go, no change)
- [x] Document house/hotel placement rules
- [x] Document Just Say No mechanics and chaining
- [x] Write full reference in `docs/GAME_RULES.md`

---

## Phase 2: Backend Core — Data Models [DONE]

- [x] Define `PropertyColor` enum (10 colors)
- [x] Define `CardType` enum (15 types: money, property, wildcards, actions, rent)
- [x] Define `Card` interface with id, type, value, colors
- [x] Define `PropertySet` interface (color, cards, house, hotel)
- [x] Define `Player` interface (hand, bank, properties, connection status)
- [x] Define `GameState` interface (players, deck, discard, turn tracking)
- [x] Define `TurnState` with phase tracking (draw, play, discard, actionPending)
- [x] Define `PendingAction` for rent/deal/JSN chain tracking
- [x] Define `ClientGameState` and `toClientState()` for safe serialization
- [x] Define all WebSocket message types (client and server)
- [x] Define rent/set-size lookup tables

**File:** `server/src/models/types.ts`

---

## Phase 3: Deck Initialization [DONE]

- [x] Create all 20 money cards (1M x6, 2M x5, 3M x3, 4M x3, 5M x2, 10M x1)
- [x] Create all 28 property cards (correct count per color)
- [x] Create all 11 property wildcards (dual-color and multi-color)
- [x] Create all 34 action cards (correct counts and values)
- [x] Create all 13 rent cards (5 dual-color pairs + 3 wild)
- [x] Implement Fisher-Yates shuffle
- [x] Verify total = 106 playable cards

**File:** `server/src/engine/deck.ts`

---

## Phase 4: Game Engine [DONE]

### Turn Management
- [x] `startTurn()` — draw 2 cards (or 5 if hand empty), set phase to Play
- [x] `endTurn()` — validate hand size <= 7, advance to next player
- [x] Skip disconnected players
- [x] Discard cards to reach 7-card hand limit

### Playing Cards
- [x] `playCardToBank()` — any card except property, add to bank
- [x] `playCardToProperty()` — property/wildcard to property area, specify color
- [x] `playActionCard()` — dispatch to specific action handler
- [x] Enforce max 3 plays per turn
- [x] Enforce current-player-only

### Action Card Implementations
- [x] **Pass Go** — draw 2 cards
- [x] **Sly Deal** — steal one property from incomplete set
- [x] **Force Deal** — swap properties (neither from complete set)
- [x] **Deal Breaker** — steal entire complete set including house/hotel
- [x] **Debt Collector** — charge one player 5M
- [x] **It's My Birthday** — all opponents pay 2M
- [x] **Rent (Dual)** — all opponents pay rent for chosen color
- [x] **Rent (Wild)** — one chosen opponent pays rent for chosen color
- [x] **Double the Rent** — doubles pending rent amount
- [x] **House** — place on complete set (not railroad/utility), +3M rent
- [x] **Hotel** — place on complete set with house, +4M rent

### Pending Action Resolution
- [x] Track which players have responded
- [x] Handle Just Say No cards (from hand, free action)
- [x] Handle Just Say No chaining (depth tracking)
- [x] Handle payment selection (bank + property cards)
- [x] Transfer paid property cards to recipient's property area
- [x] Transfer paid money/action cards to recipient's bank
- [x] Handle "pay nothing" when player has no cards
- [x] Resolve pending action when all targets responded

### Win Condition
- [x] Check for 3 complete property sets after every property play
- [x] Check after payment resolution (receiving properties)
- [x] Set game phase to Finished and record winner

### Property Management
- [x] Add cards to correct sets, create new sets when needed
- [x] Remove cards from sets, handle orphaned houses/hotels
- [x] Rearrange wildcards between sets during your turn
- [x] Validate wildcard color compatibility

**File:** `server/src/engine/game-engine.ts`

---

## Phase 5: Room Management [DONE]

- [x] Generate unique 6-digit room codes
- [x] Create rooms with in-memory storage
- [x] Join rooms by code
- [x] Handle player reconnection
- [x] Automatic cleanup of inactive rooms (30 min timeout)

**File:** `server/src/rooms/room-manager.ts`

---

## Phase 6: WebSocket Server [DONE]

- [x] WebSocket upgrade on `/ws` endpoint
- [x] Message routing to game engine
- [x] Per-player socket tracking for broadcasting
- [x] `sendStateToAll()` — sends personalized state to each player (own hand visible, opponents hidden)
- [x] Handle all client message types:
  - JOIN_ROOM, START_GAME, PLAY_CARD_TO_BANK, PLAY_CARD_TO_PROPERTY
  - PLAY_ACTION_CARD, END_TURN, DISCARD_CARDS
  - PAY_WITH_CARDS, JUST_SAY_NO, ACCEPT_ACTION, REARRANGE_PROPERTY
- [x] Broadcast events: GAME_STARTED, TURN_STARTED, ACTION_REQUIRED, GAME_ENDED
- [x] Handle disconnections and notify other players
- [x] Error handling with client-friendly messages

**Files:** `server/src/ws/websocket-handler.ts`, `server/src/routes/api.ts`

---

## Phase 7: HTTP API [DONE]

- [x] `POST /api/rooms` — create a room, return room code
- [x] `GET /api/rooms/:code` — get room info (player list, phase)
- [x] `GET /health` — health check with room count

**File:** `server/src/routes/api.ts`

---

## Phase 8: Server Entry Point [DONE]

- [x] Wire Hono app with API routes
- [x] Wire Bun WebSocket server
- [x] Serve static files from `./public` for production
- [x] SPA fallback (serve index.html for all non-API routes)
- [x] Configurable port via `PORT` env var

**File:** `server/src/index.ts`

---

## Phase 9: Frontend Setup [DONE]

- [x] Scaffold React + TypeScript with Vite
- [x] Install and configure Tailwind CSS v4
- [x] Install Framer Motion for animations
- [x] Install Zustand for state management
- [x] Configure Vite proxy for dev mode (API + WebSocket)
- [x] Set up custom color theme (property colors, table green)

---

## Phase 10: Frontend — State & Networking [DONE]

- [x] WebSocket hook (`useWebSocket`) — connect, send, reconnect
- [x] Game store (`useGameStore`) — Zustand store for all client state
- [x] Client-side type definitions mirroring server types

**Files:** `client/src/hooks/useWebSocket.ts`, `client/src/hooks/useGameStore.ts`, `client/src/types/game.ts`

---

## Phase 11: Frontend — Lobby [DONE]

- [x] **LobbyScreen** — Create Room / Join Room buttons
- [x] **NameEntryDialog** — enter name after creating room
- [x] **Join flow** — enter name + 6-digit code
- [x] **WaitingRoom** — show player list, room code, host start button
- [x] Real-time player join/leave updates

**Files:** `client/src/components/lobby/`

---

## Phase 12: Frontend — Game UI [DONE]

### Card Components
- [x] **GameCard** — renders any card type with color, title, value badge
- [x] Dual-color gradient for wildcard/rent headers
- [x] Multi-color wheel for 10-color wildcards
- [x] Subtitle descriptions for action cards
- [x] **CardBack** — red card back with branding
- [x] Small and regular card sizes
- [x] Hover/tap animations with Framer Motion
- [x] Selection ring indicator

### Game Table
- [x] Top bar with game title, room code, deck/discard counts
- [x] Opponent areas at top (compact mode for 4+ players)
- [x] Center deck display with card count
- [x] Current turn indicator
- [x] Player's own area with properties and bank
- [x] Card hand at bottom with spring animations

### Player Area
- [x] Avatar with first initial
- [x] Active turn highlight (yellow ring)
- [x] Bank total, complete sets count, hand count
- [x] Property set chips with color and card count
- [x] House/hotel indicators on sets
- [x] Bank card preview

### Card Action Dialog
- [x] Modal on card click — choose how to play
- [x] "Add to Bank" option with value display
- [x] "Play as Property" option (direct for single-color, color picker for wildcards)
- [x] "Use Action" option for action cards
- [x] Multi-step flows: select color -> select target -> select card
- [x] Force Deal: pick target -> pick their card -> pick your card
- [x] Deal Breaker: pick target -> pick their complete set

### Action Prompt
- [x] Payment prompt when someone charges you
- [x] Select cards from bank/properties to pay with
- [x] Running total of selected payment amount
- [x] "Pay Nothing" when no cards available
- [x] Just Say No button (only when you have one in hand)
- [x] Accept button for non-payment actions

### Game End
- [x] Win/lose screen with winner announcement

**Files:** `client/src/components/game/`, `client/src/components/cards/`

---

## Phase 13: App Wiring [DONE]

- [x] Route between screens: lobby -> nameEntry -> waiting -> game
- [x] Connect all UI actions to WebSocket messages
- [x] Toast notifications for events (player joined, your turn, etc.)
- [x] Error display with auto-dismiss

**File:** `client/src/App.tsx`

---

## Phase 14: Docker [DONE]

- [x] Multi-stage Dockerfile: build frontend -> build server -> combine
- [x] Single container serves both frontend and backend
- [x] docker-compose.yml for easy `docker compose up`
- [x] .dockerignore for clean builds

**Files:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`

---

## Phase 15: Testing [DONE]

- [x] Unit tests for game engine (23 tests, all passing)
  - Game setup (create, add players, limits)
  - Game start (dealing, turn initialization)
  - Playing cards (bank, property, validation)
  - Turn management (end turn, advance, discard)
  - Action cards (Pass Go, Debt Collector, Birthday)
  - Payment mechanics (card transfer)
  - Win condition (3 complete sets)
- [x] End-to-end browser test (room creation, joining, game start, card play)

---

## Future Work

These items are not yet implemented but are planned for future iterations:

### Gameplay Polish
- [ ] Card play animations (fly from hand to table)
- [ ] Turn timer with configurable duration
- [ ] Sound effects for card plays and notifications
- [ ] Better mobile responsive layout (swipeable hand, bottom sheets)
- [ ] Spectator mode

### Features
- [ ] Player statistics / win-loss tracking (requires database)
- [ ] Game replay system
- [ ] Custom rule variations (house rules toggle)
- [ ] Chat system between players
- [ ] Rematch button after game ends

### Technical
- [ ] Redis/DB persistence for game history
- [ ] Rate limiting on WebSocket messages
- [ ] More comprehensive test coverage for edge cases
- [ ] CI/CD pipeline
- [ ] HTTPS/TLS support in Docker
- [ ] Health check endpoint for Docker orchestration
