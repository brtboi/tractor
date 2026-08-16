import { motion } from "framer-motion";
import clsx from "clsx";
import { cardToString, type Card } from "@tractor/shared";
import { type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type BaseProps = {
  orientation: Orientation;
  isFaceDown: boolean;
  isSelected: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
};

type Props =
  | (BaseProps & {
      isFaceDown: false;
      card: Card;
    })
  | (BaseProps & {
      isFaceDown: true;
      card?: Card;
    });

export default function CardComponent({
  isFaceDown,
  orientation,
  card,
  isSelected,
  isSelectable = false,
  onClick,
}: Props) {
  // TODO: different card sprite themes
  const spritePathPrefix = "/cardSprites/";
  const spritePath: string = isFaceDown
    ? "back_red.png"
    : `${cardToString(card)}.png`;

  return (
    <motion.div
      layout
      layoutId={card ? `${card.deck}-${card.suit}-${card.rank}` : undefined}
      initial={{ opacity: 0, y: -60, scale: 0.7 }}
      animate={{ opacity: 1, y: isSelected ? -24 : 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 480, damping: 30 }}
      whileHover={isSelectable ? { scale: 1.1 } : undefined}
      whileTap={isSelectable ? { scale: 1.04 } : undefined}
      className={clsx(
        styles.cardComponent,
        styles[orientation],
        isSelected && styles.selected,
        isSelectable && styles.selectable,
      )}
      onClick={onClick}
    >
      <img
        className={styles.cardImage}
        src={spritePathPrefix + spritePath}
        alt={`card ${spritePath}`}
        draggable={false}
      />
    </motion.div>
  );
}
