import { useState, useEffect } from "react";
import { useGameSocket } from "../services/useGameSocket";
import { joinRoom } from "../services/gameActions";

interface Props {
  playerName: string;
  onClose: () => void;
}

const MIN_PLAYERS = 4;

export default function JoinModal({ playerName, onClose }: Props) {
  const { gameState, error } = useGameSocket();
  const [codeInput, setCodeInput] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!codeInput.trim()) return;
    // TODO: backend integration — join room with playerName and codeInput
    joinRoom(codeInput.trim().toUpperCase(), playerName);
    setJoined(true);
  };

  // TODO: once gameState transitions to "playing", navigate to /game/:roomId
  useEffect(() => {
    if (gameState?.phase === "playing") {
      onClose();
      // navigate(`/game/${gameState.roomId}`);
    }
  }, [gameState?.phase]);

  const players = gameState ? Object.values(gameState.players) : [];
  const playerCount = players.length;
  const isReady = playerCount >= MIN_PLAYERS;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
      >
        <div className="modal__header">
          <h2 className="modal__title" id="join-title">
            Join a game
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

        {!joined ? (
          <>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Ask the host for their 5-letter room code.
            </p>
            <input
              className="input"
              type="text"
              placeholder="e.g. AB3XY"
              maxLength={5}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              autoFocus
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.2em",
                fontSize: "1.1rem",
                textAlign: "center",
              }}
            />
            <button
              className="btn btn--primary"
              disabled={codeInput.trim().length < 1}
              onClick={handleJoin}
            >
              Join room
            </button>
          </>
        ) : (
          <>
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
                ? "game starting…"
                : `waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount !== 1 ? "s" : ""}...`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
