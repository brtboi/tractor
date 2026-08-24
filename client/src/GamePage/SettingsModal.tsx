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
  // TODO: endGame: () => void;
};

const MUST_PLAY_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "N/A" },
  { value: 1, label: "Touch" },
  { value: 2, label: "Beat" },
];

export default function SettingsModal({
  state,
  playerId,
  changeName,
  addGhostPlayer,
  startGame,
  leaveRoom,
  updateSettings,
}: Props) {
  const [playerName, setPlayerName] = useState<string>(
    state.players[playerId].name,
  );

  const [gameCodeCopied, setGameCodeCopied] = useState<boolean>(false);

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
          <h3>Rules</h3>
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
              {Object.entries(state.players).map(([playerId, player]) => (
                <div key={playerId}>{player.name}</div>
              ))}
            </div>
            <button onClick={addGhostPlayer}>ADD GHOST PLAYER</button>
            <button onClick={startGame}>START GMAE</button>
            <button onClick={leaveRoom}>LEAVE ROOM</button>
          </div>
        </div>
      </div>
    </>
  );
}
