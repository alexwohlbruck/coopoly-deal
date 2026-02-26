import { describe, it, expect, beforeEach } from "bun:test";
import { GameEngine } from "./game-engine.ts";
import { createDeck } from "./deck.ts";
import {
  type Card,
  type GameState,
  type Player,
  CardType,
  GamePhase,
  TurnPhase,
  PropertyColor,
  SET_SIZE,
  RENT_VALUES,
  isSetComplete,
} from "../models/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestGame(playerCount = 2) {
  const engine = new GameEngine();
  const state = engine.createGame("TEST");
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push(engine.addPlayer(state, `Player ${i + 1}`));
  }
  return { state, engine, players };
}

function startTestGame(playerCount = 2) {
  const result = createTestGame(playerCount);
  result.engine.startGame(result.state);
  return result;
}

function givePlayerCard(player: Player, card: Partial<Card>): Card {
  const fullCard: Card = {
    id: `test_${Math.random().toString(36).slice(2)}`,
    type: CardType.Money,
    value: 0,
    ...card,
  };
  player.hand.push(fullCard);
  return fullCard;
}

function makeProperty(color: PropertyColor, value?: number, name?: string): Partial<Card> {
  return {
    type: CardType.Property,
    value: value ?? 1,
    colors: [color],
    name: name ?? `Test ${color}`,
  };
}

function makeWildcard(colors: PropertyColor[], value = 0): Partial<Card> {
  return {
    type: CardType.PropertyWildcard,
    value,
    colors,
  };
}

function makeMoney(value: number): Partial<Card> {
  return { type: CardType.Money, value };
}

function makeAction(type: CardType, value = 0): Partial<Card> {
  return { type, value };
}

function makeRentDual(color1: PropertyColor, color2: PropertyColor): Partial<Card> {
  return { type: CardType.RentDual, value: 1, colors: [color1, color2] };
}

function makeRentWild(): Partial<Card> {
  return { type: CardType.RentWild, value: 3, colors: Object.values(PropertyColor) };
}

/** Fill a property set on a player so it's complete. */
function giveCompleteSet(player: Player, color: PropertyColor, value = 1): Card[] {
  const size = SET_SIZE[color];
  const cards: Card[] = [];
  for (let i = 0; i < size; i++) {
    const card: Card = {
      id: `set_${color}_${i}_${Math.random().toString(36).slice(2)}`,
      type: CardType.Property,
      value,
      colors: [color],
      name: `${color} prop ${i}`,
    };
    cards.push(card);
  }
  player.properties.push({ color, cards, house: null, hotel: null });
  return cards;
}

/** Return current player from state */
function currentPlayer(state: GameState): Player {
  return state.players.find((p) => p.id === state.turn!.playerId)!;
}

// ===========================================================================
// Tests
// ===========================================================================

describe("GameEngine", () => {
  // -------------------------------------------------------------------------
  // 1. Game Setup
  // -------------------------------------------------------------------------
  describe("Game Setup", () => {
    it("creates a game with correct initial state", () => {
      const engine = new GameEngine();
      const state = engine.createGame("ROOM1");
      expect(state.id).toBe("ROOM1");
      expect(state.players).toHaveLength(0);
      expect(state.deck).toHaveLength(0);
      expect(state.discardPile).toHaveLength(0);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.phase).toBe(GamePhase.Waiting);
      expect(state.turn).toBeNull();
      expect(state.winner).toBeNull();
    });

    it("adds players up to the limit of 6", () => {
      const { state, engine } = createTestGame(0);
      for (let i = 0; i < 6; i++) {
        engine.addPlayer(state, `P${i}`);
      }
      expect(state.players).toHaveLength(6);
    });

    it("throws when adding a 7th player", () => {
      const { state, engine } = createTestGame(6);
      expect(() => engine.addPlayer(state, "Extra")).toThrow("Room is full");
    });

    it("throws when adding players to a started game", () => {
      const { state, engine } = startTestGame(2);
      expect(() => engine.addPlayer(state, "Late")).toThrow("Game already started");
    });

    it("removes a player from the waiting room", () => {
      const { state, engine, players } = createTestGame(3);
      engine.removePlayer(state, players[1]!.id);
      expect(state.players).toHaveLength(2);
      expect(state.players.find((p) => p.id === players[1]!.id)).toBeUndefined();
    });

    it("marks a player as disconnected when removed during active game", () => {
      const { state, engine, players } = startTestGame(3);
      engine.removePlayer(state, players[1]!.id);
      expect(players[1]!.connected).toBe(false);
      expect(state.players).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Game Start
  // -------------------------------------------------------------------------
  describe("Game Start", () => {
    it("throws when starting with fewer than 2 players", () => {
      const { state, engine } = createTestGame(1);
      expect(() => engine.startGame(state)).toThrow("at least 2 players");
    });

    it("deals 5 cards to each player (first player gets +2 draw)", () => {
      const { state } = startTestGame(3);
      // First player: 5 dealt + 2 drawn at turn start = 7
      expect(state.players[0]!.hand).toHaveLength(7);
      // Other players: 5 dealt, no turn yet
      expect(state.players[1]!.hand).toHaveLength(5);
      expect(state.players[2]!.hand).toHaveLength(5);
    });

    it("creates a deck with 106 playable cards", () => {
      const deck = createDeck();
      expect(deck).toHaveLength(106);
    });

    it("deck has correct composition", () => {
      const deck = createDeck();
      const money = deck.filter((c) => c.type === CardType.Money);
      const property = deck.filter((c) => c.type === CardType.Property);
      const wildcards = deck.filter((c) => c.type === CardType.PropertyWildcard);
      const rent = deck.filter(
        (c) => c.type === CardType.RentDual || c.type === CardType.RentWild
      );
      const actions = deck.filter(
        (c) =>
          ![
            CardType.Money,
            CardType.Property,
            CardType.PropertyWildcard,
            CardType.RentDual,
            CardType.RentWild,
          ].includes(c.type)
      );
      expect(money).toHaveLength(20);
      expect(property).toHaveLength(28);
      expect(wildcards).toHaveLength(11);
      expect(actions).toHaveLength(34);
      expect(rent).toHaveLength(13);
    });

    it("first player's turn begins in Play phase", () => {
      const { state } = startTestGame(2);
      expect(state.turn).not.toBeNull();
      expect(state.turn!.phase).toBe(TurnPhase.Play);
      expect(state.turn!.playerId).toBe(state.players[0]!.id);
    });

    it("sets game phase to Playing", () => {
      const { state } = startTestGame(2);
      expect(state.phase).toBe(GamePhase.Playing);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Card Plays
  // -------------------------------------------------------------------------
  describe("Card Plays", () => {
    let state: GameState;
    let engine: GameEngine;
    let players: Player[];

    beforeEach(() => {
      ({ state, engine, players } = startTestGame(2));
    });

    it("plays a money card to bank", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeMoney(3));
      engine.playCardToBank(state, player.id, card.id);
      expect(player.bank).toContainEqual(card);
      expect(player.hand).not.toContainEqual(card);
    });

    it("plays an action card to bank (as money)", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeAction(CardType.PassGo, 1));
      engine.playCardToBank(state, player.id, card.id);
      expect(player.bank).toContainEqual(card);
    });

    it("plays a wildcard to bank", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(
        player,
        makeWildcard([PropertyColor.Brown, PropertyColor.LightBlue], 1)
      );
      engine.playCardToBank(state, player.id, card.id);
      expect(player.bank).toContainEqual(card);
    });

    it("blocks playing a property card to bank", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeProperty(PropertyColor.Brown));
      expect(() => engine.playCardToBank(state, player.id, card.id)).toThrow(
        "Property cards cannot be placed in the bank"
      );
    });

    it("plays a property card to the correct set", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeProperty(PropertyColor.Red, 3));
      engine.playCardToProperty(state, player.id, card.id, PropertyColor.Red);
      const set = player.properties.find((s) => s.color === PropertyColor.Red);
      expect(set).toBeDefined();
      expect(set!.cards.some((c) => c.id === card.id)).toBe(true);
    });

    it("plays a wildcard as a specific valid color", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(
        player,
        makeWildcard([PropertyColor.Pink, PropertyColor.Orange])
      );
      engine.playCardToProperty(state, player.id, card.id, PropertyColor.Orange);
      const set = player.properties.find((s) => s.color === PropertyColor.Orange);
      expect(set).toBeDefined();
      expect(set!.cards.some((c) => c.id === card.id)).toBe(true);
    });

    it("throws when playing a wildcard as an invalid color", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(
        player,
        makeWildcard([PropertyColor.Pink, PropertyColor.Orange])
      );
      expect(() =>
        engine.playCardToProperty(state, player.id, card.id, PropertyColor.Green)
      ).toThrow("Card cannot be played as green");
    });

    it("rejects non-property card types played to property area", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeMoney(5));
      expect(() =>
        engine.playCardToProperty(state, player.id, card.id, PropertyColor.Brown)
      ).toThrow("Only property cards can be played to the property area");
    });

    it("increments cards played counter", () => {
      const player = currentPlayer(state);
      expect(state.turn!.cardsPlayed).toBe(0);
      const c1 = givePlayerCard(player, makeMoney(1));
      engine.playCardToBank(state, player.id, c1.id);
      expect(state.turn!.cardsPlayed).toBe(1);
    });

    it("enforces max 3 plays per turn", () => {
      const player = currentPlayer(state);
      // Play 3 money cards, need hand ≤ maxHandSize for no auto-end
      for (let i = 0; i < 3; i++) {
        const c = givePlayerCard(player, makeMoney(1));
        engine.playCardToBank(state, player.id, c.id);
      }
      // If auto-end didn't fire (hand > 7), we should get an error on 4th play
      // Make sure hand size > 7 so auto-end doesn't trigger
      while (player.hand.length <= state.settings.maxHandSize) {
        givePlayerCard(player, makeMoney(1));
      }

      // Replay: fresh start
      ({ state, engine, players } = startTestGame(2));
      const p = currentPlayer(state);
      // Inflate hand so auto-end doesn't trigger
      for (let i = 0; i < 10; i++) givePlayerCard(p, makeMoney(1));

      const c1 = givePlayerCard(p, makeMoney(1));
      const c2 = givePlayerCard(p, makeMoney(2));
      const c3 = givePlayerCard(p, makeMoney(3));
      const c4 = givePlayerCard(p, makeMoney(4));
      engine.playCardToBank(state, p.id, c1.id);
      engine.playCardToBank(state, p.id, c2.id);
      engine.playCardToBank(state, p.id, c3.id);
      expect(() => engine.playCardToBank(state, p.id, c4.id)).toThrow(
        "Already played maximum cards this turn"
      );
    });

    it("cannot play during ActionPending phase", () => {
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;

      const dc = givePlayerCard(player, makeAction(CardType.DebtCollector, 3));
      engine.playActionCard(state, player.id, {
        action: "debtCollector",
        cardId: dc.id,
        targetPlayerId: target.id,
      });
      expect(state.turn!.phase).toBe(TurnPhase.ActionPending);

      const money = givePlayerCard(player, makeMoney(1));
      expect(() => engine.playCardToBank(state, player.id, money.id)).toThrow(
        "Must resolve pending action first"
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. Turn Management
  // -------------------------------------------------------------------------
  describe("Turn Management", () => {
    let state: GameState;
    let engine: GameEngine;
    let players: Player[];

    beforeEach(() => {
      ({ state, engine, players } = startTestGame(2));
    });

    it("end turn advances to next player", () => {
      const p1 = currentPlayer(state);
      engine.endTurn(state, p1.id);
      expect(state.turn!.playerId).toBe(players[1]!.id);
    });

    it("end turn blocked during ActionPending", () => {
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;
      const dc = givePlayerCard(player, makeAction(CardType.DebtCollector, 3));
      engine.playActionCard(state, player.id, {
        action: "debtCollector",
        cardId: dc.id,
        targetPlayerId: target.id,
      });
      expect(() => engine.endTurn(state, player.id)).toThrow(
        "Cannot end turn while an action is pending"
      );
    });

    it("end turn blocked if hand exceeds maxHandSize", () => {
      const player = currentPlayer(state);
      while (player.hand.length <= state.settings.maxHandSize) {
        givePlayerCard(player, makeMoney(1));
      }
      expect(() => engine.endTurn(state, player.id)).toThrow("Must discard down to");
    });

    it("discard cards removes from hand and adds to discard pile", () => {
      const player = currentPlayer(state);
      const card = givePlayerCard(player, makeMoney(1));
      const prevHand = player.hand.length;
      engine.discardCards(state, player.id, [card.id]);
      expect(player.hand).toHaveLength(prevHand - 1);
      expect(state.discardPile.some((c) => c.id === card.id)).toBe(true);
    });

    it("disconnected players are skipped", () => {
      const { state, engine, players } = startTestGame(3);
      // Disconnect player index 1
      players[1]!.connected = false;
      engine.endTurn(state, players[0]!.id);
      // Should skip player 1 and go to player 2
      expect(state.turn!.playerId).toBe(players[2]!.id);
    });

    it("auto-end turn triggers after 3 plays with valid hand size", () => {
      const player = currentPlayer(state);
      // Ensure hand size is small enough (≤ maxHandSize after plays)
      player.hand = [];
      const c1 = givePlayerCard(player, makeMoney(1));
      const c2 = givePlayerCard(player, makeMoney(2));
      const c3 = givePlayerCard(player, makeMoney(3));

      engine.playCardToBank(state, player.id, c1.id);
      engine.playCardToBank(state, player.id, c2.id);
      // After 3rd play, hand=0 ≤ 7, so auto-end should trigger
      engine.playCardToBank(state, player.id, c3.id);
      expect(state.turn!.playerId).toBe(players[1]!.id);
    });

    it("auto-end turn does NOT trigger during ActionPending", () => {
      const player = currentPlayer(state);
      player.hand = [];
      const target = state.players.find((p) => p.id !== player.id)!;

      const c1 = givePlayerCard(player, makeMoney(1));
      const c2 = givePlayerCard(player, makeMoney(2));
      const dc = givePlayerCard(player, makeAction(CardType.DebtCollector, 3));

      engine.playCardToBank(state, player.id, c1.id);
      engine.playCardToBank(state, player.id, c2.id);
      engine.playActionCard(state, player.id, {
        action: "debtCollector",
        cardId: dc.id,
        targetPlayerId: target.id,
      });

      // 3 plays made but ActionPending, so turn should NOT auto-end
      expect(state.turn!.playerId).toBe(player.id);
      expect(state.turn!.phase).toBe(TurnPhase.ActionPending);
    });

    it("auto-end turn does NOT trigger if hand exceeds maxHandSize", () => {
      const player = currentPlayer(state);
      // Give player a huge hand
      for (let i = 0; i < 15; i++) givePlayerCard(player, makeMoney(1));
      const c1 = givePlayerCard(player, makeMoney(1));
      const c2 = givePlayerCard(player, makeMoney(2));
      const c3 = givePlayerCard(player, makeMoney(3));

      engine.playCardToBank(state, player.id, c1.id);
      engine.playCardToBank(state, player.id, c2.id);
      engine.playCardToBank(state, player.id, c3.id);

      // Still current player's turn because hand > 7
      expect(state.turn!.playerId).toBe(player.id);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Property Card Values
  // -------------------------------------------------------------------------
  describe("Property Card Values", () => {
    const deck = createDeck();
    const properties = deck.filter((c) => c.type === CardType.Property);

    const expectedValues: [PropertyColor, number][] = [
      [PropertyColor.Brown, 1],
      [PropertyColor.LightBlue, 1],
      [PropertyColor.Pink, 2],
      [PropertyColor.Orange, 2],
      [PropertyColor.Red, 3],
      [PropertyColor.Yellow, 3],
      [PropertyColor.Green, 4],
      [PropertyColor.DarkBlue, 4],
      [PropertyColor.Railroad, 2],
      [PropertyColor.Utility, 2],
    ];

    for (const [color, value] of expectedValues) {
      it(`${color} properties have value ${value}`, () => {
        const colorProps = properties.filter((c) => c.colors?.includes(color));
        expect(colorProps.length).toBeGreaterThan(0);
        for (const card of colorProps) {
          expect(card.value).toBe(value);
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // 6. Property Names
  // -------------------------------------------------------------------------
  describe("Property Names", () => {
    const deck = createDeck();
    const properties = deck.filter((c) => c.type === CardType.Property);

    it("each property card has a name", () => {
      for (const card of properties) {
        expect(card.name).toBeDefined();
        expect(card.name!.length).toBeGreaterThan(0);
      }
    });

    it("Brown properties are Baltic Avenue and Mediterranean Avenue", () => {
      const browns = properties
        .filter((c) => c.colors?.includes(PropertyColor.Brown))
        .map((c) => c.name)
        .sort();
      expect(browns).toEqual(["Baltic Avenue", "Mediterranean Avenue"]);
    });

    it("Dark Blue properties are Boardwalk and Park Place", () => {
      const blues = properties
        .filter((c) => c.colors?.includes(PropertyColor.DarkBlue))
        .map((c) => c.name)
        .sort();
      expect(blues).toEqual(["Boardwalk", "Park Place"]);
    });

    it("Red properties are Indiana, Illinois, and Kentucky Avenue", () => {
      const reds = properties
        .filter((c) => c.colors?.includes(PropertyColor.Red))
        .map((c) => c.name)
        .sort();
      expect(reds).toEqual(["Illinois Avenue", "Indiana Avenue", "Kentucky Avenue"]);
    });

    it("Railroad properties are the 4 railroads", () => {
      const railroads = properties
        .filter((c) => c.colors?.includes(PropertyColor.Railroad))
        .map((c) => c.name)
        .sort();
      expect(railroads).toEqual([
        "B&O Railroad",
        "Pennsylvania Railroad",
        "Reading Railroad",
        "Short Line",
      ]);
    });

    it("Utility properties are Electric Company and Water Works", () => {
      const utils = properties
        .filter((c) => c.colors?.includes(PropertyColor.Utility))
        .map((c) => c.name)
        .sort();
      expect(utils).toEqual(["Electric Company", "Water Works"]);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Action Cards
  // -------------------------------------------------------------------------
  describe("Action Cards", () => {
    describe("Pass Go", () => {
      it("draws 2 additional cards", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const card = givePlayerCard(player, makeAction(CardType.PassGo, 1));
        const handBefore = player.hand.length;
        engine.playActionCard(state, player.id, { action: "passGo", cardId: card.id });
        // -1 played + 2 drawn = net +1
        expect(player.hand).toHaveLength(handBefore + 1);
      });

      it("card goes to discard pile", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const card = givePlayerCard(player, makeAction(CardType.PassGo, 1));
        engine.playActionCard(state, player.id, { action: "passGo", cardId: card.id });
        expect(state.discardPile.some((c) => c.id === card.id)).toBe(true);
      });

      it("counts as a play", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const card = givePlayerCard(player, makeAction(CardType.PassGo, 1));
        engine.playActionCard(state, player.id, { action: "passGo", cardId: card.id });
        expect(state.turn!.cardsPlayed).toBe(1);
      });
    });

    describe("Sly Deal", () => {
      it("creates pending action targeting one player", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;
        const propCard = givePlayerCard(target, makeProperty(PropertyColor.Green, 4));
        // Manually add to target's properties
        target.properties.push({
          color: PropertyColor.Green,
          cards: [target.hand.pop()!],
          house: null,
          hotel: null,
        });

        const sly = givePlayerCard(player, makeAction(CardType.SlyDeal, 3));
        engine.playActionCard(state, player.id, {
          action: "slyDeal",
          cardId: sly.id,
          targetPlayerId: target.id,
          targetCardId: propCard.id,
        });

        expect(state.turn!.pendingAction).not.toBeNull();
        expect(state.turn!.pendingAction!.type).toBe("slyDeal");
        expect(state.turn!.pendingAction!.targetPlayerIds).toEqual([target.id]);
      });

      it("cannot steal from a complete set (on resolution)", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;
        const setCards = giveCompleteSet(target, PropertyColor.Brown, 1);

        const sly = givePlayerCard(player, makeAction(CardType.SlyDeal, 3));
        engine.playActionCard(state, player.id, {
          action: "slyDeal",
          cardId: sly.id,
          targetPlayerId: target.id,
          targetCardId: setCards[0]!.id,
        });

        expect(() =>
          engine.respondAcceptAction(state, target.id)
        ).toThrow("Cannot steal from a complete set");
      });

      it("resolution moves property to source player", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const prop: Card = {
          id: "steal_me",
          type: CardType.Property,
          value: 2,
          colors: [PropertyColor.Orange],
          name: "St. James Place",
        };
        target.properties.push({
          color: PropertyColor.Orange,
          cards: [prop],
          house: null,
          hotel: null,
        });

        const sly = givePlayerCard(player, makeAction(CardType.SlyDeal, 3));
        engine.playActionCard(state, player.id, {
          action: "slyDeal",
          cardId: sly.id,
          targetPlayerId: target.id,
          targetCardId: "steal_me",
        });

        engine.respondAcceptAction(state, target.id);
        expect(
          player.properties.some((s) => s.cards.some((c) => c.id === "steal_me"))
        ).toBe(true);
        expect(
          target.properties.some((s) => s.cards.some((c) => c.id === "steal_me"))
        ).toBe(false);
      });
    });

    describe("Force Deal", () => {
      it("creates pending action for swap", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const myProp: Card = {
          id: "my_prop",
          type: CardType.Property,
          value: 1,
          colors: [PropertyColor.Brown],
        };
        player.properties.push({
          color: PropertyColor.Brown,
          cards: [myProp],
          house: null,
          hotel: null,
        });

        const theirProp: Card = {
          id: "their_prop",
          type: CardType.Property,
          value: 2,
          colors: [PropertyColor.Orange],
        };
        target.properties.push({
          color: PropertyColor.Orange,
          cards: [theirProp],
          house: null,
          hotel: null,
        });

        const fd = givePlayerCard(player, makeAction(CardType.ForceDeal, 3));
        engine.playActionCard(state, player.id, {
          action: "forceDeal",
          cardId: fd.id,
          myCardId: "my_prop",
          targetPlayerId: target.id,
          targetCardId: "their_prop",
        });

        expect(state.turn!.pendingAction!.type).toBe("forceDeal");
        expect(state.turn!.phase).toBe(TurnPhase.ActionPending);
      });

      it("cannot trade from a complete set", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const myCards = giveCompleteSet(player, PropertyColor.Brown);

        const theirProp: Card = {
          id: "their_prop",
          type: CardType.Property,
          value: 2,
          colors: [PropertyColor.Orange],
        };
        target.properties.push({
          color: PropertyColor.Orange,
          cards: [theirProp],
          house: null,
          hotel: null,
        });

        const fd = givePlayerCard(player, makeAction(CardType.ForceDeal, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "forceDeal",
            cardId: fd.id,
            myCardId: myCards[0]!.id,
            targetPlayerId: target.id,
            targetCardId: "their_prop",
          })
        ).toThrow("Cannot trade from a complete set");
      });

      it("cannot take from a complete set", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const myProp: Card = {
          id: "my_prop",
          type: CardType.Property,
          value: 1,
          colors: [PropertyColor.LightBlue],
        };
        player.properties.push({
          color: PropertyColor.LightBlue,
          cards: [myProp],
          house: null,
          hotel: null,
        });

        const theirCards = giveCompleteSet(target, PropertyColor.DarkBlue);

        const fd = givePlayerCard(player, makeAction(CardType.ForceDeal, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "forceDeal",
            cardId: fd.id,
            myCardId: "my_prop",
            targetPlayerId: target.id,
            targetCardId: theirCards[0]!.id,
          })
        ).toThrow("Cannot take from a complete set");
      });

      it("resolution swaps properties between players", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const myProp: Card = {
          id: "swap_mine",
          type: CardType.Property,
          value: 1,
          colors: [PropertyColor.Brown],
        };
        player.properties.push({
          color: PropertyColor.Brown,
          cards: [myProp],
          house: null,
          hotel: null,
        });

        const theirProp: Card = {
          id: "swap_theirs",
          type: CardType.Property,
          value: 4,
          colors: [PropertyColor.Green],
        };
        target.properties.push({
          color: PropertyColor.Green,
          cards: [theirProp],
          house: null,
          hotel: null,
        });

        const fd = givePlayerCard(player, makeAction(CardType.ForceDeal, 3));
        engine.playActionCard(state, player.id, {
          action: "forceDeal",
          cardId: fd.id,
          myCardId: "swap_mine",
          targetPlayerId: target.id,
          targetCardId: "swap_theirs",
        });

        engine.respondAcceptAction(state, target.id);

        expect(
          player.properties.some((s) => s.cards.some((c) => c.id === "swap_theirs"))
        ).toBe(true);
        expect(
          target.properties.some((s) => s.cards.some((c) => c.id === "swap_mine"))
        ).toBe(true);
      });
    });

    describe("Deal Breaker", () => {
      it("requires target to have a complete set", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        // Give target an incomplete set
        target.properties.push({
          color: PropertyColor.Brown,
          cards: [
            {
              id: "only_one",
              type: CardType.Property,
              value: 1,
              colors: [PropertyColor.Brown],
            },
          ],
          house: null,
          hotel: null,
        });

        const db = givePlayerCard(player, makeAction(CardType.DealBreaker, 5));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "dealBreaker",
            cardId: db.id,
            targetPlayerId: target.id,
            targetSetColor: PropertyColor.Brown,
          })
        ).toThrow("Target does not have a complete set");
      });

      it("fails if target has no complete set of that color", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const db = givePlayerCard(player, makeAction(CardType.DealBreaker, 5));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "dealBreaker",
            cardId: db.id,
            targetPlayerId: target.id,
            targetSetColor: PropertyColor.Green,
          })
        ).toThrow("Target does not have a complete set");
      });

      it("resolution moves entire set including house/hotel", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        giveCompleteSet(target, PropertyColor.Brown);
        const set = target.properties.find((s) => s.color === PropertyColor.Brown)!;
        set.house = { id: "house_1", type: CardType.House, value: 3 };
        set.hotel = { id: "hotel_1", type: CardType.Hotel, value: 4 };

        const db = givePlayerCard(player, makeAction(CardType.DealBreaker, 5));
        engine.playActionCard(state, player.id, {
          action: "dealBreaker",
          cardId: db.id,
          targetPlayerId: target.id,
          targetSetColor: PropertyColor.Brown,
        });

        engine.respondAcceptAction(state, target.id);

        const stolen = player.properties.find((s) => s.color === PropertyColor.Brown);
        expect(stolen).toBeDefined();
        expect(stolen!.house?.id).toBe("house_1");
        expect(stolen!.hotel?.id).toBe("hotel_1");
        expect(
          target.properties.find((s) => s.color === PropertyColor.Brown)
        ).toBeUndefined();
      });
    });

    describe("Debt Collector", () => {
      it("creates pending action for 5M targeting single player", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        const dc = givePlayerCard(player, makeAction(CardType.DebtCollector, 3));
        engine.playActionCard(state, player.id, {
          action: "debtCollector",
          cardId: dc.id,
          targetPlayerId: target.id,
        });

        expect(state.turn!.pendingAction!.type).toBe("debtCollector");
        expect(state.turn!.pendingAction!.amount).toBe(5);
        expect(state.turn!.pendingAction!.targetPlayerIds).toEqual([target.id]);
      });
    });

    describe("Birthday", () => {
      it("creates pending action for 2M targeting all opponents", () => {
        const { state, engine } = startTestGame(3);
        const player = currentPlayer(state);

        const bd = givePlayerCard(player, makeAction(CardType.Birthday, 2));
        engine.playActionCard(state, player.id, { action: "birthday", cardId: bd.id });

        const action = state.turn!.pendingAction!;
        expect(action.type).toBe("birthday");
        expect(action.amount).toBe(2);
        expect(action.targetPlayerIds).toHaveLength(2);
        expect(action.targetPlayerIds).not.toContain(player.id);
      });
    });

    describe("House", () => {
      it("can only be placed on a complete set", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);

        // Incomplete set
        player.properties.push({
          color: PropertyColor.Red,
          cards: [
            { id: "r1", type: CardType.Property, value: 3, colors: [PropertyColor.Red] },
          ],
          house: null,
          hotel: null,
        });

        const house = givePlayerCard(player, makeAction(CardType.House, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "house",
            cardId: house.id,
            setColor: PropertyColor.Red,
          })
        ).toThrow("Set is not complete");
      });

      it("cannot be placed on Railroad", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Railroad);
        const house = givePlayerCard(player, makeAction(CardType.House, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "house",
            cardId: house.id,
            setColor: PropertyColor.Railroad,
          })
        ).toThrow("Cannot place houses on Railroad or Utility");
      });

      it("cannot be placed on Utility", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Utility);
        const house = givePlayerCard(player, makeAction(CardType.House, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "house",
            cardId: house.id,
            setColor: PropertyColor.Utility,
          })
        ).toThrow("Cannot place houses on Railroad or Utility");
      });

      it("errors if set already has a house", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Red);
        const set = player.properties.find((s) => s.color === PropertyColor.Red)!;
        set.house = { id: "existing_house", type: CardType.House, value: 3 };

        const house = givePlayerCard(player, makeAction(CardType.House, 3));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "house",
            cardId: house.id,
            setColor: PropertyColor.Red,
          })
        ).toThrow("Set already has a house");
      });

      it("places a house on a complete set successfully", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Green);
        const house = givePlayerCard(player, makeAction(CardType.House, 3));
        engine.playActionCard(state, player.id, {
          action: "house",
          cardId: house.id,
          setColor: PropertyColor.Green,
        });
        const set = player.properties.find((s) => s.color === PropertyColor.Green)!;
        expect(set.house).not.toBeNull();
        expect(set.house!.id).toBe(house.id);
      });
    });

    describe("Hotel", () => {
      it("requires a house first", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Yellow);

        const hotel = givePlayerCard(player, makeAction(CardType.Hotel, 4));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "hotel",
            cardId: hotel.id,
            setColor: PropertyColor.Yellow,
          })
        ).toThrow("Must have a house before placing a hotel");
      });

      it("cannot be placed on Railroad", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Railroad);
        const hotel = givePlayerCard(player, makeAction(CardType.Hotel, 4));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "hotel",
            cardId: hotel.id,
            setColor: PropertyColor.Railroad,
          })
        ).toThrow("Cannot place hotels on Railroad or Utility");
      });

      it("cannot be placed on Utility", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Utility);
        const hotel = givePlayerCard(player, makeAction(CardType.Hotel, 4));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "hotel",
            cardId: hotel.id,
            setColor: PropertyColor.Utility,
          })
        ).toThrow("Cannot place hotels on Railroad or Utility");
      });

      it("errors if set already has a hotel", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Pink);
        const set = player.properties.find((s) => s.color === PropertyColor.Pink)!;
        set.house = { id: "h1", type: CardType.House, value: 3 };
        set.hotel = { id: "existing_hotel", type: CardType.Hotel, value: 4 };

        const hotel = givePlayerCard(player, makeAction(CardType.Hotel, 4));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "hotel",
            cardId: hotel.id,
            setColor: PropertyColor.Pink,
          })
        ).toThrow("Set already has a hotel");
      });

      it("places a hotel on a set with a house successfully", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        giveCompleteSet(player, PropertyColor.Orange);
        const set = player.properties.find((s) => s.color === PropertyColor.Orange)!;
        set.house = { id: "house_for_hotel", type: CardType.House, value: 3 };

        const hotel = givePlayerCard(player, makeAction(CardType.Hotel, 4));
        engine.playActionCard(state, player.id, {
          action: "hotel",
          cardId: hotel.id,
          setColor: PropertyColor.Orange,
        });
        expect(set.hotel).not.toBeNull();
        expect(set.hotel!.id).toBe(hotel.id);
      });
    });

    describe("Double The Rent", () => {
      it("can only be played with an active rent pending action", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const dtr = givePlayerCard(player, makeAction(CardType.DoubleTheRent, 1));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "doubleTheRent",
            cardId: dtr.id,
          })
        ).toThrow("Double the Rent must be played with a rent card");
      });

      it("doubles the rent amount", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        // Give player a brown property for rent
        giveCompleteSet(player, PropertyColor.Brown);

        const rent = givePlayerCard(
          player,
          makeRentDual(PropertyColor.Brown, PropertyColor.LightBlue)
        );
        engine.playActionCard(state, player.id, {
          action: "rentDual",
          cardId: rent.id,
          color: PropertyColor.Brown,
        });

        const originalAmount = state.turn!.pendingAction!.amount!;
        const dtr = givePlayerCard(player, makeAction(CardType.DoubleTheRent, 1));
        engine.playActionCard(state, player.id, {
          action: "doubleTheRent",
          cardId: dtr.id,
        });

        expect(state.turn!.pendingAction!.amount).toBe(originalAmount * 2);
      });

      it("cannot be played after players have started responding", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);
        const target = state.players.find((p) => p.id !== player.id)!;

        giveCompleteSet(player, PropertyColor.Brown);

        const rent = givePlayerCard(
          player,
          makeRentDual(PropertyColor.Brown, PropertyColor.LightBlue)
        );
        engine.playActionCard(state, player.id, {
          action: "rentDual",
          cardId: rent.id,
          color: PropertyColor.Brown,
        });

        // Target pays (responds)
        target.bank.push({ id: "pay_money", type: CardType.Money, value: 5 });
        engine.respondPayWithCards(state, target.id, ["pay_money"]);

        const dtr = givePlayerCard(player, makeAction(CardType.DoubleTheRent, 1));
        expect(() =>
          engine.playActionCard(state, player.id, {
            action: "doubleTheRent",
            cardId: dtr.id,
          })
        ).toThrow(); // Action is resolved at this point
      });

      it("can be played during ActionPending (special exception)", () => {
        const { state, engine } = startTestGame(2);
        const player = currentPlayer(state);

        giveCompleteSet(player, PropertyColor.DarkBlue);

        const rent = givePlayerCard(
          player,
          makeRentDual(PropertyColor.DarkBlue, PropertyColor.Green)
        );
        engine.playActionCard(state, player.id, {
          action: "rentDual",
          cardId: rent.id,
          color: PropertyColor.DarkBlue,
        });

        expect(state.turn!.phase).toBe(TurnPhase.ActionPending);

        const dtr = givePlayerCard(player, makeAction(CardType.DoubleTheRent, 1));
        // Should not throw even though ActionPending
        engine.playActionCard(state, player.id, {
          action: "doubleTheRent",
          cardId: dtr.id,
        });
        expect(state.turn!.pendingAction!.amount).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 8. Rent Cards
  // -------------------------------------------------------------------------
  describe("Rent Cards", () => {
    it("dual rent charges all opponents for matching color", () => {
      const { state, engine } = startTestGame(3);
      const player = currentPlayer(state);

      // Give player properties of that color
      player.properties.push({
        color: PropertyColor.Red,
        cards: [
          { id: "r1", type: CardType.Property, value: 3, colors: [PropertyColor.Red] },
        ],
        house: null,
        hotel: null,
      });

      const rent = givePlayerCard(
        player,
        makeRentDual(PropertyColor.Red, PropertyColor.Yellow)
      );
      engine.playActionCard(state, player.id, {
        action: "rentDual",
        cardId: rent.id,
        color: PropertyColor.Red,
      });

      const action = state.turn!.pendingAction!;
      expect(action.type).toBe("rent");
      // All opponents should be targets
      expect(action.targetPlayerIds).toHaveLength(2);
      expect(action.targetPlayerIds).not.toContain(player.id);
    });

    it("wild rent targets a single player for any color", () => {
      const { state, engine } = startTestGame(3);
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;

      player.properties.push({
        color: PropertyColor.Yellow,
        cards: [
          { id: "y1", type: CardType.Property, value: 3, colors: [PropertyColor.Yellow] },
          { id: "y2", type: CardType.Property, value: 3, colors: [PropertyColor.Yellow] },
        ],
        house: null,
        hotel: null,
      });

      const rent = givePlayerCard(player, makeRentWild());
      engine.playActionCard(state, player.id, {
        action: "rentWild",
        cardId: rent.id,
        color: PropertyColor.Yellow,
        targetPlayerId: target.id,
      });

      const action = state.turn!.pendingAction!;
      expect(action.targetPlayerIds).toEqual([target.id]);
    });

    it("rent amount matches RENT_VALUES table", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      // 2 green properties → index 1 → RENT_VALUES.green[1] = 4
      player.properties.push({
        color: PropertyColor.Green,
        cards: [
          { id: "g1", type: CardType.Property, value: 4, colors: [PropertyColor.Green] },
          { id: "g2", type: CardType.Property, value: 4, colors: [PropertyColor.Green] },
        ],
        house: null,
        hotel: null,
      });

      const rent = givePlayerCard(
        player,
        makeRentDual(PropertyColor.DarkBlue, PropertyColor.Green)
      );
      engine.playActionCard(state, player.id, {
        action: "rentDual",
        cardId: rent.id,
        color: PropertyColor.Green,
      });

      expect(state.turn!.pendingAction!.amount).toBe(RENT_VALUES[PropertyColor.Green][1]);
    });

    it("errors if player has no properties of that color", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      const rent = givePlayerCard(
        player,
        makeRentDual(PropertyColor.Red, PropertyColor.Yellow)
      );
      expect(() =>
        engine.playActionCard(state, player.id, {
          action: "rentDual",
          cardId: rent.id,
          color: PropertyColor.Red,
        })
      ).toThrow("You have no properties of that color");
    });

    it("wild rent errors if player has no properties of that color", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;

      const rent = givePlayerCard(player, makeRentWild());
      expect(() =>
        engine.playActionCard(state, player.id, {
          action: "rentWild",
          cardId: rent.id,
          color: PropertyColor.Pink,
          targetPlayerId: target.id,
        })
      ).toThrow("You have no properties of that color");
    });
  });

  // -------------------------------------------------------------------------
  // 9. Payment Mechanics
  // -------------------------------------------------------------------------
  describe("Payment Mechanics", () => {
    function setupDebt(amount = 5) {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;

      const dc = givePlayerCard(player, makeAction(CardType.DebtCollector, 3));
      engine.playActionCard(state, player.id, {
        action: "debtCollector",
        cardId: dc.id,
        targetPlayerId: target.id,
      });

      return { state, engine, player, target };
    }

    it("must select at least some cards if you have assets", () => {
      const { state, engine, target } = setupDebt();
      target.bank.push({ id: "m1", type: CardType.Money, value: 3 });
      expect(() => engine.respondPayWithCards(state, target.id, [])).toThrow(
        "You must pay with at least some cards"
      );
    });

    it("must pay >= amount due if affordable", () => {
      const { state, engine, target } = setupDebt();
      target.bank.push({ id: "m1", type: CardType.Money, value: 2 });
      target.bank.push({ id: "m2", type: CardType.Money, value: 5 });
      // Paying only 2 when target still has 5 on the table
      expect(() => engine.respondPayWithCards(state, target.id, ["m1"])).toThrow(
        "You must pay more"
      );
    });

    it("if you can't pay full amount, must give all cards", () => {
      const { state, engine, target } = setupDebt();
      // Target has only 3M total — less than the 5M debt
      target.bank.push({ id: "m1", type: CardType.Money, value: 3 });
      // Paying everything (3) is less than 5 but that's all they have
      engine.respondPayWithCards(state, target.id, ["m1"]);
      expect(target.bank).toHaveLength(0);
    });

    it("property payments transfer to source player's properties", () => {
      const { state, engine, player, target } = setupDebt();
      const prop: Card = {
        id: "pay_prop",
        type: CardType.Property,
        value: 4,
        colors: [PropertyColor.Green],
      };
      target.properties.push({
        color: PropertyColor.Green,
        cards: [prop],
        house: null,
        hotel: null,
      });

      engine.respondPayWithCards(state, target.id, ["pay_prop"]);
      expect(
        player.properties.some((s) => s.cards.some((c) => c.id === "pay_prop"))
      ).toBe(true);
    });

    it("money payments transfer to source player's bank", () => {
      const { state, engine, player, target } = setupDebt();
      target.bank.push({ id: "m1", type: CardType.Money, value: 5 });
      engine.respondPayWithCards(state, target.id, ["m1"]);
      expect(player.bank.some((c) => c.id === "m1")).toBe(true);
    });

    it("action cards in bank can be used as payment (by value)", () => {
      const { state, engine, player, target } = setupDebt();
      target.bank.push({
        id: "action_in_bank",
        type: CardType.PassGo,
        value: 1,
      });
      target.bank.push({
        id: "money_in_bank",
        type: CardType.Money,
        value: 4,
      });
      engine.respondPayWithCards(state, target.id, ["action_in_bank", "money_in_bank"]);
      expect(player.bank.some((c) => c.id === "action_in_bank")).toBe(true);
      expect(player.bank.some((c) => c.id === "money_in_bank")).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Just Say No
  // -------------------------------------------------------------------------
  describe("Just Say No", () => {
    function setupJSNScenario() {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);
      const target = state.players.find((p) => p.id !== player.id)!;

      // Give target a property to steal
      const prop: Card = {
        id: "steal_target",
        type: CardType.Property,
        value: 2,
        colors: [PropertyColor.Orange],
      };
      target.properties.push({
        color: PropertyColor.Orange,
        cards: [prop],
        house: null,
        hotel: null,
      });

      // Play sly deal
      const sly = givePlayerCard(player, makeAction(CardType.SlyDeal, 3));
      engine.playActionCard(state, player.id, {
        action: "slyDeal",
        cardId: sly.id,
        targetPlayerId: target.id,
        targetCardId: "steal_target",
      });

      return { state, engine, player, target };
    }

    it("uses JSN card from hand", () => {
      const { state, engine, target } = setupJSNScenario();
      const jsn = givePlayerCard(target, makeAction(CardType.JustSayNo, 4));
      const handBefore = target.hand.length;

      engine.respondJustSayNo(state, target.id);

      expect(target.hand).toHaveLength(handBefore - 1);
      expect(target.hand.find((c) => c.id === jsn.id)).toBeUndefined();
      expect(state.discardPile.some((c) => c.id === jsn.id)).toBe(true);
    });

    it("creates JSN chain with depth 1", () => {
      const { state, engine, target } = setupJSNScenario();
      givePlayerCard(target, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, target.id);

      const chain = state.turn!.pendingAction!.justSayNoChain;
      expect(chain).toBeDefined();
      expect(chain!.depth).toBe(1);
      expect(chain!.targetPlayerId).toBe(target.id);
    });

    it("counter-JSN increases depth", () => {
      const { state, engine, player, target } = setupJSNScenario();
      givePlayerCard(target, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, target.id);

      givePlayerCard(player, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, player.id);

      const chain = state.turn!.pendingAction!.justSayNoChain;
      expect(chain!.depth).toBe(2);
    });

    it("accepting at odd depth: target is blocked, action fails for that target", () => {
      const { state, engine, player, target } = setupJSNScenario();
      givePlayerCard(target, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, target.id);

      // Source accepts the JSN → action is blocked for this target
      engine.respondAcceptAction(state, player.id);

      // Target still has their property
      expect(
        target.properties.some((s) => s.cards.some((c) => c.id === "steal_target"))
      ).toBe(true);
      expect(
        player.properties.some((s) => s.cards.some((c) => c.id === "steal_target"))
      ).toBe(false);
    });

    it("accepting at even depth: source re-countered, action proceeds", () => {
      const { state, engine, player, target } = setupJSNScenario();

      // Target says no (depth 1)
      givePlayerCard(target, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, target.id);

      // Source counters (depth 2)
      givePlayerCard(player, makeAction(CardType.JustSayNo, 4));
      engine.respondJustSayNo(state, player.id);

      // Target accepts the counter → action goes through
      engine.respondAcceptAction(state, target.id);

      // Source should now have the property
      expect(
        player.properties.some((s) => s.cards.some((c) => c.id === "steal_target"))
      ).toBe(true);
    });

    it("cannot play JSN if none in hand", () => {
      const { state, engine, target } = setupJSNScenario();
      // Ensure no JSN in hand
      target.hand = target.hand.filter((c) => c.type !== CardType.JustSayNo);
      expect(() => engine.respondJustSayNo(state, target.id)).toThrow(
        "No Just Say No card in hand"
      );
    });
  });

  // -------------------------------------------------------------------------
  // 11. Win Condition
  // -------------------------------------------------------------------------
  describe("Win Condition", () => {
    it("win requires 3 complete property sets", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      giveCompleteSet(player, PropertyColor.Brown);
      giveCompleteSet(player, PropertyColor.DarkBlue);
      expect(state.phase).toBe(GamePhase.Playing);

      // Playing a property that completes a third set triggers the win check
      player.properties.push({
        color: PropertyColor.Utility,
        cards: [
          { id: "u1", type: CardType.Property, value: 2, colors: [PropertyColor.Utility] },
        ],
        house: null,
        hotel: null,
      });

      const lastCard = givePlayerCard(player, makeProperty(PropertyColor.Utility, 2));
      engine.playCardToProperty(state, player.id, lastCard.id, PropertyColor.Utility);

      expect(state.phase).toBe(GamePhase.Finished);
    });

    it("game phase changes to Finished on win", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      giveCompleteSet(player, PropertyColor.Brown);
      giveCompleteSet(player, PropertyColor.DarkBlue);
      player.properties.push({
        color: PropertyColor.Utility,
        cards: [
          { id: "u1", type: CardType.Property, value: 2, colors: [PropertyColor.Utility] },
        ],
        house: null,
        hotel: null,
      });
      const card = givePlayerCard(player, makeProperty(PropertyColor.Utility, 2));
      engine.playCardToProperty(state, player.id, card.id, PropertyColor.Utility);

      expect(state.phase).toBe(GamePhase.Finished);
    });

    it("winner ID is recorded", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      giveCompleteSet(player, PropertyColor.Brown);
      giveCompleteSet(player, PropertyColor.DarkBlue);
      player.properties.push({
        color: PropertyColor.Utility,
        cards: [
          { id: "u1", type: CardType.Property, value: 2, colors: [PropertyColor.Utility] },
        ],
        house: null,
        hotel: null,
      });
      const card = givePlayerCard(player, makeProperty(PropertyColor.Utility, 2));
      engine.playCardToProperty(state, player.id, card.id, PropertyColor.Utility);

      expect(state.winner).toBe(player.id);
    });
  });

  // -------------------------------------------------------------------------
  // 12. Game Settings
  // -------------------------------------------------------------------------
  describe("Game Settings", () => {
    it("default maxHandSize is 7", () => {
      const { state } = createTestGame(2);
      expect(state.settings.maxHandSize).toBe(7);
    });

    it("custom maxHandSize is respected in end turn validation", () => {
      const { state, engine } = startTestGame(2);
      state.settings = { ...state.settings, maxHandSize: 5 };

      const player = currentPlayer(state);
      // Give player exactly 6 cards total
      player.hand = [];
      for (let i = 0; i < 6; i++) givePlayerCard(player, makeMoney(1));

      expect(() => engine.endTurn(state, player.id)).toThrow("Must discard down to 5");
    });

    it("end turn succeeds when hand is at or below maxHandSize", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);
      player.hand = [];
      for (let i = 0; i < 5; i++) givePlayerCard(player, makeMoney(1));

      // Should not throw
      engine.endTurn(state, player.id);
      expect(state.turn!.playerId).not.toBe(player.id);
    });
  });

  // -------------------------------------------------------------------------
  // 13. Rematch
  // -------------------------------------------------------------------------
  describe("Rematch", () => {
    it("resets deck, hands, banks, and properties", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      // Modify game state
      player.bank.push({ id: "b1", type: CardType.Money, value: 5 });
      giveCompleteSet(player, PropertyColor.Brown);

      engine.rematchGame(state);

      for (const p of state.players) {
        expect(p.bank).toHaveLength(0);
        expect(p.properties).toHaveLength(0);
        // 5 dealt; first player gets +2 drawn
      }
      expect(state.discardPile).toHaveLength(0);
      expect(state.winner).toBeNull();
    });

    it("keeps players connected", () => {
      const { state, engine, players } = startTestGame(3);
      players[1]!.connected = false;
      engine.rematchGame(state);

      for (const p of state.players) {
        expect(p.connected).toBe(true);
      }
    });

    it("starts a new turn", () => {
      const { state, engine } = startTestGame(2);
      engine.rematchGame(state);

      expect(state.turn).not.toBeNull();
      expect(state.turn!.cardsPlayed).toBe(0);
      expect(state.turn!.phase).toBe(TurnPhase.Play);
      expect(state.phase).toBe(GamePhase.Playing);
    });
  });

  // -------------------------------------------------------------------------
  // 14. Resign
  // -------------------------------------------------------------------------
  describe("Resign", () => {
    it("removes player assets and disconnects them", () => {
      const { state, engine, players } = startTestGame(3);
      const player = players[1]!;

      // Give player assets
      player.bank.push({ id: "m1", type: CardType.Money, value: 5 });
      giveCompleteSet(player, PropertyColor.Brown);
      const handCount = player.hand.length;

      engine.resignPlayer(state, player.id);

      expect(player.connected).toBe(false);
      expect(player.hand).toHaveLength(0);
      expect(player.bank).toHaveLength(0);
      expect(player.properties).toHaveLength(0);
    });

    it("advances turn if resigning player is current player", () => {
      const { state, engine, players } = startTestGame(3);
      const player = currentPlayer(state);
      const nextPlayerId = state.players[state.currentPlayerIndex + 1]!.id;

      engine.resignPlayer(state, player.id);

      expect(state.turn?.playerId).toBe(nextPlayerId);
    });

    it("ends game if only one player remains", () => {
      const { state, engine, players } = startTestGame(2);
      const [p1, p2] = players;

      engine.resignPlayer(state, p1!.id);

      expect(state.phase).toBe(GamePhase.Finished);
      expect(state.winner).toBe(p2!.id);
    });

    it("does not end game if multiple players remain", () => {
      const { state, engine, players } = startTestGame(3);
      
      engine.resignPlayer(state, players[0]!.id);

      expect(state.phase).toBe(GamePhase.Playing);
      expect(state.winner).toBeNull();
    });

    it("throws error if game is not in progress", () => {
      const { state, engine } = createTestGame(2);
      state.phase = GamePhase.Waiting;

      expect(() => {
        engine.resignPlayer(state, state.players[0]!.id);
      }).toThrow("Cannot resign when game is not in progress");
    });
  });

  // -------------------------------------------------------------------------
  // 15. Edge Cases
  // -------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("empty deck triggers reshuffle from discard pile", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      // Empty the deck and put cards in discard
      const deckCards = state.deck.splice(0);
      state.discardPile.push(...deckCards);

      const discardCount = state.discardPile.length;
      expect(state.deck).toHaveLength(0);

      // Play Pass Go which tries to draw 2 cards
      const pg = givePlayerCard(player, makeAction(CardType.PassGo, 1));
      engine.playActionCard(state, player.id, { action: "passGo", cardId: pg.id });

      // Deck should have been reshuffled from discard (minus the drawn cards and the pass go itself)
      // The pass go card was added to discard, then reshuffle happened, then 2 drawn
      expect(state.deck.length + 2).toBeLessThanOrEqual(discardCount + 1);
    });

    it("player with 0 cards draws 5 at turn start", () => {
      const { state, engine, players } = startTestGame(2);
      const p1 = players[0]!;
      const p2 = players[1]!;

      // Empty p2's hand and trim p1's hand to be within maxHandSize
      p2.hand = [];
      p1.hand = p1.hand.slice(0, state.settings.maxHandSize);

      // End p1's turn so p2's turn starts
      engine.endTurn(state, p1.id);

      // P2 should draw 5 instead of 2
      expect(p2.hand).toHaveLength(5);
    });

    it("multiple property sets of same color can exist (overfilling)", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      // Fill a Brown set (2 cards to complete)
      giveCompleteSet(player, PropertyColor.Brown);
      expect(
        player.properties.filter((s) => s.color === PropertyColor.Brown)
      ).toHaveLength(1);

      // Playing another Brown property creates a new set
      const extraBrown = givePlayerCard(
        player,
        makeProperty(PropertyColor.Brown, 1, "Extra Brown")
      );
      engine.playCardToProperty(state, player.id, extraBrown.id, PropertyColor.Brown);

      const brownSets = player.properties.filter(
        (s) => s.color === PropertyColor.Brown
      );
      expect(brownSets).toHaveLength(2);
    });

    it("drawing from empty deck and empty discard does not crash", () => {
      const { state, engine } = startTestGame(2);
      const player = currentPlayer(state);

      state.deck = [];
      state.discardPile = [];

      // Pass Go goes to discard, then drawCards reshuffles it back and draws it.
      // Net effect: passGo removed from hand, added to discard, reshuffled, drawn back.
      const pg = givePlayerCard(player, makeAction(CardType.PassGo, 1));
      const handBefore = player.hand.length;

      // Should not crash even with no cards to draw from
      engine.playActionCard(state, player.id, { action: "passGo", cardId: pg.id });

      // PassGo goes to discard → reshuffle → draw 1 (the passGo itself). Second draw finds nothing.
      // Net: lost passGo from hand (-1), drew it back (+1) = same size
      expect(player.hand).toHaveLength(handBefore);
    });
  });
});
