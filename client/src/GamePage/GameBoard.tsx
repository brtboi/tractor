import { useGameSocket } from "../services/useGameSocket";
import CardHand from "./CardHand";
import styles from "./GamePage.module.scss";

export default function GameBoard() {
  const { gameState } = useGameSocket();
  const currentRound = gameState?.currentRound;
  const orientation = ["top", "bottom", "left", "right"] as const;

  if (!gameState || !currentRound) {
    return <p>no game state :(</p>;
  }

  return (
    <div className={styles.gameBoard}>
      
      {gameState.playerOrder.map((playerId, i) => (
        <CardHand
          cards={currentRound.hands[playerId]}
          isFaceDown={false}
          orientation={orientation[i]}
          isSelectable={true}
        />
      ))}
    </div>
  );
}
