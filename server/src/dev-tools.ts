/**
 * Developer Tools for Card Injection and Game State Manipulation
 * 
 * These tools are for development and testing only.
 * They allow injecting specific cards into players' hands for testing scenarios.
 */

import type { GameState, Card, Player } from "./models/types.ts";
import { CardType, PropertyColor } from "./models/types.ts";

export interface DevTools {
  /**
   * Inject a card into a player's hand
   */
  injectCard(state: GameState, playerId: string, card: Card): void;
  
  /**
   * Create a specific card for testing
   */
  createCard(type: CardType, options?: {
    value?: number;
    name?: string;
    colors?: PropertyColor[];
  }): Card;
  
  /**
   * Give a player a complete property set
   */
  giveCompleteSet(state: GameState, playerId: string, color: PropertyColor): void;
  
  /**
   * Clear a player's hand
   */
  clearHand(state: GameState, playerId: string): void;
  
  /**
   * Set a player's money in bank
   */
  setMoney(state: GameState, playerId: string, amount: number): void;
}

class DevToolsImpl implements DevTools {
  private cardIdCounter = 0;

  injectCard(state: GameState, playerId: string, card: Card): void {
    const player = this.getPlayer(state, playerId);
    player.hand.push(card);
    console.log(`[DevTools] Injected ${card.name || card.type} into ${player.name}'s hand`);
  }

  createCard(type: CardType, options: {
    value?: number;
    name?: string;
    colors?: PropertyColor[];
  } = {}): Card {
    this.cardIdCounter++;
    
    const defaults: Record<CardType, { value: number; name: string; colors?: PropertyColor[] }> = {
      [CardType.Money]: { value: 1, name: "Money" },
      [CardType.Property]: { value: 2, name: "Property", colors: [PropertyColor.Brown] },
      [CardType.PropertyWildcard]: { value: 3, name: "Property Wildcard", colors: [PropertyColor.Red, PropertyColor.Yellow] },
      [CardType.RentDual]: { value: 1, name: "Rent (Dual)", colors: [PropertyColor.Pink, PropertyColor.Orange] },
      [CardType.RentWild]: { value: 3, name: "Rent (Wild)" },
      [CardType.PassGo]: { value: 1, name: "Pass Go" },
      [CardType.SlyDeal]: { value: 3, name: "Sly Deal" },
      [CardType.ForceDeal]: { value: 3, name: "Force Deal" },
      [CardType.DealBreaker]: { value: 5, name: "Deal Breaker" },
      [CardType.DebtCollector]: { value: 3, name: "Debt Collector" },
      [CardType.Birthday]: { value: 2, name: "It's My Birthday" },
      [CardType.JustSayNo]: { value: 4, name: "Just Say No" },
      [CardType.DoubleTheRent]: { value: 1, name: "Double the Rent" },
      [CardType.House]: { value: 3, name: "House" },
      [CardType.Hotel]: { value: 4, name: "Hotel" },
    };

    const defaultCard = defaults[type];
    
    return {
      id: `dev-card-${this.cardIdCounter}`,
      type,
      value: options.value ?? defaultCard.value,
      name: options.name ?? defaultCard.name,
      colors: options.colors ?? defaultCard.colors,
    };
  }

  giveCompleteSet(state: GameState, playerId: string, color: PropertyColor): void {
    const player = this.getPlayer(state, playerId);
    
    const setSize: Record<PropertyColor, number> = {
      [PropertyColor.Brown]: 2,
      [PropertyColor.LightBlue]: 3,
      [PropertyColor.Pink]: 3,
      [PropertyColor.Orange]: 3,
      [PropertyColor.Red]: 3,
      [PropertyColor.Yellow]: 3,
      [PropertyColor.Green]: 3,
      [PropertyColor.DarkBlue]: 2,
      [PropertyColor.Railroad]: 4,
      [PropertyColor.Utility]: 2,
    };

    const needed = setSize[color];
    const cards: Card[] = [];
    
    for (let i = 0; i < needed; i++) {
      cards.push(this.createCard(CardType.Property, {
        name: `${color} Property ${i + 1}`,
        colors: [color],
        value: 2,
      }));
    }

    player.properties.push({
      color,
      cards,
      house: null,
      hotel: null,
    });

    console.log(`[DevTools] Gave ${player.name} a complete ${color} set (${needed} cards)`);
  }

  clearHand(state: GameState, playerId: string): void {
    const player = this.getPlayer(state, playerId);
    const count = player.hand.length;
    player.hand = [];
    console.log(`[DevTools] Cleared ${count} cards from ${player.name}'s hand`);
  }

  setMoney(state: GameState, playerId: string, amount: number): void {
    const player = this.getPlayer(state, playerId);
    player.bank = [];
    
    // Add money cards to reach the desired amount
    let remaining = amount;
    const denominations = [10, 5, 4, 3, 2, 1];
    
    for (const denom of denominations) {
      while (remaining >= denom) {
        player.bank.push(this.createCard(CardType.Money, {
          value: denom,
          name: `$${denom}M`,
        }));
        remaining -= denom;
      }
    }

    console.log(`[DevTools] Set ${player.name}'s bank to $${amount}M`);
  }

  private getPlayer(state: GameState, playerId: string): Player {
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    return player;
  }
}

// Export singleton instance
export const devTools = new DevToolsImpl();

// Export helper functions for common scenarios
export const DevScenarios = {
  /**
   * Setup a scenario where player can test Force Deal
   */
  setupForceDealTest(state: GameState, playerId: string, targetPlayerId: string): void {
    // Give player a Force Deal card
    devTools.injectCard(state, playerId, devTools.createCard(CardType.ForceDeal));
    
    // Give both players some properties to swap
    devTools.injectCard(state, playerId, devTools.createCard(CardType.Property, {
      colors: [PropertyColor.Red],
      name: "Kentucky Avenue",
    }));
    
    devTools.injectCard(state, targetPlayerId, devTools.createCard(CardType.Property, {
      colors: [PropertyColor.Green],
      name: "Pacific Avenue",
    }));
    
    console.log("[DevScenarios] Force Deal test scenario ready");
  },

  /**
   * Setup a scenario to test Double the Rent
   */
  setupDoubleRentTest(state: GameState, playerId: string): void {
    // Give player 2 Double the Rent cards
    devTools.injectCard(state, playerId, devTools.createCard(CardType.DoubleTheRent));
    devTools.injectCard(state, playerId, devTools.createCard(CardType.DoubleTheRent));
    
    // Give player a rent card
    devTools.injectCard(state, playerId, devTools.createCard(CardType.RentDual, {
      colors: [PropertyColor.Red, PropertyColor.Yellow],
    }));
    
    // Give player a complete property set
    devTools.giveCompleteSet(state, playerId, PropertyColor.Red);
    
    console.log("[DevScenarios] Double Rent test scenario ready");
  },

  /**
   * Setup a scenario to test Deal Breaker
   */
  setupDealBreakerTest(state: GameState, playerId: string, targetPlayerId: string): void {
    // Give player a Deal Breaker card
    devTools.injectCard(state, playerId, devTools.createCard(CardType.DealBreaker));
    
    // Give target a complete set
    devTools.giveCompleteSet(state, targetPlayerId, PropertyColor.Green);
    
    console.log("[DevScenarios] Deal Breaker test scenario ready");
  },

  /**
   * Setup a player close to winning
   */
  setupNearWin(state: GameState, playerId: string): void {
    // Give 2 complete sets
    devTools.giveCompleteSet(state, playerId, PropertyColor.Brown);
    devTools.giveCompleteSet(state, playerId, PropertyColor.DarkBlue);
    
    // Give cards to complete a third set
    const player = state.players.find(p => p.id === playerId);
    if (player) {
      const cards: Card[] = [];
      for (let i = 0; i < 2; i++) {
        cards.push(devTools.createCard(CardType.Property, {
          colors: [PropertyColor.Green],
          name: `Green Property ${i + 1}`,
        }));
      }
      player.properties.push({
        color: PropertyColor.Green,
        cards,
        house: null,
        hotel: null,
      });
    }
    
    console.log("[DevScenarios] Near-win scenario ready (2 complete sets, 1 incomplete)");
  },
};
