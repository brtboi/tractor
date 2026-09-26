import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { Player } from "@tractor/shared";
import CardHand from "./CardHand";
import { CARD_HEIGHT, CARD_WIDTH, type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

// must match the small face-down overlap in GamePage.module.scss
const OPPONENT_OVERLAP = 42;

type Props = {
  player: Player | undefined;
  cardCount: number;
  orientation: Exclude<Orientation, "bottom">;
  isTurn: boolean;
  isPartner: boolean;
};

export default function OpponentSeat({
  player,
  cardCount,
  orientation,
  isTurn,
  isPartner,
}: Props) {
  const cards = Array.from({ length: cardCount }, () => undefined);
  const handLength =
    cardCount === 0
      ? 0
      : CARD_WIDTH + (cardCount - 1) * (CARD_WIDTH - OPPONENT_OVERLAP);
  const isSide = orientation === "left" || orientation === "right";

  const hand = (
    <CardHand
      cards={cards}
      isFaceDown={true}
      orientation={orientation}
      isSelectable={false}
      size="sm"
    />
  );

  return (
    <div className={clsx(styles.opponentSeat, styles[orientation])}>
      <div className={clsx(styles.seatChip, isTurn && styles.activeTurn)}>
        <span className={styles.seatName}>{player?.name ?? "empty seat"}</span>
        {isPartner && <span className={styles.muted}>partner</span>}
        {player && !player.active && <span className={styles.muted}>left</span>}
        <span className={styles.seatCount}>{cardCount}</span>
      </div>

      {isSide ? (
        // the hand is laid out horizontally then rotated, so reserve its
        // rotated footprint explicitly
        <motion.div
          className={styles.sideHand}
          style={{ width: CARD_HEIGHT }}
          animate={{ height: handLength }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
        >
          <div className={styles.sideHandInner}>{hand}</div>
        </motion.div>
      ) : (
        hand
      )}
    </div>
  );
}
