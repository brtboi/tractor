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
  const { playerId, gameState } = useGameSocket();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  // store game settings

  // function for on settings save/close

  const changeName = (newName: string) => {
    renamePlayer(gameState.roomId, newName);
  };

  const handleStartTestGame = () => {
    startTestGame(gameState.roomId, () => {
      setIsSettingsModalOpen(false);
    });
  };

  return (
    <>
      <GameBoard />

      {(isSettingsModalOpen || gameState?.phase === "waiting") && (
        <SettingsModal
          setIsSettingsOpen={setIsSettingsModalOpen}
          state={gameState}
          playerId={playerId}
          changeName={changeName}
          addGhostPlayer={() => {
            addGhostPlayer(gameState.roomId);
          }}
          startGame={handleStartTestGame}
        />
      )}
    </>
  );
}
