import type { GameState } from "@tractor/shared";
import styles from "./GamePage.module.scss";
import { useState } from "react";

type Props = {
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  state: GameState;
  playerId: string;
  changeName: (newName: string) => void;
  startGame: () => void;
  // TODO: endGame: () => void;
};

export default function SettingsModal({
  state,
  playerId,
  changeName,
  startGame,
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
    } catch (error) {
      console.error("game code copy failed");
    }
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
            <p>rule 1:</p>{" "}
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
            <button onClick={startGame}>START GMAE</button>
          </div>
        </div>
      </div>
    </>
  );
}
