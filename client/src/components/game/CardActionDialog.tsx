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
    | "selectRentCards"
    | "selectColor"
    | "selectTarget"
    | "selectTargetCard"
    | "selectMyCard"
    | "selectTargetSet"
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
          s.house &&
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
            : sets.filter((s) => s.house && !s.hotel);
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
            cardId: activeCard.id,
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
                    s.house &&
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
      {step !== "selectRentCards" && (
        <div className="flex justify-center mb-3">
          <GameCard card={activeCard} useSocialistTheme={settings.useSocialistTheme} />
        </div>
      )}

      {step === "choose" && (
        <p className="text-gray-400 text-xs text-center">
          💡 Drag cards to your bank to add them
        </p>
      )}

      {step === "selectColor" && (
        <div>
          <p className="text-gray-300 text-sm mb-2">
            {activeCard.type === CardType.RentDual || activeCard.type === CardType.RentWild
              ? settings.useSocialistTheme ? "Select a color to charge levy:" : "Select a color to charge rent:"
              : "Select a color:"}
          </p>
          {(rentMultiplier > 1 || selectedDtrCardIds.length > 0) &&
            (activeCard.type === CardType.RentDual ||
              activeCard.type === CardType.RentWild) && (
              <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300 text-xs font-semibold text-center">
                  🎯 {settings.useSocialistTheme ? "Levy" : "Rent"} will be {rentMultiplier * Math.pow(2, selectedDtrCardIds.length)}x (Doubled!)
                </p>
              </div>
            )}
          <div className="grid grid-cols-2 gap-2">
            {availableColors.map((color) => {
              const baseRent =
                activeCard.type === CardType.RentDual ||
                activeCard.type === CardType.RentWild
                  ? calculateRent(player, color)
                  : null;
              const combinedMultiplier = rentMultiplier * Math.pow(2, selectedDtrCardIds.length);
              const finalRent =
                baseRent !== null ? baseRent * combinedMultiplier : null;

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
                  className="py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80 flex flex-col items-center justify-center"
                  style={{ backgroundColor: PROPERTY_COLOR_HEX[color] }}
                >
                  <span>
                    {getPropertyColorLabel(color, settings.useSocialistTheme)}
                  </span>
                  {finalRent !== null && (
                    <span className="text-xs mt-1 opacity-90">
                      ${finalRent}M {settings.useSocialistTheme ? "levy" : "rent"}
                      {combinedMultiplier > 1 && baseRent !== null && (
                        <span className="ml-1 text-yellow-300">
                          (${baseRent}M × {combinedMultiplier})
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
            {canPlayToProperty &&
              !settings.wildcardFlipCountsAsMove &&
              activeCard.type === CardType.PropertyWildcard &&
              activeCard.colors &&
              activeCard.colors.length > 2 && (
                <button
                  onClick={() => {
                    markDispatchedAndClose();
                    onPlayToProperty(activeCard.id, PC.Unassigned);
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
            {(() => {
              let validOpponents = opponents;
              if (activeCard.type === CardType.DealBreaker) {
                validOpponents = opponents.filter(opp => opp.properties.some(isSetComplete));
              } else if (activeCard.type === CardType.SlyDeal || activeCard.type === CardType.ForceDeal) {
                validOpponents = opponents.filter(opp => opp.properties.some(s => !isSetComplete(s) && s.cards.length > 0));
              }
              
              return validOpponents.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => handleSelectTarget(opp)}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm text-left px-4"
                >
                  {opp.name}
                </button>
              ));
            })()}
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

      {step === "selectRentCards" && (
        <div className="flex flex-col items-center space-y-4 px-4 w-full">
          <div className="w-full text-left">
            <h3 className="text-lg font-semibold text-white mb-2">
              {settings.useSocialistTheme ? "Collect the Mandatory State Levy" : "Play Rent Cards"}
            </h3>
            
            {settings.useSocialistTheme && (
              <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-2 text-sm italic text-yellow-200/80 mb-4">
                "The state demands its fair share. Combine directives to maximize your expropriation."
              </div>
            )}
            
            <p className="text-gray-300 text-sm">
              Select a {settings.useSocialistTheme ? "levy" : "rent"} card and any multipliers you wish to use. You can play up to {3 - cardsPlayed} cards total.
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
                  return <div className="text-gray-400 italic text-sm py-4">No valid properties to charge {settings.useSocialistTheme ? "levy" : "rent"}</div>;
                }
                
                return (
                  <div className="flex items-center justify-center gap-3 w-full">
                    <div className="flex flex-col items-center bg-black/30 rounded-lg py-2 px-4 flex-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Base</span>
                      <span className="text-sm font-bold text-white">
                        {!isExactBase && <span className="text-xs font-normal text-gray-400 mr-1">Up to</span>}${baseRent}M
                      </span>
                    </div>
                    
                    <span className="text-lg text-gray-500 font-bold">×</span>
                    
                    <div className={`flex flex-col items-center rounded-lg py-2 px-4 flex-1 border ${selectedDtrCardIds.length > 0 ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-black/30 border-transparent'}`}>
                      <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${selectedDtrCardIds.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>Multiplier</span>
                      <span className={`text-sm font-bold ${selectedDtrCardIds.length > 0 ? 'text-yellow-400' : 'text-white'}`}>{multiplier}x</span>
                    </div>
                    
                    <span className="text-lg text-gray-500 font-bold">=</span>
                    
                    <div className={`flex flex-col items-center rounded-lg py-2 px-4 flex-1 border ${selectedDtrCardIds.length > 0 ? 'bg-green-500/20 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-black/30 border-transparent'}`}>
                      <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${selectedDtrCardIds.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>Total</span>
                      <span className={`text-base font-bold ${selectedDtrCardIds.length > 0 ? 'text-green-400' : 'text-white'}`}>
                        {!isExactBase && <span className="text-[10px] font-normal text-gray-400 mr-1">Up to</span>}${baseRent * multiplier}M
                      </span>
                    </div>
                  </div>
                );
            })() : (
              <div className="text-gray-400 italic text-sm py-4">Select a {settings.useSocialistTheme ? "levy" : "rent"} card to see total</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto py-2 justify-center w-full px-2">
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
                    small
                    selected={isSelected}
                    useSocialistTheme={settings.useSocialistTheme}
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
                ? (settings.useSocialistTheme ? "Select a Levy card" : "Select a Rent card")
                : "Play Selected Cards"}
            </button>
            {(!selectedRentCardId && selectedDtrCardIds.length > 0) && (
              <p className="text-red-400 text-xs text-center">
                You must select a {settings.useSocialistTheme ? "levy" : "rent"} card to use a multiplier.
              </p>
            )}
            {((selectedRentCardId ? 1 : 0) + selectedDtrCardIds.length) > 3 - cardsPlayed && (
              <p className="text-red-400 text-xs text-center">
                You only have {3 - cardsPlayed} {3 - cardsPlayed === 1 ? "move" : "moves"} left this turn.
              </p>
            )}
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
