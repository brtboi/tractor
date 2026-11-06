import {
  Card,
  GameState,
  Suit,
  countPairs,
  getCanonicalRank,
  getEffectiveSuit,
  isTrump,
} from "@tractor/shared";
import {
  drawCard,
  finishBreaking,
  playTrick,
  setBottom,
  skipAsk,
} from "./gameState.js";

// ghost players are server-driven stand-ins so a host can test a full game
// alone. they play legal but dumb: never call, bury their lowest cards, and
// follow with their lowest legal cards.

export type GhostMove = {
  delayMs: number;
  apply: (state: GameState) => GameState;
};

function isGhost(state: GameState, playerId: string | null): boolean {
  return !!playerId && !!state.players[playerId]?.isGhost;
}

function byRankAscending(trumpSuit: Suit, trumpRank: number) {
  return (a: Card, b: Card) =>
    getCanonicalRank(a, trumpSuit, trumpRank) -
    getCanonicalRank(b, trumpSuit, trumpRank);
}

function chooseBottom(hand: Card[], trumpSuit: Suit, trumpRank: number) {
  // bury the lowest non-trump cards (trump only if forced)
  const sorted = [...hand].sort((a, b) => {
    const aTrump = isTrump(a, trumpSuit, trumpRank) ? 1 : 0;
    const bTrump = isTrump(b, trumpSuit, trumpRank) ? 1 : 0;
    if (aTrump !== bTrump) return aTrump - bTrump;
    return byRankAscending(trumpSuit, trumpRank)(a, b);
  });
  return { newBottom: sorted.slice(0, 8), newHand: sorted.slice(8) };
}

/** takes out and returns up to `count` pairs from `cards`, lowest first */
function takePairs(cards: Card[], count: number): Card[] {
  const taken: Card[] = [];
  for (let i = 0; i + 1 < cards.length && taken.length < count * 2; i++) {
    const a = cards[i];
    const j = cards.findIndex(
      (c, k) => k > i && c.suit === a.suit && c.rank === a.rank,
    );
    if (j === -1) continue;
    taken.push(a, cards[j]);
    cards.splice(j, 1);
    cards.splice(i, 1);
    i--;
  }
  return taken;
}

function choosePlay(
  hand: Card[],
  leadTrick: Card[] | null,
  trumpSuit: Suit,
  trumpRank: number,
): Card[] {
  const sorted = [...hand].sort(byRankAscending(trumpSuit, trumpRank));

  // leading: just throw out the highest single card
  if (!leadTrick) return [sorted[sorted.length - 1]];

  const suitOf = (card: Card) => getEffectiveSuit(card, trumpSuit, trumpRank);
  const leadSuit = suitOf(leadTrick[0]);
  const inSuit = sorted.filter((card) => suitOf(card) === leadSuit);
  const offSuit = sorted.filter((card) => suitOf(card) !== leadSuit);

  const pairsNeeded = Math.min(countPairs(leadTrick), countPairs(inSuit));
  const play = takePairs(inSuit, pairsNeeded);
  while (play.length < leadTrick.length && inSuit.length > 0)
    play.push(inSuit.shift()!);
  while (play.length < leadTrick.length && offSuit.length > 0)
    play.push(offSuit.shift()!);
  return play;
}

/**
 * The next action a ghost should take in this state, if any. Re-evaluated
 * right before it's applied, since a human may have acted in between.
 */
export function getGhostMove(state: GameState): GhostMove | null {
  const round = state.currentRound;
  if (!round || state.paused || state.phase !== "playing") return null;

  const { playerOrder } = state;

  switch (round.phase) {
    case "breaking": {
      const idx = playerOrder.indexOf(round.onPlayer);
      const breakerId =
        playerOrder[(idx - 1 + playerOrder.length) % playerOrder.length];
      if (!isGhost(state, breakerId)) return null;
      return {
        delayMs: 600,
        apply: (s) => finishBreaking(s, breakerId),
      };
    }

    case "drawing":
      if (!isGhost(state, round.currentTurn)) return null;
      return {
        delayMs: 180,
        apply: (s) => drawCard(s, round.currentTurn),
      };

    case "asking":
    case "asking_before_bottoming":
      if (!isGhost(state, round.currentTurn)) return null;
      return {
        delayMs: 700,
        apply: (s) => skipAsk(s, round.currentTurn),
      };

    case "bottoming": {
      const bottomPlayer = round.bottomPlayer;
      if (!bottomPlayer || !isGhost(state, bottomPlayer)) return null;
      const trumpSuit = round.trumpSuit ?? "Joker";
      const { newBottom, newHand } = chooseBottom(
        [...round.hands[bottomPlayer], ...round.bottom],
        trumpSuit,
        round.trumpRank,
      );
      return {
        delayMs: 900,
        apply: (s) => setBottom(s, bottomPlayer, newBottom, newHand),
      };
    }

    case "playing": {
      if (!isGhost(state, round.currentTurn) || !round.trumpSuit) return null;
      const trick = choosePlay(
        round.hands[round.currentTurn],
        round.currentTricks[0]?.trick ?? null,
        round.trumpSuit,
        round.trumpRank,
      );
      // pause a bit longer after a trick completes so people can see it,
      // and longer still while a throw is being announced
      const isThrowAnnounced =
        !!round.lastThrow && round.currentTricks.length === 1;
      const delayMs = isThrowAnnounced
        ? 2600
        : round.currentTricks.length === 0
          ? 1400
          : 800;
      return {
        delayMs,
        apply: (s) => playTrick(s, round.currentTurn, trick),
      };
    }
  }
}
