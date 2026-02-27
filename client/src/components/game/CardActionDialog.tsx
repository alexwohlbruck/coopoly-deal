import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Card,
  type ClientPlayer,
  type PropertyColor,
  CardType,
  PropertyColor as PC,
  PROPERTY_COLOR_LABEL,
  PROPERTY_COLOR_HEX,
  isSetComplete,
} from "../../types/game";
import { GameCard } from "../cards/GameCard";
import { calculateRent } from "../../utils/rent-calculator";
import { BottomSheet } from "../common/BottomSheet";

interface CardActionDialogProps {
  card: Card;
  player: ClientPlayer;
  opponents: ClientPlayer[];
  rentMultiplier?: number;
  onClose: () => void;
  onPlayToProperty: (cardId: string, color: PropertyColor, groupWithUnassigned?: boolean, createNewSet?: boolean) => void;
  onPlayAction: (payload: Record<string, unknown>) => void;
}

export function CardActionDialog({
  card,
  player,
  opponents,
  rentMultiplier = 1,
  onClose,
  onPlayToProperty,
  onPlayAction,
}: CardActionDialogProps) {
  console.log('[CardActionDialog] Component rendered', {
    cardType: card.type,
    cardId: card.id
  });
  
  const [step, setStep] = useState<"choose" | "selectColor" | "selectTarget" | "selectTargetCard" | "selectMyCard" | "selectTargetSet">("choose");
  const [selectedColor, setSelectedColor] = useState<PropertyColor | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ClientPlayer | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [actionDispatched, setActionDispatched] = useState(false);
  const closedRef = useRef(false);
  const lastCardIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    console.log('[CardActionDialog] Component mounted for card', card.id);
    // Only reset flags when the card ID changes (new card selected)
    // Do NOT reset on remount of the same card
    if (lastCardIdRef.current !== card.id) {
      console.log('[CardActionDialog] New card detected, resetting flags');
      closedRef.current = false;
      setActionDispatched(false);
      lastCardIdRef.current = card.id;
    } else {
      console.log('[CardActionDialog] Remount of same card detected, keeping closedRef:', closedRef.current);
    }
    
    return () => {
      console.log('[CardActionDialog] Component unmounting for card', card.id);
    };
  }, [card.id]);

  const canPlayToProperty = card.type === CardType.Property || card.type === CardType.PropertyWildcard;

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
    console.log('[CardActionDialog] markDispatchedAndClose called');
    setActionDispatched(true);
    closedRef.current = true;
  }, []);

  const canUseAction = (() => {
    if (card.type === CardType.House) {
      return player.properties.some((s) => isSetComplete(s) && s.color !== PC.Railroad && s.color !== PC.Utility && !s.house);
    }
    if (card.type === CardType.Hotel) {
      return player.properties.some((s) => isSetComplete(s) && s.color !== PC.Railroad && s.color !== PC.Utility && s.house && !s.hotel);
    }
    if (card.type === CardType.DealBreaker) {
      return opponents.some((opp) => opp.properties.some((s) => isSetComplete(s)));
    }
    if (card.type === CardType.SlyDeal) {
      return opponents.some((opp) => opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0));
    }
    if (card.type === CardType.ForceDeal) {
      const hasMyCards = player.properties.some((s) => !isSetComplete(s) && s.cards.length > 0);
      const hasTheirCards = opponents.some((opp) => opp.properties.some((s) => !isSetComplete(s) && s.cards.length > 0));
      return hasMyCards && hasTheirCards;
    }
    if (card.type === CardType.RentDual) {
      return card.colors?.some((c) => player.properties.some((s) => s.color === c && s.cards.length > 0)) ?? false;
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
    console.log('[CardActionDialog] handlePlayAction called', {
      cardType: card.type,
      cardId: card.id,
      actionDispatched,
      closedRef: closedRef.current,
      step
    });
    
    // CRITICAL: Check closedRef FIRST to prevent remount from re-executing
    if (closedRef.current) {
      console.log('[CardActionDialog] Dialog already closed (remount detected), returning');
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
      console.log('[CardActionDialog] Dispatching simple action', actionPayload);
      markDispatchedAndClose();
      onPlayAction(actionPayload);
      onClose();
      console.log('[CardActionDialog] Action dispatched');
      return;
    }

    switch (card.type) {
      case CardType.DebtCollector:
        if (opponents.length === 1) {
          markDispatchedAndClose();
          onPlayAction({ action: "debtCollector", cardId: card.id, targetPlayerId: opponents[0].id });
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
        const validColors = colors.filter(c => player.properties.some(s => s.color === c && s.cards.length > 0));
        if (validColors.length === 1) {
          markDispatchedAndClose();
          onPlayAction({ action: "rentDual", cardId: card.id, color: validColors[0] });
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
        const sets = player.properties.filter((s) => isSetComplete(s) && s.color !== PC.Railroad && s.color !== PC.Utility);
        const validSets = card.type === CardType.House
          ? sets.filter(s => !s.house)
          : sets.filter(s => s.house && !s.hotel);
        if (validSets.length === 1) {
          const action = card.type === CardType.House ? "house" : "hotel";
          markDispatchedAndClose();
          onPlayAction({ action, cardId: card.id, setColor: validSets[0].color });
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
      markDispatchedAndClose();
      onPlayAction({ action: "rentDual", cardId: card.id, color });
      onClose();
    } else if (card.type === CardType.RentWild) {
      if (opponents.length === 1) {
        markDispatchedAndClose();
        onPlayAction({ action: "rentWild", cardId: card.id, color, targetPlayerId: opponents[0].id });
        onClose();
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
      onPlayAction({ action: "debtCollector", cardId: card.id, targetPlayerId: target.id });
      onClose();
    } else if (card.type === CardType.RentWild && selectedColor) {
      markDispatchedAndClose();
      onPlayAction({ action: "rentWild", cardId: card.id, color: selectedColor, targetPlayerId: target.id });
      onClose();
    } else if (card.type === CardType.SlyDeal) {
      const stealable = target.properties.filter((s) => !isSetComplete(s)).flatMap((s) => s.cards);
      if (stealable.length === 1) {
        markDispatchedAndClose();
        onPlayAction({ action: "slyDeal", cardId: card.id, targetPlayerId: target.id, targetCardId: stealable[0].id });
        onClose();
        return;
      }
      setStep("selectTargetCard");
    } else if (card.type === CardType.ForceDeal) {
      const stealable = target.properties.filter((s) => !isSetComplete(s)).flatMap((s) => s.cards);
      if (stealable.length === 1) {
        setSelectedTargetCard(stealable[0].id);
        const myCards = player.properties.filter((s) => !isSetComplete(s)).flatMap((s) => s.cards);
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
        onPlayAction({ action: "dealBreaker", cardId: card.id, targetPlayerId: target.id, targetSetColor: completeSets[0].color });
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
      onPlayAction({ action: "slyDeal", cardId: card.id, targetPlayerId: selectedTarget.id, targetCardId: cardId });
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
      onPlayAction({ action: "dealBreaker", cardId: card.id, targetPlayerId: selectedTarget.id, targetSetColor: color });
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

  const isMultiWildcard = card.type === CardType.PropertyWildcard && (card.colors?.length ?? 0) > 2;

  const availableColors =
    card.type === CardType.RentDual
      ? (card.colors ?? []).filter(c => c !== PC.Unassigned && player.properties.some(s => s.color === c && s.cards.length > 0))
      : card.type === CardType.RentWild
        ? Object.values(PC).filter(c => c !== PC.Unassigned && player.properties.some(s => s.color === c && s.cards.length > 0))
        : card.type === CardType.House
          ? player.properties.filter((s) => isSetComplete(s) && s.color !== PC.Railroad && s.color !== PC.Utility && !s.house).map((s) => s.color)
          : card.type === CardType.Hotel
            ? player.properties.filter((s) => isSetComplete(s) && s.color !== PC.Railroad && s.color !== PC.Utility && s.house && !s.hotel).map((s) => s.color)
            : isMultiWildcard
              ? (card.colors ?? []).filter(c => c !== PC.Unassigned && player.properties.some(s => s.color === c && s.cards.length > 0))
              : (card.colors ?? []).filter(c => c !== PC.Unassigned);

  useEffect(() => {
    console.log('[CardActionDialog] useEffect triggered', {
      autoTriggered,
      step,
      cardType: card.type,
      canPlayToProperty,
      isActionCard,
      actionDispatched
    });
    
    if (autoTriggered) {
      console.log('[CardActionDialog] Already auto-triggered, skipping');
      return;
    }
    if (step !== "choose") {
      console.log('[CardActionDialog] Not in choose step, skipping');
      return;
    }

    const actionCount = [canPlayToProperty, isActionCard && !canPlayToProperty].filter(Boolean).length;
    
    console.log('[CardActionDialog] Action count:', actionCount);
    
    if (actionCount === 1) {
      setAutoTriggered(true);
      if (canPlayToProperty && !isActionCard) {
        console.log('[CardActionDialog] Auto-triggering property play');
        handlePlayToProperty();
      } else if (isActionCard && !canPlayToProperty) {
        console.log('[CardActionDialog] Auto-triggering action play');
        handlePlayAction();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const footerButtons = step === "choose" ? (
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
          className={`w-full py-3 ${canUseAction ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 cursor-not-allowed'} text-white font-semibold rounded-lg transition-colors`}
        >
          Use Action
        </button>
      )}
    </div>
  ) : null;

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title="Play Card"
      height="h-96"
      footer={footerButtons}
    >
      <div className="flex justify-center mb-3">
        <GameCard card={card} />
      </div>

      {step === "choose" && (
        <p className="text-gray-400 text-xs text-center">
          💡 Drag cards to your bank to add them
        </p>
      )}

          {step === "selectColor" && (
            <div>
              <p className="text-gray-300 text-sm mb-2">
                {(card.type === CardType.RentDual || card.type === CardType.RentWild) ? "Select a color to charge rent:" : "Select a color:"}
              </p>
              {rentMultiplier > 1 && (card.type === CardType.RentDual || card.type === CardType.RentWild) && (
                <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 text-xs font-semibold text-center">
                    🎯 Rent will be {rentMultiplier}x (Doubled!)
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {availableColors.map((color) => {
                  const baseRent = (card.type === CardType.RentDual || card.type === CardType.RentWild) 
                    ? calculateRent(player, color) 
                    : null;
                  const finalRent = baseRent !== null ? baseRent * rentMultiplier : null;
                  
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
                      <span>{PROPERTY_COLOR_LABEL[color]}</span>
                      {finalRent !== null && (
                        <span className="text-xs mt-1 opacity-90">
                          ${finalRent}M rent
                          {rentMultiplier > 1 && baseRent !== null && (
                            <span className="ml-1 text-yellow-300">(${baseRent}M × {rentMultiplier})</span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
                {canPlayToProperty && card.type === CardType.PropertyWildcard && card.colors && card.colors.length > 2 && (
                  <button
                    onClick={() => {
                      markDispatchedAndClose();
                      onPlayToProperty(card.id, PC.Unassigned);
                      onClose();
                    }}
                    className="py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-80 flex flex-col items-center justify-center col-span-2 border-2 border-dashed border-gray-500"
                    style={{ backgroundColor: "#8B5CF6" }}
                  >
                    Play as Rainbow Set
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "selectTarget" && (
            <div>
              <p className="text-gray-300 text-sm mb-2">Select a player:</p>
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
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {selectedTarget.properties
                  .filter((s) => !isSetComplete(s))
                  .flatMap((s) => s.cards)
                  .map((c) => (
                    <GameCard key={c.id} card={c} small onClick={() => handleSelectTargetCard(c.id)} />
                  ))}
              </div>
            </div>
          )}

          {step === "selectMyCard" && (
            <div>
              <p className="text-gray-300 text-sm mb-2">
                Select your property to swap:
              </p>
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {player.properties
                  .filter((s) => !isSetComplete(s))
                  .flatMap((s) => s.cards)
                  .map((c) => (
                    <GameCard key={c.id} card={c} small onClick={() => handleSelectMyCard(c.id)} />
                  ))}
              </div>
            </div>
          )}

          {step === "selectTargetSet" && selectedTarget && (
            <div>
              <p className="text-gray-300 text-sm mb-2">
                Select a complete set from {selectedTarget.name}:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {selectedTarget.properties
                  .filter(isSetComplete)
                  .map((set, i) => (
                    <button
                      key={`${set.color}-${i}`}
                      onClick={() => handleSelectTargetSet(set.color)}
                      className="py-2 rounded-lg text-white font-semibold text-sm hover:opacity-80"
                      style={{ backgroundColor: PROPERTY_COLOR_HEX[set.color] }}
                    >
                      {PROPERTY_COLOR_LABEL[set.color]}
                    </button>
                  ))}
              </div>
            </div>
          )}

    </BottomSheet>
  );
}
