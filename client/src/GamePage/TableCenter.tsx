import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  getPointValue,
  type AckResult,
  type Card,
  type GameState,
  type RoundState,
} from "@tractor/shared";
import CardComponent, { type CardSize } from "./CardComponent";
import CutDeck from "./CutDeck";
import {
  cardKey,
  getBreakerId,
  getSeatOrientation,
  getTeamIndex,
  playerName,
  SEAT_VECTORS,
  type Orientation,
} from "./GamePageHelpers";
import { useFlyIn } from "./useFlyIn";
import { useBoardCardSize } from "./useViewport";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  round: RoundState;
  playerId: string;
  // whoever the table is waiting on
  actorId: string | null;
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
        : `${playerName(gameState, breaker)} is cutting`;
    }
    // turns fly by while drawing, so keep this steady; the seat plates and
    // the glowing pile show whose turn it is
    case "drawing":
      return "Drawing";
    case "asking_before_bottoming":
      return mine ? "Nobody called — overturn or pass" : `Final call · ${name}`;
    case "bottoming":
      return round.bottomPlayer === playerId
        ? "Bury 8 cards"
        : `${playerName(gameState, round.bottomPlayer)} is burying`;
    case "asking":
      return mine ? "Overturn trump or pass" : `${name} is deciding`;
    case "playing":
      if (!mine) return `${name}'s turn`;
      return round.currentTricks.length === 0 ? "Your lead" : "Your turn";
  }
}

const SEAT_ANGLE: Record<Orientation, number> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};

const trickSpring = { type: "spring", stiffness: 320, damping: 32 } as const;
const fade = { duration: 0.25 };

export default function TableCenter({
  gameState,
  round,
  playerId,
  actorId,
  canDraw,
  onDrawPile,
  onCut,
}: Props) {
  const cardSize = useBoardCardSize();
  const status = getStatus(gameState, round, playerId);
  const seatOf = (id: string): Orientation =>
    getSeatOrientation(gameState.playerOrder, playerId, id);

  // the turn pointer always takes the short way round, so track its angle
  // cumulatively instead of jumping between fixed values
  const actorSeat = actorId ? seatOf(actorId) : null;
  const [pointer, setPointer] = useState({
    seat: actorSeat,
    angle: actorSeat ? SEAT_ANGLE[actorSeat] : 0,
  });
  if (actorSeat && actorSeat !== pointer.seat) {
    const delta =
      ((((SEAT_ANGLE[actorSeat] - pointer.angle) % 360) + 540) % 360) - 180;
    setPointer({ seat: actorSeat, angle: pointer.angle + delta });
  }

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
    <div className={styles.tableFelt} data-fly-origin="table">
      <div className={styles.tableMiddle}>
        <div className={styles.statusLine}>
          <AnimatePresence initial={false}>
            {actorSeat && round.phase !== "drawing" && (
              <motion.svg
                key="pointer"
                className={styles.turnPointer}
                viewBox="0 0 7 4"
                shapeRendering="crispEdges"
                aria-hidden="true"
                initial={{ opacity: 0, rotate: pointer.angle }}
                animate={{ opacity: 1, rotate: pointer.angle }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
              >
                <path d="M3 0h1v1h1v1h1v1h1v1H0V3h1V2h1V1h1z" />
              </motion.svg>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status}
              className={styles.statusText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {status}
            </motion.span>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="popLayout">
          {round.phase === "breaking" && (
            <motion.div
              key="cut"
              className={styles.phaseArea}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={fade}
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
              className={styles.phaseArea}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={fade}
            >
              <motion.div
                className={clsx(
                  styles.pile,
                  styles[cardSize],
                  canDraw && styles.clickable,
                )}
                data-fly-origin="pile"
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
              className={clsx(styles.phaseArea, styles.bottomArea)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={fade}
            >
              <div className={styles.pileColumn}>
                <div
                  className={clsx(styles.pile, styles.sm)}
                  data-fly-origin="bottom"
                >
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
      </div>

      <AnimatePresence custom={winnerVector}>
        {plays.map(({ playerId: trickPlayerId, trick }) => {
          const isWinner =
            isShowingLast && trickPlayerId === round.lastTrickWinner;
          return (
            <TrickGroup
              key={`${trickId}-${trickPlayerId}`}
              trickPlayerId={trickPlayerId}
              seat={seatOf(trickPlayerId)}
              cards={trick}
              size={cardSize}
              winnerVector={winnerVector}
              isDimmed={isShowingLast && !isWinner}
              isWinner={isWinner}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {isShowingLast && offTeamWonLast && lastTrickPoints > 0 && (
          <motion.span
            key={`points-${trickId}`}
            className={styles.trickPoints}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={trickSpring}
          >
            +{lastTrickPoints}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

type TrickGroupProps = {
  trickPlayerId: string;
  seat: Orientation;
  cards: Card[];
  size: CardSize;
  winnerVector: { x: number; y: number };
  isDimmed: boolean;
  isWinner: boolean;
};

/**
 * One player's play, sitting on their side of the table. Your own cards
 * glide in from your hand via their shared layoutId; everyone else's are
 * thrown in from their seat.
 */
function TrickGroup({
  trickPlayerId,
  seat,
  cards,
  size,
  winnerVector,
  isDimmed,
  isWinner,
}: TrickGroupProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const fly = useFlyIn(
    anchorRef,
    seat === "bottom" ? null : { origin: `seat-${trickPlayerId}` },
  );

  return (
    <motion.div
      ref={anchorRef}
      custom={winnerVector}
      className={clsx(
        styles.trickGroup,
        styles[seat],
        styles[size],
        isWinner && styles.won,
      )}
      initial={false}
      animate={{ opacity: isDimmed ? 0.45 : 1 }}
      variants={{
        exit: (to: { x: number; y: number }) => ({
          opacity: 0,
          x: to.x * 260,
          y: to.y * 220,
          scale: 0.7,
          transition: { duration: 0.4, ease: [0.4, 0, 1, 1] },
        }),
      }}
      exit="exit"
      transition={trickSpring}
    >
      <motion.div className={styles.trickCards} style={fly.style}>
        {cards.map((card) => (
          <CardComponent
            key={cardKey(card)}
            card={card}
            isFaceDown={false}
            orientation="bottom"
            isSelected={false}
            size={size}
            animateEntry={false}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
