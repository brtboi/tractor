import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardHand from "./CardHand";
import SeatPlate from "./SeatPlate";
import { CARD_HEIGHT, CARD_SCALE, CARD_WIDTH } from "./GamePageHelpers";
import { useBoardCardSize, useViewportWidth } from "./useViewport";
import styles from "./GamePage.module.scss";

export type ActionDescriptor = {
  id: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type Props = {
  name: string;
  team: number;
  isMyTurn: boolean;
  cards: Card[];
  selectedCards: Card[];
  highlightedCards: Card[];
  onCardClick: (card: Card) => void;
  sortEnabled: boolean;
  onToggleSort: () => void;
  // only shown while drawing
  autoDraw: { enabled: boolean; onToggle: () => void } | null;
  actions: ActionDescriptor[];
  // enter triggers the primary action
  enterKeyEnabled: boolean;
  hint: string | null;
};

// px of each card showing, as a fraction of the card's width
const MAX_VISIBLE = 0.4;
const MIN_VISIBLE = 0.2; // enough to still read the corner index

export default function ActionBar({
  name,
  team,
  isMyTurn,
  cards,
  selectedCards,
  highlightedCards,
  onCardClick,
  sortEnabled,
  onToggleSort,
  autoDraw,
  actions,
  enterKeyEnabled,
  hint,
}: Props) {
  useEffect(() => {
    if (!enterKeyEnabled) return;
    const primary = actions.find((a) => a.primary && !a.disabled);
    if (!primary) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, button")) return;
      e.preventDefault();
      primary.onClick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, enterKeyEnabled]);

  const size = useBoardCardSize();
  const cardWidth = CARD_WIDTH * CARD_SCALE[size];

  // squeeze the fan on narrow screens (and for the 33-card bury hand)
  // rather than letting it run off the edges
  const viewportWidth = useViewportWidth();
  const visiblePerCard =
    cards.length > 1
      ? Math.min(
          MAX_VISIBLE * cardWidth,
          Math.max(
            MIN_VISIBLE * cardWidth,
            (viewportWidth - 48 - cardWidth) / (cards.length - 1),
          ),
        )
      : cardWidth;

  const selectedCount = selectedCards.length;

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionRow}>
        <div className={styles.selfMeta}>
          <SeatPlate
            name={name}
            team={team}
            isTurn={isMyTurn}
            tag="you"
            count={selectedCount > 0 ? selectedCount : cards.length}
            countLabel={selectedCount > 0 ? "selected" : undefined}
          />
        </div>

        <div className={styles.actionCenter}>
          <div className={styles.hintSlot}>
            <AnimatePresence mode="wait">
              {hint && (
                <motion.span
                  key={hint}
                  className={styles.hint}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {hint}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className={styles.actionButtons}>
            <AnimatePresence mode="popLayout" initial={false}>
              {actions.map((action) => (
                <motion.button
                  key={action.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  // opacity lives here (not in css :disabled) since framer
                  // owns the inline opacity of motion elements
                  animate={{ opacity: action.disabled ? 0.35 : 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={clsx(
                    styles.actionButton,
                    action.primary && styles.primary,
                  )}
                >
                  {action.label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.handToggles}>
          {autoDraw && (
            <button
              className={clsx(styles.toggle, autoDraw.enabled && styles.active)}
              onClick={autoDraw.onToggle}
              title="draw automatically on your turn"
            >
              auto draw
            </button>
          )}
          <button
            className={clsx(styles.toggle, sortEnabled && styles.active)}
            onClick={onToggleSort}
            title="sort your hand by rank"
          >
            sort
          </button>
        </div>
      </div>

      <div
        className={styles.myHand}
        data-fly-origin="seat-me"
        // hold the hand's height even when empty so the table doesn't
        // jump around between rounds
        style={{ minHeight: CARD_HEIGHT * CARD_SCALE[size] }}
      >
        <CardHand
          cards={cards}
          isFaceDown={false}
          orientation="bottom"
          isSelectable={true}
          selectedCards={selectedCards}
          highlightedCards={highlightedCards}
          onCardClick={onCardClick}
          size={size}
          overlap={visiblePerCard - cardWidth}
          flyFrom={{ origin: "pile" }}
        />
      </div>
    </div>
  );
}
