import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardHand from "./CardHand";
import { CARD_WIDTH } from "./GamePageHelpers";
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
  hint: string | null;
};

const HAND_CARD_WIDTH = CARD_WIDTH * 1.5;
const MAX_VISIBLE = 31.5; // px of each card showing at the default overlap
const MIN_VISIBLE = 16; // enough to still read the corner index

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

export default function ActionBar({
  name,
  isMyTurn,
  cards,
  selectedCards,
  highlightedCards,
  onCardClick,
  sortEnabled,
  onToggleSort,
  autoDraw,
  actions,
  hint,
}: Props) {
  // squeeze the fan on narrow screens (and for the 33-card bury hand)
  // rather than letting it run off the edges
  const viewportWidth = useViewportWidth();
  const visiblePerCard =
    cards.length > 1
      ? Math.min(
          MAX_VISIBLE,
          Math.max(
            MIN_VISIBLE,
            (viewportWidth - 48 - HAND_CARD_WIDTH) / (cards.length - 1),
          ),
        )
      : MAX_VISIBLE;

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionRow}>
        <div className={styles.selfMeta}>
          <span className={clsx(styles.turnDot, isMyTurn && styles.active)} />
          <span className={styles.selfName}>{name}</span>
          <span className={styles.muted}>
            {selectedCards.length > 0
              ? `${selectedCards.length} selected`
              : `${cards.length} card${cards.length === 1 ? "" : "s"}`}
          </span>
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
                  whileTap={action.disabled ? undefined : { scale: 0.96 }}
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

      <CardHand
        cards={cards}
        isFaceDown={false}
        orientation="bottom"
        isSelectable={true}
        selectedCards={selectedCards}
        highlightedCards={highlightedCards}
        onCardClick={onCardClick}
        overlap={visiblePerCard - HAND_CARD_WIDTH}
      />
    </div>
  );
}
