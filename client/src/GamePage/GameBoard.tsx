import type { Card } from "@tractor/shared";
import { useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import ActionBar from "./ActionBar";
import CardHand from "./CardHand";
import styles from "./GamePage.module.scss";
import { playTrick } from "../services/gameActions";

export default function GameBoard() {
  const { playerId, gameState } = useGameSocket();
  const currentRound = gameState?.currentRound;
  const orientation = ["right", "top", "left"] as const;

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  function handleCardClick(card: Card) {
    setSelectedCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card],
    );
  }

  function handlePlayTrick() {
    // TODO: actual error message or sumth
    if (!gameState) return;
    // TODO: add/handle ack from server side to confirm it is valid trick
    playTrick(gameState.roomId, selectedCards);
  }

  function handleSort() {
    
  }

  if (!gameState || !currentRound) {
    return <p>no game state :(</p>;
  }

  return (
    <div className={styles.gameBoard}>
      <ActionBar cards={currentRound.hands[playerId]} />

      {[0, 1, 2].map((i) => (
        <CardHand
          cards={
            currentRound.hands[
              gameState.playerOrder[
                (gameState.playerOrder.indexOf(playerId) + 1 + i) % 4
              ]
            ]
          }
          isFaceDown={false}
          orientation={orientation[i]}
          isSelectable={true}
        />
      ))}
    </div>
  );
}
