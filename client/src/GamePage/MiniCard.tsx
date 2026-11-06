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
  const isJoker = suit === "Joker";
  const symbol = suit ? SUIT_SYMBOLS[suit] : "";
  // big joker is the red one on the sprites
  const isRed = isJoker ? rank === 16 : !!suit && isRedSuit(suit);
  return (
    <span
      className={clsx(
        styles.miniCard,
        isRed && styles.red,
        muted && styles.mutedCard,
      )}
      title={
        title ??
        (isJoker ? (rank === 16 ? "big joker" : "small joker") : undefined)
      }
    >
      <span>{isJoker ? (rank === 16 ? "BJ" : "SJ") : levelLabel(rank)}</span>
      {symbol && <span className={styles.miniSuit}>{symbol}</span>}
    </span>
  );
}
