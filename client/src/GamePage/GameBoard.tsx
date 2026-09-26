import { useState } from "react";
import { clsx } from "clsx";
import type { AckResult, Card } from "@tractor/shared";
import { useGameSocket } from "../services/useGameSocket";
import { useRoomActions } from "../services/useRoomActions";
import ActionBar, { type ActionDescriptor } from "./ActionBar";
import CardHand from "./CardHand";
import TableCenter from "./TableCenter";
import styles from "./GamePage.module.scss";
import {
  canCallTrump,
  canReinforceTrump,
  getKnownTrumpSuit,
  getSeatOrientation,
  isCardSelected,
  sortHand,
  toggleCard,
} from "./GamePageHelpers";

export default function GameBoard() {
  const { playerId, gameState } = useGameSocket();
  const roomActions = useRoomActions();
  const currentRound = gameState?.currentRound;

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [sortEnabled, setSortEnabled] = useState(true);
  const [prevPhase, setPrevPhase] = useState(currentRound?.phase);

  // stale selections from a previous phase (e.g. someone else's call trump
  // moved us from "drawing" to "bottoming") shouldn't carry over. Resetting
  // during render (rather than in an effect) avoids an extra commit.
  if (currentRound && currentRound.phase !== prevPhase) {
    setPrevPhase(currentRound.phase);
    setSelectedCards([]);
  }

  async function runAction(
    fn: () => Promise<AckResult>,
    onSuccess?: () => void,
  ) {
    const res = await fn();
    if (res.ok) onSuccess?.();
  }

  function handleCardClick(card: Card) {
    setSelectedCards((prev) => toggleCard(card, prev));
  }

  if (!gameState || !currentRound) {
    return <p>no game state :(</p>;
  }

  const isBottomingMe =
    currentRound.phase === "bottoming" &&
    currentRound.bottomPlayer === playerId;

  const rawHand = currentRound.hands[playerId] ?? [];
  const myHand = isBottomingMe
    ? [...rawHand, ...currentRound.bottom]
    : rawHand;
  const displayHand = sortEnabled
    ? sortHand(myHand, getKnownTrumpSuit(currentRound), currentRound.trumpRank)
    : myHand;

  const actions: ActionDescriptor[] = [];

  if (currentRound.phase === "breaking") {
    // the breaker is whoever sits right before the dealer (onPlayer)
    const { playerOrder } = gameState;
    const breakerId =
      playerOrder[
        (playerOrder.indexOf(currentRound.onPlayer) -
          1 +
          playerOrder.length) %
          playerOrder.length
      ];
    if (breakerId === playerId) {
      actions.push({
        id: "finish-breaking",
        label: "Finish Breaking",
        onClick: () => runAction(roomActions.finishBreaking),
      });
    }
  } else if (currentRound.phase === "drawing") {
    if (currentRound.currentTurn === playerId) {
      actions.push({
        id: "draw",
        label: "Draw Card",
        onClick: () => runAction(roomActions.drawCard),
      });
    }
    if (currentRound.callPlayer === playerId) {
      actions.push({
        id: "reinforce-trump",
        label: "Reinforce Trump",
        disabled: !canReinforceTrump(selectedCards, currentRound, playerId),
        onClick: () =>
          runAction(
            () => roomActions.reinforceTrump(selectedCards),
            () => setSelectedCards([]),
          ),
      });
    } else {
      actions.push({
        id: "call-trump",
        label: "Call Trump",
        disabled: !canCallTrump(selectedCards, currentRound, playerId),
        onClick: () =>
          runAction(
            () => roomActions.callTrump(selectedCards),
            () => setSelectedCards([]),
          ),
      });
    }
  } else if (currentRound.phase === "bottoming" && isBottomingMe) {
    actions.push({
      id: "confirm-bottom",
      label: `Confirm Bottom (${selectedCards.length}/8)`,
      disabled: selectedCards.length !== 8,
      onClick: () =>
        runAction(
          () =>
            roomActions.setBottom(
              selectedCards,
              myHand.filter((c) => !isCardSelected(c, selectedCards)),
            ),
          () => setSelectedCards([]),
        ),
    });
  } else if (
    (currentRound.phase === "asking" ||
      currentRound.phase === "asking_before_bottoming") &&
    currentRound.currentTurn === playerId
  ) {
    actions.push({
      id: "overturn-trump",
      label: "Overturn Trump",
      disabled: selectedCards.length === 0,
      onClick: () =>
        runAction(
          () => roomActions.overturnTrump(selectedCards),
          () => setSelectedCards([]),
        ),
    });
    actions.push({
      id: "skip-ask",
      label: "Skip",
      onClick: () => runAction(roomActions.skipAsk),
    });
  } else if (
    currentRound.phase === "playing" &&
    currentRound.currentTurn === playerId
  ) {
    actions.push({
      id: "play-trick",
      label: "Play Trick",
      disabled: selectedCards.length === 0,
      onClick: () =>
        runAction(
          () => roomActions.playTrick(selectedCards),
          () => setSelectedCards([]),
        ),
    });
  }

  const canDraw =
    currentRound.phase === "drawing" && currentRound.currentTurn === playerId;

  return (
    <div className={styles.gameBoard}>
      <TableCenter
        gameState={gameState}
        round={currentRound}
        playerId={playerId}
        canDraw={canDraw}
        onDrawPile={() => runAction(roomActions.drawCard)}
      />

      {gameState.playerOrder
        .filter((id) => id !== playerId)
        .map((id) => {
          const orientation = getSeatOrientation(
            gameState.playerOrder,
            playerId,
            id,
          );
          return (
            <div
              key={id}
              className={clsx(styles.opponentSeat, styles[orientation])}
            >
              <span
                className={clsx(
                  styles.playerLabel,
                  currentRound.currentTurn === id && styles.activeTurn,
                )}
              >
                {gameState.players[id]?.name ?? id}
              </span>
              <CardHand
                cards={currentRound.hands[id] ?? []}
                isFaceDown={true}
                orientation={orientation}
                isSelectable={false}
              />
            </div>
          );
        })}

      <ActionBar
        cards={displayHand}
        selectedCards={selectedCards}
        onCardClick={handleCardClick}
        sortEnabled={sortEnabled}
        onToggleSort={() => setSortEnabled((prev) => !prev)}
        actions={actions}
      />
    </div>
  );
}
