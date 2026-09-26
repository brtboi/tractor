import { motion } from "framer-motion";
import clsx from "clsx";
import { cardToString, type Card } from "@tractor/shared";
import { cardKey, type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

export type CardSize = "sm" | "md";

type BaseProps = {
  orientation: Orientation;
  isFaceDown: boolean;
  isSelected: boolean;
  isSelectable?: boolean;
  // small marker above the card, e.g. cards that came from the bottom
  isHighlighted?: boolean;
  size?: CardSize;
  // shared layoutId lets a card glide from the hand to the table. turn it
  // off for purely decorative copies (like the round summary's bottom)
  shareLayout?: boolean;
  // drop in from above when mounted; off when a parent animates entry
  animateEntry?: boolean;
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

const spring = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.8,
} as const;

export default function CardComponent({
  isFaceDown,
  orientation,
  card,
  isSelected,
  isSelectable = false,
  isHighlighted = false,
  size = "md",
  shareLayout = true,
  animateEntry = true,
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
      layoutId={!isFaceDown && shareLayout ? cardKey(card) : undefined}
      initial={
        !animateEntry
          ? false
          : isFaceDown
            ? { opacity: 0 }
            : { opacity: 0, y: -40 }
      }
      animate={{ opacity: 1, y: isSelected ? -18 : 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={spring}
      className={clsx(
        styles.cardComponent,
        styles[orientation],
        styles[size],
        isSelected && styles.selected,
        isSelectable && styles.selectable,
        isHighlighted && styles.highlighted,
      )}
      onClick={onClick}
    >
      <img
        className={styles.cardImage}
        src={spritePathPrefix + spritePath}
        alt={isFaceDown ? "card back" : `card ${spritePath}`}
        draggable={false}
      />
    </motion.div>
  );
}
