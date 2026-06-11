import { useState } from "react";
import styles from "./HomePage.module.scss";

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
        <div className={styles.hostJoinDiv}>
          <p>Host Game</p>

        </div>
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