import { useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import { useRoomActions } from "../services/useRoomActions";
import SettingsModal from "./SettingsModal";
import GameBoard from "./GameBoard";
import styles from "./GamePage.module.scss";

export default function GamePage() {
  const { playerId, gameState } = useGameSocket();
  const actions = useRoomActions();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  const handleStartTestGame = async () => {
    const res = await actions.startTestGame();
    if (res.ok) setIsSettingsModalOpen(false);
  };

  const isModalShowing =
    isSettingsModalOpen ||
    gameState.phase === "waiting_start" ||
    gameState.paused;

  return (
    <>
      {gameState.currentRound && <GameBoard />}

      {gameState.currentRound && !isModalShowing && (
        <button
          className={styles.settingsGearButton}
          onClick={() => setIsSettingsModalOpen(true)}
        >
          ⚙
        </button>
      )}

      {isModalShowing && (
        <SettingsModal
          setIsSettingsOpen={setIsSettingsModalOpen}
          state={gameState}
          playerId={playerId}
          changeName={actions.changeName}
          addGhostPlayer={actions.addGhostPlayer}
          startGame={handleStartTestGame}
          leaveRoom={actions.leaveRoom}
          updateSettings={actions.updateSettings}
          reorderPlayers={actions.reorderPlayers}
          pauseGame={actions.pauseGame}
          resumeGame={actions.resumeGame}
        />
      )}
    </>
  );
}
