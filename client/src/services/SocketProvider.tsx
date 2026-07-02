import type { GameState } from "@tractor/shared";
import { type ReactNode, useState, useEffect } from "react";
import socket from "./socket";
import { SocketContext } from "./useGameSocket";

function getPlayerId(): string {
  // TODO: make sure playerId in localstorage is valid
  let id = localStorage.getItem("PLAYER_ID");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("PLAYER_ID", id);
  }

  return id;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [playerId] = useState<string>(getPlayerId());
  const [isRegistered, setIsRegistered] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      socket.emit("REGISTER", { playerId }, () => {
        // server acks registration, only then mark ready
        setIsRegistered(true);
      });
    };

    const handleDisconnect = () => setIsRegistered(false);
    const handleGameState = (state: GameState) => setGameState(state);
    const handleRoomCreated = ({ state }: { state: GameState }) =>
      setGameState(state);
    const handleError = (message: string) => setError(message);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("GAME_STATE", handleGameState);
    socket.on("ROOM_CREATED", handleRoomCreated);
    socket.on("ERROR", handleError);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("GAME_STATE", handleGameState);
      socket.off("ROOM_CREATED", handleRoomCreated);
      socket.off("ERROR", handleError);
      socket.disconnect();
    };
  }, [playerId]);

  return (
    <SocketContext.Provider
      value={{ isRegistered, playerId, gameState, error }}
    >
      {children}
    </SocketContext.Provider>
  );
}
