import { createContext, useContext } from "react";
import type { GameState } from "@tractor/shared";

interface SocketContextValue {
  isRegistered: boolean;
  playerId: string;
  gameState: GameState | null;
  error: string | null;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

export function useGameSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useGameSocket must be used within SocketProvider");
  return ctx;
}