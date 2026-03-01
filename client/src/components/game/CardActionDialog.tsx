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
  console.log("[CardActionDialog] Component rendered", {
    cardType: card.type,
    cardId: card.id,
  });

  const [step, setStep] = useState<
    | "choose"
    | "selectColor"
    | "selectTarget"
    | "selectTargetCard"
    | "selectMyCard"
    | "selectTargetSet"
    | "promptDoubleRent"
  >("choose");
  const [selectedColor, setSelectedColor] = useState<PropertyColor | null>(
    null,
  );
  const [selectedTarget, setSelectedTarget] = useState<ClientPlayer | null>(
    null,
  );
  const [pendingRentAction, setPendingRentAction] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(
    null,
  );
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [actionDispatched, setActionDispatched] = useState(false);
  const closedRef = useRef(false);
  const lastCardIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("[CardActionDialog] Component mounted for card", card.id);
    // Only reset flags when the card ID changes (new card selected)
    // Do NOT reset on remount of the same card
    if (lastCardIdRef.current !== card.id) {
      console.log("[CardActionDialog] New card detected, resetting flags");
      closedRef.current = false;
      setActionDispatched(false);
      lastCardIdRef.current = card.id;
    } else {
      console.log(
        "[CardActionDialog] Remount of same card detected, keeping closedRef:",
        closedRef.current,
      );
    }

    return () => {
      console.log("[CardActionDialog] Component unmounting for card", card.id);
    };
  }, [card.id]);

  const canPlayToProperty =
    card.type === CardType.Property || card.type === CardType.PropertyWildcard;

  const isActionCard =
    card.type === CardType.PassGo ||
    card.type === CardType.SlyDeal ||
    card.type === CardType.ForceDeal ||
    card.type === CardType.DealBreaker ||
    card.type === CardType.DebtCollector ||
    card.type === CardType.Birthday ||
    card.type === CardType.RentDual ||
    card.type === CardType.RentWild ||
    card.type === CardType.DoubleTheRent ||
    card.type === CardType.House ||
    card.type === CardType.Hotel;

  // Helper to mark as dispatched and close
  // NOTE: This should be called BEFORE onPlayAction to prevent remounts
  const markDispatchedAndClose = useCallback(() => {
    console.log("[CardActionDialog] markDispatchedAndClose called");
    setActionDispatched(true);
    closedRef.current = true;
  }, []);

  const canUseAction = (() => {
    if (card.type === CardType.House) {
      return player.properties.some(
        (s) =>
          isSetComplete(s) &&
          s.color !== PC.Railroad &&
          s.color !== PC.Utility &&
          !s.house,
      );
    }
    if (card.type === CardType.Hotel) {
      return player.properties.some(
        (s) =>
          isSetComplete(s) &&
          s.color !== PC.Railroad &&
          s.color !== PC.Utility &&
          s.house &&
          !s.hotel,
      );
    }
    if (card.type === CardType.DealBreaker) {
      return opponents.some((opp) =>
        opp.properties.some((s) => isSetComplete(s)),
      );
    }
    if (card.type === CardType.SlyDeal) {
      return opponents.some((opp) =>
        opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0),
      );
    }
    if (card.type === CardType.ForceDeal) {
      const hasMyCards = player.properties.some(
        (s) => !isSetComplete(s) && s.cards.length > 0,
      );
      const hasTheirCards = opponents.some((opp) =>
        opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0),
      );
      return hasMyCards && hasTheirCards;
    }
    if (card.type === CardType.RentDual) {
      return (
        card.colors?.some((c) =>
          player.properties.some((s) => s.color === c && s.cards.length > 0),
        ) ?? false
      );
    }
    if (card.type === CardType.RentWild) {
      return player.properties.some((s) => s.cards.length > 0);
    }
    if (card.type === CardType.DoubleTheRent) {
      return true;
    }
    return true;
  })();

  function handlePlayAction() {
    console.log("[CardActionDialog] handlePlayAction called", {
      cardType: card.type,
      cardId: card.id,
      actionDispatched,
      closedRef: closedRef.current,
      step,
    });

    // CRITICAL: Check closedRef FIRST to prevent remount from re-executing
    if (closedRef.current) {
      console.log(
        "[CardActionDialog] Dialog already closed (remount detected), returning",
      );
      return;
    }

    // Check for simple actions that dispatch immediately
    const actionPayload = (() => {
      switch (card.type) {
        case CardType.PassGo:
          return { action: "passGo", cardId: card.id };
        case CardType.Birthday:
          return { action: "birthday", cardId: card.id };
        case CardType.DoubleTheRent:
          return { action: "doubleTheRent", cardId: card.id };
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

    switch (card.type) {
      case CardType.DebtCollector:
        if (opponents.length === 1) {
          markDispatchedAndClose();
          onPlayAction({
            action: "debtCollector",
            cardId: card.id,
            targetPlayerId: opponents[0].id,
          });
          onClose();
          return;
        }
        setStep("selectTarget");
        return;
      case CardType.SlyDeal:
      case CardType.ForceDeal:
      case CardType.DealBreaker:
        if (opponents.length === 1) {
          handleSelectTarget(opponents[0]);
          return;
        }
        setStep("selectTarget");
        return;
      case CardType.RentDual: {
        const colors = card.colors ?? [];
        const validColors = colors.filter((c) =>
          player.properties.some((s) => s.color === c && s.cards.length > 0),
        );
        if (validColors.length === 1) {
          markDispatchedAndClose();
          onPlayAction({
            action: "rentDual",
            cardId: card.id,
            color: validColors[0],
          });
          onClose();
          return;
        }
        setStep("selectColor");
        return;
      }
      case CardType.RentWild:
        setStep("selectColor");
        return;
      case CardType.House:
      case CardType.Hotel: {
        const sets = player.properties.filter(
          (s) =>
            isSetComplete(s) &&
            s.color !== PC.Railroad &&
            s.color !== PC.Utility,
        );
        const validSets =
          card.type === CardType.House
            ? sets.filter((s) => !s.house)
            : sets.filter((s) => s.house && !s.hotel);
        if (validSets.length === 1) {
          const action = card.type === CardType.House ? "house" : "hotel";
          markDispatchedAndClose();
          onPlayAction({
            action,
            cardId: card.id,
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
    if (card.type === CardType.RentDual) {
      const doubleRentCard = player.hand?.find(
        (c) => c.type === CardType.DoubleTheRent,
      );
      const action = { action: "rentDual", cardId: card.id, color };

      if (doubleRentCard && rentMultiplier === 1 && cardsPlayed < 2) {
        setPendingRentAction(action);
        setStep("promptDoubleRent");
      } else {
        markDispatchedAndClose();
        onPlayAction(action);
        onClose();
      }
    } else if (card.type === CardType.RentWild) {
      if (opponents.length === 1) {
        const doubleRentCard = player.hand?.find(
          (c) => c.type === CardType.DoubleTheRent,
        );
        const action = {
          action: "rentWild",
          cardId: card.id,
          color,
          targetPlayerId: opponents[0].id,
        };

        if (doubleRentCard && rentMultiplier === 1 && cardsPlayed < 2) {
          setPendingRentAction(action);
          setStep("promptDoubleRent");
        } else {
          markDispatchedAndClose();
          onPlayAction(action);
          onClose();
        }
        return;
      }
      setStep("selectTarget");
    } else if (card.type === CardType.House) {
      markDispatchedAndClose();
      onPlayAction({ action: "house", cardId: card.id, setColor: color });
      onClose();
    } else if (card.type === CardType.Hotel) {
      markDispatchedAndClose();
      onPlayAction({ action: "hotel", cardId: card.id, setColor: color });
      onClose();
    }
  }

  function handleSelectTarget(target: ClientPlayer) {
    if (closedRef.current) return;

    setSelectedTarget(target);
    if (card.type === CardType.DebtCollector) {
      markDispatchedAndClose();
      onPlayAction({
        action: "debtCollector",
        cardId: card.id,
        targetPlayerId: target.id,
      });
      onClose();
    } else if (card.type === CardType.RentWild && selectedColor) {
      const doubleRentCard = player.hand?.find(
        (c) => c.type === CardType.DoubleTheRent,
      );
      const action = {
        action: "rentWild",
        cardId: card.id,
        color: selectedColor,
        targetPlayerId: target.id,
      };

      if (doubleRentCard && rentMultiplier === 1 && cardsPlayed < 2) {
        setPendingRentAction(action);
        setStep("promptDoubleRent");
      } else {
        markDispatchedAndClose();
        onPlayAction(action);
        onClose();
      }
    } else if (card.type === CardType.SlyDeal) {
      const stealable = target.properties
        .filter((s) => !isSetComplete(s))
        .flatMap((s) => s.cards);
      if (stealable.length === 1) {
        markDispatchedAndClose();
        onPlayAction({
          action: "slyDeal",
          cardId: card.id,
          targetPlayerId: target.id,
          targetCardId: stealable[0].id,
        });
        onClose();
        return;
      }
      setStep("selectTargetCard");
    } else if (card.type === CardType.ForceDeal) {
      const stealable = target.properties
        .filter((s) => !isSetComplete(s))
        .flatMap((s) => s.cards);
      if (stealable.length === 1) {
        setSelectedTargetCard(stealable[0].id);
        const myCards = player.properties
          .filter((s) => !isSetComplete(s))
          .flatMap((s) => s.cards);
        if (myCards.length === 1) {
          markDispatchedAndClose();
          onPlayAction({
            action: "forceDeal",
            cardId: card.id,
            myCardId: myCards[0].id,
            targetPlayerId: target.id,
            targetCardId: stealable[0].id,
          });
          onClose();
          return;
        }
        setStep("selectMyCard");
        return;
      }
      setStep("selectTargetCard");
    } else if (card.type === CardType.DealBreaker) {
      const completeSets = target.properties.filter(isSetComplete);
      if (completeSets.length === 1) {
        markDispatchedAndClose();
        onPlayAction({
          action: "dealBreaker",
          cardId: card.id,
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
    if (card.type === CardType.SlyDeal && selectedTarget) {
      markDispatchedAndClose();
      onPlayAction({
        action: "slyDeal",
        cardId: card.id,
        targetPlayerId: selectedTarget.id,
        targetCardId: cardId,
      });
      onClose();
    } else if (card.type === CardType.ForceDeal) {
      setStep("selectMyCard");
    }
  }

  function handleSelectMyCard(myCardId: string) {
    if (closedRef.current) return;
    if (selectedTarget && selectedTargetCard) {
      markDispatchedAndClose();
      onPlayAction({
        action: "forceDeal",
        cardId: card.id,
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
        cardId: card.id,
        targetPlayerId: selectedTarget.id,
        targetSetColor: color,
      });
      onClose();
    }
  }

  function handlePlayToProperty() {
    if (card.colors && card.colors.length === 1) {
      markDispatchedAndClose();
      onPlayToProperty(card.id, card.colors[0]);
      onClose();
    } else if (card.colors && card.colors.length >= 2) {
      setStep("selectColor");
    }
  }

  const isMultiWildcard =
    card.type === CardType.PropertyWildcard && (card.colors?.length ?? 0) > 2;

  const availableColors =
    card.type === CardType.RentDual
      ? (card.colors ?? []).filter(
          (c) =>
            c !== PC.Unassigned &&
            player.properties.some((s) => s.color === c && s.cards.length > 0),
        )
      : card.type === CardType.RentWild
        ? Object.values(PC).filter(
            (c) =>
              c !== PC.Unassigned &&
              player.properties.some(
                (s) => s.color === c && s.cards.length > 0,
              ),
          )
        : card.type === CardType.House
          ? player.properties
              .filter(
                (s) =>
                  isSetComplete(s) &&
                  s.color !== PC.Railroad &&
                  s.color !== PC.Utility &&
                  !s.house,
              )
              .map((s) => s.color)
          : card.type === CardType.Hotel
            ? player.properties
                .filter(
                  (s) =>
                    isSetComplete(s) &&
                    s.color !== PC.Railroad &&
                    s.color !== PC.Utility &&
                    s.house &&
                    !s.hotel,
                )
                .map((s) => s.color)
            : isMultiWildcard
              ? (() => {
                  const valid = (card.colors ?? []).filter(
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
                    : (card.colors ?? []).filter((c) => c !== PC.Unassigned);
                })()
              : (card.colors ?? []).filter((c) => c !== PC.Unassigned);

  useEffect(() => {
    console.log("[CardActionDialog] useEffect triggered", {
      autoTriggered,
      step,
      cardType: card.type,
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
      <div className="space-y-2">
        {canPlayToProperty && (
          <button
            onClick={handlePlayToProperty}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            Play as Property
          </button>
        )}
        {isActionCard && !canPlayToProperty && (
          <button
            onClick={handlePlayAction}
            disabled={!canUseAction}
            className={`w-full py-3 ${canUseAction ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-600 cursor-not-allowed"} text-white font-semibold rounded-lg transition-colors`}
          >
            {settings.useSocialistTheme ? "Use Directive" : "Use Action"}
          </button>
        )}
      </div>
    ) : null;

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title="Play Card"
      height="h-auto"
      footer={footerButtons}
      playSound={true}
    >
      <div className="flex justify-center mb-3">
        <GameCard card={card} useSocialistTheme={settings.useSocialistTheme} />
      </div>

      {step === "choose" && (
        <p className="text-gray-400 text-xs text-center">
          💡 Drag cards to your bank to add them
        </p>
      )}

      {step === "selectColor" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {card.type === CardType.RentDual || card.type === CardType.RentWild
              ? settings.useSocialistTheme ? "Select a color to charge levy:" : "Select a color to charge rent:"
              : "Select a color:"}
          </p>
          {rentMultiplier > 1 &&
            (card.type === CardType.RentDual ||
              card.type === CardType.RentWild) && (
              <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300 text-xs font-semibold text-center">
                  🎯 {settings.useSocialistTheme ? "Levy" : "Rent"} will be {rentMultiplier}x (Doubled!)
                </p>
              </div>
            )}
          <div className="grid grid-cols-2 gap-2">
            {availableColors.map((color) => {
              const baseRent =
                card.type === CardType.RentDual ||
                card.type === CardType.RentWild
                  ? calculateRent(player, color)
                  : null;
              const finalRent =
                baseRent !== null ? baseRent * rentMultiplier : null;

              return (
                <button
                  key={color}
                  onClick={() => {
                    if (canPlayToProperty) {
                      markDispatchedAndClose();
                      onPlayToProperty(card.id, color);
                      onClose();
                    } else {
                      handleSelectColor(color);
                    }
                  }}
                  className="py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80 flex flex-col items-center justify-center"
                  style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
                >
                  <span>
                    {getPropertyColorLabel(color, settings.useSocialistTheme)}
                  </span>
                  {finalRent !== null && (
                    <span className="text-xs mt-1 opacity-90">
                      ${finalRent}M {settings.useSocialistTheme ? "levy" : "rent"}
                      {rentMultiplier > 1 && baseRent !== null && (
                        <span className="ml-1 text-yellow-300">
                          (${baseRent}M × {rentMultiplier})
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
            {canPlayToProperty &&
              !settings.wildcardFlipCountsAsMove &&
              card.type === CardType.PropertyWildcard &&
              card.colors &&
              card.colors.length > 2 && (
                <button
                  onClick={() => {
                    markDispatchedAndClose();
                    onPlayToProperty(card.id, PC.Unassigned);
                    onClose();
                  }}
                  className="py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80 flex flex-col items-center justify-center col-span-2 border-2 border-white/20 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(to right, #8B4513, #87CEEB, #FF69B4, #FFA500, #FF0000, #FFFF00, #008000, #00008B, #000000, #A0D6B4)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                  }}
                >
                  I'll decide later
                </button>
              )}
          </div>
        </div>
      )}

      {step === "selectTarget" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">{settings.useSocialistTheme ? "Select a comrade:" : "Select a player:"}</p>
          <div className="space-y-2">
            {opponents.map((opp) => (
              <button
                key={opp.id}
                onClick={() => handleSelectTarget(opp)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm text-left px-4"
              >
                {opp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "selectTargetCard" && selectedTarget && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            Select a property from {selectedTarget.name}:
          </p>
          <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto pb-2 justify-center">
            {selectedTarget.properties
              .filter((s) => !isSetComplete(s))
              .flatMap((s) => s.cards)
              .map((c) => (
                <GameCard
                  key={c.id}
                  card={c}
                  small
                  useSocialistTheme={settings.useSocialistTheme}
                  onClick={() => handleSelectTargetCard(c.id)}
                />
              ))}
          </div>
        </div>
      )}

      {step === "selectMyCard" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            Select your property to swap:
          </p>
          <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto pb-2 justify-center">
            {player.properties
              .filter((s) => !isSetComplete(s))
              .flatMap((s) => s.cards)
              .map((c) => (
                <GameCard
                  key={c.id}
                  card={c}
                  small
                  useSocialistTheme={settings.useSocialistTheme}
                  onClick={() => handleSelectMyCard(c.id)}
                />
              ))}
          </div>
        </div>
      )}

      {step === "promptDoubleRent" && pendingRentAction && (
        <div className="flex flex-col items-center text-center space-y-4 px-4">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg mb-2">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-xl font-bold text-white">{settings.useSocialistTheme ? "Double the Levy?" : "Double the Rent?"}</h3>
          <p className="text-gray-300 text-sm">
            You have a {settings.useSocialistTheme ? "Double the Levy" : "Double the Rent"} card in your hand. Would you like to play
            it first?
          </p>
          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={() => {
                const doubleRentCard = player.hand?.find(
                  (c) => c.type === CardType.DoubleTheRent,
                );
                if (doubleRentCard) {
                  markDispatchedAndClose();
                  onPlayAction({
                    action: "doubleTheRent",
                    cardId: doubleRentCard.id,
                  });
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
            >
              Yes, Double It!
            </button>
            <button
              onClick={() => {
                markDispatchedAndClose();
                onPlayAction(pendingRentAction);
                onClose();
              }}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
            >
              {settings.useSocialistTheme ? "No, Just Play Levy" : "No, Just Play Rent"}
            </button>
          </div>
        </div>
      )}

      {step === "selectTargetSet" && selectedTarget && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            Select a complete set from {selectedTarget.name}:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {selectedTarget.properties.filter(isSetComplete).map((set, i) => (
              <button
                key={`${set.color}-${i}`}
                onClick={() => handleSelectTargetSet(set.color)}
                className="py-2 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                style={{ backgroundColor: PROPERTY_COLOR_HEX[set.color] }}
              >
                {getPropertyColorLabel(set.color, settings.useSocialistTheme)}
              </button>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
