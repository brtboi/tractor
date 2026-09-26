import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  getPointValue,
  type AckResult,
  type GameState,
  type RoundState,
} from "@tractor/shared";
import CardComponent from "./CardComponent";
import CutDeck from "./CutDeck";
import {
  cardKey,
  describeCall,
  describeTrump,
  getBreakerId,
  getSeatOrientation,
  getTeamIndex,
  playerName,
  SEAT_VECTORS,
  type Orientation,
} from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  round: RoundState;
  playerId: string;
  canDraw: boolean;
  onDrawPile: () => void;
  onCut: (breakAt: number) => Promise<AckResult>;
};

function getStatus(
  gameState: GameState,
  round: RoundState,
  playerId: string,
): string {
  const turn = round.currentTurn;
  const mine = turn === playerId;
  const name = playerName(gameState, turn);

  switch (round.phase) {
    case "breaking": {
      const breaker = getBreakerId(gameState.playerOrder, round.onPlayer);
      return breaker === playerId
        ? "Cut the deck"
        : `${playerName(gameState, breaker)} is cutting the deck`;
    }
    // turns fly by while drawing, so keep this steady; the seat chips and
    // the glowing pile show whose turn it is
    case "drawing":
      return "Drawing";
    case "asking_before_bottoming":
      return mine
        ? "Nobody called — overturn or pass"
        : `Final call · ${name} is deciding`;
    case "bottoming":
      return round.bottomPlayer === playerId
        ? "Bury 8 cards"
        : `${playerName(gameState, round.bottomPlayer)} is burying the bottom`;
    case "asking":
      return mine ? "Overturn trump or pass" : `${name} is deciding`;
    case "playing":
      if (!mine) return `${name}'s turn`;
      return round.currentTricks.length === 0 ? "Your lead" : "Your turn";
  }
}

const trickSpring = { type: "spring", stiffness: 320, damping: 32 } as const;

export default function TableCenter({
  gameState,
  round,
  playerId,
  canDraw,
  onDrawPile,
  onCut,
}: Props) {
  const status = getStatus(gameState, round, playerId);
  const seatOf = (id: string): Orientation =>
    getSeatOrientation(gameState.playerOrder, playerId, id);

  // tricks: show the one in progress, or the last completed one (with its
  // winner) until the next lead
  const isShowingLast =
    round.phase === "playing" &&
    round.currentTricks.length === 0 &&
    round.lastTrick.length > 0;
  const plays = isShowingLast ? round.lastTrick : round.currentTricks;
  const trickId =
    plays.length > 0 && plays[0].trick.length > 0
      ? `${plays[0].playerId}-${cardKey(plays[0].trick[0])}`
      : "";

  // a finished trick sweeps off toward whoever won it
  const winnerVector = round.lastTrickWinner
    ? SEAT_VECTORS[seatOf(round.lastTrickWinner)]
    : { x: 0, y: 0 };

  const lastTrickPoints = isShowingLast
    ? getPointValue(round.lastTrick.flatMap((p) => p.trick))
    : 0;
  const offTeamWonLast =
    !!round.lastTrickWinner &&
    getTeamIndex(gameState, round.lastTrickWinner) !== round.onTeam;

  const showBottomPile =
    round.bottom.length > 0 &&
    (round.phase === "asking_before_bottoming" ||
      round.phase === "asking" ||
      (round.phase === "bottoming" && round.bottomPlayer !== playerId));

  return (
    <div className={styles.tableCenter}>
      <div className={styles.statusLine}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={status}
            className={styles.statusText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {status}
          </motion.div>
        </AnimatePresence>
        <div className={styles.statusChips}>
          <span className={styles.chip}>
            <span className={styles.muted}>trump</span>
            {describeTrump(round)}
          </span>
          {round.callPlayer && round.callCards.length > 0 && (
            <span className={styles.chip}>
              <span className={styles.muted}>
                {playerName(gameState, round.callPlayer)}
              </span>
              {describeCall(round.callCards)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.tableSurface}>
        <AnimatePresence>
          {round.phase === "breaking" && (
            <motion.div
              key="cut"
              className={styles.centered}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <CutDeck
                key={round.drawPile.length}
                count={round.drawPile.length}
                canCut={
                  getBreakerId(gameState.playerOrder, round.onPlayer) ===
                  playerId
                }
                onCut={onCut}
              />
            </motion.div>
          )}

          {round.phase === "drawing" && round.drawPile.length > 0 && (
            <motion.div
              key="draw"
              className={styles.centered}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className={clsx(styles.pile, canDraw && styles.clickable)}
                onClick={canDraw ? onDrawPile : undefined}
                whileHover={canDraw ? { y: -3 } : undefined}
                whileTap={canDraw ? { scale: 0.97 } : undefined}
              >
                {Array.from({
                  length: Math.min(5, Math.ceil(round.drawPile.length / 20)),
                }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.pileCard}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <img
                      src="/cardSprites/back_red.png"
                      alt="draw pile"
                      draggable={false}
                    />
                  </div>
                ))}
                {canDraw && <span className={styles.pileGlow} />}
              </motion.div>
              <span className={styles.pileLabel}>
                {round.drawPile.length} left
              </span>
            </motion.div>
          )}

          {showBottomPile && (
            <motion.div
              key="bottom"
              className={clsx(styles.centered, styles.bottomArea)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
            >
              <div className={styles.pileColumn}>
                <div className={clsx(styles.pile, styles.small)}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={styles.pileCard}
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <img
                        src="/cardSprites/back_black.png"
                        alt="bottom"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
                <span className={styles.pileLabel}>bottom</span>
              </div>
              {round.isFinalCall && round.bottom[2] && (
                <div className={styles.pileColumn}>
                  <CardComponent
                    card={round.bottom[2]}
                    isFaceDown={false}
                    orientation="bottom"
                    isSelected={false}
                    size="sm"
                    shareLayout={false}
                    animateEntry={false}
                  />
                  <span className={styles.pileLabel}>flipped for trump</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence custom={winnerVector}>
          {plays.map(({ playerId: trickPlayerId, trick }) => {
            const seat = seatOf(trickPlayerId);
            const from = SEAT_VECTORS[seat];
            const isWinner =
              isShowingLast && trickPlayerId === round.lastTrickWinner;
            return (
              <motion.div
                key={`${trickId}-${trickPlayerId}`}
                custom={winnerVector}
                className={clsx(
                  styles.trickGroup,
                  styles[seat],
                  isWinner && styles.won,
                )}
                // your own cards glide in from your hand via layoutId,
                // everyone else's slide in from their seat
                initial={
                  seat === "bottom"
                    ? false
                    : { opacity: 0, x: from.x * 70, y: from.y * 70 }
                }
                animate={{
                  opacity: isShowingLast && !isWinner ? 0.5 : 1,
                  x: 0,
                  y: 0,
                }}
                variants={{
                  exit: (to: { x: number; y: number }) => ({
                    opacity: 0,
                    x: to.x * 140,
                    y: to.y * 140,
                    scale: 0.85,
                    transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
                  }),
                }}
                exit="exit"
                transition={trickSpring}
              >
                {trick.map((card) => (
                  <CardComponent
                    key={cardKey(card)}
                    card={card}
                    isFaceDown={false}
                    orientation="bottom"
                    isSelected={false}
                    size="sm"
                    animateEntry={false}
                  />
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {isShowingLast && offTeamWonLast && lastTrickPoints > 0 && (
            <motion.span
              key={`points-${trickId}`}
              className={styles.trickPoints}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={trickSpring}
            >
              +{lastTrickPoints}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
