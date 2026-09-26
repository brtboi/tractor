import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import styles from "./HomePage.module.scss";
import { createRoom, joinRoom } from "../services/gameActions";
import { useGameSocket } from "../services/useGameSocket";
import { useNavigate } from "react-router-dom";

const NAME_KEY = "PLAYER_NAME";

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // private mode etc - the name just won't be remembered
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { gameState, pushError } = useGameSocket();
  const [inputtedRoomId, setInputtedRoomId] = useState<string>("");
  const [name, setName] = useState<string>(loadName);

  useEffect(() => {
    if (gameState) navigate(`/game/${gameState.roomId}`);
  }, [gameState, navigate]);

  const trimmedName = name.trim();

  const handleRoomIdFormSubmit = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    saveName(trimmedName);
    const res = await joinRoom(
      inputtedRoomId.trim().toUpperCase(),
      trimmedName,
    );
    if (!res.ok) {
      pushError(
        res.code === "ROOM_NOT_FOUND" ? "That room doesn't exist." : res.error,
      );
    }
  };

  const handleCreateRoom = async () => {
    saveName(trimmedName);
    const res = await createRoom(trimmedName);
    if (!res.ok) pushError(res.error);
  };

  return (
    <motion.div
      className={styles.homePage}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.titleDiv}>
        <h1 className={styles.title}>🚜 Tractor</h1>
        <p className={styles.description}>hi :P WIP</p>
      </div>

      <div className={styles.card}>
        <label className={styles.field}>
          <span className={styles.label}>Your name</span>
          <input
            type="text"
            placeholder="Player"
            value={name}
            maxLength={20}
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <button className={styles.hostButton} onClick={handleCreateRoom}>
          Host a game
        </button>

        <div className={styles.divider}>
          <span>or join one</span>
        </div>

        <form className={styles.joinForm} onSubmit={handleRoomIdFormSubmit}>
          <input
            type="text"
            placeholder="Room code"
            value={inputtedRoomId}
            spellCheck={false}
            onChange={(e) => setInputtedRoomId(e.target.value)}
          />
          <button
            type="submit"
            className={styles.joinButton}
            disabled={inputtedRoomId.trim() === ""}
          >
            Join
          </button>
        </form>
      </div>
    </motion.div>
  );
}
