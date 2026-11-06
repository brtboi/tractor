import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useGameSocket } from "../services/useGameSocket";
import { useRoomActions } from "../services/useRoomActions";
import { joinRoom } from "../services/gameActions";
import { loadName } from "../services/playerName";
import NotFound from "../NotFound/NotFound";
import notFoundStyles from "../NotFound/NotFound.module.scss";
import SettingsModal from "./SettingsModal";
import GameBoard from "./GameBoard";
import RoundSummary from "./RoundSummary";
import styles from "./GamePage.module.scss";

export default function GamePage() {
  const { roomId: urlRoomId = "" } = useParams();
  const roomCode = urlRoomId.toUpperCase();
  const navigate = useNavigate();
  const { playerId, gameState, isRegistered } = useGameSocket();
  const actions = useRoomActions();
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);
  // why joining from the link failed, keyed by room so a new link retries
  const [joinFailure, setJoinFailure] = useState<{
    roomCode: string;
    code: string;
    error: string;
  } | null>(null);

  const isInThisRoom =
    !!gameState &&
    gameState.roomId === roomCode &&
    !!gameState.players[playerId];
  const otherRoomId =
    gameState && gameState.roomId !== roomCode ? gameState.roomId : null;
  const failure = joinFailure?.roomCode === roomCode ? joinFailure : null;

  // remember once we've been seated here, so losing the room afterwards
  // (leaving, getting removed) doesn't count as "opened a link to it"
  const [seatedIn, setSeatedIn] = useState<string | null>(null);
  if (isInThisRoom && seatedIn !== roomCode) setSeatedIn(roomCode);
  const hasBeenSeated = seatedIn === roomCode;

  // opened a room link directly (or refreshed): join it. if we're already
  // seated there the server just hands our seat back.
  useEffect(() => {
    if (
      !isRegistered ||
      isInThisRoom ||
      hasBeenSeated ||
      otherRoomId ||
      !roomCode
    )
      return;
    let cancelled = false;
    joinRoom(roomCode, loadName()).then((res) => {
      if (!cancelled && !res.ok)
        setJoinFailure({ roomCode, code: res.code, error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [isRegistered, isInThisRoom, hasBeenSeated, otherRoomId, roomCode]);

  if (failure) {
    const code = <span className={notFoundStyles.code}>{roomCode}</span>;
    if (failure.code === "ROOM_NOT_FOUND")
      return (
        <NotFound
          title={<>oops, room {code} doesn't exist</>}
          message="It may have closed, or the code has a typo."
        />
      );
    return (
      <NotFound
        title={<>can't join room {code}</>}
        message={
          failure.code === "ROOM_FULL"
            ? "That table is already full."
            : failure.code === "GAME_ALREADY_STARTED"
              ? "That game already started."
              : failure.error
        }
      />
    );
  }

  if (otherRoomId) {
    return (
      <NotFound
        title={
          <>
            you're already in room{" "}
            <span className={notFoundStyles.code}>{otherRoomId}</span>
          </>
        }
        message="Leave it first if you want to join a different one."
        action={{
          label: "Back to my room",
          onClick: () => navigate(`/game/${otherRoomId}`, { replace: true }),
        }}
      />
    );
  }

  if (!gameState || !isInThisRoom) {
    // just left: we're on our way home, nothing to show
    if (hasBeenSeated) return null;
    return <p className={styles.joining}>joining {roomCode}…</p>;
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
