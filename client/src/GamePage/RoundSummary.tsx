import { motion } from "framer-motion";
import type { GameState, RoundSummary as Summary } from "@tractor/shared";
import CardComponent from "./CardComponent";
import { cardKey, levelLabel } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  summary: Summary;
  playerId: string;
  onNextRound: () => void;
  onLeave: () => void;
};

function describeResult(gameState: GameState, summary: Summary): string {
  const team = gameState.teams[summary.levelingTeam].name;
  const from = levelLabel(summary.fromLevel);
  const to = levelLabel(summary.toLevel);
  const defended = summary.levelingTeam === summary.onTeam;

  if (gameState.phase === "game_over") return `${team} climbs past A`;
  if (defended)
    return summary.fromLevel === summary.toLevel
      ? `${team} defends and stays on ${from}`
      : `${team} defends · ${from} → ${to}`;
  return summary.fromLevel === summary.toLevel
    ? `${team} takes over on ${from}`
    : `${team} takes over · ${from} → ${to}`;
}

export default function RoundSummary({
  gameState,
  summary,
  playerId,
  onNextRound,
  onLeave,
}: Props) {
  const isGameOver = gameState.phase === "game_over";
  const isHost = gameState.hostId === playerId;
  const pointsPct = Math.min(summary.points / 160, 1) * 100;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className={styles.summaryPanel}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <span className={styles.eyebrow}>
          {isGameOver ? "Game over" : `Round ${summary.roundNumber + 1}`}
        </span>
        <h2 className={styles.summaryTitle}>
          {isGameOver
            ? `${gameState.teams[gameState.winner]?.name ?? "Someone"} wins`
            : describeResult(gameState, summary)}
        </h2>

        <div className={styles.summaryPoints}>
          <div className={styles.summaryPointsHeader}>
            <span className={styles.summaryPointsValue}>{summary.points}</span>
            <span className={styles.muted}>
              points for {gameState.teams[1 - summary.onTeam].name}
            </span>
          </div>
          <div className={styles.pointsTrack}>
            <motion.div
              className={styles.pointsFill}
              initial={{ width: 0 }}
              animate={{ width: `${pointsPct}%` }}
              transition={{
                delay: 0.15,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            <span className={styles.pointsThreshold} />
          </div>
          {isGameOver && (
            <span className={styles.muted}>
              {describeResult(gameState, summary)}
            </span>
          )}
        </div>

        <div className={styles.summaryBottom}>
          <span className={styles.muted}>
            bottom
            {summary.bottomPoints > 0 && (
              <span className={styles.accentText}>
                {" "}
                +{summary.bottomPoints}
              </span>
            )}
          </span>
          <div className={styles.summaryBottomCards}>
            {summary.bottom.map((card, i) => (
              <motion.div
                key={cardKey(card)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
              >
                <CardComponent
                  card={card}
                  isFaceDown={false}
                  orientation="bottom"
                  isSelected={false}
                  size="sm"
                  shareLayout={false}
                  animateEntry={false}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className={styles.summaryActions}>
          {isGameOver ? (
            <button className={styles.primaryButton} onClick={onLeave}>
              Leave room
            </button>
          ) : isHost ? (
            <button className={styles.primaryButton} onClick={onNextRound}>
              Next round
            </button>
          ) : (
            <span className={styles.muted}>waiting for the host…</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
