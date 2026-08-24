import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameSocket } from "../services/useGameSocket";
import SettingsModal from "./SettingsModal";
import GameBoard from "./GameBoard";
import {
  addGhostPlayer,
  leaveRoom,
  renamePlayer,
  startTestGame,
} from "../services/gameActions";

export default function GamePage() {
  const { playerId, gameState, pushError, resetGameState } = useGameSocket();
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  const changeName = async (newName: string) => {
    const res = await renamePlayer(gameState.roomId, newName);
    if (!res.ok) pushError(res.error);
  };

  const handleAddGhostPlayer = async () => {
    const res = await addGhostPlayer(gameState.roomId);
    if (!res.ok) pushError(res.error);
  };

  const handleLeaveRoom = async () => {
    // leaving needs to work even if the server can't confirm it (stale
    // room, dropped connection) - clear local state regardless of the ack
    const res = await leaveRoom(gameState.roomId);
    if (!res.ok) pushError(res.error);
    resetGameState();
    navigate("/");
  };

  const handleStartTestGame = async () => {
    const res = await startTestGame(gameState.roomId);
    if (res.ok) {
      setIsSettingsModalOpen(false);
    } else {
      pushError(res.error);
    }
  };

  // TODO: settings modal after start game

  return (
    <>
      {gameState.currentRound && <GameBoard />}

      {(isSettingsModalOpen || gameState.phase === "waiting_start") && (
        <SettingsModal
          setIsSettingsOpen={setIsSettingsModalOpen}
          state={gameState}
          playerId={playerId}
          changeName={changeName}
          addGhostPlayer={handleAddGhostPlayer}
          startGame={handleStartTestGame}
          leaveRoom={handleLeaveRoom}
        />
      )}
    </>
  );
}
