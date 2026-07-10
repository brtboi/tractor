import { useState } from "react";
import { clsx } from "clsx";
import type { Card } from "@tractor/shared";
import CardComponent from "./CardComponent";
import { type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type BaseProps = {
  orientation: Orientation;
  isSelectable: boolean;
};

type Props =
  | (BaseProps & {
      isFaceDown: false;
      cards: Card[];
    })
  | (BaseProps & {
      isFaceDown: true;
      cards: (Card | undefined)[];
    });

export default function CardHand({
  cards,
  isFaceDown,
  orientation,
  isSelectable,
}: Props) {
  // const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  const handleCardClick = (index: number) => {
    if (!isSelectable) return;

    setSelectedIndices((prev) => {
      const newSelectedIndices = new Set(prev);
      if (newSelectedIndices.has(index)) {
        newSelectedIndices.delete(index);
      } else {
        newSelectedIndices.add(index);
      }
      return newSelectedIndices;
    });
  };

  return (
    <div className={clsx(styles.cardHand, styles[orientation])}>
      {cards.map((card, i) =>
        isFaceDown ? (
          <CardComponent
            isFaceDown={true}
            orientation={orientation}
            isSelected={selectedIndices.has(i)}
            onClick={() => handleCardClick(i)}
          />
        ) : (
          <CardComponent
            card={card!}
            isFaceDown={false}
            orientation={orientation}
            isSelected={selectedIndices.has(i)}
            onClick={() => handleCardClick(i)}
          />
        ),
      )}
    </div>
  );
}
