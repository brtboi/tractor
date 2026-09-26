import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameSocket } from "../services/useGameSocket";
import { useRoomActions } from "../services/useRoomActions";
import SettingsModal from "./SettingsModal";
import GameBoard from "./GameBoard";
import RoundSummary from "./RoundSummary";
import styles from "./GamePage.module.scss";

export default function GamePage() {
  const { playerId, gameState } = useGameSocket();
  const actions = useRoomActions();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  if (!gameState || !gameState.players[playerId]) {
    return <p>no game state :(</p>;
  }

  const handleStartTestGame = async () => {
    const res = await actions.startTestGame();
    if (res.ok) setIsSettingsModalOpen(false);
  };

  const isModalShowing =
    isSettingsModalOpen ||
    gameState.phase === "waiting_start" ||
    gameState.paused;

  const summary = gameState.lastRoundSummary;
  const isSummaryShowing =
    !!summary &&
    (gameState.phase === "waiting_next_round" ||
      gameState.phase === "game_over");

  return (
    <>
      {gameState.currentRound && (
        <GameBoard isInteractive={!isModalShowing && !isSummaryShowing} />
      )}

      {gameState.currentRound && !isModalShowing && (
        <button
          className={styles.settingsGearButton}
          onClick={() => setIsSettingsModalOpen(true)}
          aria-label="settings"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.66 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
            />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {isSummaryShowing && !isModalShowing && (
          <RoundSummary
            key="summary"
            gameState={gameState}
            summary={summary}
            playerId={playerId}
            onNextRound={actions.nextRound}
            onLeave={actions.leaveRoom}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalShowing && (
          <SettingsModal
            key="settings"
            setIsSettingsOpen={setIsSettingsModalOpen}
            state={gameState}
            playerId={playerId}
            changeName={actions.changeName}
            addGhostPlayer={actions.addGhostPlayer}
            startGame={handleStartTestGame}
            leaveRoom={actions.leaveRoom}
            updateSettings={actions.updateSettings}
            reorderPlayers={actions.reorderPlayers}
            pauseGame={actions.pauseGame}
            resumeGame={actions.resumeGame}
          />
        )}
      </AnimatePresence>
    </>
  );
}
