import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { Card, GameState } from "@tractor/shared";
import MiniCard from "./MiniCard";
import {
  cardKey,
  levelLabel,
  playerName,
  SUIT_SYMBOLS,
} from "./GamePageHelpers";
import type { ThrowReveal } from "./useThrowReveal";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  playerId: string;
  reveal: ThrowReveal;
};

/** "33", "K", "3344"; per-card suits only when they're mixed (trump) */
function describeCards(cards: Card[]): string {
  const label = (card: Card) =>
    card.suit === "Joker"
      ? card.rank === 16
        ? "BJ"
        : "SJ"
      : levelLabel(card.rank);
  const isOneSuit = cards.every(
    (card) => card.suit === cards[0].suit && card.suit !== "Joker",
  );
  return isOneSuit
    ? cards.map(label).join("")
    : cards.map((card) => label(card) + SUIT_SYMBOLS[card.suit]).join(" ");
}

/**
 * The table being asked whether a throw stands. Purely staged: the server
 * already checked every hand, this just reveals it like a real table would.
 */
export default function ThrowBanner({ gameState, playerId, reveal }: Props) {
  const { attempt, stage, returned } = reveal;
  const isMine = attempt.playerId === playerId;
  const thrower = isMine ? "You" : playerName(gameState, attempt.playerId);
  const beater = attempt.beatenBy
    ? attempt.beatenBy === playerId
      ? "You"
      : playerName(gameState, attempt.beatenBy)
    : null;
  const isAsking = stage === "asking";
  const returnedKeys = new Set(returned.map(cardKey));

  let title: string;
  let detail: string;
  if (isAsking) {
    title = `${thrower} ${isMine ? "throw" : "throws"}`;
    detail = "asking around";
  } else if (beater) {
    title = `${beater} can beat ${describeCards(attempt.played)}`;
    detail = `${isMine ? "you take" : `${thrower} takes`} back ${describeCards(returned)}`;
  } else {
    title = "Nobody can beat it";
    detail = `${isMine ? "your" : `${thrower}'s`} throw stands`;
  }

  return (
    <motion.div
      className={clsx(
        styles.throwBanner,
        !isAsking && (beater ? styles.denied : styles.stands),
      )}
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -6 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={title}
          className={styles.throwTitle}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {!isAsking && (
            <span className={styles.throwMark} aria-hidden="true">
              {beater ? "✕" : "✓"}
            </span>
          )}
          {title}
        </motion.span>
      </AnimatePresence>

      <div className={styles.throwCards}>
        {attempt.attempted.map((card, i) => {
          const isReturned = !isAsking && returnedKeys.has(cardKey(card));
          return (
            <motion.span
              key={cardKey(card)}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: isReturned ? 0.35 : 1,
                y: isReturned ? 5 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 26,
                delay: isAsking ? i * 0.05 : 0,
              }}
            >
              <MiniCard rank={card.rank} suit={card.suit} />
            </motion.span>
          );
        })}
      </div>

      <span className={styles.throwDetail}>
        {detail}
        {isAsking && (
          <span className={styles.askingDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
    </motion.div>
  );
}
