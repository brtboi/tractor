import type { GameState } from "@tractor/shared";
import { type ReactNode, useState, useEffect, useCallback } from "react";
import socket from "./socket";
import { SocketContext } from "./useGameSocket";

function getPlayerId(): string {
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
  const [errors, setErrors] = useState<string[]>([]);

  const pushError = useCallback((message: string) => {
    setErrors((prev) => [...prev, message]);
  }, []);

  const dismissError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    const handleConnect = async () => {
      const res = await socket.emitWithAck("REGISTER", { playerId });
      if (res.ok) {
        setIsRegistered(true);
      } else {
        pushError(res.error);
      }
    };

    const handleDisconnect = () => setIsRegistered(false);
    const handleGameState = (state: GameState) => setGameState(state);
    const handleRoomCreated = ({ state }: { state: GameState }) =>
      setGameState(state);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("GAME_STATE", handleGameState);
    socket.on("ROOM_CREATED", handleRoomCreated);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("GAME_STATE", handleGameState);
      socket.off("ROOM_CREATED", handleRoomCreated);
      socket.disconnect();
    };
  }, [playerId, pushError]);

  return (
    <SocketContext.Provider
      value={{
        isRegistered,
        playerId,
        gameState,
        errors,
        pushError,
        dismissError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
