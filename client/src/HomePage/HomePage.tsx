import React, { useEffect, useState } from "react";
import styles from "./HomePage.module.scss";
import { createRoom, joinRoom } from "../services/gameActions";
import { useGameSocket } from "../services/SocketContext";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  const { gameState } = useGameSocket();
  const [inputtedRoomId, setInputtedRoomId] = useState<string>("");

  const handleRoomIdFormSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    console.log(`form submitted, code: ${inputtedRoomId}`);
    e.preventDefault();
    joinRoom(inputtedRoomId);
  };

  useEffect(() => {
    if (gameState) navigate(`/game/${gameState.roomId}`);
  }, [gameState, navigate]);

  return (
    <div className={styles.homePage}>
      <div className={styles.titleDiv}>
        <h1 className={styles.title}>🚜 Tractor :P</h1>
        <h2 className={styles.description}>hi :P WIP</h2>
      </div>

      <div className={styles.hostJoinContainer}>
        <button
          className={styles.hostJoinDiv}
          onClick={() => {
            createRoom();
          }}
        >
          <p>Host Game</p>
        </button>
        <div className={styles.hostJoinDiv}>
          <p>Join Game</p>
          <form
            onSubmit={handleRoomIdFormSubmit}
          >
            <input
              type="text"
              placeholder="Enter Room Id"
              value={inputtedRoomId}
              onChange={(e) => setInputtedRoomId(e.target.value)}
            />
            <button type="submit">E</button>
          </form>
        </div>
      </div>

      {/* list public lobbies */}
    </div>
  );
}
