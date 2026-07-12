import React, { useEffect, useState } from "react";
import styles from "./HomePage.module.scss";
import { createRoom, joinRoom } from "../services/gameActions";
import { useGameSocket } from "../services/useGameSocket";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  const { gameState, setError } = useGameSocket();
  const [inputtedRoomId, setInputtedRoomId] = useState<string>("");

  useEffect(() => {
    if (gameState) navigate(`/game/${gameState.roomId}`);
  }, [gameState, navigate]);

  const handleRoomIdFormSubmit = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const res = await joinRoom(inputtedRoomId);
    if (!res.ok) {
      setError(
        res.code === "ROOM_NOT_FOUND" ? "That room doesn't exist." : res.error,
      );
    }
  };

  const handleCreateRoom = async () => {
    const res = await createRoom();
    if (!res.ok) setError(res.error);
  };

  return (
    <div className={styles.homePage}>
      <div className={styles.titleDiv}>
        <h1 className={styles.title}>🚜 Tractor :P</h1>
        <h2 className={styles.description}>hi :P WIP</h2>
      </div>

      <div className={styles.hostJoinContainer}>
        <button className={styles.hostJoinDiv} onClick={handleCreateRoom}>
          <p>Host Game</p>
        </button>
        <div className={styles.hostJoinDiv}>
          <p>Join Game</p>
          <form onSubmit={handleRoomIdFormSubmit}>
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
    </div>
  );
}
