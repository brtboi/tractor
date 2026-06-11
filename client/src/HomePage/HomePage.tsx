import { useState } from "react";
import styles from "./HomePage.module.scss";
import { createRoom } from "../services/gameActions";

export default function HomePage() {

  const [gameCode, setGameCode] = useState<string>("");

  return (
    <div className={styles.homePage}>
      <div className={styles.titleDiv}>
        <h1 className={styles.title}>🚜 Tractor :P</h1>
        <h2 className={styles.description}>
          hi :P WIP
        </h2>
      </div>

      <div className={styles.hostJoinContainer}>
        <button className={styles.hostJoinDiv} onClick={() => {
          createRoom();
        }}>
          <p>Host Game</p>

        </button>
        <div className={styles.hostJoinDiv}>
          <p>Join Game</p>
          <input
            type="text"
            placeholder="Enter Game Code"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value)}
          />
        </div>
      </div>

      {/* list public lobbies */}
    </div>
  );
}