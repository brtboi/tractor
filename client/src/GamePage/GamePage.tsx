import { useState } from "react";
import { useGameSocket } from "../services/SocketContext";
import SettingsModal from "./SettingsModal";

export default function GamePage() {
  const { playerId, gameState } = useGameSocket();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(
    gameState?.phase === "waiting",
  );

  // store game settings

  // function for on settings save/close

  const changeName = (newName: string) => {
    console.log(newName);
  };

  const startGame = () => {
    console.log("start game yayyy");
  };

  if (!gameState || !playerId) {
    return <p>no game state :(</p>;
  }

  return (
    <>
      <div>
        <h1>Game Page</h1>
        <p>WIP</p>
      </div>

      {isSettingsModalOpen && (
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
