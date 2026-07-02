// client/src/services/SocketContext.tsx
// TODO: fix this actually
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { GameState } from "@tractor/shared";
import socket from "./socket";

interface SocketContextValue {
  playerId: string | null;
  gameState: GameState | null;
  error: string | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on("CONNECTED", () => setPlayerId(socket.id ?? null));
    socket.on("GAME_STATE", (state: GameState) => {
      console.log("game stated")
      setGameState(state);
    });
    socket.on("ROOM_CREATED", ({ state }: { state: GameState }) => setGameState(state));
    socket.on("ERROR", (message: string) => setError(message));

    return () => {
      socket.off("CONNECTED");
      socket.off("GAME_STATE");
      socket.off("ROOM_CREATED");
      socket.off("ERROR");
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ playerId, gameState, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useGameSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx)
    throw new Error("useGameSocket must be used within a SocketProvider");
  return ctx;
}
