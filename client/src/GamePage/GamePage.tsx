import { useState } from "react";
import { useGameSocket } from "../services/SocketContext";

export default function GamePage() {
  const { playerId, gameState } = useGameSocket();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState) {
    return <p>no game state :(</p>;
  }
  return (
    <div>
      <h1>Game Page</h1>
      <p>WIP</p>
      <p>playerId: {playerId}</p>
      <p>roomId: {gameState.roomId}</p>
      <p>players:</p>
      {Object.entries(gameState.players).map(([playerId, _]) => (
        <p>{playerId}</p>
      ))}
    </div>
  );
}
