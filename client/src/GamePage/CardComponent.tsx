import clsx from "clsx";
import { cardToString, type Card } from "@tractor/shared";
import { type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type BaseProps = {
  orientation: Orientation;
  isFaceDown: boolean;
  isSelected: boolean;
  onClick: () => void;
}

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
  onClick,
}: Props) {
  // TODO: different card sprite themes
  const spritePathPrefix = "/cardSprites/";
  const spritePath: string = isFaceDown
    ? "back_red.png"
    : `${cardToString(card)}.png`;

  return (
    <div
      className={clsx(
        styles.cardComponent,
        styles[orientation],
        isSelected && styles.selected,
      )}
      onClick={onClick}
    >
      <img
        className={styles.cardImage}
        src={spritePathPrefix + spritePath}
        alt={`card ${spritePath}`}
      />
    </div>
  );
}
