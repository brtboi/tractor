import { clsx } from "clsx";
import type { GameSettings, GameState } from "@tractor/shared";
import styles from "./GamePage.module.scss";
import { LEVEL_LABELS } from "./GamePageHelpers";
import { useState } from "react";

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
  { value: 0, label: "N/A" },
  { value: 1, label: "Touch" },
  { value: 2, label: "Beat" },
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
  // reordering seats and editing mustPlay only make sense before the game
  // starts - once it's running, seats/levels are locked in
  const canManageLobby = isHost && state.phase === "waiting_start";
  const hasVacantSeat = state.playerOrder.some(
    (id) => !state.players[id]?.active,
  );

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

  return (
    <>
      <div className={styles.bgBlur} />

      <div className={styles.settingsModal}>
        <div className={styles.settingsHeader}>
          <h3>{state.paused ? "Game Paused" : "Rules"}</h3>
          {state.currentRound && !state.paused && (
            <button
              className={styles.closeSettingsButton}
              onClick={() => setIsSettingsOpen(false)}
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.settingsBody}>
          <div className={styles.gameRules}>
            <div className={styles.mustPlayHeader}>Levels to play</div>
            {Object.keys(LEVEL_LABELS)
              .map(Number)
              .map((level) => (
                <div className={styles.mustPlayRow} key={level}>
                  <span className={styles.mustPlayLevel}>
                    {LEVEL_LABELS[level]}
                  </span>
                  <div className={styles.mustPlayOptions}>
                    {MUST_PLAY_OPTIONS.map(({ value, label }) => (
                      <button
                        key={label}
                        disabled={!canManageLobby}
                        className={clsx(
                          styles.mustPlayOption,
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
          {/* TODO: vertical bar */}

          <div className={styles.lobbyRules}>
            <div className={styles.roomIdDiv}>
              <p>
                <span>Room Id: </span>
                {state.roomId}
              </p>
              <button onClick={handleGameCodeCopy}>
                {gameCodeCopied ? "check" : "copy"}
              </button>
            </div>
            {/* TODO: public/private */}
            <div className={styles.playerProfile}>
              {/* TODO: player icon */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  changeName(playerName);
                }}
              >
                <input
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                  }}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  spellCheck={false}
                />
                <button type="submit">{">"}</button>
              </form>
            </div>
            <div className={styles.playerList}>
              <div>Players:</div>
              {state.playerOrder.map((id, index) => (
                <div key={id} className={styles.playerRow}>
                  <span>
                    {state.players[id]?.name ?? id}
                    {id === state.hostId ? " (host)" : ""}
                    {!state.players[id]?.active ? " (vacant)" : ""}
                  </span>
                  <span className={styles.teamLabel}>
                    Team {(index % 2) + 1}
                  </span>
                  {canManageLobby && (
                    <span className={styles.reorderButtons}>
                      <button
                        disabled={index === 0}
                        onClick={() => handleMovePlayer(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={index === state.playerOrder.length - 1}
                        onClick={() => handleMovePlayer(index, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button disabled={!isHost} onClick={addGhostPlayer}>
              ADD GHOST PLAYER
            </button>
            {state.phase === "waiting_start" && (
              <button disabled={!isHost} onClick={startGame}>
                START GMAE
              </button>
            )}
            {isHost && state.currentRound && (
              <button
                disabled={state.paused && hasVacantSeat}
                onClick={state.paused ? resumeGame : pauseGame}
                title={
                  state.paused && hasVacantSeat
                    ? "waiting for a vacant seat to be filled"
                    : undefined
                }
              >
                {state.paused ? "RESUME GAME" : "PAUSE GAME"}
              </button>
            )}
            <button onClick={leaveRoom}>LEAVE ROOM</button>
          </div>
        </div>
      </div>
    </>
  );
}
