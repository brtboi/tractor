import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { AckResult, Card, GameSettings } from "@tractor/shared";
import { useGameSocket } from "./useGameSocket";
import {
  addGhostPlayer,
  breakDeck,
  callTrump,
  drawCard,
  finishBreaking,
  leaveRoom,
  nextRound,
  overturnTrump,
  pauseGame,
  playTrick,
  reinforceTrump,
  renamePlayer,
  reorderPlayers,
  resumeGame,
  setBottom,
  skipAsk,
  startTestGame,
  updateSettings,
} from "./gameActions";

/**
 * Every room/game action, pre-bound to the current room and already wired
 * to toast the error on failure - callers just invoke the function and
 * (optionally) look at the returned AckResult for their own on-success logic.
 */
export function useRoomActions() {
  const { gameState, pushError, resetGameState } = useGameSocket();
  const navigate = useNavigate();
  const roomId = gameState?.roomId ?? "";

  const run = useCallback(
    async (promise: Promise<AckResult>): Promise<AckResult> => {
      const res = await promise;
      if (!res.ok) pushError(res.error);
      return res;
    },
    [pushError],
  );

  return {
    changeName: (newName: string) => run(renamePlayer(roomId, newName)),
    addGhostPlayer: () => run(addGhostPlayer(roomId)),
    updateSettings: (settings: Partial<GameSettings>) =>
      run(updateSettings(roomId, settings)),
    reorderPlayers: (newPlayerOrder: string[]) =>
      run(reorderPlayers(roomId, newPlayerOrder)),
    pauseGame: () => run(pauseGame(roomId)),
    resumeGame: () => run(resumeGame(roomId)),
    startTestGame: () => run(startTestGame(roomId)),
    leaveRoom: async () => {
      // leaving needs to work even if the server can't confirm it (stale
      // room, dropped connection) - clear local state regardless of the ack
      const res = await run(leaveRoom(roomId));
      resetGameState();
      navigate("/");
      return res;
    },

    nextRound: () => run(nextRound(roomId)),
    breakDeck: (breakAt: number) => run(breakDeck(roomId, breakAt)),
    finishBreaking: () => run(finishBreaking(roomId)),
    drawCard: () => run(drawCard(roomId)),
    callTrump: (cards: Card[]) => run(callTrump(roomId, cards)),
    reinforceTrump: (cards: Card[]) => run(reinforceTrump(roomId, cards)),
    setBottom: (newBottom: Card[], newHand: Card[]) =>
      run(setBottom(roomId, newBottom, newHand)),
    skipAsk: () => run(skipAsk(roomId)),
    overturnTrump: (cards: Card[]) => run(overturnTrump(roomId, cards)),
    playTrick: (trick: Card[]) => run(playTrick(roomId, trick)),
  };
}
