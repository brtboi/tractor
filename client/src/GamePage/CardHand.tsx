import { AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardComponent from "./CardComponent";
import { isCardSelected, type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type BaseProps = {
  orientation: Orientation;
  isSelectable: boolean;
};

type Props =
  | (BaseProps & {
      isFaceDown: false;
      cards: Card[];
      selectedCards?: Card[];
      onCardClick?: (card: Card) => void;
    })
  | (BaseProps & {
      isFaceDown: true;
      cards: (Card | undefined)[];
    });

function cardKey(card: Card | undefined, index: number): string {
  return card ? `${card.deck}-${card.suit}-${card.rank}` : `back-${index}`;
}

export default function CardHand(props: Props) {
  const { orientation, isSelectable, cards } = props;

  return (
    <div className={clsx(styles.cardHand, styles[orientation])}>
      <AnimatePresence initial={false}>
        {cards.map((card, i) =>
          props.isFaceDown ? (
            <CardComponent
              key={cardKey(card, i)}
              isFaceDown={true}
              orientation={orientation}
              isSelected={false}
            />
          ) : (
            <CardComponent
              key={cardKey(card!, i)}
              card={card!}
              isFaceDown={false}
              orientation={orientation}
              isSelectable={isSelectable}
              isSelected={
                isSelectable
                  ? isCardSelected(card!, props.selectedCards ?? [])
                  : false
              }
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
