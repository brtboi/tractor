import { useState } from "react";
import "../index.sass";
import "./HomePage.sass";
import HostModal from "./HostModal.tsx";
import JoinModal from "./JoinModal.tsx";

export default function HomePage() {
  const [nameInput, setNameInput] = useState("");
  const [showHost, setShowHost] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const canProceed = nameInput.trim().length >= 1;

  return (
    <div className="home">
      <div className="hero">
        <span className="hero__eyebrow">升级 · Sheng Ji</span>
        <h1 className="hero__title">
          Play <span>Tractor</span>
        </h1>
        <p className="hero__subtitle">
          The classic Chinese climbing card game, online with friends.
        </p>

        <div className="cards">
          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♟
            </div>
            <div className="card__title">Your name</div>
            <p className="card__desc">
              Set your display name before joining or hosting.
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

          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♚
            </div>
            <div className="card__title">Host a game</div>
            <p className="card__desc">
              Create a room and share the code with three friends.
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

          <div className="card">
            <div className="card__icon" aria-hidden="true">
              ♜
            </div>
            <div className="card__title">Join a game</div>
            <p className="card__desc">
              Enter a room code to jump into a friend's game.
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
      </div>

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