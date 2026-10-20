import { useRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { cardToString, type Card } from "@tractor/shared";
import { cardKey, type Orientation } from "./GamePageHelpers";
import { useFlyIn, type FlyFrom } from "./useFlyIn";
import styles from "./GamePage.module.scss";

// sm = 1x sprite, md = 1.5x, lg = 2x
export type CardSize = "sm" | "md" | "lg";

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
  // when added to an existing hand, glide in from this spot on the board
  flyFrom?: FlyFrom | null;
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

const SPRITE_PREFIX = "/cardSprites/";
// TODO: different card sprite themes
const CARD_BACK = `${SPRITE_PREFIX}back_red.png`;

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
  flyFrom,
  onClick,
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const fly = useFlyIn(anchorRef, flyFrom);
  const spriteName = isFaceDown ? null : cardToString(card);
  const flying = !!flyFrom;

  return (
    <motion.div
      ref={anchorRef}
      layout
      layoutId={!isFaceDown && shareLayout ? cardKey(card) : undefined}
      // a card travelling hand -> table should stay solid, not fade through
      layoutCrossfade={false}
      initial={
        !animateEntry || flying
          ? false
          : isFaceDown
            ? { opacity: 0 }
            : { opacity: 0, y: -40 }
      }
      animate={{ opacity: 1, y: isSelected ? -20 : 0 }}
      // face-down hands are rotated, so a sideways drift would look random
      exit={
        isFaceDown
          ? { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
          : { opacity: 0, y: -30, transition: { duration: 0.2 } }
      }
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
      <motion.div className={styles.cardFly} style={fly.style}>
        <img
          className={styles.cardImage}
          src={spriteName ? `${SPRITE_PREFIX}${spriteName}.png` : CARD_BACK}
          alt={spriteName ? `card ${spriteName}.png` : "card back"}
          draggable={false}
        />
        {/* face-up cards are drawn face down, so turn over mid-flight */}
        {flying && spriteName && (
          <motion.img
            className={clsx(styles.cardImage, styles.cardBackOverlay)}
            src={CARD_BACK}
            alt=""
            draggable={false}
            style={{ opacity: fly.progress }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
