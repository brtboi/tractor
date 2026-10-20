import { clsx } from "clsx";
import type { Suit } from "@tractor/shared";
import { isRedSuit, levelLabel, SUIT_SYMBOLS } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type Props = {
  rank: number;
  // omit for a bare level badge
  suit?: Suit | null;
  muted?: boolean;
  title?: string;
};

/** a tiny paper badge drawn like the corner index of a card sprite */
export default function MiniCard({ rank, suit, muted, title }: Props) {
  const symbol = suit ? SUIT_SYMBOLS[suit] : "";
  return (
    <span
      className={clsx(
        styles.miniCard,
        suit && isRedSuit(suit) && styles.red,
        muted && styles.mutedCard,
      )}
      title={title}
    >
      <span>{levelLabel(rank)}</span>
      {symbol && <span className={styles.miniSuit}>{symbol}</span>}
    </span>
  );
}
