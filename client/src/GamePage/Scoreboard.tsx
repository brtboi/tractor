import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { getPointValue, type GameState } from "@tractor/shared";
import MiniCard from "./MiniCard";
import {
  describeCall,
  getKnownTrumpSuit,
  isTrumpUncalled,
  playerName,
} from "./GamePageHelpers";
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
  const uncalled = isTrumpUncalled(round);
  const trumpSuit = getKnownTrumpSuit(round);
  const hasCall = !!round.callPlayer && round.callCards.length > 0;

  const callTitle = hasCall
    ? `${playerName(gameState, round.callPlayer)} called ${describeCall(round.callCards)}`
    : undefined;

  return (
    <div className={styles.scoreboard}>
      <div className={styles.scoreHeader}>
        <span className={styles.eyebrow}>
          Round {gameState.currentRoundNumber + 1}
        </span>
        <span className={styles.trumpValue} title={callTitle}>
          <span className={styles.trumpCaption}>
            {uncalled
              ? "uncalled"
              : hasCall
                ? playerName(gameState, round.callPlayer)
                : trumpSuit === "Joker"
                  ? "no trump"
                  : "trump"}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${round.trumpRank}-${uncalled ? "?" : trumpSuit}`}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <MiniCard
                rank={round.trumpRank}
                suit={uncalled || trumpSuit === "Joker" ? null : trumpSuit}
                muted={uncalled}
                title="trump"
              />
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <div className={styles.teams}>
        {gameState.teams.map((team, i) => {
          const isOn = round.onTeam === i;
          const isMine = team.playerIds.includes(playerId);
          return (
            <div
              key={i}
              className={clsx(styles.teamCell, isMine && styles.mine)}
              title={`${team.playerIds
                .map((id) => playerName(gameState, id))
                .join(" & ")}${isMine ? " (your team)" : ""}`}
            >
              <span
                className={clsx(styles.teamMarker, i === 1 && styles.teamB)}
              />
              <span className={styles.teamName}>{team.name}</span>
              {isOn && <span className={styles.onTag}>on</span>}
              <MiniCard rank={team.score} title="level" />
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {showPoints && (
          <motion.div
            className={styles.pointsRow}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className={styles.pointsTrack}>
              <motion.div
                className={styles.pointsFill}
                animate={{ width: `${Math.min(points / 160, 1) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
              <span className={styles.pointsThreshold} />
            </div>
            <span className={styles.pointsValue}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={points}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  {points}
                </motion.span>
              </AnimatePresence>
              <span className={styles.pointsLabel}>pts</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
