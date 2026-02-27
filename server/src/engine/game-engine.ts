import {
  type Card,
  CardType,
  type GameState,
  GamePhase,
  type Player,
  type PropertySet,
  PropertyColor,
  type TurnState,
  TurnPhase,
  type PendingAction,
  type PlayActionPayload,
  SET_SIZE,
  RENT_VALUES,
  isSetComplete,
  DEFAULT_SETTINGS,
  type GameSettings,
} from "../models/types.ts";
import { createDeck, shuffleDeck } from "./deck.ts";

const MAX_PLAYS_PER_TURN = 3;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export class GameEngine {
  createGame(roomCode: string): GameState {
    return {
      id: roomCode,
      players: [],
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      phase: GamePhase.Waiting,
      turn: null,
      winner: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      settings: DEFAULT_SETTINGS,
    };
  }

  addPlayer(state: GameState, playerName: string): Player {
    if (state.phase !== GamePhase.Waiting) {
      throw new Error("Game already started");
    }
    if (state.players.length >= MAX_PLAYERS) {
      throw new Error("Room is full");
    }
    const id = crypto.randomUUID();
    const player: Player = {
      id,
      name: playerName,
      hand: [],
      bank: [],
      properties: [],
      connected: true,
    };
    state.players.push(player);
    state.lastActivityAt = Date.now();
    return player;
  }

  removePlayer(state: GameState, playerId: string): void {
    if (state.phase === GamePhase.Waiting) {
      state.players = state.players.filter((p) => p.id !== playerId);
    } else {
      const player = this.getPlayer(state, playerId);
      player.connected = false;
    }
    state.lastActivityAt = Date.now();
  }

  startGame(state: GameState): void {
    if (state.phase !== GamePhase.Waiting) {
      throw new Error("Game already started");
    }
    if (state.players.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players`);
    }

    state.deck = shuffleDeck(createDeck());
    state.phase = GamePhase.Playing;

    for (const player of state.players) {
      player.hand = state.deck.splice(0, 5);
    }

    this.startTurn(state);
    state.lastActivityAt = Date.now();
  }

  rematchGame(state: GameState): void {
    // Remember the winner to make them go first
    const previousWinner = state.winner;
    
    state.deck = shuffleDeck(createDeck());
    state.discardPile = [];
    
    // Set the starting player to the previous winner
    if (previousWinner) {
      const winnerIndex = state.players.findIndex(p => p.id === previousWinner);
      state.currentPlayerIndex = winnerIndex >= 0 ? winnerIndex : 0;
    } else {
      state.currentPlayerIndex = 0;
    }
    
    state.phase = GamePhase.Playing;
    state.turn = null;
    state.winner = null;

    for (const player of state.players) {
      player.hand = [];
      player.bank = [];
      player.properties = [];
      player.connected = true;
    }

    for (const player of state.players) {
      player.hand = state.deck.splice(0, 5);
    }

    this.startTurn(state);
    state.lastActivityAt = Date.now();
  }

  // -- Turn management --

  private startTurn(state: GameState): void {
    const player = state.players[state.currentPlayerIndex]!;

    // Skip disconnected players
    if (!player.connected) {
      this.advanceTurn(state);
      return;
    }

    const drawCount = player.hand.length === 0 ? 5 : 2;
    this.drawCards(state, player, drawCount);

    state.turn = {
      playerId: player.id,
      cardsPlayed: 0,
      phase: TurnPhase.Play,
      pendingAction: null,
      pendingWildcardAssignment: null,
      rentMultiplier: 1,
    };
    state.lastActivityAt = Date.now();
  }

  private drawCards(state: GameState, player: Player, count: number): void {
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        if (state.discardPile.length === 0) break;
        state.deck = shuffleDeck(state.discardPile);
        state.discardPile = [];
      }
      const card = state.deck.pop();
      if (card) player.hand.push(card);
    }
  }

  endTurn(state: GameState, playerId: string): void {
    this.assertCurrentPlayer(state, playerId);
    const turn = this.getTurn(state);
    if (turn.phase === TurnPhase.ActionPending) {
      throw new Error("Cannot end turn while an action is pending");
    }

    const player = this.getPlayer(state, playerId);
    const maxHand = state.settings.maxHandSize;
    // Skip hand size check if unlimited (999 = unlimited)
    if (maxHand !== 999 && player.hand.length > maxHand) {
      throw new Error(`Must discard down to ${maxHand} cards first`);
    }

    this.advanceTurn(state);
  }

  private advanceTurn(state: GameState): void {
    state.currentPlayerIndex =
      (state.currentPlayerIndex + 1) % state.players.length;
    this.startTurn(state);
  }

  discardCards(state: GameState, playerId: string, cardIds: string[]): void {
    this.assertCurrentPlayer(state, playerId);
    const player = this.getPlayer(state, playerId);

    for (const cardId of cardIds) {
      const idx = player.hand.findIndex((c) => c.id === cardId);
      if (idx === -1) throw new Error(`Card ${cardId} not in hand`);
      const [card] = player.hand.splice(idx, 1);
      state.discardPile.push(card!);
    }
    state.lastActivityAt = Date.now();
  }

  // -- Playing cards --

  playCardToBank(state: GameState, playerId: string, cardId: string): void {
    this.assertCurrentPlayer(state, playerId);
    this.assertCanPlay(state);

    const player = this.getPlayer(state, playerId);
    const card = this.removeFromHand(player, cardId);

    if (card.type === CardType.Property) {
      throw new Error("Property cards cannot be placed in the bank");
    }

    player.bank.push(card);
    this.incrementPlays(state);
    this.tryAutoEndTurn(state);
    state.lastActivityAt = Date.now();
  }

  playCardToProperty(
    state: GameState,
    playerId: string,
    cardId: string,
    asColor: PropertyColor | null,
    groupWithUnassigned?: boolean
  ): void {
    this.assertCurrentPlayer(state, playerId);
    this.assertCanPlay(state);

    const player = this.getPlayer(state, playerId);
    const card = this.removeFromHand(player, cardId);

    if (card.type !== CardType.Property && card.type !== CardType.PropertyWildcard) {
      throw new Error("Only property cards can be played to the property area");
    }

    // Allow null color for multi-color wildcards only (unassigned)
    if (asColor !== null && asColor !== PropertyColor.Unassigned) {
      if (card.colors && !card.colors.includes(asColor)) {
        throw new Error(`Card cannot be played as ${asColor}`);
      }
    } else {
      // Null/Unassigned color only allowed for multi-color wildcards (more than 2 colors)
      if (card.type !== CardType.PropertyWildcard) {
        throw new Error("Only wildcards can be played without a color");
      }
      if (!card.colors || card.colors.length <= 2) {
        throw new Error("Only multi-color wildcards can be placed in unassigned stack");
      }
    }

    this.addPropertyToPlayer(player, card, asColor, groupWithUnassigned);
    this.incrementPlays(state);
    this.checkWin(state, player);
    this.tryAutoEndTurn(state);
    state.lastActivityAt = Date.now();
  }

  playActionCard(state: GameState, playerId: string, payload: PlayActionPayload): void {
    this.assertCurrentPlayer(state, playerId);

    if (payload.action !== "doubleTheRent") {
      this.assertCanPlay(state);
    } else {
      const turn = this.getTurn(state);
      if (turn.cardsPlayed >= MAX_PLAYS_PER_TURN) {
        throw new Error("Already played maximum cards this turn");
      }
    }

    const player = this.getPlayer(state, playerId);
    const card = this.removeFromHand(player, payload.cardId);

    switch (payload.action) {
      case "passGo":
        this.assertCardType(card, CardType.PassGo);
        state.discardPile.push(card);
        this.drawCards(state, player, 2);
        this.incrementPlays(state);
        break;

      case "slyDeal":
        this.assertCardType(card, CardType.SlyDeal);
        this.executeSlyDeal(state, player, card, payload.targetPlayerId, payload.targetCardId);
        break;

      case "forceDeal":
        this.assertCardType(card, CardType.ForceDeal);
        this.executeForceDeal(state, player, card, payload.myCardId, payload.targetPlayerId, payload.targetCardId);
        break;

      case "dealBreaker":
        this.assertCardType(card, CardType.DealBreaker);
        this.executeDealBreaker(state, player, card, payload.targetPlayerId, payload.targetSetColor);
        break;

      case "debtCollector":
        this.assertCardType(card, CardType.DebtCollector);
        this.executeDebtCollector(state, player, card, payload.targetPlayerId);
        break;

      case "birthday":
        this.assertCardType(card, CardType.Birthday);
        this.executeBirthday(state, player, card);
        break;

      case "rentDual":
        this.assertCardType(card, CardType.RentDual);
        this.executeRentDual(state, player, card, payload.color);
        break;

      case "rentWild":
        this.assertCardType(card, CardType.RentWild);
        this.executeRentWild(state, player, card, payload.color, payload.targetPlayerId);
        break;

      case "doubleTheRent":
        this.assertCardType(card, CardType.DoubleTheRent);
        this.executeDoubleTheRent(state, player, card);
        break;

      case "house":
        this.assertCardType(card, CardType.House);
        this.executeHouse(state, player, card, payload.setColor);
        break;

      case "hotel":
        this.assertCardType(card, CardType.Hotel);
        this.executeHotel(state, player, card, payload.setColor);
        break;

      default:
        throw new Error("Unknown action");
    }

    this.tryAutoEndTurn(state);
    state.lastActivityAt = Date.now();
  }

  // -- Action implementations --

  private executeSlyDeal(
    state: GameState,
    player: Player,
    card: Card,
    targetPlayerId: string,
    targetCardId: string
  ): void {
    const target = this.getPlayer(state, targetPlayerId);
    this.setPendingAction(state, card, {
      type: "slyDeal",
      sourcePlayerId: player.id,
      targetPlayerIds: [targetPlayerId],
      respondedPlayerIds: [],
      selectedCards: { targetCardId },
    });
  }

  private executeForceDeal(
    state: GameState,
    player: Player,
    card: Card,
    myCardId: string,
    targetPlayerId: string,
    targetCardId: string
  ): void {
    const target = this.getPlayer(state, targetPlayerId);

    const myCard = this.findPropertyOnTable(player, myCardId);
    if (!myCard) throw new Error("Your card not found on table");
    if (this.isCardInCompleteSet(player, myCardId)) {
      throw new Error("Cannot trade from a complete set");
    }

    const targetCard = this.findPropertyOnTable(target, targetCardId);
    if (!targetCard) throw new Error("Target card not found on table");
    if (this.isCardInCompleteSet(target, targetCardId)) {
      throw new Error("Cannot take from a complete set");
    }

    this.setPendingAction(state, card, {
      type: "forceDeal",
      sourcePlayerId: player.id,
      targetPlayerIds: [targetPlayerId],
      respondedPlayerIds: [],
      selectedCards: { sourceCardId: myCardId, targetCardId },
    });
  }

  private executeDealBreaker(
    state: GameState,
    player: Player,
    card: Card,
    targetPlayerId: string,
    targetSetColor: PropertyColor
  ): void {
    const target = this.getPlayer(state, targetPlayerId);
    const set = target.properties.find(
      (s) => s.color === targetSetColor && isSetComplete(s)
    );
    if (!set) throw new Error("Target does not have a complete set of that color");

    this.setPendingAction(state, card, {
      type: "dealBreaker",
      sourcePlayerId: player.id,
      targetPlayerIds: [targetPlayerId],
      respondedPlayerIds: [],
      selectedCards: { targetSetColor },
    });
  }

  private executeDebtCollector(
    state: GameState,
    player: Player,
    card: Card,
    targetPlayerId: string
  ): void {
    this.setPendingAction(state, card, {
      type: "debtCollector",
      sourcePlayerId: player.id,
      targetPlayerIds: [targetPlayerId],
      respondedPlayerIds: [],
      amount: 5,
    });
  }

  private executeBirthday(state: GameState, player: Player, card: Card): void {
    const targetIds = state.players
      .filter((p) => p.id !== player.id && p.connected)
      .map((p) => p.id);

    this.setPendingAction(state, card, {
      type: "birthday",
      sourcePlayerId: player.id,
      targetPlayerIds: targetIds,
      respondedPlayerIds: [],
      amount: 2,
    });
  }

  private executeRentDual(
    state: GameState,
    player: Player,
    card: Card,
    color: PropertyColor
  ): void {
    if (!card.colors?.includes(color)) {
      throw new Error("Rent card does not match that color");
    }

    const rentAmount = this.calculateRent(player, color);
    if (rentAmount === 0) throw new Error("You have no properties of that color");

    const targetIds = state.players
      .filter((p) => p.id !== player.id && p.connected)
      .map((p) => p.id);

    state.discardPile.push(card);
    this.incrementPlays(state);

    const turn = this.getTurn(state);
    const finalRent = rentAmount * turn.rentMultiplier;

    state.turn!.pendingAction = {
      type: "rent",
      sourcePlayerId: player.id,
      targetPlayerIds: targetIds,
      respondedPlayerIds: [],
      amount: finalRent,
    };
    state.turn!.phase = TurnPhase.ActionPending;
    
    // Reset multiplier after using it
    turn.rentMultiplier = 1;
  }

  private executeRentWild(
    state: GameState,
    player: Player,
    card: Card,
    color: PropertyColor,
    targetPlayerId: string
  ): void {
    const rentAmount = this.calculateRent(player, color);
    if (rentAmount === 0) throw new Error("You have no properties of that color");

    state.discardPile.push(card);
    this.incrementPlays(state);

    const turn = this.getTurn(state);
    const finalRent = rentAmount * turn.rentMultiplier;

    state.turn!.pendingAction = {
      type: "rent",
      sourcePlayerId: player.id,
      targetPlayerIds: [targetPlayerId],
      respondedPlayerIds: [],
      amount: finalRent,
    };
    state.turn!.phase = TurnPhase.ActionPending;
    
    // Reset multiplier after using it
    turn.rentMultiplier = 1;
  }

  private executeDoubleTheRent(state: GameState, player: Player, card: Card): void {
    const turn = this.getTurn(state);
    
    // Double the rent multiplier (can stack: 1 -> 2 -> 4)
    turn.rentMultiplier *= 2;
    
    state.discardPile.push(card);
    this.incrementPlays(state);
  }

  private executeHouse(
    state: GameState,
    player: Player,
    card: Card,
    setColor: PropertyColor
  ): void {
    if (setColor === PropertyColor.Railroad || setColor === PropertyColor.Utility) {
      throw new Error("Cannot place houses on Railroad or Utility");
    }

    const set = player.properties.find(
      (s) => s.color === setColor && isSetComplete(s)
    );
    if (!set) throw new Error("Set is not complete");
    if (set.house) throw new Error("Set already has a house");

    set.house = card;
    this.incrementPlays(state);
  }

  private executeHotel(
    state: GameState,
    player: Player,
    card: Card,
    setColor: PropertyColor
  ): void {
    if (setColor === PropertyColor.Railroad || setColor === PropertyColor.Utility) {
      throw new Error("Cannot place hotels on Railroad or Utility");
    }

    const set = player.properties.find(
      (s) => s.color === setColor && isSetComplete(s)
    );
    if (!set) throw new Error("Set is not complete");
    if (!set.house) throw new Error("Must have a house before placing a hotel");
    if (set.hotel) throw new Error("Set already has a hotel");

    set.hotel = card;
    this.incrementPlays(state);
  }

  // -- Pending action responses --

  respondJustSayNo(state: GameState, playerId: string): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction;
    if (!action) throw new Error("No pending action");

    const player = this.getPlayer(state, playerId);
    const jsnIndex = player.hand.findIndex((c) => c.type === CardType.JustSayNo);
    if (jsnIndex === -1) throw new Error("No Just Say No card in hand");

    const [jsnCard] = player.hand.splice(jsnIndex, 1);
    state.discardPile.push(jsnCard!);

    if (!action.justSayNoChain) {
      action.justSayNoChain = { targetPlayerId: playerId, depth: 1 };
    } else {
      action.justSayNoChain.depth++;
      action.justSayNoChain.targetPlayerId = playerId;
    }

    state.lastActivityAt = Date.now();
  }

  respondAcceptAction(state: GameState, playerId: string): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction;
    if (!action) throw new Error("No pending action");

    if (action.justSayNoChain) {
      if (playerId === action.justSayNoChain.targetPlayerId) {
        throw new Error("Waiting for the other player to respond to your Just Say No");
      }

      const depth = action.justSayNoChain.depth;
      if (depth % 2 === 1) {
        // Odd depth: target blocked the action, source is accepting the block
        // The target is unaffected — mark them as responded (skipped)
        const targetId = action.justSayNoChain.targetPlayerId;
        action.respondedPlayerIds.push(targetId);
        action.justSayNoChain = undefined;
        this.tryResolveAction(state);
        state.lastActivityAt = Date.now();
        return;
      } else {
        // Even depth: source counter-blocked, target is accepting that their block failed
        // Action goes through against this target — fall through to normal resolution
        const targetId = action.targetPlayerIds.find(
          (id) => !action.respondedPlayerIds.includes(id)
        );
        action.justSayNoChain = undefined;
        if (targetId) {
          this.resolveActionForPlayer(state, targetId);
          state.lastActivityAt = Date.now();
          return;
        }
      }
    }

    this.resolveActionForPlayer(state, playerId);
    state.lastActivityAt = Date.now();
  }

  respondPayWithCards(state: GameState, payerId: string, cardIds: string[]): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction;
    if (!action || !action.amount) throw new Error("No pending payment");
    if (!action.targetPlayerIds.includes(payerId)) {
      throw new Error("You are not a target of this action");
    }
    if (action.respondedPlayerIds.includes(payerId)) {
      throw new Error("Already responded");
    }

    const payer = this.getPlayer(state, payerId);
    const source = this.getPlayer(state, action.sourcePlayerId);

    const totalTableBefore = this.totalTableValue(payer);

    if (cardIds.length === 0 && totalTableBefore > 0) {
      throw new Error("You must pay with at least some cards if you have assets on the table");
    }

    let totalPaid = 0;
    for (const cardId of cardIds) {
      const card = this.removeCardFromTable(payer, cardId);
      totalPaid += card.value;

      if (card.type === CardType.Property || card.type === CardType.PropertyWildcard) {
        // Multi-color wildcards should go to Unassigned, not auto-assign to brown
        if (card.type === CardType.PropertyWildcard && card.colors && card.colors.length > 1) {
          this.addPropertyToPlayer(source, card, PropertyColor.Unassigned);
        } else {
          const color = card.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(source, card, color);
        }
      } else {
        source.bank.push(card);
      }
    }

    if (totalPaid < action.amount && this.totalTableValue(payer) > 0) {
      throw new Error("You must pay more — you still have assets on the table");
    }

    action.respondedPlayerIds.push(payerId);
    this.tryResolveAction(state);
    this.checkWin(state, source);
    state.lastActivityAt = Date.now();
  }

  private resolveActionForPlayer(state: GameState, playerId: string): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction!;

    switch (action.type) {
      case "slyDeal": {
        const source = this.getPlayer(state, action.sourcePlayerId);
        const target = this.getPlayer(state, playerId);
        const targetCardId = action.selectedCards?.targetCardId;
        if (!targetCardId) throw new Error("No target card selected");

        if (this.isCardInCompleteSet(target, targetCardId)) {
          throw new Error("Cannot steal from a complete set");
        }

        const card = this.removePropertyFromPlayer(target, targetCardId);
        
        // Check if it's a wildcard - if so, create pending assignment
        if (card.type === CardType.PropertyWildcard && card.colors && card.colors.length > 1) {
          // Place in unassigned temporarily
          this.addPropertyToPlayer(source, card, PropertyColor.Unassigned);
          // Create pending assignment
          turn.pendingWildcardAssignment = {
            playerId: source.id,
            cardId: card.id,
            availableColors: this.getAvailableColorsForWildcard(source, card),
          };
          turn.phase = TurnPhase.ActionPending;
        } else {
          // Regular property or single-color wildcard
          const color = card.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(source, card, color);
        }
        
        this.checkWin(state, source);
        break;
      }

      case "forceDeal": {
        const source = this.getPlayer(state, action.sourcePlayerId);
        const target = this.getPlayer(state, playerId);
        const sourceCardId = action.selectedCards?.sourceCardId;
        const targetCardId = action.selectedCards?.targetCardId;
        if (!sourceCardId || !targetCardId) throw new Error("Missing card selections");

        // Remove cards from both players
        const sourceCard = this.removePropertyFromPlayer(source, sourceCardId);
        const targetCard = this.removePropertyFromPlayer(target, targetCardId);

        // Handle target receiving source's card (might be wildcard)
        if (targetCard.type === CardType.PropertyWildcard && targetCard.colors && targetCard.colors.length > 1) {
          // Source player gets a wildcard - needs to assign color
          this.addPropertyToPlayer(source, targetCard, PropertyColor.Unassigned);
          turn.pendingWildcardAssignment = {
            playerId: source.id,
            cardId: targetCard.id,
            availableColors: this.getAvailableColorsForWildcard(source, targetCard),
          };
          turn.phase = TurnPhase.ActionPending;
          // Target gets source card normally
          const sourceColor = sourceCard.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(target, sourceCard, sourceColor);
        } else if (sourceCard.type === CardType.PropertyWildcard && sourceCard.colors && sourceCard.colors.length > 1) {
          // Target player gets a wildcard - needs to assign color
          this.addPropertyToPlayer(target, sourceCard, PropertyColor.Unassigned);
          // For now, we'll handle this immediately for the target
          // In a more complete implementation, we'd queue multiple assignments
          const targetColor = targetCard.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(source, targetCard, targetColor);
          // Note: Target's wildcard assignment happens client-side via REARRANGE_PROPERTY
        } else {
          // Neither is a multi-color wildcard
          const sourceColor = sourceCard.colors?.[0] ?? PropertyColor.Brown;
          const targetColor = targetCard.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(target, sourceCard, sourceColor);
          this.addPropertyToPlayer(source, targetCard, targetColor);
        }
        
        // Check for wins
        this.checkWin(state, source);
        this.checkWin(state, target);
        break;
      }

      case "dealBreaker": {
        const source = this.getPlayer(state, action.sourcePlayerId);
        const target = this.getPlayer(state, playerId);
        const setColor = action.selectedCards?.targetSetColor;
        if (!setColor) throw new Error("No target set color");

        const setIdx = target.properties.findIndex(
          (s) => s.color === setColor && isSetComplete(s)
        );
        if (setIdx === -1) throw new Error("Target set not found");

        const [set] = target.properties.splice(setIdx, 1);
        source.properties.push(set!);
        this.checkWin(state, source);
        break;
      }

      default:
        break;
    }

    action.respondedPlayerIds.push(playerId);
    this.tryResolveAction(state);
  }

  private tryResolveAction(state: GameState): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction!;

    const allResponded = action.targetPlayerIds.every((id) =>
      action.respondedPlayerIds.includes(id)
    );

    if (allResponded) {
      turn.pendingAction = null;
      // Only change phase if there's no pending wildcard assignment
      if (!turn.pendingWildcardAssignment) {
        turn.phase = TurnPhase.Play;
        this.tryAutoEndTurn(state);
      }
    }
  }

  // -- Rearrange properties --

  rearrangeProperty(
    state: GameState,
    playerId: string,
    cardId: string,
    toColor: PropertyColor
  ): void {
    this.assertCurrentPlayer(state, playerId);
    const player = this.getPlayer(state, playerId);
    const card = this.removePropertyFromPlayer(player, cardId);

    if (card.type !== CardType.PropertyWildcard) {
      throw new Error("Only wildcards can be rearranged");
    }
    if (!card.colors?.includes(toColor)) {
      throw new Error("Card cannot be used for that color");
    }

    this.addPropertyToPlayer(player, card, toColor);
    
    // If setting is enabled, count this as a move (only during Play phase, not during steal/swap)
    const turn = this.getTurn(state);
    if (state.settings.wildcardFlipCountsAsMove && turn.phase === TurnPhase.Play) {
      this.incrementPlays(state);
      this.tryAutoEndTurn(state);
    }
    
    state.lastActivityAt = Date.now();
  }

  assignReceivedWildcard(
    state: GameState,
    playerId: string,
    cardId: string,
    color: PropertyColor
  ): void {
    const turn = this.getTurn(state);
    
    // Verify there's a pending assignment for this player and card
    if (!turn.pendingWildcardAssignment) {
      throw new Error("No pending wildcard assignment");
    }
    if (turn.pendingWildcardAssignment.playerId !== playerId) {
      throw new Error("Not your wildcard to assign");
    }
    if (turn.pendingWildcardAssignment.cardId !== cardId) {
      throw new Error("Wrong card");
    }
    if (!turn.pendingWildcardAssignment.availableColors.includes(color)) {
      throw new Error("Invalid color for this wildcard");
    }
    
    const player = this.getPlayer(state, playerId);
    const card = this.removePropertyFromPlayer(player, cardId);
    
    // Assign the wildcard to the selected color
    this.addPropertyToPlayer(player, card, color);
    
    // Clear pending assignment
    turn.pendingWildcardAssignment = null;
    
    // Resume normal turn flow
    if (!turn.pendingAction) {
      turn.phase = TurnPhase.Play;
    }
    
    this.checkWin(state, player);
    state.lastActivityAt = Date.now();
  }

  // -- Helpers --

  private getAvailableColorsForWildcard(player: Player, card: Card): PropertyColor[] {
    if (!card.colors) return [];
    
    // For dual-color wildcards, they can always be placed as either color
    if (card.colors.length <= 2) {
      return card.colors;
    }
    
    // Multi-color wildcards can be placed anywhere, plus unassigned
    const validColors = [...card.colors, PropertyColor.Unassigned];
    
    return validColors;
  }

  private getPlayer(state: GameState, playerId: string): Player {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");
    return player;
  }

  private getTurn(state: GameState): TurnState {
    if (!state.turn) throw new Error("No active turn");
    return state.turn;
  }

  private assertCurrentPlayer(state: GameState, playerId: string): void {
    const turn = this.getTurn(state);
    if (turn.playerId !== playerId) throw new Error("Not your turn");
  }

  private assertCanPlay(state: GameState): void {
    const turn = this.getTurn(state);
    if (turn.phase === TurnPhase.ActionPending) {
      throw new Error("Must resolve pending action first");
    }
    if (turn.cardsPlayed >= MAX_PLAYS_PER_TURN) {
      throw new Error("Already played maximum cards this turn");
    }
  }

  private assertCardType(card: Card, expected: CardType): void {
    if (card.type !== expected) {
      throw new Error(`Expected ${expected} but got ${card.type}`);
    }
  }

  private incrementPlays(state: GameState): void {
    state.turn!.cardsPlayed++;
  }

  private tryAutoEndTurn(state: GameState): void {
    const turn = this.getTurn(state);
    if (
      turn.cardsPlayed >= MAX_PLAYS_PER_TURN &&
      turn.phase === TurnPhase.Play &&
      !turn.pendingAction
    ) {
      const player = this.getPlayer(state, turn.playerId);
      const maxHand = state.settings.maxHandSize;
      // Auto-advance if unlimited hand size or within limit
      if (maxHand === 999 || player.hand.length <= maxHand) {
        this.advanceTurn(state);
      }
    }
  }

  private removeFromHand(player: Player, cardId: string): Card {
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error("Card not in hand");
    return player.hand.splice(idx, 1)[0]!;
  }

  private setPendingAction(
    state: GameState,
    card: Card,
    action: PendingAction
  ): void {
    state.discardPile.push(card);
    this.incrementPlays(state);
    state.turn!.pendingAction = action;
    state.turn!.phase = TurnPhase.ActionPending;
  }

  private addPropertyToPlayer(player: Player, card: Card, color: PropertyColor | null, groupWithUnassigned?: boolean): void {
    // Convert null to Unassigned for wildcards
    const targetColor = color ?? PropertyColor.Unassigned;
    
    let set = player.properties.find(
      (s) => s.color === targetColor && s.cards.length < SET_SIZE[targetColor]
    );

    if (!set) {
      set = { color: targetColor, cards: [], house: null, hotel: null };
      player.properties.push(set);
    }

    set.cards.push(card);
    
    // Auto-assign unassigned wildcards when a colored property is added to their stack
    // Or if explicitly requested via groupWithUnassigned
    if (targetColor !== PropertyColor.Unassigned && (card.type === CardType.Property || groupWithUnassigned)) {
      this.autoAssignWildcardsInSet(player, set);
    }
  }
  
  private autoAssignWildcardsInSet(player: Player, targetSet: PropertySet): void {
    // Find unassigned wildcards that can be assigned to this color
    const unassignedSet = player.properties.find(s => s.color === PropertyColor.Unassigned);
    if (!unassignedSet || unassignedSet.cards.length === 0) return;
    
    const targetColor = targetSet.color;
    if (targetColor === PropertyColor.Unassigned) return;
    
    // Move compatible wildcards from unassigned to the target set
    const cardsToMove: Card[] = [];
    for (const card of unassignedSet.cards) {
      if (card.type === CardType.PropertyWildcard && card.colors?.includes(targetColor)) {
        if (targetSet.cards.length + cardsToMove.length < SET_SIZE[targetColor]) {
          cardsToMove.push(card);
        }
      }
    }
    
    // Move the cards
    for (const card of cardsToMove) {
      const idx = unassignedSet.cards.findIndex(c => c.id === card.id);
      if (idx !== -1) {
        unassignedSet.cards.splice(idx, 1);
        targetSet.cards.push(card);
      }
    }
    
    // Clean up empty unassigned set
    if (unassignedSet.cards.length === 0) {
      const setIdx = player.properties.findIndex(s => s.color === PropertyColor.Unassigned);
      if (setIdx !== -1) {
        player.properties.splice(setIdx, 1);
      }
    }
  }

  private removePropertyFromPlayer(player: Player, cardId: string): Card {
    for (const set of player.properties) {
      const idx = set.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        const [card] = set.cards.splice(idx, 1);
        // If set becomes empty, remove it. If it had house/hotel and is no longer complete, orphan them.
        if (!isSetComplete(set)) {
          if (set.house) {
            // Orphan the house — put it in a standalone property "slot"
            player.bank.push(set.house);
            set.house = null;
          }
          if (set.hotel) {
            player.bank.push(set.hotel);
            set.hotel = null;
          }
        }
        if (set.cards.length === 0) {
          player.properties = player.properties.filter((s) => s !== set);
        }
        return card!;
      }
    }
    throw new Error("Card not found in properties");
  }

  private removeCardFromTable(player: Player, cardId: string): Card {
    // Check bank
    const bankIdx = player.bank.findIndex((c) => c.id === cardId);
    if (bankIdx !== -1) {
      return player.bank.splice(bankIdx, 1)[0]!;
    }

    // Check properties
    for (const set of player.properties) {
      if (set.house?.id === cardId) {
        const card = set.house;
        set.house = null;
        return card;
      }
      if (set.hotel?.id === cardId) {
        const card = set.hotel;
        set.hotel = null;
        return card;
      }
      const idx = set.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        const [card] = set.cards.splice(idx, 1);
        if (!isSetComplete(set)) {
          if (set.house) {
            player.bank.push(set.house);
            set.house = null;
          }
          if (set.hotel) {
            player.bank.push(set.hotel);
            set.hotel = null;
          }
        }
        if (set.cards.length === 0) {
          player.properties = player.properties.filter((s) => s !== set);
        }
        return card!;
      }
    }

    throw new Error("Card not found on table");
  }

  private findPropertyOnTable(player: Player, cardId: string): Card | null {
    for (const set of player.properties) {
      const card = set.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return null;
  }

  private isCardInCompleteSet(player: Player, cardId: string): boolean {
    for (const set of player.properties) {
      if (isSetComplete(set) && set.cards.some((c) => c.id === cardId)) {
        return true;
      }
    }
    return false;
  }

  private calculateRent(player: Player, color: PropertyColor): number {
    let totalCards = 0;
    let hasHouse = false;
    let hasHotel = false;

    for (const set of player.properties) {
      if (set.color === color) {
        totalCards += set.cards.length;
        if (set.house) hasHouse = true;
        if (set.hotel) hasHotel = true;
      }
    }

    if (totalCards === 0) return 0;

    const rents = RENT_VALUES[color];
    const idx = Math.min(totalCards, rents.length) - 1;
    let rent = rents[idx]!;

    if (totalCards >= SET_SIZE[color]) {
      if (hasHouse) rent += 3;
      if (hasHotel) rent += 4;
    }

    return rent;
  }

  private totalTableValue(player: Player): number {
    let total = 0;
    for (const card of player.bank) total += card.value;
    for (const set of player.properties) {
      for (const card of set.cards) total += card.value;
      if (set.house) total += set.house.value;
      if (set.hotel) total += set.hotel.value;
    }
    return total;
  }

  private checkWin(state: GameState, player: Player): void {
    const completeSets = player.properties.filter((s) => isSetComplete(s));
    if (completeSets.length >= 3) {
      state.phase = GamePhase.Finished;
      state.winner = player.id;
    }
  }

  resignPlayer(state: GameState, playerId: string): void {
    if (state.phase !== GamePhase.Playing) {
      throw new Error("Cannot resign when game is not in progress");
    }

    const player = this.getPlayer(state, playerId);
    player.connected = false;

    // Remove from properties and bank (forfeit all assets)
    player.hand = [];
    player.bank = [];
    player.properties = [];

    // If this was the current player's turn, advance to next player
    if (state.turn?.playerId === playerId) {
      this.advanceTurn(state);
    }

    // Check if only one player remains
    const activePlayers = state.players.filter((p) => p.connected);
    if (activePlayers.length === 1) {
      state.phase = GamePhase.Finished;
      state.winner = activePlayers[0]!.id;
    }

    state.lastActivityAt = Date.now();
  }
}
