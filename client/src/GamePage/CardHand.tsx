import { AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardComponent, { type CardSize } from "./CardComponent";
import { cardKey, isCardSelected, type Orientation } from "./GamePageHelpers";
import type { FlyFrom } from "./useFlyIn";
import styles from "./GamePage.module.scss";

type BaseProps = {
  orientation: Orientation;
  isSelectable: boolean;
  size?: CardSize;
  // px each card overlaps the previous one (negative margin); falls back to
  // the stylesheet default
  overlap?: number;
  // cards dealt into the hand after it first renders glide in from here
  flyFrom?: FlyFrom;
};

type Props =
  | (BaseProps & {
      isFaceDown: false;
      cards: Card[];
      selectedCards?: Card[];
      highlightedCards?: Card[];
      onCardClick?: (card: Card) => void;
    })
  | (BaseProps & {
      isFaceDown: true;
      cards: (Card | undefined)[];
    });

export default function CardHand(props: Props) {
  const {
    orientation,
    isSelectable,
    cards,
    size = "md",
    overlap,
    flyFrom,
  } = props;

  return (
    <div
      className={clsx(styles.cardHand, styles[orientation], styles[size])}
      style={
        overlap !== undefined
          ? ({ "--overlap": `${overlap}px` } as React.CSSProperties)
          : undefined
      }
    >
      <AnimatePresence initial={false}>
        {cards.map((card, i) =>
          props.isFaceDown ? (
            // face-down cards arrive scrubbed (every one is the same
            // HIDDEN_CARD), so their identity can't be used as a key
            <CardComponent
              key={`back-${i}`}
              isFaceDown={true}
              orientation={orientation}
              isSelected={false}
              size={size}
              flyFrom={flyFrom}
            />
          ) : (
            <CardComponent
              key={cardKey(card!)}
              card={card!}
              isFaceDown={false}
              orientation={orientation}
              size={size}
              flyFrom={flyFrom}
              isSelectable={isSelectable}
              isSelected={
                isSelectable
                  ? isCardSelected(card!, props.selectedCards ?? [])
                  : false
              }
              isHighlighted={isCardSelected(
                card!,
                props.highlightedCards ?? [],
              )}
              onClick={
                isSelectable ? () => props.onCardClick?.(card!) : undefined
              }
            />
          ),
        )}
      </AnimatePresence>
    </div>
  );
}
