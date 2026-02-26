#!/bin/bash
# Quick test script for validating game logic changes
# Usage: ./server/test-quick.sh

cd "$(dirname "$0")"

echo "🧪 Running game logic tests..."
echo ""

# Run unit tests
bun test

# Test resign functionality
echo ""
echo "🎯 Testing resign functionality..."
bun run src/test-game-sim.ts resign

echo ""
echo "✅ All tests complete!"
