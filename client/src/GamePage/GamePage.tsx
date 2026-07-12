import { useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import SettingsModal from "./SettingsModal";
import GameBoard from "./GameBoard";
import {
  addGhostPlayer,
  renamePlayer,
  startTestGame,
} from "../services/gameActions";

export default function GamePage() {
  const { playerId, gameState, setError } = useGameSocket();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  const changeName = async (newName: string) => {
    const res = await renamePlayer(gameState.roomId, newName);
    if (!res.ok) setError(res.error);
  };

  const handleAddGhostPlayer = async () => {
    const res = await addGhostPlayer(gameState.roomId);
    if (!res.ok) setError(res.error);
  };

  const handleStartTestGame = async () => {
    const res = await startTestGame(gameState.roomId);
    if (res.ok) {
      setIsSettingsModalOpen(false);
    } else {
      setError(res.error);
    }
  };

  // TODO: settings modal after start game

  return (
    <>
      <GameBoard />

      {(isSettingsModalOpen || gameState?.phase === "waiting") && (
        <SettingsModal
          setIsSettingsOpen={setIsSettingsModalOpen}
          state={gameState}
          playerId={playerId}
          changeName={changeName}
          addGhostPlayer={handleAddGhostPlayer}
          startGame={handleStartTestGame}
        />
      )}
    </>
  );
}
