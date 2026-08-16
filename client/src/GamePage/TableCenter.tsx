import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { GameState, RoundState } from "@tractor/shared";
import CardComponent from "./CardComponent";
import { getSeatOrientation, PHASE_LABELS } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  round: RoundState;
  playerId: string;
  canDraw: boolean;
  onDrawPile: () => void;
};

export default function TableCenter({
  gameState,
  round,
  playerId,
  canDraw,
  onDrawPile,
}: Props) {
  const turnLabel =
    round.currentTurn === playerId
      ? "your turn"
      : `${gameState.players[round.currentTurn]?.name ?? round.currentTurn}'s turn`;

  const callPlayerName = round.callPlayer
    ? (gameState.players[round.callPlayer]?.name ?? round.callPlayer)
    : null;

  return (
    <div className={styles.tableCenter}>
      <div className={styles.statusPills}>
        <span className={styles.pill}>
          {PHASE_LABELS[round.phase] ?? round.phase}
        </span>
        <span className={clsx(styles.pill, styles.turnPill)}>
          {turnLabel}
        </span>
        {round.trumpSuit && (
          <span className={styles.pill}>
            Trump: {round.trumpRank}
            {round.trumpSuit !== "Joker" ? ` of ${round.trumpSuit}` : ""}
          </span>
        )}
        {callPlayerName && (
          <span className={styles.pill}>called by {callPlayerName}</span>
        )}
      </div>

      <div className={styles.tableSurface}>
        {round.drawPile.length > 0 && (
          <motion.div
            className={clsx(styles.drawPile, canDraw && styles.clickable)}
            onClick={canDraw ? onDrawPile : undefined}
            whileHover={canDraw ? { scale: 1.05 } : undefined}
            whileTap={canDraw ? { scale: 0.95 } : undefined}
          >
            {Array.from({ length: Math.min(5, round.drawPile.length) }).map(
              (_, i) => (
                <div
                  key={i}
                  className={styles.drawPileCard}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <img
                    src="/cardSprites/back_red.png"
                    alt="draw pile"
                    draggable={false}
                  />
                </div>
              ),
            )}
            <span className={styles.drawPileCount}>
              {round.drawPile.length}
            </span>
          </motion.div>
        )}

        {round.bottom.length > 0 && round.phase !== "bottoming" && (
          <div className={styles.bottomPile}>
            {Array.from({ length: Math.min(4, round.bottom.length) }).map(
              (_, i) => (
                <div
                  key={i}
                  className={styles.bottomPileCard}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <img
                    src="/cardSprites/back_black.png"
                    alt="bottom"
                    draggable={false}
                  />
                </div>
              ),
            )}
            <span className={styles.bottomPileCount}>
              bottom &times; {round.bottom.length}
            </span>
          </div>
        )}

        <AnimatePresence>
          {round.currentTricks.map(({ playerId: trickPlayerId, trick }) => (
            // outer plain div: static position/rotation per seat.
            // framer-motion owns `transform` on any motion element it
            // renders, so the enter/exit scale animation lives on the
            // nested motion.div instead of fighting the CSS rotate here.
            <div
              key={trickPlayerId}
              className={clsx(
                styles.trickGroup,
                styles[
                  getSeatOrientation(
                    gameState.playerOrder,
                    playerId,
                    trickPlayerId,
                  )
                ],
              )}
            >
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={styles.trickCardsRow}
              >
                {trick.map((card) => (
                  <div
                    key={`${card.deck}-${card.suit}-${card.rank}`}
                    className={styles.trickCard}
                  >
                    <CardComponent
                      card={card}
                      isFaceDown={false}
                      orientation="bottom"
                      isSelected={false}
                    />
                  </div>
                ))}
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
