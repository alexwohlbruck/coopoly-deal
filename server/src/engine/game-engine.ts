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
    state.startedAt = Date.now();
    state.lastActivityAt = Date.now();
  }

  rematchGame(state: GameState): void {
    // Remember the winner to make them go first
    const previousWinner = state.winner;

    state.deck = shuffleDeck(createDeck());
    state.discardPile = [];

    // Set the starting player to the previous winner
    if (previousWinner) {
      const winnerIndex = state.players.findIndex(
        (p) => p.id === previousWinner,
      );
      state.currentPlayerIndex = winnerIndex >= 0 ? winnerIndex : 0;
    } else {
      state.currentPlayerIndex = 0;
    }

    state.phase = GamePhase.Playing;
    state.turn = null;
    state.winner = null;
    state.gameEndedBroadcasted = false;

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
    state.startedAt = Date.now();
    state.lastActivityAt = Date.now();
  }

  returnToLobby(state: GameState): void {
    state.phase = GamePhase.Waiting;
    state.deck = [];
    state.discardPile = [];
    state.turn = null;
    state.winner = null;
    state.gameEndedBroadcasted = false;
    state.currentPlayerIndex = 0;

    for (const player of state.players) {
      player.hand = [];
      player.bank = [];
      player.properties = [];
      player.connected = true;
    }

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

    const drawCount = player.hand.length === 0 ? 5 : state.settings.drawCardsPerTurn;
    this.drawCards(state, player, drawCount);

    state.turn = {
      playerId: player.id,
      cardsPlayed: 0,
      phase: TurnPhase.Play,
      pendingAction: null,
      pendingWildcardAssignments: [],
      pendingWildcardAssignment: null,
      rentMultiplier: 1,
      expiresAt:
        state.settings.turnTimer > 0
          ? Date.now() + state.settings.turnTimer * 1000
          : null,
      pausedTimeLeft: null,
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

  handleTurnTimeout(state: GameState): boolean {
    if (state.phase !== GamePhase.Playing || !state.turn) return false;

    const turn = state.turn;
    const now = Date.now();

    if (!turn.expiresAt || now < turn.expiresAt) return false;

    let changed = false;

    if (turn.phase === TurnPhase.Play) {
      const player = this.getPlayer(state, turn.playerId);
      const maxHand = state.settings.maxHandSize;

      // Auto-discard if over limit
      if (maxHand !== 999 && player.hand.length > maxHand) {
        const excess = player.hand.length - maxHand;
        const toDiscard = player.hand.slice(0, excess);
        this.discardCards(
          state,
          player.id,
          toDiscard.map((c) => c.id),
        );
      }

      this.advanceTurn(state);
      changed = true;
    } else if (turn.phase === TurnPhase.ActionPending) {
      if (turn.pendingWildcardAssignment) {
        // Auto-assign to first available color
        this.assignReceivedWildcard(
          state,
          turn.pendingWildcardAssignment.playerId,
          turn.pendingWildcardAssignment.cardId,
          turn.pendingWildcardAssignment.availableColors[0]!,
        );
        changed = true;
      } else if (turn.pendingAction) {
        const action = turn.pendingAction;

        // Auto-respond for anyone who hasn't
        for (const targetId of action.targetPlayerIds) {
          if (!action.respondedPlayerIds.includes(targetId)) {
            const target = this.getPlayer(state, targetId);

            if (
              action.type === "rent" ||
              action.type === "debtCollector" ||
              action.type === "birthday"
            ) {
              // Auto-pay: just pay with bank cards first, then properties if needed
              const cardsToPay: string[] = [];
              let paid = 0;

              // Try bank first
              for (const card of target.bank) {
                if (paid >= action.amount!) break;
                cardsToPay.push(card.id);
                paid += card.value;
              }

              // If still need more, use properties
              if (paid < action.amount!) {
                for (const set of target.properties) {
                  for (const card of set.cards) {
                    if (paid >= action.amount!) break;
                    cardsToPay.push(card.id);
                    paid += card.value;
                  }
                }
              }

              try {
                this.respondPayWithCards(state, targetId, cardsToPay);
                changed = true;
              } catch (e) {
                // If payment fails for some reason, just accept action to unblock
                this.respondAcceptAction(state, targetId);
                changed = true;
              }
            } else {
              // For steal, deal breaker, force deal, just accept
              this.respondAcceptAction(state, targetId);
              changed = true;
            }
          }
        }
      }
    }

    return changed;
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
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new Error(`Card ${cardId} not in hand`);

    if (card.type === CardType.Property) {
      throw new Error("Property cards cannot be placed in the bank");
    }

    this.removeFromHand(player, cardId);
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
    groupWithUnassigned?: boolean,
    createNewSet?: boolean,
  ): void {
    this.assertCurrentPlayer(state, playerId);
    this.assertCanPlay(state);

    const player = this.getPlayer(state, playerId);
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new Error(`Card ${cardId} not in hand`);

    if (
      card.type !== CardType.Property &&
      card.type !== CardType.PropertyWildcard
    ) {
      throw new Error("Only property cards can be played to the property area");
    }

    // Validate color BEFORE removing from hand so the card isn't lost on error
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
        throw new Error(
          "Only multi-color wildcards can be placed in unassigned stack",
        );
      }
      if (state.settings.wildcardFlipCountsAsMove) {
        throw new Error(
          "Rainbow sets are disabled when wildcard flips count as moves",
        );
      }
    }

    this.removeFromHand(player, cardId);

    this.addPropertyToPlayer(
      player,
      card,
      asColor,
      groupWithUnassigned,
      createNewSet,
    );
    this.incrementPlays(state);
    this.checkWin(state, player);
    this.tryAutoEndTurn(state);
    state.lastActivityAt = Date.now();
  }

  playActionCard(
    state: GameState,
    playerId: string,
    payload: PlayActionPayload,
  ): void {
    this.assertCurrentPlayer(state, playerId);

    if (payload.action !== "doubleTheRent") {
      this.assertCanPlay(state);
    } else {
      const turn = this.getTurn(state);
      if (turn.cardsPlayed >= state.settings.movesPerTurn) {
        throw new Error("Already played maximum cards this turn");
      }
    }

    const player = this.getPlayer(state, playerId);
    const card = player.hand.find((c) => c.id === payload.cardId);
    if (!card) throw new Error(`Card ${payload.cardId} not in hand`);

    // Validate card type BEFORE removing from hand so the card isn't
    // lost if the type doesn't match or a downstream check fails.
    const expectedType: Record<string, CardType> = {
      passGo: CardType.PassGo,
      slyDeal: CardType.SlyDeal,
      forceDeal: CardType.ForceDeal,
      dealBreaker: CardType.DealBreaker,
      debtCollector: CardType.DebtCollector,
      birthday: CardType.Birthday,
      rentDual: CardType.RentDual,
      rentWild: CardType.RentWild,
      doubleTheRent: CardType.DoubleTheRent,
      house: CardType.House,
      hotel: CardType.Hotel,
    };
    const expected = expectedType[payload.action];
    if (!expected) throw new Error("Unknown action");
    this.assertCardType(card, expected);

    // Pre-validate action-specific conditions BEFORE removing from hand
    // so the card isn't lost if a downstream check fails.
    if (payload.action === "rentDual") {
      if (!card.colors?.includes(payload.color)) {
        throw new Error("Rent card does not match that color");
      }
      if (this.calculateRent(player, payload.color) === 0) {
        throw new Error("You have no properties of that color");
      }
    }

    if (payload.action === "rentWild") {
      if (this.calculateRent(player, payload.color) === 0) {
        throw new Error("You have no properties of that color");
      }
    }

    if (payload.action === "forceDeal") {
      const target = this.getPlayer(state, payload.targetPlayerId);
      const myCard = this.findPropertyOnTable(player, payload.myCardId);
      if (!myCard) throw new Error("Your card not found on table");
      if (this.isCardInCompleteSet(player, payload.myCardId)) {
        throw new Error("Cannot trade from a complete set");
      }
      const targetCard = this.findPropertyOnTable(target, payload.targetCardId);
      if (!targetCard) throw new Error("Target card not found on table");
      if (this.isCardInCompleteSet(target, payload.targetCardId)) {
        throw new Error("Cannot take from a complete set");
      }
    }

    if (payload.action === "dealBreaker") {
      const target = this.getPlayer(state, payload.targetPlayerId);
      const set = target.properties.find(
        (s) => s.color === payload.targetSetColor && isSetComplete(s),
      );
      if (!set) {
        throw new Error("Target does not have a complete set of that color");
      }
    }

    if (payload.action === "house" || payload.action === "hotel") {
      const setColor = payload.setColor;
      if (
        setColor === PropertyColor.Railroad ||
        setColor === PropertyColor.Utility
      ) {
        throw new Error(
          `Cannot place ${payload.action === "house" ? "houses" : "hotels"} on Railroad or Utility`,
        );
      }
      const set = player.properties.find(
        (s) => s.color === setColor && isSetComplete(s),
      );
      if (!set) throw new Error("Set is not complete");
      if (payload.action === "house") {
        if (set.house) throw new Error("Set already has a house");
      } else {
        if (state.settings.requireHouseBeforeHotel && !set.house)
          throw new Error("Must have a house before placing a hotel");
        if (set.hotel) throw new Error("Set already has a hotel");
      }
    }

    this.removeFromHand(player, payload.cardId);

    switch (payload.action) {
      case "passGo":
        state.discardPile.push(card);
        this.drawCards(state, player, 2);
        this.incrementPlays(state);
        break;

      case "slyDeal":
        this.executeSlyDeal(
          state,
          player,
          card,
          payload.targetPlayerId,
          payload.targetCardId,
        );
        break;

      case "forceDeal":
        this.executeForceDeal(
          state,
          player,
          card,
          payload.myCardId,
          payload.targetPlayerId,
          payload.targetCardId,
        );
        break;

      case "dealBreaker":
        this.executeDealBreaker(
          state,
          player,
          card,
          payload.targetPlayerId,
          payload.targetSetColor,
        );
        break;

      case "debtCollector":
        this.executeDebtCollector(state, player, card, payload.targetPlayerId);
        break;

      case "birthday":
        this.executeBirthday(state, player, card);
        break;

      case "rentDual":
        this.executeRentDual(state, player, card, payload.color);
        break;

      case "rentWild":
        this.executeRentWild(
          state,
          player,
          card,
          payload.color,
          payload.targetPlayerId,
        );
        break;

      case "doubleTheRent":
        this.executeDoubleTheRent(state, player, card);
        break;

      case "house":
        this.executeHouse(state, player, card, payload.setColor);
        break;

      case "hotel":
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
    targetCardId: string,
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
    targetCardId: string,
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
    targetSetColor: PropertyColor,
  ): void {
    const target = this.getPlayer(state, targetPlayerId);
    const set = target.properties.find(
      (s) => s.color === targetSetColor && isSetComplete(s),
    );
    if (!set)
      throw new Error("Target does not have a complete set of that color");

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
    targetPlayerId: string,
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
    color: PropertyColor,
  ): void {
    if (!card.colors?.includes(color)) {
      throw new Error("Rent card does not match that color");
    }

    const rentAmount = this.calculateRent(player, color);
    if (rentAmount === 0)
      throw new Error("You have no properties of that color");

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
    if (state.settings.turnTimer > 0 && state.turn!.expiresAt) {
      state.turn!.pausedTimeLeft = Math.max(
        0,
        state.turn!.expiresAt - Date.now(),
      );
      state.turn!.expiresAt = null;
    }

    // Reset multiplier after using it
    turn.rentMultiplier = 1;
  }

  private executeRentWild(
    state: GameState,
    player: Player,
    card: Card,
    color: PropertyColor,
    targetPlayerId: string,
  ): void {
    const rentAmount = this.calculateRent(player, color);
    if (rentAmount === 0)
      throw new Error("You have no properties of that color");

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
    if (state.settings.turnTimer > 0 && state.turn!.expiresAt) {
      state.turn!.pausedTimeLeft = Math.max(
        0,
        state.turn!.expiresAt - Date.now(),
      );
      state.turn!.expiresAt = null;
    }

    // Reset multiplier after using it
    turn.rentMultiplier = 1;
  }

  private executeDoubleTheRent(
    state: GameState,
    player: Player,
    card: Card,
  ): void {
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
    setColor: PropertyColor,
  ): void {
    if (
      setColor === PropertyColor.Railroad ||
      setColor === PropertyColor.Utility
    ) {
      throw new Error("Cannot place houses on Railroad or Utility");
    }

    const set = player.properties.find(
      (s) => s.color === setColor && isSetComplete(s),
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
    setColor: PropertyColor,
  ): void {
    if (
      setColor === PropertyColor.Railroad ||
      setColor === PropertyColor.Utility
    ) {
      throw new Error("Cannot place hotels on Railroad or Utility");
    }

    const set = player.properties.find(
      (s) => s.color === setColor && isSetComplete(s),
    );
    if (!set) throw new Error("Set is not complete");
    if (state.settings.requireHouseBeforeHotel && !set.house) throw new Error("Must have a house before placing a hotel");
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
    const jsnIndex = player.hand.findIndex(
      (c) => c.type === CardType.JustSayNo,
    );
    if (jsnIndex === -1) throw new Error("No Just Say No card in hand");

    const [jsnCard] = player.hand.splice(jsnIndex, 1);
    state.discardPile.push(jsnCard!);

    if (!action.justSayNoChain) {
      action.justSayNoChain = {
        targetPlayerId: playerId,
        initiatorTargetId: playerId,
        depth: 1,
      };
    } else {
      action.justSayNoChain.depth++;
      action.justSayNoChain.targetPlayerId = playerId;
    }

    // Auto-clear even-depth chains for payment actions so the client
    // goes straight to the payment card selector (which already has a
    // JSN button) instead of showing a redundant "Accept or JSN" prompt
    // first.  Even depth means the original action-source successfully
    // counter-blocked — the target's JSN was negated.
    if (
      action.justSayNoChain &&
      action.justSayNoChain.depth % 2 === 0 &&
      (action.type === "rent" ||
        action.type === "debtCollector" ||
        action.type === "birthday")
    ) {
      action.justSayNoChain = undefined;
    }

    state.lastActivityAt = Date.now();
  }

  respondAcceptAction(state: GameState, playerId: string): void {
    const turn = this.getTurn(state);
    const action = turn.pendingAction;
    if (!action) throw new Error("No pending action");

    if (action.justSayNoChain) {
      if (playerId === action.justSayNoChain.targetPlayerId) {
        throw new Error(
          "Waiting for the other player to respond to your Just Say No",
        );
      }
      const isChainParticipant =
        playerId === action.sourcePlayerId ||
        playerId === action.justSayNoChain.initiatorTargetId;
      if (!isChainParticipant) {
        throw new Error("You are not involved in this Just Say No chain");
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
        // Even depth: source counter-blocked, target is accepting that
        // their block failed — the original action goes through.
        action.justSayNoChain = undefined;

        // For payment actions (rent, debtCollector, birthday) we just
        // clear the chain.  The target is still in targetPlayerIds and
        // NOT in respondedPlayerIds, so the client will now show the
        // normal payment-selection prompt to them.
        if (
          action.type === "rent" ||
          action.type === "debtCollector" ||
          action.type === "birthday"
        ) {
          state.lastActivityAt = Date.now();
          return;
        }

        // Non-payment actions (slyDeal, forceDeal, dealBreaker) resolve
        // immediately — there's no card-selection step.
        const targetId = action.targetPlayerIds.find(
          (id) => !action.respondedPlayerIds.includes(id),
        );
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

  respondPayWithCards(
    state: GameState,
    payerId: string,
    cardIds: string[],
  ): void {
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
      throw new Error(
        "You must pay with at least some cards if you have assets on the table",
      );
    }

    // Pre-validate: compute total payment and check all cards exist
    // BEFORE moving anything, so cards aren't lost on error
    let totalPaid = 0;
    const cardsToTransfer: Card[] = [];
    for (const cardId of cardIds) {
      const card = this.findCardOnTable(payer, cardId);
      if (!card) throw new Error(`Card ${cardId} not found on table`);
      totalPaid += card.value;
      cardsToTransfer.push(card);
    }

    // Calculate remaining table value after these cards are removed
    const remainingTableValue = this.totalTableValue(payer) - totalPaid;
    if (totalPaid < action.amount && remainingTableValue > 0) {
      throw new Error("You must pay more — you still have assets on the table");
    }

    // Validation passed — now transfer cards
    for (const card of cardsToTransfer) {
      this.removeCardFromTable(payer, card.id);

      if (
        card.type === CardType.Property ||
        card.type === CardType.PropertyWildcard
      ) {
        if (
          card.type === CardType.PropertyWildcard &&
          card.colors &&
          card.colors.length > 1
        ) {
          if (
            card.colors.length > 2 &&
            !state.settings.wildcardFlipCountsAsMove
          ) {
            this.addPropertyToPlayer(source, card, PropertyColor.Unassigned);
          } else {
            this.queueWildcardAssignment(state, source.id, card);
          }
        } else {
          const color = card.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(source, card, color);
        }
      } else {
        source.bank.push(card);
      }
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
        if (
          card.type === CardType.PropertyWildcard &&
          card.colors &&
          card.colors.length > 1
        ) {
          this.queueWildcardAssignment(state, source.id, card);
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
        if (!sourceCardId || !targetCardId)
          throw new Error("Missing card selections");

        // Remove cards from both players
        const sourceCard = this.removePropertyFromPlayer(source, sourceCardId);
        const targetCard = this.removePropertyFromPlayer(target, targetCardId);

        // Handle target receiving source's card (might be wildcard)
        if (
          targetCard.type === CardType.PropertyWildcard &&
          targetCard.colors &&
          targetCard.colors.length > 1
        ) {
          this.queueWildcardAssignment(state, source.id, targetCard);
        } else {
          const targetColor = targetCard.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(source, targetCard, targetColor);
        }

        // Handle source receiving target's card (might be wildcard)
        if (
          sourceCard.type === CardType.PropertyWildcard &&
          sourceCard.colors &&
          sourceCard.colors.length > 1
        ) {
          this.queueWildcardAssignment(state, target.id, sourceCard);
        } else {
          const sourceColor = sourceCard.colors?.[0] ?? PropertyColor.Brown;
          this.addPropertyToPlayer(target, sourceCard, sourceColor);
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
          (s) => s.color === setColor && isSetComplete(s),
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
      action.respondedPlayerIds.includes(id),
    );

    if (allResponded) {
      turn.pendingAction = null;
      // Only change phase if there's no pending wildcard assignment
      if (!turn.pendingWildcardAssignment) {
        turn.phase = TurnPhase.Play;
        if (state.settings.turnTimer > 0 && turn.pausedTimeLeft !== null) {
          turn.expiresAt = Date.now() + turn.pausedTimeLeft;
          turn.pausedTimeLeft = null;
        }
        this.tryAutoEndTurn(state);
      }
    }
  }

  private queueWildcardAssignment(
    state: GameState,
    playerId: string,
    card: Card,
  ): void {
    const turn = this.getTurn(state);
    const player = this.getPlayer(state, playerId);

    // Place in unassigned temporarily
    this.addPropertyToPlayer(player, card, PropertyColor.Unassigned);

    const assignment = {
      playerId,
      cardId: card.id,
      availableColors: this.getAvailableColorsForWildcard(state, player, card),
    };

    if (!turn.pendingWildcardAssignments) {
      turn.pendingWildcardAssignments = [];
    }
    turn.pendingWildcardAssignments.push(assignment);

    // Set the legacy property to the first one for backwards compatibility
    turn.pendingWildcardAssignment = turn.pendingWildcardAssignments[0]!;

    turn.phase = TurnPhase.ActionPending;
    if (state.settings.turnTimer > 0 && turn.expiresAt) {
      turn.pausedTimeLeft = Math.max(0, turn.expiresAt - Date.now());
      turn.expiresAt = null;
    }
  }

  // -- Rearrange properties --

  rearrangeProperty(
    state: GameState,
    playerId: string,
    cardId: string,
    toColor: PropertyColor,
    createNewSet?: boolean,
  ): void {
    this.assertCurrentPlayer(state, playerId);
    const player = this.getPlayer(state, playerId);

    // Find the card's current color before removing it
    let currentColor = PropertyColor.Unassigned;
    for (const set of player.properties) {
      if (set.cards.some((c) => c.id === cardId)) {
        currentColor = set.color;
        break;
      }
    }

    // Find the card on the table without removing it yet
    const card = this.findPropertyOnTable(player, cardId);
    if (!card) throw new Error("Card not found on table");

    // Validate BEFORE removing so the card isn't lost on error
    if (card.type !== CardType.PropertyWildcard) {
      throw new Error("Only wildcards can be rearranged");
    }
    if (
      !card.colors?.includes(toColor) &&
      toColor !== PropertyColor.Unassigned
    ) {
      throw new Error("Card cannot be used for that color");
    }

    if (
      toColor === PropertyColor.Unassigned &&
      state.settings.wildcardFlipCountsAsMove
    ) {
      throw new Error(
        "Rainbow sets are disabled when wildcard flips count as moves",
      );
    }

    // Now safe to remove and re-add
    this.removePropertyFromPlayer(player, cardId);
    this.addPropertyToPlayer(player, card, toColor, false, createNewSet);

    // After moving the wildcard, regroup any orphaned properties of the old color
    if (currentColor !== PropertyColor.Unassigned && currentColor !== toColor) {
      this.regroupProperties(player, currentColor);
    }

    // If setting is enabled, count this as a move (only during Play phase, not during steal/swap)
    // EXCEPTION: Moving a wildcard from the Rainbow set does not cost a move
    const turn = this.getTurn(state);
    if (
      state.settings.wildcardFlipCountsAsMove &&
      turn.phase === TurnPhase.Play &&
      currentColor !== PropertyColor.Unassigned
    ) {
      this.incrementPlays(state);
      this.tryAutoEndTurn(state);
    }

    this.checkWin(state, player);
    state.lastActivityAt = Date.now();
  }

  assignReceivedWildcard(
    state: GameState,
    playerId: string,
    cardId: string,
    color: PropertyColor,
  ): void {
    const turn = this.getTurn(state);

    // Verify there's a pending assignment for this player and card
    if (
      !turn.pendingWildcardAssignments ||
      turn.pendingWildcardAssignments.length === 0
    ) {
      throw new Error("No pending wildcard assignment");
    }

    const assignmentIndex = turn.pendingWildcardAssignments.findIndex(
      (a) => a.playerId === playerId && a.cardId === cardId,
    );

    if (assignmentIndex === -1) {
      throw new Error("Not your wildcard to assign or wrong card");
    }

    const assignment = turn.pendingWildcardAssignments[assignmentIndex]!;
    if (!assignment.availableColors.includes(color)) {
      throw new Error("Invalid color for this wildcard");
    }

    const player = this.getPlayer(state, playerId);
    const card = this.removePropertyFromPlayer(player, cardId);

    // Assign the wildcard to the selected color
    this.addPropertyToPlayer(player, card, color);

    // Remove this assignment
    turn.pendingWildcardAssignments.splice(assignmentIndex, 1);

    // Update legacy property
    turn.pendingWildcardAssignment = turn.pendingWildcardAssignments[0] ?? null;

    // Resume normal turn flow if no more assignments and no pending actions
    if (turn.pendingWildcardAssignments.length === 0 && !turn.pendingAction) {
      turn.phase = TurnPhase.Play;
      if (state.settings.turnTimer > 0 && turn.pausedTimeLeft !== null) {
        turn.expiresAt = Date.now() + turn.pausedTimeLeft;
        turn.pausedTimeLeft = null;
      }
      // If the wildcard assignment was the last thing blocking turn
      // completion (e.g. user played their 3rd action card which stole
      // a wildcard), auto-advance now. Without this the turn just sits
      // there and forces the player to manually click End Turn even
      // though they've used all their plays.
      this.tryAutoEndTurn(state);
    }

    this.checkWin(state, player);
    state.lastActivityAt = Date.now();
  }

  // -- Helpers --

  private getAvailableColorsForWildcard(
    state: GameState,
    player: Player,
    card: Card,
  ): PropertyColor[] {
    if (!card.colors) return [];

    // For dual-color wildcards, they can always be placed as either color
    if (card.colors.length <= 2) {
      return card.colors;
    }

    // Multi-color wildcards can only be placed on existing incomplete sets, plus unassigned (unless rule is active)
    const validColors = card.colors.filter(
      (c) =>
        c !== PropertyColor.Unassigned &&
        player.properties.some(
          (s) =>
            s.color === c && s.cards.length > 0 && s.cards.length < SET_SIZE[c],
        ),
    );

    if (!state.settings.wildcardFlipCountsAsMove) {
      validColors.push(PropertyColor.Unassigned);
    }

    // Fallback: if no valid colors are available (e.g. no existing sets and rainbow not allowed),
    // allow them to pick any color to start a new set.
    if (validColors.length === 0) {
      return card.colors.filter((c) => c !== PropertyColor.Unassigned);
    }

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
    if (turn.cardsPlayed >= state.settings.movesPerTurn) {
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
      turn.cardsPlayed >= state.settings.movesPerTurn &&
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
    action: PendingAction,
  ): void {
    state.discardPile.push(card);
    this.incrementPlays(state);
    state.turn!.pendingAction = action;
    state.turn!.phase = TurnPhase.ActionPending;
    if (state.settings.turnTimer > 0 && state.turn!.expiresAt) {
      state.turn!.pausedTimeLeft = Math.max(
        0,
        state.turn!.expiresAt - Date.now(),
      );
      state.turn!.expiresAt = null;
    }
  }

  private addPropertyToPlayer(
    player: Player,
    card: Card,
    color: PropertyColor | null,
    groupWithUnassigned?: boolean,
    createNewSet?: boolean,
  ): void {
    // Convert null to Unassigned for wildcards
    const targetColor = color ?? PropertyColor.Unassigned;

    let set = undefined;

    if (!createNewSet) {
      set = player.properties.find(
        (s) =>
          s.color === targetColor && s.cards.length < SET_SIZE[targetColor],
      );
    }

    if (!set) {
      set = { color: targetColor, cards: [], house: null, hotel: null };
      player.properties.push(set);
    }

    set.cards.push(card);

    // Auto-assign unassigned wildcards when explicitly requested via groupWithUnassigned
    if (targetColor !== PropertyColor.Unassigned && groupWithUnassigned) {
      this.autoAssignWildcardsInSet(player, set);
    }
  }

  private autoAssignWildcardsInSet(
    player: Player,
    targetSet: PropertySet,
  ): void {
    // Find unassigned wildcards that can be assigned to this color
    const unassignedSet = player.properties.find(
      (s) => s.color === PropertyColor.Unassigned,
    );
    if (!unassignedSet || unassignedSet.cards.length === 0) return;

    const targetColor = targetSet.color;
    if (targetColor === PropertyColor.Unassigned) return;

    // Move compatible wildcards from unassigned to the target set
    const cardsToMove: Card[] = [];
    for (const card of unassignedSet.cards) {
      if (
        card.type === CardType.PropertyWildcard &&
        card.colors?.includes(targetColor)
      ) {
        if (
          targetSet.cards.length + cardsToMove.length <
          SET_SIZE[targetColor]
        ) {
          cardsToMove.push(card);
        }
      }
    }

    // Move the cards
    for (const card of cardsToMove) {
      const idx = unassignedSet.cards.findIndex((c) => c.id === card.id);
      if (idx !== -1) {
        unassignedSet.cards.splice(idx, 1);
        targetSet.cards.push(card);
      }
    }

    // Clean up empty unassigned set
    if (unassignedSet.cards.length === 0) {
      const setIdx = player.properties.findIndex(
        (s) => s.color === PropertyColor.Unassigned,
      );
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

  /**
   * Regroups all property sets of a given color. 
   * When a wildcard is removed from a set, orphaned properties may be left in separate sets.
   * This consolidates them into fewer sets.
   */
  private regroupProperties(player: Player, color: PropertyColor): void {
    // Find all sets of the specified color
    const setsOfColor = player.properties.filter((s) => s.color === color);
    
    if (setsOfColor.length <= 1) {
      return; // Nothing to regroup
    }

    // Collect all cards and houses/hotels from these sets
    const allCards: Card[] = [];
    const houses: Card[] = [];
    const hotels: Card[] = [];

    for (const set of setsOfColor) {
      allCards.push(...set.cards);
      if (set.house) houses.push(set.house);
      if (set.hotel) hotels.push(set.hotel);
    }

    // Remove all existing sets of this color
    player.properties = player.properties.filter((s) => s.color !== color);

    // Re-add all cards, which will naturally group them optimally
    for (const card of allCards) {
      this.addPropertyToPlayer(player, card, color, false, false);
    }

    // Re-add houses and hotels to complete sets
    const completeSets = player.properties.filter(
      (s) => s.color === color && isSetComplete(s)
    );
    
    for (const house of houses) {
      const targetSet = completeSets.find((s) => !s.house && !s.hotel);
      if (targetSet) {
        targetSet.house = house;
      } else {
        player.bank.push(house); // No valid set, return to bank
      }
    }

    for (const hotel of hotels) {
      const targetSet = completeSets.find((s) => !s.hotel);
      if (targetSet) {
        targetSet.hotel = hotel;
      } else {
        player.bank.push(hotel); // No valid set, return to bank
      }
    }
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

  private findCardOnTable(player: Player, cardId: string): Card | null {
    // Check bank
    const bankCard = player.bank.find((c) => c.id === cardId);
    if (bankCard) return bankCard;

    // Check properties (cards, house, hotel)
    for (const set of player.properties) {
      if (set.house?.id === cardId) return set.house;
      if (set.hotel?.id === cardId) return set.hotel;
      const card = set.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return null;
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

  checkWin(state: GameState, player: Player): void {
    const completeSets = player.properties.filter((s) => isSetComplete(s));

    let winCount = 0;
    if (state.settings.allowDuplicateSets) {
      winCount = completeSets.length;
    } else {
      const uniqueColors = new Set(completeSets.map((s) => s.color));
      winCount = uniqueColors.size;
    }

    if (winCount >= state.settings.setsToWin) {
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
