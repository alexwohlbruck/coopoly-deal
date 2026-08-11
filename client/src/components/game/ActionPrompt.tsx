import { useState } from "react";
import type {
  PendingAction,
  ClientPlayer,
  Card,
  GameSettings,
} from "../../types/game";
import { CardType } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { BottomSheet } from "../common/BottomSheet";
import { getQuirkySaying } from "../../utils/quirkySayings";
import { PrimaryButton, DangerButton } from "../ui/Button";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { fmt } from "../../i18n/format";

interface ActionPromptProps {
  action: PendingAction;
  playerId: string;
  players: ClientPlayer[];
  settings: GameSettings;
  onPayWithCards: (cardIds: string[]) => void;
  onJustSayNo: () => void;
  onAccept: () => void;
}

export function ActionPrompt({
  action,
  playerId,
  players,
  settings: _settings,
  onPayWithCards,
  onJustSayNo,
  onAccept,
}: ActionPromptProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
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

  const [quirkySaying] = useState(() =>
    sourcePlayer
      ? getQuirkySaying(
          action.type,
          sourcePlayer.name,
          useSocialistTheme,
        )
      : null,
  );

  const isJSNChain = action.justSayNoChain;
  if (isJSNChain) {
    const shouldRespond = isJSNChain.targetPlayerId !== playerId;
    const isChainParticipant =
      isSource || playerId === isJSNChain.initiatorTargetId;
    if (!shouldRespond || !isChainParticipant) {
      return null;
    }
  } else {
    // Don't show prompt to the person who initiated the action
    if (isSource) {
      return null;
    }
    if (!isTarget || hasResponded) {
      return null;
    }
  }

  console.log(`[ActionPrompt] ✓✓✓ SHOWING action prompt to player ${playerId}`);

  const hasJustSayNo =
    me?.hand?.some((c) => c.type === CardType.JustSayNo) ?? false;

  const toggleCard = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
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

  // In a JSN chain, the responding player only gets Accept/JSN — never payment
  const needsPayment =
    !isJSNChain &&
    (action.type === "rent" ||
      action.type === "debtCollector" ||
      action.type === "birthday");
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

  const allPayableCardIds = me
    ? [
        ...me.bank.filter((c) => c.value > 0).map((c) => c.id),
        ...me.properties.flatMap((s) => [
          ...s.cards.filter((c) => c.value > 0).map((c) => c.id),
          ...(s.house && s.house.value > 0 ? [s.house.id] : []),
          ...(s.hotel && s.hotel.value > 0 ? [s.hotel.id] : []),
        ]),
      ]
    : [];
  const mustPayAll = totalTableValue <= amountDue;
  const hasPaidEnough = selectedTotal >= amountDue;
  const hasSelectedAll = allPayableCardIds.every((id) =>
    selectedCardIds.includes(id),
  );
  const canSubmitPayment =
    totalTableValue === 0 || (mustPayAll ? hasSelectedAll : hasPaidEnough);

  function getActionDescription(): string {
    // If in JSN chain, clarify what's happening
    if (isJSNChain) {
      const jsnPlayerName =
        players.find((p) => p.id === isJSNChain.targetPlayerId)?.name ??
        t.prompts.someone;
      const jsnLabel = useSocialistTheme ? t.socialist.counterIntelligence : t.actions.justSayNo;

      // If the current player is the source, they see that opponent countered
      if (isSource) {
        return fmt(t.prompts.jsnCounterYours, {
          name: jsnPlayerName,
          card: jsnLabel,
          accept: useSocialistTheme ? t.socialist.comply : t.prompts.accept,
          action: useSocialistTheme ? t.socialist.action : t.cardFaces.action.toLowerCase(),
        });
      }

      // If the current player is the target, they see that opponent countered the JSN
      if (isTarget) {
        return fmt(t.prompts.jsnCounter, {
          name: sourcePlayer?.name ?? t.prompts.someone,
          card: jsnLabel,
          accept: useSocialistTheme ? t.socialist.comply : t.prompts.accept,
        });
      }
    }

    // Regular action descriptions
    switch (action.type) {
      case "rent":
        return fmt(t.prompts.rentCharge, {
          name: sourcePlayer?.name ?? t.prompts.someone,
          amount: amountDue,
          rent: useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase(),
        });
      case "debtCollector":
        return fmt(t.prompts.debtDemand, {
          name: sourcePlayer?.name ?? t.prompts.someone,
          amount: amountDue,
        });
      case "birthday":
        return fmt(
          useSocialistTheme ? t.socialist.birthdayPay : t.prompts.birthdayPay,
          { name: sourcePlayer?.name ?? t.prompts.someone, amount: amountDue },
        );
      case "slyDeal":
        return fmt(
          useSocialistTheme ? t.socialist.stealProperty : t.prompts.stealProperty,
          {
            name: sourcePlayer?.name ?? t.prompts.someone,
            property: useSocialistTheme
              ? t.socialist.property
              : t.cardTypes.property.toLowerCase(),
          },
        );
      case "forceDeal":
        return fmt(
          useSocialistTheme ? t.socialist.swapProperty : t.prompts.swapProperty,
          {
            name: sourcePlayer?.name ?? t.prompts.someone,
            properties: useSocialistTheme
              ? t.socialist.properties
              : t.common.properties.toLowerCase(),
          },
        );
      case "dealBreaker":
        return fmt(t.prompts.stealSet, {
          name: sourcePlayer?.name ?? t.prompts.someone,
        });
      default:
        return useSocialistTheme ? t.socialist.actionPlayedAgainstYou : t.prompts.actionPlayedAgainstYou;
    }
  }

  // Get the cards involved in the trade/steal
  function getTargetCard(): Card | null {
    // For deal breaker, return first card of the target set
    if (action.type === "dealBreaker" && action.selectedCards?.targetSetColor) {
      const set = me?.properties.find(
        (s) => s.color === action.selectedCards!.targetSetColor,
      );
      return set?.cards[0] ?? null;
    }
    // For sly deal and force deal, find the specific card
    if (!action.selectedCards?.targetCardId) return null;
    for (const set of me?.properties ?? []) {
      const card = set.cards.find(
        (c) => c.id === action.selectedCards!.targetCardId,
      );
      if (card) return card;
    }
    return null;
  }

  function getSourceCard(): Card | null {
    if (!action.selectedCards?.sourceCardId) return null;
    for (const set of sourcePlayer?.properties ?? []) {
      const card = set.cards.find(
        (c) => c.id === action.selectedCards!.sourceCardId,
      );
      if (card) return card;
    }
    return null;
  }

  function getTargetSet() {
    if (action.type === "dealBreaker" && action.selectedCards?.targetSetColor) {
      return me?.properties.find(
        (s) => s.color === action.selectedCards!.targetSetColor,
      );
    }
    return null;
  }

  const targetCard = getTargetCard();
  const sourceCard = getSourceCard();
  const targetSet = getTargetSet();
  const showTradePreview =
    (action.type === "slyDeal" || action.type === "forceDeal") && targetCard;
  const showDealBreakerPreview = action.type === "dealBreaker" && targetSet;

  const soc = useSocialistTheme;

  const footerButtons = (
    <div style={{ display: "flex", gap: 8 }}>
      {needsPayment && (
        <PrimaryButton
          onClick={() => onPayWithCards(selectedCardIds)}
          disabled={!canSubmitPayment}
          fullWidth
          size="lg"
        >
          {totalTableValue === 0
            ? soc ? t.socialist.nothingToContribute : t.prompts.cantPay
            : selectedCardIds.length > 0
              ? `${soc ? t.socialist.contribute : t.prompts.pay} ${selectedTotal}M`
              : soc ? t.socialist.selectResources : t.prompts.selectCards}
        </PrimaryButton>
      )}

      {!needsPayment && (
        <PrimaryButton onClick={onAccept} fullWidth size="lg">
          {soc ? t.socialist.comply : t.prompts.accept}
        </PrimaryButton>
      )}

      {hasJustSayNo && (
        <DangerButton onClick={onJustSayNo} fullWidth size="lg">
          {soc ? `${t.socialist.counterIntelligence}!` : `${t.actions.justSayNo}!`}
        </DangerButton>
      )}
    </div>
  );

  return (
    <BottomSheet
      isOpen={true}
      onClose={() => {}}
      closable={false}
      title={useSocialistTheme ? `${t.socialist.directive}!` : `${t.prompts.action}!`}
      height="h-auto"
      footer={footerButtons}
      playSound={true}
    >
      <p className="text-gray-300 text-sm mb-2">{getActionDescription()}</p>
      {quirkySaying && (
        <p className="text-yellow-400 text-xs italic mb-4 border-l-2 border-yellow-500/50 pl-2 py-1 bg-yellow-500/10 rounded-r">
          "{quirkySaying}"
        </p>
      )}

      {/* Show Deal Breaker preview - complete set being stolen */}
      {showDealBreakerPreview && (
        <div className="mb-4 bg-black/30 rounded-lg p-3">
          <div className="flex items-center justify-center gap-4">
            {/* Target complete set */}
            <div className="flex flex-col items-center">
              <p className="text-gray-400 text-[10px] mb-1">
                {soc ? t.socialist.yourCompleteSet : t.prompts.yourCompleteSet}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-[200px]">
                {targetSet.cards.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    width={96}
                    useSocialistTheme={useSocialistTheme}
                  />
                ))}
                {targetSet.house && (
                  <GameCard
                    key={targetSet.house.id}
                    card={targetSet.house}
                    width={96}
                    useSocialistTheme={useSocialistTheme}
                  />
                )}
                {targetSet.hotel && (
                  <GameCard
                    key={targetSet.hotel.id}
                    card={targetSet.hotel}
                    width={96}
                    useSocialistTheme={useSocialistTheme}
                  />
                )}
              </div>
            </div>

            {/* Arrow for steal */}
            <div className="flex flex-col items-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <p className="text-red-400 text-[10px] mt-1">{soc ? t.socialist.stolen : t.common.stolen}</p>
            </div>
          </div>
        </div>
      )}

      {/* Show trade/steal preview for Sly Deal and Force Deal */}
      {showTradePreview && (
        <div className="mb-4 bg-black/30 rounded-lg p-3">
          <div className="flex items-center justify-center gap-4">
            {/* Source card (for force deal) */}
            {action.type === "forceDeal" && sourceCard && (
              <>
                <div className="flex flex-col items-center">
                  <p className="text-gray-400 text-[10px] mb-1">
                    {sourcePlayer?.name}'s card
                  </p>
                  <GameCard
                    card={sourceCard}
                    width={96}
                    useSocialistTheme={useSocialistTheme}
                  />
                </div>
                {/* Swap icon */}
                <div className="flex flex-col items-center">
                  <svg
                    className="w-6 h-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
              </>
            )}

            {/* Target card */}
            <div className="flex flex-col items-center">
              <p className="text-gray-400 text-[10px] mb-1">{t.prompts.yourCard}</p>
              {targetCard && (
                <GameCard
                  card={targetCard}
                  width={96}
                  useSocialistTheme={useSocialistTheme}
                />
              )}
            </div>

            {/* Arrow for steal */}
            {action.type === "slyDeal" && (
              <div className="flex flex-col items-center">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <p className="text-red-400 text-[10px] mt-1">{soc ? t.socialist.stolen : t.common.stolen}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {needsPayment && me && (
        <>
          <p className="text-gray-400 text-xs mb-2">
            {soc
              ? `${t.socialist.selectResources} ($${selectedTotal}M / $${amountDue}M):`
              : `${t.game.selectCardsToPayWith} ($${selectedTotal}M / $${amountDue}M):`}
          </p>

          {me.bank.filter((c) => c.value > 0).length > 0 && (
            <div className="mb-2">
              <p className="text-gray-500 text-[10px] mb-1">{soc ? t.socialist.bank : t.common.bank}</p>
              <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto p-2 justify-center">
                {[...me.bank]
                  .filter((c) => c.value > 0)
                  .sort((a, b) => a.value - b.value)
                  .map((card) => (
                    <GameCard
                      key={card.id}
                      card={card}
                      width={96}
                      selected={selectedCardIds.includes(card.id)}
                      onClick={() => toggleCard(card.id)}
                      useSocialistTheme={useSocialistTheme}
                    />
                  ))}
              </div>
            </div>
          )}

          {me.properties.flatMap((s) => s.cards).filter((c) => c.value > 0)
            .length > 0 && (
            <div className="mb-3">
              <p className="text-gray-500 text-[10px] mb-1">{soc ? t.socialist.properties : t.common.properties}</p>
              <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto p-2 justify-center">
                {me.properties.flatMap((set) => [
                  ...set.cards
                    .filter((c) => c.value > 0)
                    .map((card) => (
                      <GameCard
                        key={card.id}
                        card={card}
                        width={96}
                        selected={selectedCardIds.includes(card.id)}
                        onClick={() => toggleCard(card.id)}
                        useSocialistTheme={useSocialistTheme}
                      />
                    )),
                  ...(set.house && set.house.value > 0
                    ? [
                        <GameCard
                          key={set.house.id}
                          card={set.house}
                          width={96}
                          selected={selectedCardIds.includes(set.house.id)}
                          onClick={() => toggleCard(set.house!.id)}
                          useSocialistTheme={useSocialistTheme}
                        />,
                      ]
                    : []),
                  ...(set.hotel && set.hotel.value > 0
                    ? [
                        <GameCard
                          key={set.hotel.id}
                          card={set.hotel}
                          width={96}
                          selected={selectedCardIds.includes(set.hotel.id)}
                          onClick={() => toggleCard(set.hotel!.id)}
                          useSocialistTheme={useSocialistTheme}
                        />,
                      ]
                    : []),
                ])}
              </div>
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
