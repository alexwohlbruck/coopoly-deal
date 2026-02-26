# Testing Game Logic

This document describes how to test game logic changes without needing to spin up the full browser environment.

## Quick Test Script

The fastest way to validate game logic changes:

```bash
./server/test-quick.sh
```

This runs:
1. All unit tests (111 tests covering game mechanics)
2. Resign functionality test

## Unit Tests

Run the comprehensive unit test suite:

```bash
cd server
bun test
```

The test suite covers:
- Game setup and player management
- Card plays (money, property, action cards)
- Turn management and phase transitions
- All action cards (Pass Go, Sly Deal, Force Deal, Deal Breaker, etc.)
- Payment mechanics
- Just Say No chains
- Win conditions
- Game settings
- Rematch and resign functionality
- Edge cases

## Headless Game Simulation

For testing full game flows with bot players:

```bash
# Test resign functionality
bun run server/src/test-game-sim.ts resign

# Test music files
bun run server/src/test-game-sim.ts music

# Run all tests
bun run server/src/test-game-sim.ts all
```

Note: The full game simulation (2-player bot game) has some issues with action resolution loops and is not recommended for regular testing. Use unit tests instead.

## Adding New Tests

When adding new game logic:

1. Add unit tests to `server/src/engine/game-engine.test.ts`
2. Run `bun test` to verify
3. If testing UI integration, use the browser only after server-side logic is validated

## Benefits of Server-Side Testing

- **Fast**: Tests run in milliseconds vs seconds for browser tests
- **Reliable**: No browser autoplay policies, network issues, or UI timing concerns
- **Focused**: Tests exactly what changed without UI noise
- **Cost-effective**: No compute wasted on browser automation
- **Debuggable**: Easy to add console.log and inspect state

## When to Use Browser Testing

Only use browser testing for:
- Visual/UI changes
- User interaction flows
- WebSocket connection issues
- Frontend-specific bugs

For game logic changes (card mechanics, turn flow, win conditions, etc.), always use server-side tests first.
