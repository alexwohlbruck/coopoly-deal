import { useState } from "react";
import type { PendingAction, ClientPlayer, Card } from "../../types/game";
import { CardType } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { BottomSheet } from "../common/BottomSheet";

interface ActionPromptProps {
  action: PendingAction;
  playerId: string;
  players: ClientPlayer[];
  onPayWithCards: (cardIds: string[]) => void;
  onJustSayNo: () => void;
  onAccept: () => void;
}

export function ActionPrompt({
  action,
  playerId,
  players,
  onPayWithCards,
  onJustSayNo,
  onAccept,
}: ActionPromptProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const isSource = action.sourcePlayerId === playerId;
  const isTarget = action.targetPlayerIds.includes(playerId);
  const hasResponded = action.respondedPlayerIds.includes(playerId);
  const sourcePlayer = players.find((p) => p.id === action.sourcePlayerId);
  const me = players.find((p) => p.id === playerId);

  console.log(`[ActionPrompt] Evaluating for player ${playerId}:`, {
    actionType: action.type,
    sourcePlayerId: action.sourcePlayerId,
    targetPlayerIds: action.targetPlayerIds,
    respondedPlayerIds: action.respondedPlayerIds,
    isSource,
    isTarget,
    hasResponded,
    hasJSNChain: !!action.justSayNoChain,
  });

  const isJSNChain = action.justSayNoChain;
  if (isJSNChain) {
    const shouldRespond = isJSNChain.targetPlayerId !== playerId;
    const isInvolved = isTarget || isSource;
    console.log(`[ActionPrompt] JSN Chain - shouldRespond: ${shouldRespond}, isInvolved: ${isInvolved}`);
    if (!shouldRespond || !isInvolved) {
      console.log(`[ActionPrompt] Hiding due to JSN chain logic`);
      return null;
    }
  } else {
    // Don't show prompt to the person who initiated the action
    if (isSource) {
      console.log(`[ActionPrompt] ✓ Hiding from source player (${playerId})`);
      return null;
    }
    if (!isTarget || hasResponded) {
      console.log(`[ActionPrompt] Hiding: isTarget=${isTarget}, hasResponded=${hasResponded}`);
      return null;
    }
  }
  
  console.log(`[ActionPrompt] ✓✓✓ SHOWING action prompt to player ${playerId}`);

  const hasJustSayNo = me?.hand?.some((c) => c.type === CardType.JustSayNo) ?? false;

  const toggleCard = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const selectedTotal = selectedCardIds.reduce((sum, id) => {
    const bankCard = me?.bank.find((c) => c.id === id);
    if (bankCard) return sum + bankCard.value;
    for (const set of me?.properties ?? []) {
      const propCard = set.cards.find((c) => c.id === id);
      if (propCard) return sum + propCard.value;
      if (set.house?.id === id) return sum + set.house.value;
      if (set.hotel?.id === id) return sum + set.hotel.value;
    }
    return sum;
  }, 0);

  const needsPayment = action.type === "rent" || action.type === "debtCollector" || action.type === "birthday";
  const amountDue = action.amount ?? 0;

  const totalTableValue = (() => {
    if (!me) return 0;
    let total = 0;
    for (const c of me.bank) total += c.value;
    for (const s of me.properties) {
      for (const c of s.cards) total += c.value;
      if (s.house) total += s.house.value;
      if (s.hotel) total += s.hotel.value;
    }
    return total;
  })();

  const allPayableCardIds = me ? [
    ...me.bank.map(c => c.id),
    ...me.properties.flatMap(s => [...s.cards.map(c => c.id), ...(s.house ? [s.house.id] : []), ...(s.hotel ? [s.hotel.id] : [])]),
  ] : [];
  const mustPayAll = totalTableValue <= amountDue;
  const hasPaidEnough = selectedTotal >= amountDue;
  const hasSelectedAll = allPayableCardIds.every(id => selectedCardIds.includes(id));
  const canSubmitPayment = totalTableValue === 0 || (mustPayAll ? hasSelectedAll : hasPaidEnough);

  function getActionDescription(): string {
    // If in JSN chain, clarify what's happening
    if (isJSNChain) {
      const jsnPlayerName = players.find(p => p.id === isJSNChain.targetPlayerId)?.name ?? "Someone";
      
      // If the current player is the source, they see that opponent countered
      if (isSource) {
        return `${jsnPlayerName} played Just Say No! Accept to let them counter your action.`;
      }
      
      // If the current player is the target, they see that opponent countered the JSN
      if (isTarget) {
        return `${sourcePlayer?.name ?? "Someone"} played Just Say No! Accept to let them counter.`;
      }
    }
    
    // Regular action descriptions
    switch (action.type) {
      case "rent":
        return `${sourcePlayer?.name ?? "Someone"} is charging ${amountDue}M rent!`;
      case "debtCollector":
        return `${sourcePlayer?.name ?? "Someone"} demands ${amountDue}M!`;
      case "birthday":
        return `It's ${sourcePlayer?.name ?? "someone"}'s birthday! Pay ${amountDue}M.`;
      case "slyDeal":
        return `${sourcePlayer?.name ?? "Someone"} wants to steal your property!`;
      case "forceDeal":
        return `${sourcePlayer?.name ?? "Someone"} wants to swap properties!`;
      case "dealBreaker":
        return `${sourcePlayer?.name ?? "Someone"} is taking your complete set!`;
      default:
        return "An action was played against you.";
    }
  }

  // Get the cards involved in the trade/steal
  function getTargetCard(): Card | null {
    // For deal breaker, return first card of the target set
    if (action.type === "dealBreaker" && action.selectedCards?.targetSetColor) {
      const set = me?.properties.find(s => s.color === action.selectedCards!.targetSetColor);
      return set?.cards[0] ?? null;
    }
    // For sly deal and force deal, find the specific card
    if (!action.selectedCards?.targetCardId) return null;
    for (const set of me?.properties ?? []) {
      const card = set.cards.find(c => c.id === action.selectedCards!.targetCardId);
      if (card) return card;
    }
    return null;
  }

  function getSourceCard(): Card | null {
    if (!action.selectedCards?.sourceCardId) return null;
    for (const set of sourcePlayer?.properties ?? []) {
      const card = set.cards.find(c => c.id === action.selectedCards!.sourceCardId);
      if (card) return card;
    }
    return null;
  }

  function getTargetSet() {
    if (action.type === "dealBreaker" && action.selectedCards?.targetSetColor) {
      return me?.properties.find(s => s.color === action.selectedCards!.targetSetColor);
    }
    return null;
  }

  const targetCard = getTargetCard();
  const sourceCard = getSourceCard();
  const targetSet = getTargetSet();
  const showTradePreview = (action.type === "slyDeal" || action.type === "forceDeal") && targetCard;
  const showDealBreakerPreview = action.type === "dealBreaker" && targetSet;

  const footerButtons = (
    <div className="flex gap-2">
      {needsPayment && (
        <button
          onClick={() => onPayWithCards(selectedCardIds)}
          disabled={!canSubmitPayment}
          className={`flex-1 py-3 ${canSubmitPayment ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 cursor-not-allowed opacity-50'} text-white font-semibold rounded-lg transition-colors`}
        >
          {totalTableValue === 0 ? "I Can't Pay" : selectedCardIds.length > 0 ? `Pay ${selectedTotal}M` : "Select Cards"}
        </button>
      )}

      {!needsPayment && (
        <button
          onClick={onAccept}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Accept
        </button>
      )}

      {hasJustSayNo && (
        <button
          onClick={onJustSayNo}
          className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
        >
          Just Say No!
        </button>
      )}
    </div>
  );

  return (
    <BottomSheet
      isOpen={true}
      onClose={() => {}} // No close button for action prompts - must respond
      title="Action!"
      height="h-96"
      footer={footerButtons}
    >
      <p className="text-gray-300 text-sm mb-3">{getActionDescription()}</p>

          {/* Show Deal Breaker preview - complete set being stolen */}
          {showDealBreakerPreview && (
            <div className="mb-4 bg-black/30 rounded-lg p-3">
              <div className="flex items-center justify-center gap-3">
                {/* Target complete set */}
                <div className="flex flex-col items-center">
                  <p className="text-gray-400 text-[10px] mb-1">Your complete set</p>
                  <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
                    {targetSet.cards.map(card => (
                      <GameCard key={card.id} card={card} small />
                    ))}
                    {targetSet.house && (
                      <GameCard key={targetSet.house.id} card={targetSet.house} small />
                    )}
                    {targetSet.hotel && (
                      <GameCard key={targetSet.hotel.id} card={targetSet.hotel} small />
                    )}
                  </div>
                </div>

                {/* Arrow for steal */}
                <div className="flex flex-col items-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <p className="text-red-400 text-[10px] mt-1">Stolen!</p>
                </div>
              </div>
            </div>
          )}

          {/* Show trade/steal preview for Sly Deal and Force Deal */}
          {showTradePreview && (
            <div className="mb-4 bg-black/30 rounded-lg p-3">
              <div className="flex items-center justify-center gap-3">
                {/* Source card (for force deal) */}
                {action.type === "forceDeal" && sourceCard && (
                  <>
                    <div className="flex flex-col items-center">
                      <p className="text-gray-400 text-[10px] mb-1">{sourcePlayer?.name}'s card</p>
                      <GameCard card={sourceCard} small />
                    </div>
                    {/* Swap icon */}
                    <div className="flex flex-col items-center">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  </>
                )}

                {/* Target card */}
                <div className="flex flex-col items-center">
                  <p className="text-gray-400 text-[10px] mb-1">Your card</p>
                  {targetCard && <GameCard card={targetCard} small />}
                </div>

                {/* Arrow for steal */}
                {action.type === "slyDeal" && (
                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <p className="text-red-400 text-[10px] mt-1">Stolen!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {needsPayment && me && (
            <>
              <p className="text-gray-400 text-xs mb-2">
                Select cards to pay with (${selectedTotal}M / ${amountDue}M):
              </p>

              {me.bank.length > 0 && (
                <div className="mb-2">
                  <p className="text-gray-500 text-[10px] mb-1">Bank</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {[...me.bank].sort((a, b) => a.value - b.value).map((card) => (
                      <GameCard
                        key={card.id}
                        card={card}
                        small
                        selected={selectedCardIds.includes(card.id)}
                        onClick={() => toggleCard(card.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {me.properties.flatMap(s => s.cards).length > 0 && (
                <div className="mb-3">
                  <p className="text-gray-500 text-[10px] mb-1">Properties</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {me.properties.flatMap((set) => [
                      ...set.cards.map((card) => (
                        <GameCard
                          key={card.id}
                          card={card}
                          small
                          selected={selectedCardIds.includes(card.id)}
                          onClick={() => toggleCard(card.id)}
                        />
                      )),
                      ...(set.house ? [<GameCard key={set.house.id} card={set.house} small selected={selectedCardIds.includes(set.house.id)} onClick={() => toggleCard(set.house!.id)} />] : []),
                      ...(set.hotel ? [<GameCard key={set.hotel.id} card={set.hotel} small selected={selectedCardIds.includes(set.hotel.id)} onClick={() => toggleCard(set.hotel!.id)} />] : []),
                    ])}
                  </div>
                </div>
              )}
            </>
          )}
    </BottomSheet>
  );
}
