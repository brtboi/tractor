import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { getPointValue, type GameState } from "@tractor/shared";
import { levelLabel, playerName } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

type Props = {
  gameState: GameState;
  playerId: string;
};

export default function Scoreboard({ gameState, playerId }: Props) {
  const round = gameState.currentRound;
  if (!round) return null;

  const points = getPointValue(round.points);
  const showPoints = round.phase === "playing";

  return (
    <div className={styles.scoreboard}>
      <span className={styles.eyebrow}>
        Round {gameState.currentRoundNumber + 1}
      </span>

      {gameState.teams.map((team, i) => {
        const isOn = round.onTeam === i;
        const isMine = team.playerIds.includes(playerId);
        return (
          <div key={i} className={styles.teamRow}>
            <span
              className={clsx(styles.teamDot, isOn && styles.on)}
              title={isOn ? "on (defending)" : undefined}
            />
            <div className={styles.teamInfo}>
              <span className={styles.teamName}>
                {team.name}
                {isMine && <span className={styles.muted}> · you</span>}
                {isOn && <span className={styles.onTag}>on</span>}
              </span>
              <span className={styles.teamMembers}>
                {team.playerIds
                  .map((id) => playerName(gameState, id))
                  .join(" & ")}
              </span>
            </div>
            <span className={styles.teamLevel} title="level">
              {levelLabel(team.score)}
            </span>
          </div>
        );
      })}

      <AnimatePresence initial={false}>
        {showPoints && (
          <motion.div
            className={styles.pointsRow}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span className={styles.muted}>points</span>
            <motion.span
              key={points}
              className={styles.pointsValue}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {points}
            </motion.span>
            <div className={styles.pointsTrack}>
              <motion.div
                className={styles.pointsFill}
                animate={{ width: `${Math.min(points / 160, 1) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
              <span className={styles.pointsThreshold} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
