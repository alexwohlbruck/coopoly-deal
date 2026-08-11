import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Card,
  type ClientPlayer,
  type PropertyColor,
  CardType,
  PropertyColor as PC,
  getPropertyColorLabel,
  PROPERTY_COLOR_HEX,
  isSetComplete,
  SET_SIZE,
} from "../../types/game";
import { type GameSettings } from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { calculateRent } from "../../utils/rent-calculator";
import { BottomSheet } from "../common/BottomSheet";
import { PrimaryButton } from "../ui/Button";
import { RENT_VALUES } from "../../types/game";
import {
  WildcardColorOption,
  DecideLaterButton,
  rentGainFor,
} from "./WildcardColorOption";
import { useGameStore } from "../../hooks/useGameStore";
import { useI18n } from "../../i18n";
import { fmt } from "../../i18n/format";

/**
 * Card + caption tile used in steal / swap pickers. Shows the card
 * itself plus the set-context info that makes the choice readable:
 *   - color name
 *   - completion state ("2/3 cards")
 *   - current rent for the set ("$2M rent")
 *
 * Helps the player decide which target card hurts the most or which
 * of their own cards is least valuable to give up — without having
 * to mentally cross-reference the table.
 */
function CardWithSetStats({
  card,
  player,
  selected,
  onClick,
  useSocialistTheme,
}: {
  card: Card;
  /** The OWNER of this card (target player for steal, you for give). */
  player: ClientPlayer;
  selected?: boolean;
  onClick?: () => void;
  useSocialistTheme?: boolean;
}) {
  const { t } = useI18n();
  // Locate the set this card belongs to, to compute the contextual
  // stats. Fall back gracefully if not found.
  const owningSet = player.properties.find((s) =>
    s.cards.some((c) => c.id === card.id),
  );
  const color = owningSet?.color ?? card.colors?.[0] ?? PC.Brown;
  const cardsInSet = owningSet?.cards.length ?? 1;
  const setSize = SET_SIZE[color] ?? 3;
  const rents = RENT_VALUES[color] ?? [];
  const currentRent = cardsInSet > 0 ? (rents[cardsInSet - 1] ?? 0) : 0;
  const setLabel = getPropertyColorLabel(t, color, !!useSocialistTheme);
  const accentHex = PROPERTY_COLOR_HEX[color] ?? "#888";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        // Provide breathing room so the GameCard's hover lift + the
        // selected-ring shadow have space to render without clipping.
        padding: "4px 2px",
      }}
    >
      <GameCard
        card={card}
        width={96}
        selected={selected}
        useSocialistTheme={useSocialistTheme}
        onClick={onClick}
      />
      <div
        style={{
          minHeight: 32,
          width: 96,
          padding: "3px 5px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${accentHex}33`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.06em",
            color: accentHex,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {setLabel}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.78)",
            display: "flex",
            gap: 4,
          }}
        >
          <span>
            {cardsInSet}/{setSize}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span style={{ color: "#7adb88" }}>${currentRent}M</span>
        </div>
      </div>
    </div>
  );
}

interface CardActionDialogProps {
  card: Card;
  player: ClientPlayer;
  opponents: ClientPlayer[];
  settings: GameSettings;
  rentMultiplier?: number;
  cardsPlayed: number;
  onClose: () => void;
  onPlayToProperty: (
    cardId: string,
    color: PropertyColor,
    groupWithUnassigned?: boolean,
    createNewSet?: boolean,
  ) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
}

export function CardActionDialog({
  card,
  player,
  opponents,
  settings,
  rentMultiplier = 1,
  cardsPlayed,
  onClose,
  onPlayToProperty,
  onPlayAction,
}: CardActionDialogProps) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
  console.log("[CardActionDialog] Component rendered", {
    cardType: card.type,
    cardId: card.id,
  });

  const [step, setStep] = useState<
    | "choose"
    | "selectRentCards"
    | "selectColor"
    | "selectTarget"
    | "selectTargetCard"
    | "selectMyCard"
    | "selectTargetSet"
    /** Force Deal: combined picker — choose card-to-take AND
     *  card-to-give in one step, with multi-target swipe between
     *  opponents in the take column. */
    | "forceDealSwap"
  >("choose");
  const [selectedColor, setSelectedColor] = useState<PropertyColor | null>(
    null,
  );
  const [selectedTarget, setSelectedTarget] = useState<ClientPlayer | null>(null);
  const [selectedRentCardId, setSelectedRentCardId] = useState<string | null>(
    card.type === CardType.RentDual || card.type === CardType.RentWild ? card.id : null
  );
  const [selectedDtrCardIds, setSelectedDtrCardIds] = useState<string[]>(
    card.type === CardType.DoubleTheRent ? [card.id] : []
  );
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(null);
  // Force Deal combined-step state: tracks the card we'll give back
  // (the "take" card lives in selectedTargetCard above).
  const [selectedMyCard, setSelectedMyCard] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [actionDispatched, setActionDispatched] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string>(card.id);
  const closedRef = useRef(false);
  const lastCardIdRef = useRef<string | null>(null);

  const activeCard = player.hand?.find(c => c.id === activeCardId) || card;

  useEffect(() => {
    console.log("[CardActionDialog] Component mounted for card", card.id);
    if (lastCardIdRef.current !== card.id) {
      console.log("[CardActionDialog] New card detected, resetting flags");
      closedRef.current = false;
      setActionDispatched(false);
      lastCardIdRef.current = card.id;
      setActiveCardId(card.id);
      setSelectedRentCardId(card.type === CardType.RentDual || card.type === CardType.RentWild ? card.id : null);
      setSelectedDtrCardIds(card.type === CardType.DoubleTheRent ? [card.id] : []);
      setStep("choose");
      setSelectedColor(null);
      setSelectedTarget(null);
      setSelectedTargetCard(null);
      setAutoTriggered(false);
    } else {
      console.log(
        "[CardActionDialog] Remount of same card detected, keeping closedRef:",
        closedRef.current,
      );
    }

    return () => {
      console.log("[CardActionDialog] Component unmounting for card", card.id);
    };
  }, [card.id, card.type]);

  const canPlayToProperty =
    activeCard.type === CardType.Property || activeCard.type === CardType.PropertyWildcard;

  const isActionCard =
    activeCard.type === CardType.PassGo ||
    card.type === CardType.SlyDeal ||
    card.type === CardType.ForceDeal ||
    card.type === CardType.DealBreaker ||
    card.type === CardType.DebtCollector ||
    card.type === CardType.Birthday ||
    card.type === CardType.RentDual ||
    card.type === CardType.RentWild ||
    card.type === CardType.House ||
    card.type === CardType.Hotel ||
    card.type === CardType.DoubleTheRent;

  // Helper to mark as dispatched and close
  // NOTE: This should be called BEFORE onPlayAction to prevent remounts
  const markDispatchedAndClose = useCallback(() => {
    console.log("[CardActionDialog] markDispatchedAndClose called");
    setActionDispatched(true);
    closedRef.current = true;
  }, []);

  function dispatchAll(rentAction?: Record<string, unknown>) {
    markDispatchedAndClose();
    for (const dtrId of selectedDtrCardIds) {
      onPlayAction({ action: "doubleTheRent", cardId: dtrId });
    }
    if (rentAction) {
      onPlayAction(rentAction);
    }
    onClose();
  }

  function proceedWithRentCard(rentCardId: string) {
    const rentCard = player.hand?.find(c => c.id === rentCardId) || activeCard;
    setActiveCardId(rentCard.id);

    if (rentCard.type === CardType.RentDual) {
      const colors = rentCard.colors ?? [];
      const validColors = colors.filter((c) =>
        player.properties.some((s) => s.color === c && s.cards.length > 0),
      );
      if (validColors.length === 1) {
        dispatchAll({ action: "rentDual", cardId: rentCard.id, color: validColors[0] });
      } else {
        setStep("selectColor");
      }
    } else if (rentCard.type === CardType.RentWild) {
      setStep("selectColor");
    }
  }

  const canUseAction = (() => {
    if (activeCard.type === CardType.House) {
      return player.properties.some(
        (s) =>
          isSetComplete(s) &&
          s.color !== PC.Railroad &&
          s.color !== PC.Utility &&
          !s.house,
      );
    }
    if (activeCard.type === CardType.Hotel) {
      return player.properties.some(
        (s) =>
          isSetComplete(s) &&
          s.color !== PC.Railroad &&
          s.color !== PC.Utility &&
          (!settings.requireHouseBeforeHotel || s.house) &&
          !s.hotel,
      );
    }
    if (activeCard.type === CardType.DealBreaker) {
      return opponents.some((opp) =>
        opp.properties.some((s) => isSetComplete(s)),
      );
    }
    if (activeCard.type === CardType.SlyDeal) {
      return opponents.some((opp) =>
        opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0),
      );
    }
    if (activeCard.type === CardType.ForceDeal) {
      const hasMyCards = player.properties.some(
        (s) => !isSetComplete(s) && s.cards.length > 0,
      );
      const hasTheirCards = opponents.some((opp) =>
        opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0),
      );
      return hasMyCards && hasTheirCards;
    }
    if (activeCard.type === CardType.RentDual) {
      return (
        activeCard.colors?.some((c) =>
          player.properties.some((s) => s.color === c && s.cards.length > 0),
        ) ?? false
      );
    }
    if (activeCard.type === CardType.RentWild) {
      return player.properties.some((s) => s.cards.length > 0);
    }
    if (activeCard.type === CardType.DoubleTheRent) {
      if (cardsPlayed >= 2) return false;
      const rentCards = player.hand?.filter(c => c.type === CardType.RentDual || c.type === CardType.RentWild) || [];
      return rentCards.length > 0;
    }
    return true;
  })();

  function handlePlayAction() {
    console.log("[CardActionDialog] handlePlayAction called", {
      cardType: activeCard.type,
      cardId: activeCard.id,
      actionDispatched,
      closedRef: closedRef.current,
      step,
    });

    if (closedRef.current) {
      console.log(
        "[CardActionDialog] Dialog already closed (remount detected), returning",
      );
      return;
    }

    const actionPayload = (() => {
      switch (activeCard.type) {
        case CardType.PassGo:
          return { action: "passGo", cardId: activeCard.id };
        case CardType.Birthday:
          return { action: "birthday", cardId: activeCard.id };
        case CardType.DoubleTheRent:
          return null;
        default:
          return null;
      }
    })();

    if (actionPayload) {
      console.log(
        "[CardActionDialog] Dispatching simple action",
        actionPayload,
      );
      markDispatchedAndClose();
      onPlayAction(actionPayload);
      onClose();
      console.log("[CardActionDialog] Action dispatched");
      return;
    }

    switch (activeCard.type) {
      case CardType.DoubleTheRent:
      case CardType.RentDual:
      case CardType.RentWild: {
        const dtrCards = player.hand?.filter(c => c.type === CardType.DoubleTheRent) || [];
        const rentCards = player.hand?.filter(c => c.type === CardType.RentDual || c.type === CardType.RentWild) || [];
        
        if (activeCard.type === CardType.DoubleTheRent && rentCards.length === 0) {
          markDispatchedAndClose();
          onPlayAction({ action: "doubleTheRent", cardId: activeCard.id });
          onClose();
          return;
        }
        
        if (activeCard.type === CardType.RentDual || activeCard.type === CardType.RentWild) {
           if (dtrCards.length === 0 || cardsPlayed >= 2) {
             proceedWithRentCard(activeCard.id);
             return;
           }
        }

        setStep("selectRentCards");
        return;
      }
      case CardType.DebtCollector:
        if (opponents.length === 1) {
          markDispatchedAndClose();
          onPlayAction({
            action: "debtCollector",
            cardId: activeCard.id,
            targetPlayerId: opponents[0].id,
          });
          onClose();
          return;
        }
        setStep("selectTarget");
        return;
      case CardType.SlyDeal:
      case CardType.ForceDeal:
      case CardType.DealBreaker: {
        let validOpponents = opponents;
        if (activeCard.type === CardType.DealBreaker) {
          validOpponents = opponents.filter(opp => opp.properties.some(isSetComplete));
        } else {
          validOpponents = opponents.filter(opp => opp.properties.some(s => !isSetComplete(s) && s.cards.length > 0));
        }

        if (validOpponents.length === 1) {
          handleSelectTarget(validOpponents[0]);
          return;
        }
        // Force Deal jumps straight to the combined picker — its UI
        // includes a swipeable target selector along the top, so we
        // don't need the standalone selectTarget step.
        if (activeCard.type === CardType.ForceDeal) {
          const first = validOpponents[0];
          setSelectedTarget(first);
          const stealable = first.properties
            .filter((s) => !isSetComplete(s))
            .flatMap((s) => s.cards);
          const myCards = player.properties
            .filter((s) => !isSetComplete(s))
            .flatMap((s) => s.cards);
          if (stealable.length === 1) setSelectedTargetCard(stealable[0].id);
          if (myCards.length === 1) setSelectedMyCard(myCards[0].id);
          setStep("forceDealSwap");
          return;
        }
        setStep("selectTarget");
        return;
      }
      case CardType.House:
      case CardType.Hotel: {
        const sets = player.properties.filter(
          (s) =>
            isSetComplete(s) &&
            s.color !== PC.Railroad &&
            s.color !== PC.Utility,
        );
        const validSets =
          activeCard.type === CardType.House
            ? sets.filter((s) => !s.house)
            : sets.filter((s) => (!settings.requireHouseBeforeHotel || s.house) && !s.hotel);
        if (validSets.length === 1) {
          const action = activeCard.type === CardType.House ? "house" : "hotel";
          markDispatchedAndClose();
          onPlayAction({
            action,
            cardId: activeCard.id,
            setColor: validSets[0].color,
          });
          onClose();
          return;
        }
        setStep("selectColor");
        return;
      }
    }
  }

  function handleSelectColor(color: PropertyColor) {
    if (closedRef.current) return;

    setSelectedColor(color);
    if (activeCard.type === CardType.RentDual) {
      dispatchAll({ action: "rentDual", cardId: activeCard.id, color });
    } else if (activeCard.type === CardType.RentWild) {
      if (opponents.length === 1) {
        dispatchAll({ action: "rentWild", cardId: activeCard.id, color, targetPlayerId: opponents[0].id });
        return;
      }
      setStep("selectTarget");
    } else if (activeCard.type === CardType.House) {
      markDispatchedAndClose();
      onPlayAction({ action: "house", cardId: activeCard.id, setColor: color });
      onClose();
    } else if (activeCard.type === CardType.Hotel) {
      markDispatchedAndClose();
      onPlayAction({ action: "hotel", cardId: activeCard.id, setColor: color });
      onClose();
    }
  }

  function handleSelectTarget(target: ClientPlayer) {
    if (closedRef.current) return;

    setSelectedTarget(target);
    if (activeCard.type === CardType.DebtCollector) {
      markDispatchedAndClose();
      onPlayAction({
        action: "debtCollector",
        cardId: activeCard.id,
        targetPlayerId: target.id,
      });
      onClose();
    } else if (activeCard.type === CardType.RentWild && selectedColor) {
      dispatchAll({
        action: "rentWild",
        cardId: activeCard.id,
        color: selectedColor,
        targetPlayerId: target.id,
      });
    } else if (activeCard.type === CardType.SlyDeal) {
      const stealable = target.properties
        .filter((s) => !isSetComplete(s))
        .flatMap((s) => s.cards);
      if (stealable.length === 1) {
        markDispatchedAndClose();
        onPlayAction({
          action: "slyDeal",
          cardId: activeCard.id,
          targetPlayerId: target.id,
          targetCardId: stealable[0].id,
        });
        onClose();
        return;
      }
      setStep("selectTargetCard");
    } else if (activeCard.type === CardType.ForceDeal) {
      // Combined picker: pick what-to-take AND what-to-give in one
      // step. Auto-resolves only if there's exactly one of each on
      // BOTH sides (rare). Otherwise we render the side-by-side UI.
      const stealable = target.properties
        .filter((s) => !isSetComplete(s))
        .flatMap((s) => s.cards);
      const myCards = player.properties
        .filter((s) => !isSetComplete(s))
        .flatMap((s) => s.cards);
      if (stealable.length === 1 && myCards.length === 1) {
        markDispatchedAndClose();
        onPlayAction({
          action: "forceDeal",
          cardId: activeCard.id,
          myCardId: myCards[0].id,
          targetPlayerId: target.id,
          targetCardId: stealable[0].id,
        });
        onClose();
        return;
      }
      setStep("forceDealSwap");
      // Pre-select the unambiguous side(s).
      if (stealable.length === 1) setSelectedTargetCard(stealable[0].id);
      if (myCards.length === 1) setSelectedMyCard(myCards[0].id);
      return;
    } else if (activeCard.type === CardType.DealBreaker) {
      const completeSets = target.properties.filter(isSetComplete);
      if (completeSets.length === 1) {
        markDispatchedAndClose();
        onPlayAction({
          action: "dealBreaker",
          cardId: activeCard.id,
          targetPlayerId: target.id,
          targetSetColor: completeSets[0].color,
        });
        onClose();
        return;
      }
      setStep("selectTargetSet");
    }
  }

  function handleSelectTargetCard(cardId: string) {
    if (closedRef.current) return;

    setSelectedTargetCard(cardId);
    if (activeCard.type === CardType.SlyDeal && selectedTarget) {
      markDispatchedAndClose();
      onPlayAction({
        action: "slyDeal",
        cardId: activeCard.id,
        targetPlayerId: selectedTarget.id,
        targetCardId: cardId,
      });
      onClose();
    } else if (activeCard.type === CardType.ForceDeal) {
      setStep("selectMyCard");
    }
  }

  function handleSelectMyCard(myCardId: string) {
    if (closedRef.current) return;
    if (selectedTarget && selectedTargetCard) {
      markDispatchedAndClose();
      onPlayAction({
        action: "forceDeal",
        cardId: activeCard.id,
        myCardId,
        targetPlayerId: selectedTarget.id,
        targetCardId: selectedTargetCard,
      });
      onClose();
    }
  }

  function handleSelectTargetSet(color: PropertyColor) {
    if (closedRef.current) return;
    if (selectedTarget) {
      markDispatchedAndClose();
      onPlayAction({
        action: "dealBreaker",
        cardId: activeCard.id,
        targetPlayerId: selectedTarget.id,
        targetSetColor: color,
      });
      onClose();
    }
  }

  function handlePlayToProperty() {
    if (activeCard.colors && activeCard.colors.length === 1) {
      markDispatchedAndClose();
      onPlayToProperty(activeCard.id, activeCard.colors[0]);
      onClose();
    } else if (activeCard.colors && activeCard.colors.length >= 2) {
      setStep("selectColor");
    }
  }

  const isMultiWildcard =
    activeCard.type === CardType.PropertyWildcard && (activeCard.colors?.length ?? 0) > 2;

  const availableColors =
    activeCard.type === CardType.RentDual
      ? (activeCard.colors ?? []).filter(
          (c) =>
            c !== PC.Unassigned &&
            player.properties.some((s) => s.color === c && s.cards.length > 0),
        )
      : activeCard.type === CardType.RentWild
        ? Object.values(PC).filter(
            (c) =>
              c !== PC.Unassigned &&
              player.properties.some(
                (s) => s.color === c && s.cards.length > 0,
              ),
          )
        : activeCard.type === CardType.House
          ? player.properties
              .filter(
                (s) =>
                  isSetComplete(s) &&
                  s.color !== PC.Railroad &&
                  s.color !== PC.Utility &&
                  !s.house,
              )
              .map((s) => s.color)
          : activeCard.type === CardType.Hotel
            ? player.properties
                .filter(
                  (s) =>
                    isSetComplete(s) &&
                    s.color !== PC.Railroad &&
                    s.color !== PC.Utility &&
                    (!settings.requireHouseBeforeHotel || s.house) &&
                    !s.hotel,
                )
                .map((s) => s.color)
            : isMultiWildcard
              ? (() => {
                  const valid = (activeCard.colors ?? []).filter(
                    (c) =>
                      c !== PC.Unassigned &&
                      player.properties.some(
                        (s) =>
                          s.color === c &&
                          s.cards.length > 0 &&
                          s.cards.length < SET_SIZE[c],
                      ),
                  );
                  return valid.length > 0 || !settings.wildcardFlipCountsAsMove
                    ? valid
                    : (activeCard.colors ?? []).filter((c) => c !== PC.Unassigned);
                })()
              : (activeCard.colors ?? []).filter((c) => c !== PC.Unassigned);

  useEffect(() => {
    console.log("[CardActionDialog] useEffect triggered", {
      autoTriggered,
      step,
      cardType: activeCard.type,
      canPlayToProperty,
      isActionCard,
      actionDispatched,
    });

    if (autoTriggered) {
      console.log("[CardActionDialog] Already auto-triggered, skipping");
      return;
    }
    if (step !== "choose") {
      console.log("[CardActionDialog] Not in choose step, skipping");
      return;
    }

    const actionCount = [
      canPlayToProperty,
      isActionCard && !canPlayToProperty,
    ].filter(Boolean).length;

    console.log("[CardActionDialog] Action count:", actionCount);

    if (actionCount === 1) {
      setAutoTriggered(true);
      if (canPlayToProperty && !isActionCard) {
        console.log("[CardActionDialog] Auto-triggering property play");
        handlePlayToProperty();
      } else if (isActionCard && !canPlayToProperty) {
        console.log("[CardActionDialog] Auto-triggering action play");
        handlePlayAction();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const footerButtons =
    step === "choose" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {canPlayToProperty && (
          <PrimaryButton
            onClick={handlePlayToProperty}
            fullWidth
            size="lg"
          >
            {t.game.playAsProperty}
          </PrimaryButton>
        )}
        {isActionCard && !canPlayToProperty && (
          <PrimaryButton
            onClick={handlePlayAction}
            disabled={!canUseAction}
            fullWidth
            size="lg"
          >
            {useSocialistTheme ? `Use ${t.socialist.action.charAt(0).toUpperCase() + t.socialist.action.slice(1)}` : t.game.useAction}
          </PrimaryButton>
        )}
      </div>
    ) : null;

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title={t.game.playCard}
      height="h-auto"
      footer={footerButtons}
      playSound={true}
    >
      {/* Card preview only on the initial "choose" step. Once the
          player has committed to playing the card and is now picking
          a color / target / partner card, the preview is redundant and
          eats vertical space the actual decision UI needs. */}
      {step === "choose" && (
        <div className="flex justify-center mb-3">
          <GameCard card={activeCard} useSocialistTheme={useSocialistTheme} />
        </div>
      )}

      {step === "choose" && (
        <p className="text-gray-400 text-xs text-center">
          💡 {t.game.addToBank}
        </p>
      )}

      {step === "selectColor" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {activeCard.type === CardType.RentDual || activeCard.type === CardType.RentWild
              ? `${t.game.selectColor} to charge ${useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()}:`
              : activeCard.type === CardType.PropertyWildcard
                ? t.game.wildcardFlipInstruction
                : `${t.game.selectColor}:`}
          </p>
          {(rentMultiplier > 1 || selectedDtrCardIds.length > 0) &&
            (activeCard.type === CardType.RentDual ||
              activeCard.type === CardType.RentWild) && (
              <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300 text-xs font-semibold text-center">
                  🎯 {useSocialistTheme ? t.socialist.rent : t.actions.rent} will be {rentMultiplier * Math.pow(2, selectedDtrCardIds.length)}x (Doubled!)
                </p>
              </div>
            )}

          {/* Property wildcard play: use the same set-preview tile UI
              as the WildcardFlipDialog / WildcardAssignmentPrompt so
              the player gets the same useful info (set count, rent
              ladder, BEST badge) when CHOOSING a color to play into. */}
          {activeCard.type === CardType.PropertyWildcard && (() => {
            const colors = availableColors.filter((c) => c !== PC.Unassigned);
            const gains = colors.map((c) => ({
              color: c,
              gain: rentGainFor(c, player),
            }));
            const maxGain = gains.reduce((m, g) => Math.max(m, g.gain), 0);
            const bestColor =
              maxGain > 0 ? gains.find((g) => g.gain === maxGain)?.color : undefined;
            const isMulti =
              activeCard.colors && activeCard.colors.length > 2;
            return (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {colors.map((color) => (
                    <WildcardColorOption
                      key={color}
                      color={color}
                      player={player}
                      isBest={color === bestColor}
                      onClick={() => {
                        markDispatchedAndClose();
                        onPlayToProperty(activeCard.id, color);
                        onClose();
                      }}
                      useSocialistTheme={useSocialistTheme}
                    />
                  ))}
                </div>
                {/* For multi-color (rainbow) wildcards: optional
                    "Unassigned / I'll decide later" rainbow button. */}
                {isMulti &&
                  !settings.wildcardFlipCountsAsMove &&
                  availableColors.includes(PC.Unassigned) && (
                    <div style={{ marginTop: 10 }}>
                      <DecideLaterButton
                        onClick={() => {
                          markDispatchedAndClose();
                          onPlayToProperty(activeCard.id, PC.Unassigned);
                          onClose();
                        }}
                        label={t.game.decideLater}
                      />
                    </div>
                  )}
              </>
            );
          })()}

          {/* Non-wildcard color picker (rent cards, house/hotel
              placement) keeps the simpler colored-button grid below.
              Property wildcards short-circuit above with the tile UI. */}
          {activeCard.type !== CardType.PropertyWildcard &&
            /* For rent cards, compute the highest-rent color so we can
               flag it as "BEST" — same idea as the wildcard color
               picker. Skipped for property-wildcard color choice
               (handled by the tile UI above). */
            (() => {
            const isRentCard =
              activeCard.type === CardType.RentDual ||
              activeCard.type === CardType.RentWild;
            const isHouseHotel =
              activeCard.type === CardType.House ||
              activeCard.type === CardType.Hotel;
            const combinedMultiplier =
              rentMultiplier * Math.pow(2, selectedDtrCardIds.length);
            const rentByColor: Record<string, number> = {};
            if (isRentCard) {
              for (const c of availableColors) {
                rentByColor[c] = calculateRent(player, c) * combinedMultiplier;
              }
            }
            const maxRent = isRentCard
              ? Math.max(0, ...Object.values(rentByColor))
              : 0;
            const bestColor =
              isRentCard && maxRent > 0 &&
              Object.values(rentByColor).filter((v) => v === maxRent).length === 1
                ? Object.entries(rentByColor).find(([, v]) => v === maxRent)?.[0]
                : undefined;
            return (
          <div className="grid grid-cols-2 gap-2">
            {availableColors.map((color) => {
              const baseRent = isRentCard ? calculateRent(player, color) : null;
              const finalRent =
                baseRent !== null ? baseRent * combinedMultiplier : null;
              const isBest = isRentCard && color === bestColor;

              return (
                <button
                  key={color}
                  onClick={() => {
                    if (canPlayToProperty) {
                      markDispatchedAndClose();
                      onPlayToProperty(activeCard.id, color);
                      onClose();
                    } else {
                      handleSelectColor(color);
                    }
                  }}
                  className="rounded-lg flex flex-col items-center justify-center transition-transform hover:-translate-y-0.5"
                  style={{
                    position: "relative",
                    padding: "10px 12px",
                    background: `linear-gradient(180deg, ${PROPERTY_COLOR_HEX[color]} 0%, color-mix(in oklab, ${PROPERTY_COLOR_HEX[color]} 78%, #000) 100%)`,
                    color:
                      color === PC.Yellow ||
                      color === PC.LightBlue ||
                      color === PC.Utility
                        ? "#1c1a14"
                        : "#fff",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "none",
                    boxShadow: isBest
                      ? "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.18), 0 0 0 2px var(--accent, #f0c14a), 0 4px 12px -2px rgba(0,0,0,0.5)"
                      : "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.5), 0 4px 8px -2px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                  }}
                >
                  {isBest && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "var(--accent, #f0c14a)",
                        color: "#1a1208",
                        fontFamily: "var(--font-mono)",
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                      }}
                    >
                      {t.common.best}
                    </span>
                  )}
                  <span>
                    {getPropertyColorLabel(t, color, useSocialistTheme)}
                  </span>
                  {finalRent !== null && (
                    <span className="text-xs mt-1 opacity-90">
                      ${finalRent}M {useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()}
                      {combinedMultiplier > 1 && baseRent !== null && (
                        <span className="ml-1 text-yellow-300">
                          (${baseRent}M × {combinedMultiplier})
                        </span>
                      )}
                    </span>
                  )}
                  {isHouseHotel && (() => {
                    const currentRent = calculateRent(player, color);
                    const bonus = activeCard.type === CardType.House ? 3 : 4;
                    return (
                      <span className="text-xs mt-1 opacity-90">
                        ${currentRent}M → ${currentRent + bonus}M {useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()}
                      </span>
                    );
                  })()}
                </button>
              );
            })}
            {/* Property-wildcard "I'll decide later" button used to live
                here, but the new tile UI above already handles
                multi-color wildcards (with their own rainbow button).
                This branch only renders for non-wildcard cards now,
                so the dead PropertyWildcard check has been removed. */}
          </div>
            );
          })()}
        </div>
      )}

      {step === "selectTarget" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {useSocialistTheme ? `Select a ${t.socialist.player}:` : `${t.game.selectPlayer}:`}
          </p>
          <p
            style={{
              color: "rgba(245,234,208,0.5)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t.cardActions.eachRowShows}
          </p>
          <div className="space-y-2">
            {(() => {
              let validOpponents = opponents;
              if (activeCard.type === CardType.DealBreaker) {
                validOpponents = opponents.filter(opp => opp.properties.some(isSetComplete));
              } else if (activeCard.type === CardType.SlyDeal || activeCard.type === CardType.ForceDeal) {
                validOpponents = opponents.filter(opp => opp.properties.some(s => !isSetComplete(s) && s.cards.length > 0));
              }

              return validOpponents.map((opp) => {
                const bankTotal = opp.bank.reduce((s, c) => s + c.value, 0);
                const handCount = opp.hand?.length ?? 0;
                // Group complete sets by color so we can render colored
                // pip indicators alongside the count.
                const completeSets = opp.properties.filter(isSetComplete);
                // Partial sets (anything with 1+ card that isn't complete)
                // — useful for Sly/Force Deal targets too.
                const partialSets = opp.properties.filter(
                  (s) => !isSetComplete(s) && s.cards.length > 0,
                );
                return (
                  <button
                    key={opp.id}
                    onClick={() => handleSelectTarget(opp)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background:
                        "linear-gradient(180deg, rgba(28,22,20,0.85) 0%, rgba(16,10,8,0.92) 100%)",
                      color: "#f5ead0",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      textAlign: "left",
                      boxShadow: "var(--sh-object)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 14,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {opp.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "#7adb88",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                        }}
                      >
                        ${bankTotal}M
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "rgba(245,234,208,0.6)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <span>
                        {handCount} card{handCount === 1 ? "" : "s"}
                      </span>
                      <span style={{ color: "rgba(245,234,208,0.25)" }}>·</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "var(--accent, #f0c14a)" }}>
                          {completeSets.length} complete
                        </span>
                        {completeSets.length > 0 && (
                          <span style={{ display: "inline-flex", gap: 2 }}>
                            {completeSets.map((s, i) => (
                              <span
                                key={i}
                                title={s.color}
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 1,
                                  background:
                                    PROPERTY_COLOR_HEX[s.color] ?? "#888",
                                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                                }}
                              />
                            ))}
                          </span>
                        )}
                      </span>
                      {partialSets.length > 0 && (
                        <>
                          <span style={{ color: "rgba(245,234,208,0.25)" }}>
                            ·
                          </span>
                          <span
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <span style={{ color: "rgba(245,234,208,0.5)" }}>
                              {partialSets.length} partial
                            </span>
                            <span style={{ display: "inline-flex", gap: 2 }}>
                              {partialSets.map((s, i) => (
                                <span
                                  key={i}
                                  title={`${s.color} ${s.cards.length}`}
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 1,
                                    background:
                                      PROPERTY_COLOR_HEX[s.color] ?? "#888",
                                    opacity: 0.55,
                                    boxShadow:
                                      "inset 0 1px 0 rgba(255,255,255,0.2)",
                                  }}
                                />
                              ))}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {step === "selectTargetCard" && selectedTarget && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {t.game.selectProperty} from {selectedTarget.name}:
          </p>
          <p
            style={{
              color: "rgba(245,234,208,0.5)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t.cardActions.eachCardShows}
          </p>
          <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto p-2 justify-center">
            {selectedTarget.properties
              .filter((s) => !isSetComplete(s))
              .flatMap((s) => s.cards)
              .map((c) => (
                <CardWithSetStats
                  key={c.id}
                  card={c}
                  player={selectedTarget}
                  useSocialistTheme={useSocialistTheme}
                  onClick={() => handleSelectTargetCard(c.id)}
                />
              ))}
          </div>
        </div>
      )}

      {step === "selectMyCard" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {t.game.selectYourProperty}:
          </p>
          <p
            style={{
              color: "rgba(245,234,208,0.5)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {t.cardActions.pickWhatHurtsLeast}
          </p>
          <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto p-2 justify-center">
            {player.properties
              .filter((s) => !isSetComplete(s))
              .flatMap((s) => s.cards)
              .map((c) => (
                <CardWithSetStats
                  key={c.id}
                  card={c}
                  player={player}
                  useSocialistTheme={useSocialistTheme}
                  onClick={() => handleSelectMyCard(c.id)}
                />
              ))}
          </div>
        </div>
      )}

      {step === "forceDealSwap" && (
        <ForceDealSwapStep
          activeCard={activeCard}
          opponents={opponents}
          player={player}
          selectedTarget={selectedTarget}
          selectedTargetCard={selectedTargetCard}
          selectedMyCard={selectedMyCard}
          onSelectTarget={(t) => {
            // Switching target invalidates any previously-selected
            // target card (different player's hand).
            setSelectedTarget(t);
            setSelectedTargetCard(null);
          }}
          onSelectTargetCard={(id) => setSelectedTargetCard(id)}
          onSelectMyCard={(id) => setSelectedMyCard(id)}
          onConfirm={() => {
            if (!selectedTarget || !selectedTargetCard || !selectedMyCard)
              return;
            markDispatchedAndClose();
            onPlayAction({
              action: "forceDeal",
              cardId: activeCard.id,
              myCardId: selectedMyCard,
              targetPlayerId: selectedTarget.id,
              targetCardId: selectedTargetCard,
            });
            onClose();
          }}
        />
      )}

      {step === "selectRentCards" && (
        <div className="flex flex-col items-center space-y-4 px-4 w-full">
          <div className="w-full text-left">
            <h3 className="text-lg font-semibold text-white mb-2">
              {useSocialistTheme ? t.socialist.collectLevyTitle : t.cardActions.playRentCards}
            </h3>
            
            {useSocialistTheme && (
              <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-2 text-sm italic text-yellow-200/80 mb-4">
                "{t.socialist.levyFlavor}"
              </div>
            )}
            
            <p className="text-gray-300 text-sm">
              {fmt(t.cardActions.rentIntro, {
                rent: useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase(),
                n: 3 - cardsPlayed,
              })}
            </p>
          </div>

          <div className="w-full bg-[#1A1A24] rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center">
            {selectedRentCardId ? (() => {
                const multiplier = Math.pow(2, selectedDtrCardIds.length);
                let baseRent = 0;
                let isExactBase = false;
                
                const rCard = player.hand?.find(c => c.id === selectedRentCardId);
                if (rCard) {
                   const colors = rCard.type === CardType.RentDual ? (rCard.colors || []) : 
                                  rCard.type === CardType.RentWild ? Object.values(PC).filter(c => c !== PC.Unassigned) : [];
                   const validColors = colors.filter(c => player.properties.some(s => s.color === c && s.cards.length > 0));
                   
                   if (validColors.length === 1) {
                     baseRent = calculateRent(player, validColors[0]);
                     isExactBase = true;
                   } else {
                     const rents = colors.map(c => calculateRent(player, c));
                     baseRent = Math.max(...rents, 0);
                     isExactBase = false;
                   }
                }
                
                if (baseRent === 0) {
                  return <div className="text-gray-400 italic text-sm py-4">No valid {useSocialistTheme ? t.socialist.properties : t.common.properties.toLowerCase()} to charge {useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()}</div>;
                }
                
                return (
                  <div className="flex items-center justify-center gap-3 w-full">
                    <div className="flex flex-col items-center bg-black/30 rounded-lg py-2 px-4 flex-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">{t.cardActions.base}</span>
                      <span className="text-sm font-bold text-white">
                        {!isExactBase && <span className="text-xs font-normal text-gray-400 mr-1">{t.cardActions.upTo}</span>}${baseRent}M
                      </span>
                    </div>
                    
                    <span className="text-lg text-gray-500 font-bold">×</span>
                    
                    <div className={`flex flex-col items-center rounded-lg py-2 px-4 flex-1 border ${selectedDtrCardIds.length > 0 ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-black/30 border-transparent'}`}>
                      <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${selectedDtrCardIds.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>{t.cardActions.multiplier}</span>
                      <span className={`text-sm font-bold ${selectedDtrCardIds.length > 0 ? 'text-yellow-400' : 'text-white'}`}>{multiplier}x</span>
                    </div>
                    
                    <span className="text-lg text-gray-500 font-bold">=</span>
                    
                    <div className={`flex flex-col items-center rounded-lg py-2 px-4 flex-1 border ${selectedDtrCardIds.length > 0 ? 'bg-green-500/20 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-black/30 border-transparent'}`}>
                      <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${selectedDtrCardIds.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>{t.cardActions.total}</span>
                      <span className={`text-base font-bold ${selectedDtrCardIds.length > 0 ? 'text-green-400' : 'text-white'}`}>
                        {!isExactBase && <span className="text-[10px] font-normal text-gray-400 mr-1">{t.cardActions.upTo}</span>}${baseRent * multiplier}M
                      </span>
                    </div>
                  </div>
                );
            })() : (
              <div className="text-gray-400 italic text-sm py-4">Select a {useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()} card to see total</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto p-2 justify-center w-full">
            {player.hand
              ?.filter(
                (c) =>
                  c.type === CardType.RentDual ||
                  c.type === CardType.RentWild ||
                  c.type === CardType.DoubleTheRent
              )
              .map((c) => {
                const isRentCard = c.type === CardType.RentDual || c.type === CardType.RentWild;
                const isSelected = isRentCard
                  ? selectedRentCardId === c.id
                  : selectedDtrCardIds.includes(c.id);

                return (
                  <GameCard
                    key={c.id}
                    card={c}
                    width={96}
                    selected={isSelected}
                    useSocialistTheme={useSocialistTheme}
                    onClick={() => {
                      if (isRentCard) {
                        if (selectedRentCardId === c.id) {
                          setSelectedRentCardId(null);
                        } else {
                          setSelectedRentCardId(c.id);
                        }
                      } else {
                        if (selectedDtrCardIds.includes(c.id)) {
                          setSelectedDtrCardIds(prev => prev.filter(id => id !== c.id));
                        } else {
                          setSelectedDtrCardIds(prev => [...prev, c.id]);
                        }
                      }
                    }}
                  />
                );
              })}
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={() => {
                const totalSelected = (selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length;
                if (totalSelected === 0) return;
                if (totalSelected > 3 - cardsPlayed) return;
                if (!selectedRentCardId && selectedDtrCardIds.length > 0) return;

                if (selectedRentCardId) {
                  proceedWithRentCard(selectedRentCardId);
                } else {
                  dispatchAll();
                }
              }}
              disabled={
                ((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) === 0 ||
                ((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) > 3 - cardsPlayed ||
                (!selectedRentCardId && selectedDtrCardIds.length > 0)
              }
              className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
                ((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) > 0 &&
                ((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) <= 3 - cardsPlayed &&
                (selectedRentCardId || selectedDtrCardIds.length === 0)
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {(!selectedRentCardId && selectedDtrCardIds.length > 0)
                ? `Select a ${useSocialistTheme ? t.socialist.rent : t.actions.rent} card`
                : t.game.playCard}
            </button>
            {(!selectedRentCardId && selectedDtrCardIds.length > 0) && (
              <p className="text-red-400 text-xs text-center">
                You must select a {useSocialistTheme ? t.socialist.rent : t.actions.rent.toLowerCase()} card to use a multiplier.
              </p>
            )}
            {((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) > 3 - cardsPlayed && (
              <p className="text-red-400 text-xs text-center">
                {fmt(t.cardActions.movesLeft, {
                  n: 3 - cardsPlayed,
                  moves: 3 - cardsPlayed === 1 ? t.common.move : t.common.moves,
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {step === "selectTargetSet" && selectedTarget && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {t.game.selectCompleteSet} from {selectedTarget.name}:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {selectedTarget.properties.filter(isSetComplete).map((set, i) => (
              <button
                key={`${set.color}-${i}`}
                onClick={() => handleSelectTargetSet(set.color)}
                className="py-2 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                style={{ backgroundColor: PROPERTY_COLOR_HEX[set.color] }}
              >
                {getPropertyColorLabel(t, set.color, useSocialistTheme)}
              </button>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

// ────────────────────────────────────────────────────────────────────
// ForceDealSwapStep — combined-prompt for the Force Deal action.
// User picks one of the target's cards (in a swipeable row of valid
// opponents) AND one of their own cards, then confirms. This used to
// be two separate steps which made comparison awkward; now both
// halves are visible at once so the player can weigh trades.
// ────────────────────────────────────────────────────────────────────

function ForceDealSwapStep({
  activeCard,
  opponents,
  player,
  selectedTarget,
  selectedTargetCard,
  selectedMyCard,
  onSelectTarget,
  onSelectTargetCard,
  onSelectMyCard,
  onConfirm,
}: {
  activeCard: Card;
  opponents: ClientPlayer[];
  player: ClientPlayer;
  selectedTarget: ClientPlayer | null;
  selectedTargetCard: string | null;
  selectedMyCard: string | null;
  onSelectTarget: (target: ClientPlayer) => void;
  onSelectTargetCard: (id: string) => void;
  onSelectMyCard: (id: string) => void;
  onConfirm: () => void;
}) {
  const useSocialistTheme = useGameStore((s) => s.useSocialistTheme);
  const { t } = useI18n();
  // activeCard is the Force Deal action card itself — referenced
  // mostly so this prop is "used"; the real card-pickers below pull
  // from the player/opponent property sets.
  void activeCard;
  const validOpponents = opponents.filter((opp) =>
    opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0),
  );
  const myCards = player.properties
    .filter((s) => !isSetComplete(s))
    .flatMap((s) => s.cards);

  const targetRowRef = useRef<HTMLDivElement | null>(null);
  // Two-way sync between the target swipe and selectedTarget.
  // Same pattern as the GameTableCompact opponent swipe — see comments
  // there. skipNextProgScroll suppresses one ScrollIntoView when the
  // active id changed because of a swipe (page is already in view).
  const skipNextProgScroll = useRef(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    const el = targetRowRef.current;
    if (!el || validOpponents.length <= 1) return;
    const onScroll = () => {
      if (debounce.current != null) window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        let closestId: string | null = null;
        let closestDist = Infinity;
        for (const child of Array.from(el.children) as HTMLElement[]) {
          const id = child.dataset.targetPageId;
          if (!id) continue;
          const r = child.getBoundingClientRect();
          const d = Math.abs(r.left + r.width / 2 - cx);
          if (d < closestDist) {
            closestDist = d;
            closestId = id;
          }
        }
        if (closestId && closestId !== selectedTarget?.id) {
          const opp = validOpponents.find((o) => o.id === closestId);
          if (opp) {
            skipNextProgScroll.current = true;
            onSelectTarget(opp);
          }
        }
      }, 90);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (debounce.current != null) window.clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTarget?.id, validOpponents.length]);

  useEffect(() => {
    if (skipNextProgScroll.current) {
      skipNextProgScroll.current = false;
      return;
    }
    const el = targetRowRef.current;
    if (!el || !selectedTarget) return;
    const target = el.querySelector(
      `[data-target-page-id="${selectedTarget.id}"]`,
    ) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedTarget?.id]);

  const canConfirm =
    !!selectedTarget && !!selectedTargetCard && !!selectedMyCard;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p
        style={{
          color: "rgba(245,234,208,0.7)",
          fontSize: 13,
          margin: 0,
        }}
      >
        Pick a card to take and a card to give. Stats show each set's
        current rent so you can compare directly.
      </p>

      {/* ── Target tabs (multi-opponent only) ─────────────────── */}
      {validOpponents.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {validOpponents.map((opp) => {
            const active = selectedTarget?.id === opp.id;
            return (
              <button
                key={opp.id}
                onClick={() => onSelectTarget(opp)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: active
                    ? "var(--accent, #f0c14a)"
                    : "rgba(255,255,255,0.06)",
                  color: active ? "#1a1208" : "rgba(245,234,208,0.7)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 700 : 500,
                  boxShadow: active
                    ? "inset 0 1px 0 rgba(255,255,255,0.4)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                {opp.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── TAKE half: swipeable row of opponent card grids ───── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "rgba(245,234,208,0.55)",
              textTransform: "uppercase",
            }}
          >
            Take from {selectedTarget?.name ?? "—"}
          </div>
          {validOpponents.length > 1 && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "rgba(245,234,208,0.35)",
                textTransform: "uppercase",
              }}
            >
              ← swipe →
            </div>
          )}
        </div>
        <div
          ref={targetRowRef}
          style={{
            display: "flex",
            overflowX: validOpponents.length > 1 ? "auto" : "visible",
            scrollSnapType:
              validOpponents.length > 1 ? "x mandatory" : "none",
            gap: 0,
            // Padding so card shadows + selection rings don't get clipped
            // at the snap boundary.
            padding: "4px 0 8px",
          }}
          className="scrollbar-hide"
        >
          {validOpponents.map((opp) => {
            const stealable = opp.properties
              .filter((s) => !isSetComplete(s))
              .flatMap((s) => s.cards);
            return (
              <div
                key={opp.id}
                data-target-page-id={opp.id}
                style={{
                  flex: "0 0 100%",
                  width: "100%",
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                }}
              >
                <div
                  className="flex flex-wrap gap-2 max-h-[28vh] overflow-y-auto p-2 justify-center"
                >
                  {stealable.map((c) => (
                    <CardWithSetStats
                      key={c.id}
                      card={c}
                      player={opp}
                      selected={
                        selectedTarget?.id === opp.id &&
                        selectedTargetCard === c.id
                      }
                      useSocialistTheme={useSocialistTheme}
                      onClick={() => {
                        if (selectedTarget?.id !== opp.id) {
                          onSelectTarget(opp);
                        }
                        onSelectTargetCard(c.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GIVE half: your cards ─────────────────────────────── */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "rgba(245,234,208,0.55)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {t.cardActions.giveFromYourSets}
        </div>
        <div className="flex flex-wrap gap-2 max-h-[28vh] overflow-y-auto p-2 justify-center">
          {myCards.map((c) => (
            <CardWithSetStats
              key={c.id}
              card={c}
              player={player}
              selected={selectedMyCard === c.id}
              useSocialistTheme={useSocialistTheme}
              onClick={() => onSelectMyCard(c.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Confirm ───────────────────────────────────────────── */}
      <PrimaryButton
        onClick={onConfirm}
        disabled={!canConfirm}
        fullWidth
        size="md"
      >
        {t.prompts.accept}
      </PrimaryButton>
    </div>
  );
}
