import { useState } from "react";
import "../index.sass";
import "./HomePage.sass";
import HostModal from "./HostModal.tsx";
import JoinModal from "./JoinModal.tsx";

interface Props {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function HomePage({ theme, onToggleTheme }: Props) {
  const [nameInput, setNameInput] = useState("");
  const [showHost, setShowHost] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const canProceed = nameInput.trim().length >= 1;

  return (
    <div className="home">
      <header className="header">
        <a className="header__wordmark" href="/">
          <span className="header__suit">♠</span>
          TRACTOR
        </a>
        <div className="header__actions">
          <button
            className="btn-icon"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main className="hero">
        <span className="hero__eyebrow">升级 · Sheng Ji</span>
        <h1 className="hero__title">
          Play <span>Tractor</span>
        </h1>
        <p className="hero__subtitle">
          The classic Chinese climbing card game, online with friends.
        </p>

        <div className="cards">
          {/* Name card — required before hosting or joining */}
          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♟
            </div>
            <div className="card__title">Your name</div>
            <p className="card__desc">
              Set your display name before joining or hosting a game.
            </p>
            <div className="card__body">
              <input
                className="input"
                type="text"
                placeholder="e.g. brtboi"
                value={nameInput}
                maxLength={20}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
          </div>

          {/* Host card */}
          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♚
            </div>
            <div className="card__title">Host a game</div>
            <p className="card__desc">
              Create a new room and share the code with three friends.
            </p>
            <div className="card__body">
              <button
                className="btn btn--primary"
                disabled={!canProceed}
                onClick={() => setShowHost(true)}
              >
                Create room
              </button>
            </div>
          </div>

          {/* Join card */}
          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♜
            </div>
            <div className="card__title">Join a game</div>
            <p className="card__desc">
              Enter a room code to join a friend's game.
            </p>
            <div className="card__body">
              <button
                className="btn btn--ghost"
                disabled={!canProceed}
                onClick={() => setShowJoin(true)}
              >
                Enter code
              </button>
            </div>
          </div>
        </div>
      </main>

      {showHost && (
        <HostModal
          playerName={nameInput.trim()}
          onClose={() => setShowHost(false)}
        />
      )}

      {showJoin && (
        <JoinModal
          playerName={nameInput.trim()}
          onClose={() => setShowJoin(false)}
        />
      )}
    </div>
  );
}
