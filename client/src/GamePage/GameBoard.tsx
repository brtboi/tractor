import { useEffect, useState } from "react";
import {
  getPlayError,
  type AckResult,
  type Card,
  type GameState,
  type RoundState,
} from "@tractor/shared";
import { useGameSocket } from "../services/useGameSocket";
import { useRoomActions } from "../services/useRoomActions";
import { drawCard } from "../services/gameActions";
import ActionBar, { type ActionDescriptor } from "./ActionBar";
import OpponentSeat from "./OpponentSeat";
import Scoreboard from "./Scoreboard";
import TableCenter from "./TableCenter";
import styles from "./GamePage.module.scss";
import {
  canCallTrump,
  canOverturnTrump,
  canReinforceTrump,
  getBreakerId,
  getCallError,
  getKnownTrumpSuit,
  getSeatOrientation,
  getTeamIndex,
  isCardSelected,
  sortHand,
  toggleCard,
} from "./GamePageHelpers";

type Props = {
  // keyboard shortcuts are off while a modal/overlay is covering the board
  isInteractive: boolean;
};

/** whoever the table is currently waiting on */
function getActorId(gameState: GameState, round: RoundState): string | null {
  if (round.phase === "breaking")
    return getBreakerId(gameState.playerOrder, round.onPlayer);
  if (round.phase === "bottoming") return round.bottomPlayer;
  return round.currentTurn;
}

export default function GameBoard({ isInteractive }: Props) {
  const { playerId, gameState, pushError } = useGameSocket();
  const roomActions = useRoomActions();
  const currentRound = gameState?.currentRound;

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [sortEnabled, setSortEnabled] = useState(true);
  const [autoDraw, setAutoDraw] = useState(false);
  const [prevPhase, setPrevPhase] = useState(currentRound?.phase);

  // stale selections from a previous phase (e.g. someone else's call trump
  // moved us from "drawing" to "bottoming") shouldn't carry over. Resetting
  // during render (rather than in an effect) avoids an extra commit.
  if (currentRound && currentRound.phase !== prevPhase) {
    setPrevPhase(currentRound.phase);
    setSelectedCards([]);
  }

  const roomId = gameState?.roomId;
  const isLive = gameState?.phase === "playing" && !gameState.paused;
  const isMyDraw =
    isLive &&
    currentRound?.phase === "drawing" &&
    currentRound.currentTurn === playerId;
  const drawPileSize = currentRound?.drawPile.length;

  useEffect(() => {
    if (!autoDraw || !isMyDraw || !roomId) return;
    const timer = setTimeout(async () => {
      const res = await drawCard(roomId);
      if (!res.ok) {
        pushError(res.error);
        setAutoDraw(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [autoDraw, isMyDraw, drawPileSize, roomId, pushError]);

  const actions: ActionDescriptor[] = [];
  let hint: string | null = null;

  async function runAction(
    fn: () => Promise<AckResult>,
    onSuccess?: () => void,
  ) {
    const res = await fn();
    if (res.ok) onSuccess?.();
  }
  const clearSelection = () => setSelectedCards([]);

  if (!gameState || !currentRound) {
    return <p>no game state :(</p>;
  }

  const round = currentRound;
  const actorId = getActorId(gameState, round);
  const isMyTurn = actorId === playerId;
  const isBottomingMe =
    round.phase === "bottoming" && round.bottomPlayer === playerId;

  const rawHand = round.hands[playerId] ?? [];
  const myHand = isBottomingMe ? [...rawHand, ...round.bottom] : rawHand;
  const displayHand = sortEnabled
    ? sortHand(myHand, getKnownTrumpSuit(round), round.trumpRank)
    : myHand;
  const hasSelection = selectedCards.length > 0;

  switch (round.phase) {
    case "breaking":
      if (isMyTurn) {
        hint = "click the deck to cut it, as many times as you like";
        actions.push({
          id: "finish-breaking",
          label: "Done cutting",
          primary: true,
          onClick: () => runAction(roomActions.finishBreaking),
        });
      }
      break;

    case "drawing": {
      const isCaller = round.callPlayer === playerId;
      const callReady = isCaller
        ? canReinforceTrump(selectedCards, round, playerId)
        : canCallTrump(selectedCards, round, playerId);
      if (hasSelection && !callReady)
        hint = isCaller
          ? "reinforce with a bigger set of your call card"
          : getCallError(selectedCards, round);

      // draw stays mounted (just disabled) between turns so it doesn't
      // flicker in and out while everyone draws; a ready call takes over
      // as the primary (enter key) action
      actions.push({
        id: "draw",
        label: "Draw",
        primary: !!isMyDraw && !callReady,
        disabled: !isMyDraw,
        onClick: () => runAction(roomActions.drawCard),
      });
      actions.push(
        isCaller
          ? {
              id: "reinforce-trump",
              label: "Reinforce",
              primary: callReady,
              disabled: !callReady,
              onClick: () =>
                runAction(
                  () => roomActions.reinforceTrump(selectedCards),
                  clearSelection,
                ),
            }
          : {
              id: "call-trump",
              label: "Call trump",
              primary: callReady,
              disabled: !callReady,
              onClick: () =>
                runAction(
                  () => roomActions.callTrump(selectedCards),
                  clearSelection,
                ),
            },
      );
      break;
    }

    case "asking":
    case "asking_before_bottoming": {
      if (!isMyTurn) break;
      const canOverturn = canOverturnTrump(selectedCards, round);
      if (hasSelection) hint = getCallError(selectedCards, round);
      actions.push({
        id: "overturn-trump",
        label: "Overturn",
        primary: canOverturn,
        disabled: !canOverturn,
        onClick: () =>
          runAction(
            () => roomActions.overturnTrump(selectedCards),
            clearSelection,
          ),
      });
      actions.push({
        id: "skip-ask",
        label: "Pass",
        primary: !canOverturn,
        onClick: () => runAction(roomActions.skipAsk, clearSelection),
      });
      break;
    }

    case "bottoming":
      if (!isBottomingMe) break;
      hint =
        selectedCards.length === 8
          ? "ready to bury"
          : `select 8 cards to bury · ${selectedCards.length}/8`;
      actions.push({
        id: "confirm-bottom",
        label: "Bury",
        primary: true,
        disabled: selectedCards.length !== 8,
        onClick: () =>
          runAction(
            () =>
              roomActions.setBottom(
                selectedCards,
                myHand.filter((c) => !isCardSelected(c, selectedCards)),
              ),
            clearSelection,
          ),
      });
      break;

    case "playing": {
      if (!isMyTurn || !round.trumpSuit) break;
      const leadTrick = round.currentTricks[0]?.trick ?? null;
      const playError = getPlayError(
        selectedCards,
        rawHand,
        leadTrick,
        round.trumpSuit,
        round.trumpRank,
      );
      if (hasSelection) hint = playError;
      else
        hint = leadTrick
          ? `play ${leadTrick.length} card${leadTrick.length === 1 ? "" : "s"}`
          : "select cards to lead";
      actions.push({
        id: "play-trick",
        label: "Play",
        primary: true,
        disabled: playError !== null,
        onClick: () =>
          runAction(() => roomActions.playTrick(selectedCards), clearSelection),
      });
      break;
    }
  }

  return (
    <div className={styles.gameBoard}>
      <Scoreboard gameState={gameState} playerId={playerId} />

      <TableCenter
        gameState={gameState}
        round={round}
        playerId={playerId}
        actorId={actorId}
        canDraw={!!isMyDraw}
        onDrawPile={() => runAction(roomActions.drawCard)}
        onCut={roomActions.breakDeck}
      />

      {gameState.playerOrder
        .filter((id) => id !== playerId)
        .map((id) => {
          const orientation = getSeatOrientation(
            gameState.playerOrder,
            playerId,
            id,
          );
          if (orientation === "bottom") return null;
          return (
            <OpponentSeat
              key={id}
              playerId={id}
              player={gameState.players[id]}
              team={getTeamIndex(gameState, id)}
              cardCount={round.hands[id]?.length ?? 0}
              orientation={orientation}
              isTurn={actorId === id}
              isPartner={orientation === "top"}
            />
          );
        })}

      <ActionBar
        name={gameState.players[playerId]?.name ?? "you"}
        team={getTeamIndex(gameState, playerId)}
        isMyTurn={isMyTurn}
        cards={displayHand}
        selectedCards={selectedCards}
        highlightedCards={isBottomingMe ? round.bottom : []}
        onCardClick={(card) =>
          setSelectedCards((prev) => toggleCard(card, prev))
        }
        sortEnabled={sortEnabled}
        onToggleSort={() => setSortEnabled((prev) => !prev)}
        autoDraw={
          round.phase === "drawing"
            ? { enabled: autoDraw, onToggle: () => setAutoDraw((v) => !v) }
            : null
        }
        actions={actions}
        enterKeyEnabled={isInteractive}
        hint={hint}
      />
    </div>
  );
}
