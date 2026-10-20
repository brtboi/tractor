import { useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { GameSettings, GameState } from "@tractor/shared";
import styles from "./GamePage.module.scss";
import { LEVEL_LABELS } from "./GamePageHelpers";

type Props = {
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  state: GameState;
  playerId: string;
  changeName: (newName: string) => void;
  addGhostPlayer: () => void;
  startGame: () => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  reorderPlayers: (newPlayerOrder: string[]) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  // TODO: endGame: () => void;
};

const MUST_PLAY_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "skip" },
  { value: 1, label: "touch" },
  { value: 2, label: "beat" },
];

export default function SettingsModal({
  setIsSettingsOpen,
  state,
  playerId,
  changeName,
  addGhostPlayer,
  startGame,
  leaveRoom,
  updateSettings,
  reorderPlayers,
  pauseGame,
  resumeGame,
}: Props) {
  const [playerName, setPlayerName] = useState<string>(
    state.players[playerId].name,
  );
  const [gameCodeCopied, setGameCodeCopied] = useState<boolean>(false);

  const isHost = state.hostId === playerId;
  const isLobby = state.phase === "waiting_start";
  // reordering seats and editing mustPlay only make sense before the game
  // starts - once it's running, seats/levels are locked in
  const canManageLobby = isHost && isLobby;
  const canClose = !!state.currentRound && !state.paused;
  const hasVacantSeat = state.playerOrder.some(
    (id) => !state.players[id]?.active,
  );
  const seatsFilled = state.playerOrder.length;

  const handleMovePlayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= state.playerOrder.length) return;
    const newOrder = [...state.playerOrder];
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderPlayers(newOrder);
  };

  const handleGameCodeCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.roomId);
      setGameCodeCopied(true);
      setTimeout(() => setGameCodeCopied(false), 1500);
    } catch (e) {
      console.error("game code copy failed", e);
    }
  };

  const handleMustPlayChange = (level: number, value: 0 | 1 | 2) => {
    const mustPlay = [...state.settings.mustPlay];
    mustPlay[level] = value;
    updateSettings({ mustPlay });
  };

  const title = state.paused ? "Paused" : isLobby ? "Lobby" : "Settings";

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) setIsSettingsOpen(false);
      }}
    >
      <motion.div
        className={styles.settingsPanel}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <div className={styles.settingsHeader}>
          <div className={styles.settingsTitle}>
            <span className={styles.eyebrow}>Tractor</span>
            <h2 className={styles.panelTitle}>{title}</h2>
          </div>
          <div className={styles.settingsHeaderRight}>
            <button
              className={styles.roomCode}
              onClick={handleGameCodeCopy}
              title="copy room code"
            >
              <span className={styles.muted}>room</span>
              <span className={styles.roomCodeValue}>{state.roomId}</span>
              <span className={styles.muted}>
                {gameCodeCopied ? "copied" : "copy"}
              </span>
            </button>
            {canClose && (
              <button
                className={styles.iconButton}
                onClick={() => setIsSettingsOpen(false)}
                aria-label="close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {state.paused && (
          <p className={styles.pausedNote}>
            {hasVacantSeat
              ? "Someone left. The game resumes when their seat is filled, share the room code."
              : "The host paused the game."}
          </p>
        )}

        <div className={styles.settingsBody}>
          <section className={styles.settingsSection}>
            <span className={styles.eyebrow}>Players · {seatsFilled}/4</span>
            <div className={styles.playerList}>
              {state.playerOrder.map((id, index) => {
                const player = state.players[id];
                return (
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    key={id}
                    className={clsx(
                      styles.playerRow,
                      id === playerId && styles.me,
                    )}
                  >
                    <span
                      className={clsx(
                        styles.teamMarker,
                        index % 2 === 1 && styles.teamB,
                      )}
                      title={state.teams[index % 2]?.name}
                    />
                    <span className={styles.playerRowName}>
                      {player?.name ?? id}
                    </span>
                    <span className={styles.tags}>
                      {id === playerId && (
                        <span className={styles.tag}>you</span>
                      )}
                      {id === state.hostId && (
                        <span className={styles.tag}>host</span>
                      )}
                      {player?.isGhost && (
                        <span className={styles.tag}>ghost</span>
                      )}
                      {!player?.active && (
                        <span className={styles.tag}>vacant</span>
                      )}
                    </span>
                    {canManageLobby && (
                      <span className={styles.reorderButtons}>
                        <button
                          className={styles.iconButton}
                          disabled={index === 0}
                          onClick={() => handleMovePlayer(index, -1)}
                          aria-label="move up"
                        >
                          ↑
                        </button>
                        <button
                          className={styles.iconButton}
                          disabled={index === state.playerOrder.length - 1}
                          onClick={() => handleMovePlayer(index, 1)}
                          aria-label="move down"
                        >
                          ↓
                        </button>
                      </span>
                    )}
                  </motion.div>
                );
              })}
              {Array.from({ length: Math.max(0, 4 - seatsFilled) }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className={styles.emptySeat}>
                    waiting for a player…
                  </div>
                ),
              )}
            </div>
            <span className={styles.settingsNote}>
              seats alternate teams, so partners sit across from each other
            </span>

            <form
              className={styles.nameForm}
              onSubmit={(e) => {
                e.preventDefault();
                changeName(playerName);
              }}
            >
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onFocus={(e) => e.target.select()}
                spellCheck={false}
                maxLength={20}
                aria-label="your name"
              />
              <button
                type="submit"
                className={styles.secondaryButton}
                disabled={
                  playerName.trim() === "" ||
                  playerName === state.players[playerId].name
                }
              >
                Rename
              </button>
            </form>
          </section>

          <section className={styles.settingsSection}>
            <span className={styles.eyebrow}>Levels to play</span>
            <div className={styles.mustPlayList}>
              {Object.keys(LEVEL_LABELS)
                .map(Number)
                .map((level) => (
                  <div className={styles.mustPlayRow} key={level}>
                    <span className={styles.mustPlayLevel}>
                      {LEVEL_LABELS[level]}
                    </span>
                    <div className={styles.segmented}>
                      {MUST_PLAY_OPTIONS.map(({ value, label }) => (
                        <button
                          key={label}
                          disabled={!canManageLobby}
                          className={clsx(
                            styles.segment,
                            state.settings.mustPlay[level] === value &&
                              styles.active,
                          )}
                          onClick={() => handleMustPlayChange(level, value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        <div className={styles.settingsFooter}>
          <button className={styles.quietButton} onClick={leaveRoom}>
            Leave room
          </button>
          <div className={styles.settingsFooterRight}>
            {isHost && isLobby && (
              <button
                className={styles.secondaryButton}
                disabled={seatsFilled >= 4}
                onClick={addGhostPlayer}
              >
                Add ghost
              </button>
            )}
            {isHost && state.currentRound && (
              <button
                className={styles.secondaryButton}
                disabled={state.paused && hasVacantSeat}
                onClick={state.paused ? resumeGame : pauseGame}
              >
                {state.paused ? "Resume" : "Pause"}
              </button>
            )}
            {isLobby && (
              <button
                className={styles.primaryButton}
                disabled={!isHost || seatsFilled !== 4}
                onClick={startGame}
                title={
                  !isHost
                    ? "waiting for the host to start"
                    : seatsFilled !== 4
                      ? "need 4 players"
                      : undefined
                }
              >
                {isHost ? "Start game" : "Waiting for host"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
