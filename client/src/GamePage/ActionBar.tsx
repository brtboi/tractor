import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardHand from "./CardHand";
import styles from "./GamePage.module.scss";

export type ActionDescriptor = {
  id: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

type Props = {
  cards: Card[];
  selectedCards: Card[];
  onCardClick: (card: Card) => void;
  sortEnabled: boolean;
  onToggleSort: () => void;
  actions: ActionDescriptor[];
};

export default function ActionBar({
  cards,
  selectedCards,
  onCardClick,
  sortEnabled,
  onToggleSort,
  actions,
}: Props) {
  return (
    <div className={styles.actionBar}>
      <div className={styles.cardHandOptions}>
        <span className={styles.selectionCount}>
          {selectedCards.length > 0
            ? `${selectedCards.length} selected`
            : "your hand"}
        </span>
        <motion.button
          whileTap={{ scale: 0.94 }}
          className={clsx(styles.sortButton, sortEnabled && styles.active)}
          onClick={onToggleSort}
        >
          Sort
        </motion.button>
      </div>

      <CardHand
        cards={cards}
        isFaceDown={false}
        orientation="bottom"
        isSelectable={true}
        selectedCards={selectedCards}
        onCardClick={onCardClick}
      />

      <div className={styles.actionButtons}>
        <AnimatePresence mode="popLayout">
          {actions.map((action) => (
            <motion.button
              key={action.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              whileHover={action.disabled ? undefined : { scale: 1.05 }}
              whileTap={action.disabled ? undefined : { scale: 0.94 }}
              disabled={action.disabled}
              onClick={action.onClick}
              className={styles.actionButton}
            >
              {action.label}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
