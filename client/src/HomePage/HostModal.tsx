import { useEffect, useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import { createRoom, startTestGame } from "../services/gameActions";

interface Props {
  playerName: string;
  onClose: () => void;
}

const MIN_PLAYERS = 4;

export default function HostModal({ playerName, onClose }: Props) {
  const { roomId, gameState, error } = useGameSocket();
  const [copied, setCopied] = useState(false);

  // TODO: on mount, create the room with playerName
  useEffect(() => {
    createRoom(playerName);
  }, []);

  const players = gameState ? Object.values(gameState.players) : [];
  const playerCount = players.length;
  const isReady = playerCount >= MIN_PLAYERS;

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleStart = () => {
    if (!roomId || !isReady) return;
    // TODO: swap startTestGame for startGame once fully implemented
    startTestGame(roomId);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-title"
      >
        <div className="modal__header">
          <h2 className="modal__title" id="host-title">
            Room lobby
          </h2>
          <button
            className="modal__close btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>{error}</p>
        )}

        {roomId ? (
          <>
            <div className="room-code">
              <span className="room-code__label">Code</span>
              <span className="room-code__value">{roomId}</span>
              <button
                className="room-code__copy btn-icon"
                onClick={handleCopy}
                aria-label="Copy room code"
              >
                {copied ? "✓" : "⎘"}
              </button>
            </div>

            <div className="modal__divider" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span className="player-count-label">Players</span>
              <div className="player-slots">
                {Array.from({ length: MIN_PLAYERS }).map((_, i) => (
                  <div
                    key={i}
                    className={`slot ${i < playerCount ? "slot--filled" : ""}`}
                  >
                    {i < playerCount ? "♟" : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="player-list">
              {players.map((p, i) => (
                <div key={p.id} className="player-item">
                  <div className="player-avatar">{p.name[0].toUpperCase()}</div>
                  <span className="player-name">{p.name}</span>
                  {i === 0 && <span className="player-badge">host</span>}
                </div>
              ))}
            </div>

            <p className={`status-hint ${isReady ? "status-hint--ready" : ""}`}>
              {isReady
                ? "ready to start"
                : `waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount !== 1 ? "s" : ""}...`}
            </p>

            <button
              className="btn btn--primary"
              disabled={!isReady}
              onClick={handleStart}
            >
              Start game
            </button>
          </>
        ) : (
          <p className="status-hint">Creating room…</p>
        )}
      </div>
    </div>
  );
}
