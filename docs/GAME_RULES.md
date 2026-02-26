# Co-Opoly Deal — Game Rules Reference

This document is a comprehensive reference for all Monopoly Deal rules, adapted for the Co-Opoly Deal implementation. Rules are sourced from the official Monopoly Deal rulebook and community FAQ.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Turn Structure](#turn-structure)
4. [Winning the Game](#winning-the-game)
5. [Card Types](#card-types)
6. [Property Rules](#property-rules)
7. [Action Cards](#action-cards)
8. [Rent Rules](#rent-rules)
9. [Payment Rules](#payment-rules)
10. [House & Hotel Rules](#house--hotel-rules)
11. [Just Say No Rules](#just-say-no-rules)
12. [Deal Breaker Rules](#deal-breaker-rules)
13. [Card Inventory](#card-inventory)
14. [Rent Values by Property Color](#rent-values-by-property-color)

---

## Overview

Co-Opoly Deal is a card game for 2–6 players. The goal is to be the first player to collect **3 complete property sets** on the table in front of you. Players take turns drawing cards, playing cards, and using action cards to collect rent, steal properties, and block opponents.

---

## Setup

1. Shuffle the full 106-card deck (110 minus 4 quick-start rule cards).
2. Deal **5 cards** face-down to each player.
3. Place the remaining cards face-down in the center as the **draw pile**.
4. Players may look at their own cards but must not show them to others.
5. The youngest player (or random selection) goes first. Play proceeds clockwise.

---

## Turn Structure

Each turn consists of the following steps, in order:

### 1. Draw Phase

- Draw **2 cards** from the top of the draw pile.
- If a player has **0 cards in hand** at the start of their turn, they draw **5 cards** instead.
- If the draw pile is empty, shuffle the discard pile and flip it face-down to form a new draw pile.

### 2. Play Phase

- Play **up to 3 cards** from your hand. Each card placed on the table counts as one play.
- A "play" is any card laid on the table: money to your bank, property to your property area, or an action card to the discard pile.
- You do **not** have to play all 3 cards.

### 3. Discard Phase

- At the end of your turn, you may have **no more than 7 cards** in your hand.
- If you have more than 7, discard the excess into the discard pile.

### 4. End Turn

- Play passes clockwise to the next player.

---

## Winning the Game

- The first player to have **3 complete property sets** on the table in front of them wins immediately.
- You can win with duplicate colors (e.g., two complete blue sets and one green set).
- Property sets must be **on the table** — cards in your hand do not count.

---

## Card Types

The deck contains **110 cards** (106 playable + 4 quick-start rule cards):

| Category            | Count |
|---------------------|-------|
| Money Cards         | 20    |
| Property Cards      | 28    |
| Property Wildcards  | 11    |
| Action Cards        | 34    |
| Rent Cards          | 13    |
| Quick-Start Rules   | 4     |

### Money Cards (20)

| Denomination | Count |
|-------------|-------|
| 1M          | 6     |
| 2M          | 5     |
| 3M          | 3     |
| 4M          | 3     |
| 5M          | 2     |
| 10M         | 1     |

### Playing Cards to Your Bank

- Money cards, action cards, rent cards, and house/hotel cards can all be placed face-up in your bank.
- Their monetary value is printed in the corner of the card.
- Property cards **cannot** be placed in the bank.
- Once a card is on the table, it **cannot** be returned to your hand.

---

## Property Rules

### Property Sets

Each color has a required number of cards to form a complete set:

| Color       | Cards Needed | Rent (1 card) | Rent (2 cards) | Rent (3 cards) | Rent (4 cards) |
|-------------|:------------:|:--------------:|:--------------:|:--------------:|:--------------:|
| Brown       | 2            | 1M             | 2M             | —              | —              |
| Light Blue  | 3            | 1M             | 2M             | 3M             | —              |
| Pink        | 3            | 1M             | 2M             | 4M             | —              |
| Orange      | 3            | 1M             | 3M             | 5M             | —              |
| Red         | 3            | 2M             | 3M             | 6M             | —              |
| Yellow      | 3            | 2M             | 4M             | 6M             | —              |
| Green       | 3            | 2M             | 4M             | 7M             | —              |
| Dark Blue   | 2            | 3M             | 8M             | —              | —              |
| Railroad    | 4            | 1M             | 2M             | 3M             | 4M             |
| Utility     | 2            | 1M             | 2M             | —              | —              |

### Property Wildcards

- **Dual-color wildcards** can be placed as either of the two colors shown. They can be flipped between their two colors during your turn only.
- **Multi-color (10-color) wildcard** can represent any color. It has **no monetary value** and cannot be used for payment. It can only be charged rent if paired with at least one other property card.
- Wildcards can be moved between your own property sets during your turn, but not during other players' turns.
- If you have more property cards of one color than needed for a complete set, the extras must start a new set.

### Key Property Rules

- Property paid to an opponent goes into their **property area**, never their bank.
- You may rearrange your own property cards and wildcards freely during your turn.
- You cannot rearrange cards during another player's turn (exception: when receiving a card via Force Deal).

---

## Action Cards

All action cards are played into the center discard pile to activate their effect. They can alternatively be placed into your bank as money (using their printed monetary value) without activating their effect.

### Pass Go (10 cards) — Value: 1M

- Draw **2 cards** from the draw pile.
- Multiple Pass Go cards can be played in a single turn (each counts as one of your 3 plays).
- You must still respect the 7-card hand limit at the end of your turn.

### Sly Deal (3 cards) — Value: 3M

- Steal **one property card** from any opponent.
- Cannot steal from a **complete set**.
- Cannot steal houses or hotels that are on a complete set.
- Can steal the multi-color wildcard (if not in a complete set).

### Force Deal (3 cards) — Value: 3M

- Swap **one of your property cards** for **one of an opponent's property cards**.
- Neither card can be part of a **complete set**.
- The swap does not need to be of equal value.
- Cannot swap houses or hotels that are on a complete set.

### Deal Breaker (2 cards) — Value: 5M

- Steal an opponent's **entire complete property set**, including any houses and hotels on it.
- Can only target a **complete** set.
- If played against a player with no complete set, the card is wasted (a card laid is a card played).

### Debt Collector (3 cards) — Value: 3M

- Choose **one player** who must pay you **5M**.

### It's My Birthday (3 cards) — Value: 2M

- **All other players** must each pay you **2M**.

### Double the Rent (2 cards) — Value: 1M

- Must be played **together with a rent card** in the same turn (uses 2 of your 3 plays).
- Doubles the rent amount charged.
- Two Double the Rent cards can be stacked on one rent card (tripling is not standard; each doubles the original amount, so two = 4x the base rent, using all 3 plays).
- The Double the Rent card itself can be negated by Just Say No (the base rent still applies).

### Just Say No (3 cards) — Value: 4M

- See [Just Say No Rules](#just-say-no-rules).

### House (3 cards) — Value: 3M

- See [House & Hotel Rules](#house--hotel-rules).

### Hotel (2 cards) — Value: 4M

- See [House & Hotel Rules](#house--hotel-rules).

---

## Rent Rules

### Dual-Color Rent Cards (10 total, 2 per color pair)

| Rent Card Colors       | Count |
|------------------------|-------|
| Dark Blue / Green      | 2     |
| Red / Yellow           | 2     |
| Pink / Orange          | 2     |
| Light Blue / Brown     | 2     |
| Railroad / Utility     | 2     |

- **All opponents** must pay you rent.
- You must own at least one property of the matching color to charge rent.
- You choose **one** color from the two shown on the card to charge rent for.
- Rent amount is based on how many properties of that color you have (see rent table above).

### Wild Rent Cards (3 total)

- Choose **any one color** to charge rent for.
- Only **one opponent** of your choice pays (not all players).
- You must own at least one property of that color.
- Bank value: 3M.

### General Rent Rules

- You can only charge rent for **one color** per rent card played.
- Rent is calculated based on how many cards of that color you have when rent is charged.
- Houses and hotels on the set add to the rent (see House & Hotel section).

---

## Payment Rules

### Who Chooses What to Pay With?

- The **paying player** decides which cards to use for payment.
- Payment can be made with any combination of cards on the table: money from bank, property cards, action cards in bank, houses, and hotels.
- You **cannot** pay with cards in your hand — only cards already on the table.

### Where Do Paid Cards Go?

- **Money/action cards** paid go into the recipient's **bank**.
- **Property cards** paid go into the recipient's **property area** (never the bank).
- Action cards received as payment are treated as money and go to the bank. They **cannot** be activated.

### No Change Given

- If you overpay, the opponent keeps the excess. No change is given.
- This applies to all payments: rent, Debt Collector, It's My Birthday.

### Insufficient Funds

- If you cannot pay the full amount, you pay everything you can from the cards on the table in front of you.
- The opponent does not receive the shortfall — you simply pay what you can.
- If you have **no cards** on the table worth any monetary value, you pay nothing.

### Cards That Cannot Be Used for Payment

- The **multi-color (10-color) property wildcard** has no monetary value and cannot be used for payment.

---

## House & Hotel Rules

### Houses (3 cards) — Value: 3M

- Can only be placed on a **complete property set**.
- Adds **3M** to the rent for that set.
- Cannot be placed on Railroad or Utility sets.

### Hotels (2 cards) — Value: 4M

- Can only be placed on a complete property set that **already has a house**.
- Adds **4M** to the rent for that set (on top of the house's 3M, for a total of +7M).
- Cannot be placed on Railroad or Utility sets.

### Stealing Houses and Hotels

- A **Deal Breaker** takes the entire complete set **including** any houses and hotels.
- A **Sly Deal** or **Force Deal** **cannot** take a house or hotel from a complete set.
- If a house or hotel is on the table but **not** attached to a complete set (because the set was broken up by payment), it can be taken by Sly Deal or Force Deal.

### Orphaned Houses/Hotels

- If you pay with property cards from a complete set that has a house/hotel, the house/hotel remains on the table unattached.
- It stays in your property area until you complete another set and can place it on top.
- You may also choose to pay with the house or hotel card itself.

---

## Just Say No Rules

### Basic Usage

- Play from your **hand** to cancel any action card played against you.
- Goes to the discard pile after use.
- Does **not** count as one of your 3 card plays per turn.

### What It Can Block

- Rent charges (you don't pay; other players still do if it was a dual-color rent)
- Sly Deal
- Force Deal
- Deal Breaker
- Debt Collector
- It's My Birthday
- Double the Rent (negates the doubling; base rent still applies)
- Another Just Say No

### Chaining Just Say No Cards

- A Just Say No **can** be played against another Just Say No.
- Example: Player A charges rent → Player B plays Just Say No → Player A plays Just Say No to counter → Player B must now pay rent.
- All 3 Just Say No cards in the deck could theoretically be played in a single exchange.

### Scope

- Just Say No only cancels the action **for the player who plays it**.
- If a dual-color rent card charges all players and one player says no, the other players still pay.

---

## Deal Breaker Rules

- Steal one **complete property set** from any opponent.
- Includes any houses and hotels on the set.
- If played against a player with no complete set, the card is wasted and discarded.
- The target player can block it with Just Say No.

---

## Card Inventory

Full list of all 110 cards in the deck:

### Money (20 cards)

| Card  | Count | Value |
|-------|:-----:|:-----:|
| 1M    | 6     | 1M    |
| 2M    | 5     | 2M    |
| 3M    | 3     | 3M    |
| 4M    | 3     | 4M    |
| 5M    | 2     | 5M    |
| 10M   | 1     | 10M   |

### Property (28 cards)

| Color       | Count |
|-------------|:-----:|
| Brown       | 2     |
| Light Blue  | 3     |
| Pink        | 3     |
| Orange      | 3     |
| Red         | 3     |
| Yellow      | 3     |
| Green       | 3     |
| Dark Blue   | 2     |
| Railroad    | 4     |
| Utility     | 2     |

### Property Wildcards (11 cards)

| Colors                   | Count |
|--------------------------|:-----:|
| Dark Blue / Green        | 1     |
| Green / Railroad         | 1     |
| Utility / Railroad       | 1     |
| Light Blue / Railroad    | 1     |
| Light Blue / Brown       | 1     |
| Pink / Orange            | 2     |
| Red / Yellow             | 2     |
| Multi-color (any color)  | 2     |

### Action Cards (34 cards)

| Card              | Count | Bank Value |
|-------------------|:-----:|:----------:|
| Pass Go           | 10    | 1M         |
| Sly Deal          | 3     | 3M         |
| Force Deal        | 3     | 3M         |
| Deal Breaker      | 2     | 5M         |
| Debt Collector    | 3     | 3M         |
| It's My Birthday  | 3     | 2M         |
| Just Say No       | 3     | 4M         |
| Double the Rent   | 2     | 1M         |
| House             | 3     | 3M         |
| Hotel             | 2     | 4M         |

### Rent Cards (13 cards)

| Colors                | Count | Bank Value |
|-----------------------|:-----:|:----------:|
| Dark Blue / Green     | 2     | 1M         |
| Red / Yellow          | 2     | 1M         |
| Pink / Orange         | 2     | 1M         |
| Light Blue / Brown    | 2     | 1M         |
| Railroad / Utility    | 2     | 1M         |
| Wild (any color)      | 3     | 3M         |

---

## Rent Values by Property Color

Quick reference for rent amounts based on property count:

| Color       | 1 Card | 2 Cards | 3 Cards | 4 Cards | Full Set Size |
|-------------|:------:|:-------:|:-------:|:-------:|:-------------:|
| Brown       | 1M     | 2M      | —       | —       | 2             |
| Light Blue  | 1M     | 2M      | 3M      | —       | 3             |
| Pink        | 1M     | 2M      | 4M      | —       | 3             |
| Orange      | 1M     | 3M      | 5M      | —       | 3             |
| Red         | 2M     | 3M      | 6M      | —       | 3             |
| Yellow      | 2M     | 4M      | 6M      | —       | 3             |
| Green       | 2M     | 4M      | 7M      | —       | 3             |
| Dark Blue   | 3M     | 8M      | —       | —       | 2             |
| Railroad    | 1M     | 2M      | 3M      | 4M      | 4             |
| Utility     | 1M     | 2M      | —       | —       | 2             |

**With House:** Add 3M to full-set rent.
**With House + Hotel:** Add 7M to full-set rent (3M + 4M).

Houses and hotels **cannot** be placed on Railroad or Utility sets.
