import {
  type GameState,
  type Player,
  type Card,
  CardType,
  PropertyColor,
  SET_SIZE,
  isSetComplete,
  type PendingAction,
  GamePhase,
} from "../models/types.ts";
import { GameEngine } from "./game-engine.ts";

interface BotAction {
  type: "bank" | "property" | "action";
  card?: Card;
  color?: PropertyColor;
  payload?: Record<string, unknown>;
}

export class BotPlayer {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * Calculate delay based on number of players (more players = shorter delay)
   * 2 players: 800-1200ms
   * 3 players: 600-1000ms
   * 4 players: 500-900ms
   * 5-6 players: 400-800ms
   */
  private getDelayForPlayerCount(playerCount: number): number {
    const baseDelay = Math.max(400, 1200 - (playerCount - 2) * 200);
    const variance = 400;
    return baseDelay + Math.random() * variance;
  }

  async playTurnAsync(state: GameState, botPlayerId: string, onStateChange?: () => void): Promise<void> {
    const player = state.players.find((p) => p.id === botPlayerId);
    if (!player) return;
    if (state.turn?.playerId !== botPlayerId) return;

    const playerCount = state.players.filter(p => p.connected).length;
    const maxPlays = 3;
    let plays = state.turn.cardsPlayed;

    while (
      plays < maxPlays &&
      player.hand.length > 0 &&
      state.turn?.playerId === botPlayerId &&
      state.turn.phase === "play" &&
      state.phase === GamePhase.Playing
    ) {
      const action = this.decideBestAction(state, player);
      if (!action) break;

      try {
        this.executeAction(state, botPlayerId, action);
        plays = state.turn?.cardsPlayed ?? plays + 1;
        
        // Notify state change and add delay between moves
        if (onStateChange) onStateChange();
        if (plays < maxPlays) {
          await new Promise((resolve) => setTimeout(resolve, this.getDelayForPlayerCount(playerCount)));
        }
      } catch {
        break;
      }
    }

    while (
      player.hand.length > (state.settings?.maxHandSize ?? 7) &&
      state.turn?.playerId === botPlayerId &&
      state.phase === GamePhase.Playing
    ) {
      const worst = this.findLeastValuableCard(player.hand);
      if (worst) {
        try {
          this.engine.discardCards(state, botPlayerId, [worst.id]);
          if (onStateChange) onStateChange();
          await new Promise((resolve) => setTimeout(resolve, this.getDelayForPlayerCount(playerCount)));
        } catch {
          break;
        }
      } else break;
    }

    if (state.turn?.playerId === botPlayerId && state.turn.phase === "play" && state.phase === GamePhase.Playing) {
      try {
        this.engine.endTurn(state, botPlayerId);
        if (onStateChange) onStateChange();
      } catch {
        /* auto-ended */
      }
    }
  }

  // Keep sync version for backward compatibility
  playTurn(state: GameState, botPlayerId: string): void {
    const player = state.players.find((p) => p.id === botPlayerId);
    if (!player) return;
    if (state.turn?.playerId !== botPlayerId) return;

    const maxPlays = 3;
    let plays = state.turn.cardsPlayed;

    while (
      plays < maxPlays &&
      player.hand.length > 0 &&
      state.turn?.playerId === botPlayerId &&
      state.turn.phase === "play" &&
      state.phase === GamePhase.Playing
    ) {
      const action = this.decideBestAction(state, player);
      if (!action) break;

      try {
        this.executeAction(state, botPlayerId, action);
        plays = state.turn?.cardsPlayed ?? plays + 1;
      } catch {
        break;
      }
    }

    while (
      player.hand.length > (state.settings?.maxHandSize ?? 7) &&
      state.turn?.playerId === botPlayerId &&
      state.phase === GamePhase.Playing
    ) {
      const worst = this.findLeastValuableCard(player.hand);
      if (worst) {
        try {
          this.engine.discardCards(state, botPlayerId, [worst.id]);
        } catch {
          break;
        }
      } else break;
    }

    if (state.turn?.playerId === botPlayerId && state.turn.phase === "play" && state.phase === GamePhase.Playing) {
      try {
        this.engine.endTurn(state, botPlayerId);
      } catch {
        /* auto-ended */
      }
    }
  }

  respondToAction(state: GameState, botPlayerId: string): void {
    const action = state.turn?.pendingAction;
    if (!action) return;
    
    const player = state.players.find((p) => p.id === botPlayerId);
    if (!player) return;

    // For Just Say No chains, check if this bot needs to respond
    if (action.justSayNoChain) {
      // The bot needs to respond if they're not the one who just played JSN
      if (action.justSayNoChain.targetPlayerId === botPlayerId) return;
      
      // Bot is involved if they're either the source or a target of the original action
      const isInvolved = action.sourcePlayerId === botPlayerId || action.targetPlayerIds.includes(botPlayerId);
      if (!isInvolved) return;
      
      // Check if bot has JSN to counter
      const hasJSN = player.hand.some((c) => c.type === CardType.JustSayNo);
      
      // Bots should be very aggressive about countering JSN, especially for valuable actions
      if (hasJSN && this.shouldCounterJustSayNo(action)) {
        try {
          this.engine.respondJustSayNo(state, botPlayerId);
        } catch {}
        return;
      }
      
      // Otherwise accept the JSN
      try {
        this.engine.respondAcceptAction(state, botPlayerId);
      } catch {}
      return;
    }

    // For regular actions, only respond if bot is a target
    if (!action.targetPlayerIds.includes(botPlayerId)) return;
    if (action.respondedPlayerIds.includes(botPlayerId)) return;

    if (
      action.type === "rent" ||
      action.type === "debtCollector" ||
      action.type === "birthday"
    ) {
      const amountDue = action.amount ?? 0;
      const cardIds = this.selectPaymentCards(player, amountDue);
      try {
        this.engine.respondPayWithCards(state, botPlayerId, cardIds);
      } catch {}
      return;
    }

    const hasJSN = player.hand.some((c) => c.type === CardType.JustSayNo);
    if (hasJSN && this.shouldUseJustSayNo(action)) {
      try {
        this.engine.respondJustSayNo(state, botPlayerId);
      } catch {}
      return;
    }

    try {
      this.engine.respondAcceptAction(state, botPlayerId);
    } catch {}
  }

  private decideBestAction(state: GameState, player: Player): BotAction | null {
    const hand = player.hand;
    if (hand.length === 0) return null;

    const propertyCards = hand.filter((c) => c.type === CardType.Property);
    for (const card of propertyCards) {
      const color = card.colors?.[0];
      if (color) {
        return { type: "property", card, color };
      }
    }

    const wildcards = hand.filter((c) => c.type === CardType.PropertyWildcard);
    for (const card of wildcards) {
      const bestColor = this.findBestColorForWildcard(player, card);
      if (bestColor) {
        return { type: "property", card, color: bestColor };
      }
    }

    const passGo = hand.find((c) => c.type === CardType.PassGo);
    if (passGo) {
      return {
        type: "action",
        payload: { action: "passGo", cardId: passGo.id },
      };
    }

    // Check if we have rent cards and double the rent cards
    const rentCards = hand.filter(
      (c) => c.type === CardType.RentDual || c.type === CardType.RentWild
    );
    const doubleRentCards = hand.filter((c) => c.type === CardType.DoubleTheRent);
    
    // If we have both rent cards and double rent cards, and haven't used double rent yet this turn
    if (rentCards.length > 0 && doubleRentCards.length > 0 && state.turn && state.turn.rentMultiplier === 1) {
      // Play double the rent first (can play up to 2)
      const doubleRent = doubleRentCards[0];
      return {
        type: "action",
        payload: { action: "doubleTheRent", cardId: doubleRent!.id },
      };
    }
    
    // Play rent cards
    for (const card of rentCards) {
      const result = this.tryPlayRent(state, player, card);
      if (result) return { type: "action", payload: result };
    }

    const birthday = hand.find((c) => c.type === CardType.Birthday);
    if (birthday) {
      return {
        type: "action",
        payload: { action: "birthday", cardId: birthday.id },
      };
    }

    const debtCollector = hand.find((c) => c.type === CardType.DebtCollector);
    if (debtCollector) {
      const richestOpponent = this.findRichestOpponent(state, player);
      if (richestOpponent) {
        return {
          type: "action",
          payload: {
            action: "debtCollector",
            cardId: debtCollector.id,
            targetPlayerId: richestOpponent.id,
          },
        };
      }
    }

    const dealBreaker = hand.find((c) => c.type === CardType.DealBreaker);
    if (dealBreaker) {
      for (const opp of state.players.filter(
        (p) => p.id !== player.id && p.connected
      )) {
        const completeSet = opp.properties.find((s) => isSetComplete(s));
        if (completeSet) {
          return {
            type: "action",
            payload: {
              action: "dealBreaker",
              cardId: dealBreaker.id,
              targetPlayerId: opp.id,
              targetSetColor: completeSet.color,
            },
          };
        }
      }
    }

    const forceDeal = hand.find((c) => c.type === CardType.ForceDeal);
    if (forceDeal) {
      for (const opp of state.players.filter(
        (p) => p.id !== player.id && p.connected
      )) {
        const myTradeable = player.properties
          .filter((s) => !isSetComplete(s))
          .flatMap((s) => s.cards);
        const oppTradeable = opp.properties
          .filter((s) => !isSetComplete(s))
          .flatMap((s) => s.cards);
        
        if (myTradeable.length > 0 && oppTradeable.length > 0) {
          const myWorst = myTradeable.sort((a, b) => a.value - b.value)[0]!;
          const oppBest = oppTradeable.sort((a, b) => b.value - a.value)[0]!;
          
          if (oppBest.value > myWorst.value) {
            return {
              type: "action",
              payload: {
                action: "forceDeal",
                cardId: forceDeal.id,
                myCardId: myWorst.id,
                targetPlayerId: opp.id,
                targetCardId: oppBest.id,
              },
            };
          }
        }
      }
    }

    const slyDeal = hand.find((c) => c.type === CardType.SlyDeal);
    if (slyDeal) {
      for (const opp of state.players.filter(
        (p) => p.id !== player.id && p.connected
      )) {
        const stealable = opp.properties
          .filter((s) => !isSetComplete(s))
          .flatMap((s) => s.cards);
        if (stealable.length > 0) {
          const target = stealable.sort((a, b) => b.value - a.value)[0]!;
          return {
            type: "action",
            payload: {
              action: "slyDeal",
              cardId: slyDeal.id,
              targetPlayerId: opp.id,
              targetCardId: target.id,
            },
          };
        }
      }
    }

    const house = hand.find((c) => c.type === CardType.House);
    if (house) {
      const eligibleSet = player.properties.find(
        (s) =>
          isSetComplete(s) &&
          !s.house &&
          s.color !== PropertyColor.Railroad &&
          s.color !== PropertyColor.Utility
      );
      if (eligibleSet) {
        return {
          type: "action",
          payload: {
            action: "house",
            cardId: house.id,
            setColor: eligibleSet.color,
          },
        };
      }
    }

    const hotel = hand.find((c) => c.type === CardType.Hotel);
    if (hotel) {
      const eligibleSet = player.properties.find(
        (s) =>
          isSetComplete(s) &&
          s.house &&
          !s.hotel &&
          s.color !== PropertyColor.Railroad &&
          s.color !== PropertyColor.Utility
      );
      if (eligibleSet) {
        return {
          type: "action",
          payload: {
            action: "hotel",
            cardId: hotel.id,
            setColor: eligibleSet.color,
          },
        };
      }
    }

    const bankable = hand.find(
      (c) => c.type !== CardType.Property && c.value > 0
    );
    if (bankable) {
      return { type: "bank", card: bankable };
    }

    const remaining = hand.find((c) => c.type === CardType.Property);
    if (remaining && remaining.colors?.[0]) {
      return { type: "property", card: remaining, color: remaining.colors[0] };
    }

    return null;
  }

  private executeAction(
    state: GameState,
    botPlayerId: string,
    action: BotAction
  ): void {
    switch (action.type) {
      case "bank":
        this.engine.playCardToBank(state, botPlayerId, action.card!.id);
        break;
      case "property":
        this.engine.playCardToProperty(
          state,
          botPlayerId,
          action.card!.id,
          action.color!
        );
        break;
      case "action":
        this.engine.playActionCard(
          state,
          botPlayerId,
          action.payload as any
        );
        break;
    }
  }

  private findBestColorForWildcard(
    player: Player,
    card: Card
  ): PropertyColor | null {
    const colors = card.colors ?? [];
    if (colors.length === 0) return null;

    let bestColor: PropertyColor | null = null;
    let bestProgress = -1;

    for (const color of colors) {
      const existing = player.properties
        .filter((s) => s.color === color)
        .reduce((sum, s) => sum + s.cards.length, 0);
      const needed = SET_SIZE[color];
      const progress = existing / needed;
      if (progress > bestProgress && existing < needed) {
        bestProgress = progress;
        bestColor = color;
      }
    }

    return bestColor ?? colors[0] ?? null;
  }

  private tryPlayRent(
    state: GameState,
    player: Player,
    card: Card
  ): Record<string, unknown> | null {
    const opponents = state.players.filter(
      (p) => p.id !== player.id && p.connected
    );
    if (opponents.length === 0) return null;

    if (card.type === CardType.RentDual) {
      const colors = card.colors ?? [];
      let bestColor: PropertyColor | null = null;
      let bestCount = 0;
      for (const color of colors) {
        const count = player.properties
          .filter((s) => s.color === color)
          .reduce((sum, s) => sum + s.cards.length, 0);
        if (count > bestCount) {
          bestCount = count;
          bestColor = color;
        }
      }
      if (bestColor && bestCount > 0) {
        return { action: "rentDual", cardId: card.id, color: bestColor };
      }
    } else if (card.type === CardType.RentWild) {
      let bestColor: PropertyColor | null = null;
      let bestCount = 0;
      for (const set of player.properties) {
        if (set.cards.length > bestCount) {
          bestCount = set.cards.length;
          bestColor = set.color;
        }
      }
      if (bestColor) {
        const richest = this.findRichestOpponent(state, player);
        if (richest) {
          return {
            action: "rentWild",
            cardId: card.id,
            color: bestColor,
            targetPlayerId: richest.id,
          };
        }
      }
    }
    return null;
  }

  private findRichestOpponent(
    state: GameState,
    player: Player
  ): Player | null {
    const opponents = state.players.filter(
      (p) => p.id !== player.id && p.connected
    );
    if (opponents.length === 0) return null;
    return opponents.sort((a, b) => {
      const aVal = a.bank.reduce((s, c) => s + c.value, 0);
      const bVal = b.bank.reduce((s, c) => s + c.value, 0);
      return bVal - aVal;
    })[0]!;
  }

  private selectPaymentCards(player: Player, amountDue: number): string[] {
    const cards: { id: string; value: number; importance: number }[] = [];

    for (const c of player.bank) {
      cards.push({ id: c.id, value: c.value, importance: 0 });
    }
    for (const set of player.properties) {
      const complete = isSetComplete(set);
      for (const c of set.cards) {
        cards.push({ id: c.id, value: c.value, importance: complete ? 10 : 1 });
      }
      if (set.house)
        cards.push({
          id: set.house.id,
          value: set.house.value,
          importance: 5,
        });
      if (set.hotel)
        cards.push({
          id: set.hotel.id,
          value: set.hotel.value,
          importance: 5,
        });
    }

    cards.sort((a, b) => a.importance - b.importance || a.value - b.value);

    const selected: string[] = [];
    let total = 0;
    for (const c of cards) {
      if (total >= amountDue) break;
      selected.push(c.id);
      total += c.value;
    }

    if (total < amountDue) {
      return cards.map((c) => c.id);
    }

    return selected;
  }

  private shouldUseJustSayNo(action: PendingAction): boolean {
    // Always use JSN for deal breaker (losing a complete set)
    if (action.type === "dealBreaker") return true;
    
    // Use JSN for property theft with high probability
    if (action.type === "slyDeal") {
      // 80% chance to use JSN
      return Math.random() < 0.8;
    }
    
    // Use JSN for property swaps if we're getting a worse deal
    if (action.type === "forceDeal") {
      // 70% chance to use JSN  
      return Math.random() < 0.7;
    }
    
    // Use JSN for high rent amounts (>=5M)
    if (action.amount && action.amount >= 5) {
      // 60% chance to use JSN for high rent
      return Math.random() < 0.6;
    }
    
    // Use JSN for medium rent amounts (3-4M) sometimes
    if (action.amount && action.amount >= 3) {
      // 30% chance to use JSN for medium rent
      return Math.random() < 0.3;
    }
    
    return false;
  }

  private shouldCounterJustSayNo(action: PendingAction): boolean {
    // If bot was the source (played the original action), they should counter to get what they want
    if (action.sourcePlayerId === this.getBotId(action)) {
      // Very high chance to counter when bot was trying to do something valuable
      if (action.type === "dealBreaker") return Math.random() < 0.9; // 90% counter
      if (action.type === "slyDeal") return Math.random() < 0.8; // 80% counter
      if (action.type === "forceDeal") return Math.random() < 0.7; // 70% counter
      if (action.amount && action.amount >= 5) return Math.random() < 0.7; // 70% counter for high rent
      return Math.random() < 0.5; // 50% counter for other actions
    }
    
    // If bot was defending (target), less likely to counter since they already defended once
    // But still possible if it's a really valuable thing to defend
    if (action.type === "dealBreaker") return Math.random() < 0.4; // 40% chance to keep fighting
    if (action.type === "slyDeal") return Math.random() < 0.3; // 30% chance
    return Math.random() < 0.2; // 20% chance for other actions
  }
  
  private getBotId(action: PendingAction): string | null {
    // Helper to get bot ID from the action - not a perfect solution but works for this context
    return action.sourcePlayerId;
  }

  private findLeastValuableCard(hand: Card[]): Card | null {
    if (hand.length === 0) return null;
    return [...hand].sort((a, b) => a.value - b.value)[0]!;
  }
}
