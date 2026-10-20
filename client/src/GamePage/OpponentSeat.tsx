import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { Player } from "@tractor/shared";
import CardHand from "./CardHand";
import SeatPlate from "./SeatPlate";
import { CARD_HEIGHT, CARD_WIDTH, type Orientation } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

// must match the small face-down overlap in GamePage.module.scss
const OPPONENT_OVERLAP = 42;

// side hands are laid out horizontally and then turned to face the table
const HAND_ROTATION: Record<Exclude<Orientation, "bottom">, number> = {
  top: 0,
  left: 90,
  right: -90,
};

type Props = {
  playerId: string;
  player: Player | undefined;
  team: number;
  cardCount: number;
  orientation: Exclude<Orientation, "bottom">;
  isTurn: boolean;
  isPartner: boolean;
};

export default function OpponentSeat({
  playerId,
  player,
  team,
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
  const isSide = orientation !== "top";

  const hand = (
    <CardHand
      cards={cards}
      isFaceDown={true}
      orientation={orientation}
      isSelectable={false}
      size="sm"
      flyFrom={{ origin: "pile", rotation: HAND_ROTATION[orientation] }}
    />
  );

  const tag =
    player && !player.active ? "left" : isPartner ? "partner" : null;

  return (
    <div className={clsx(styles.opponentSeat, styles[orientation])}>
      <SeatPlate
        name={player?.name ?? "empty seat"}
        team={team}
        isTurn={isTurn}
        tag={tag}
        count={cardCount}
      />

      {isSide ? (
        // the hand is laid out horizontally then rotated, so reserve its
        // rotated footprint explicitly
        <motion.div
          className={styles.sideHand}
          data-fly-origin={`seat-${playerId}`}
          style={{ width: CARD_HEIGHT }}
          initial={false}
          animate={{ height: Math.max(handLength, CARD_WIDTH) }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
        >
          <div className={styles.sideHandInner}>{hand}</div>
        </motion.div>
      ) : (
        <div
          className={styles.topHand}
          data-fly-origin={`seat-${playerId}`}
          style={{ height: CARD_HEIGHT }}
        >
          {hand}
        </div>
      )}
    </div>
  );
}
