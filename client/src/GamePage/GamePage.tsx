import { useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import SettingsModal from "./SettingsModal";

export default function GamePage() {
  const { isRegistered, playerId, gameState } = useGameSocket();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  // store game settings

  // function for on settings save/close

  const changeName = (newName: string) => {
    console.log(newName);
  };

  const startGame = () => {
    console.log("start game yayyy");
  };

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  return (
    <>
      <div>
        <h1>Game Page</h1>
        <p>WIP</p>
      </div>

      {isRegistered && <div>registered</div>}

      {(isSettingsModalOpen || gameState?.phase === "waiting") && (
        <SettingsModal
          setIsSettingsOpen={setIsSettingsModalOpen}
          state={gameState}
          playerId={playerId}
          changeName={changeName}
          startGame={startGame}
        />
      )}
    </>
  );
}
