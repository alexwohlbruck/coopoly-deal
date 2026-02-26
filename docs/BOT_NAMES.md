# Bot Names

The game now uses fun, themed bot names instead of generic "Bot 1", "Bot 2", etc.

## Available Bot Names

### Tycoons & Moguls
- Rich Uncle Pennybags
- The Monopolist
- Baron von Bankrupt
- Lady Landlord
- Sir Rent-a-Lot
- Count Cashflow
- Duke of Deals
- Duchess of Deeds

### Business Types
- The Property Shark
- Real Estate Randy
- Mortgage Molly
- Foreclosure Fred
- Auction Annie
- Bidding Betty
- Investment Ivan
- Portfolio Pete

### Playful Names
- Boardwalk Bill
- Park Place Patty
- Baltic Avenue Bob
- Mediterranean Mike
- Reading Railroad Rita
- Short Line Steve
- Waterworks Wendy
- Electric Eddie

### Personality Types
- The Deal Breaker
- The Rent Collector
- The Property Hoarder
- The Wild Card
- The Negotiator
- The Sly Dealer
- The Debt Collector
- The Pass Go Pro

### Funny/Punny
- Monopoly Mary
- Capitalist Carl
- Tycoon Tina
- Mogul Max
- CEO Chloe
- Banker Brad
- Investor Iris
- Landlord Larry

### More Creative
- The Iron Token
- The Top Hat
- The Scottie Dog
- The Race Car
- The Battleship
- The Thimble
- The Boot
- The Wheelbarrow

### Socialist/Co-op Themed (fitting the "Co-Opoly" theme)
- Comrade Cashless
- Cooperative Carl
- Collective Cathy
- Solidarity Sam
- Union Una
- Worker's Will
- People's Pete
- Commune Claire

## Implementation

Bot names are randomly selected from this pool when a bot is added to the game. Each name is unique within a game session - once a name is used, it won't be selected again until all names are exhausted.

If all 64 names are used up (unlikely in a 6-player game), the system falls back to numbered bots: "Bot 1", "Bot 2", etc.

## Files Modified

- `server/src/utils/bot-names.ts` - Contains the name pool and selection logic
- `server/src/ws/websocket-handler.ts` - Updated to use random bot names when adding bots
