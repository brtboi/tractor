// client/src/services/useGameSocket.ts
import { useEffect, useState } from "react";
import type { GameState } from "@tractor/shared";
import socket from "./socket.ts";

export function useGameSocket() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on("GAME_STATE", (state) => setGameState(state));
    socket.on("ROOM_CREATED", ({ roomId }) => setRoomId(roomId));
    socket.on("ERROR", (message) => setError(message));

    return () => {
      socket.off("GAME_STATE");
      socket.off("ROOM_CREATED");
      socket.off("ERROR");
      socket.disconnect();
    };
  }, []);

  return { gameState, error, roomId };
}
