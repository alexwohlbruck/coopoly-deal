# Pending Refactors & Complex Features

This document tracks features that require significant architectural changes to the game engine and state management.

## Completed Quick Fixes (Feb 26, 2026)

### UI/UX Improvements
- ✅ Fixed game settings button spacing in WaitingRoom
- ✅ Toned down shake animation (from 10px to 4px, 0.5s to 0.3s)
- ✅ Added error sound effect to invalid card plays
- ✅ Collapsed property sets by default (using FannedCards)
- ✅ Enlarged felt texture pattern (2px→4px, 3px→6px)
- ✅ Fixed theme selector to show all 10 themes (was only showing 4)
- ✅ Moved DevTools to top toolbar as modal dialog (next to Resign button)
- ✅ Money counts already showing in player name badges (no change needed)

### Drag & Drop Enhancements
- ✅ Added visible drop zones for bank and property sets
- ✅ Drop zones highlight on hover/drag-over
- ✅ Touch drag now supports dropping to property sets (not just bank)
- ✅ Added `data-property-drop-zone` attributes for touch targeting

### Wildcard Fixes
- ✅ Fixed "Card not in hand" error when changing wildcard colors
  - Added dedicated `onRearrangeProperty` handler
  - Sends `REARRANGE_PROPERTY` message instead of `PLAY_ACTION_CARD`
- ✅ Fixed dual wildcard orientation logic
  - Now correctly checks if set color matches second color in array
  - Returns "bottom" to flip card when needed

## Pending Large Refactors

### 1. Unassigned Wildcard Placement ⚠️ COMPLEX
**Issue**: Currently, wildcards must be assigned a color when placed on the table. User wants to place wildcards without assigning a color, which gets auto-assigned when another colored property is added to the same stack.

**Required Changes**:
- **Server**: Modify `playCardToProperty` to accept optional/null `asColor` for wildcards
- **Server**: Add "unassigned" state to PropertySet or Card
- **Server**: Add logic to auto-assign wildcard color when a colored property is added
- **Client**: Update CardActionDialog to allow "place without color" option for wildcards
- **Client**: Update PropertySetDisplay to show unassigned wildcards in a special "limbo" area
- **Client**: Update UI to show unassigned wildcards differently

**Files to Modify**:
- `server/src/engine/game-engine.ts` - `playCardToProperty`, `addPropertyToPlayer`
- `server/src/models/types.ts` - Update `PropertySet` or `Card` type
- `client/src/components/game/CardActionDialog.tsx` - Add "place unassigned" option
- `client/src/components/game/PlayerArea.tsx` - Render unassigned wildcards
- `client/src/types/game.ts` - Update client types to match server

**Estimated Complexity**: High (requires changes to core game logic and state structure)

### 2. Wildcard Color Selection on Receive (Steal/Swap) ⚠️ COMPLEX
**Issue**: When a wildcard is stolen or swapped, the receiving player should be able to choose which color to assign it to, rather than having it automatically placed.

**Required Changes**:
- **Server**: Modify steal/swap actions to pause and wait for color selection when wildcard is involved
- **Server**: Add new message type for "assign received wildcard color"
- **Server**: Track "pending wildcard assignment" state
- **Client**: Show color selection dialog when receiving a wildcard
- **Client**: Send color assignment back to server

**Files to Modify**:
- `server/src/engine/game-engine.ts` - `handleSlyDeal`, `handleForceDeal`, `handleDealBreaker`
- `server/src/models/types.ts` - Add new message type
- `server/src/ws/websocket-handler.ts` - Add handler for wildcard assignment
- `client/src/components/game/GameTable.tsx` - Show wildcard assignment dialog
- `client/src/components/game/WildcardAssignmentDialog.tsx` - New component (similar to WildcardFlipDialog)

**Estimated Complexity**: High (requires changes to action flow and state management)

### 3. Double The Rent Enhancements (In Backlog)
**Features**:
- Prompt player to use Double The Rent cards when playing rent
- Require rent card selection when playing Double The Rent

**Status**: Moved to backlog per user request

## Technical Debt & Known Issues

### Minor Issues
- [ ] Player hand movement when bottom sheet shows (user reported but may be browser-specific)
- [ ] Touch drag visual feedback could be improved (show ghost card during drag)

### Architecture Improvements
- [ ] Consider using `layoutId` for card animations (Framer Motion)
- [ ] Implement interactive table selection for action cards (click on table instead of dialog)
- [ ] Add card flip animations when wildcards change color

## Notes

- All quick fixes have been completed and tested
- Build passes successfully with no TypeScript errors
- The two major pending refactors (unassigned wildcards and wildcard-on-receive) require significant changes to the game engine's state management and action flow
- These refactors should be planned carefully to avoid breaking existing functionality
