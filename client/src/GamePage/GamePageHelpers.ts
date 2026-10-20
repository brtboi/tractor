import {
  getCallLevel,
  getCanonicalRank,
  isCardSame,
  isTrickInList,
  type Card,
  type GameState,
  type RoundState,
  type Suit,
} from "@tractor/shared";
import type { CardSize } from "./CardComponent";

export type Orientation = "top" | "bottom" | "left" | "right";

// sprite sheet is 53x75 per card
export const CARD_WIDTH = 53;
export const CARD_HEIGHT = 75;

export const CARD_SCALE: Record<CardSize, number> = { sm: 1, md: 1.5, lg: 2 };

export function isRedSuit(suit: Suit): boolean {
  return suit === "Hearts" || suit === "Diamonds";
}

const SUIT_ORDER: Record<Suit, number> = {
  Spades: 0,
  Hearts: 1,
  Clubs: 2,
  Diamonds: 3,
  Joker: 4,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  Spades: "♠",
  Hearts: "♥",
  Clubs: "♣",
  Diamonds: "♦",
  Joker: "",
};

export const PHASE_LABELS: Record<string, string> = {
  breaking: "Cutting",
  drawing: "Drawing",
  bottoming: "Bottoming",
  asking: "Asking",
  asking_before_bottoming: "Final Call",
  playing: "Playing",
};

// score levels 2-14, the range mustPlay/hasPlayed actually track
export const LEVEL_LABELS: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function levelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? String(level);
}

export function cardKey(card: Card): string {
  return `${card.deck}-${card.suit}-${card.rank}`;
}

/**
 * Sorts a hand highest to lowest. When trump is known, sorts by canonical
 * (trump-aware) rank; otherwise falls back to plain suit/rank order.
 */
export function sortHand(
  cards: Card[],
  trumpSuit: Suit | null,
  trumpRank: number,
): Card[] {
  return [...cards].sort((a, b) => {
    if (trumpSuit) {
      return (
        getCanonicalRank(b, trumpSuit, trumpRank) -
        getCanonicalRank(a, trumpSuit, trumpRank)
      );
    }
    if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return b.rank - a.rank;
  });
}

export function isCardSelected(card: Card, selected: Card[]): boolean {
  return selected.some((c) => isCardSame(card, c));
}

export function toggleCard(card: Card, selected: Card[]): Card[] {
  return isCardSelected(card, selected)
    ? selected.filter((c) => !isCardSame(card, c))
    : [...selected, card];
}

/**
 * Seat of `targetPlayerId` relative to `myPlayerId`, going clockwise around
 * the table (me at the bottom).
 */
export function getSeatOrientation(
  playerOrder: string[],
  myPlayerId: string,
  targetPlayerId: string,
): Orientation {
  const seats: Orientation[] = ["bottom", "right", "top", "left"];
  const myIndex = playerOrder.indexOf(myPlayerId);
  const targetIndex = playerOrder.indexOf(targetPlayerId);
  if (myIndex === -1 || targetIndex === -1) return "bottom";

  const diff =
    (targetIndex - myIndex + playerOrder.length) % playerOrder.length;
  return seats[diff];
}

// unit vectors pointing from the table center toward each seat
export const SEAT_VECTORS: Record<Orientation, { x: number; y: number }> = {
  bottom: { x: 0, y: 1 },
  top: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** the breaker is whoever sits right before the on player */
export function getBreakerId(playerOrder: string[], onPlayer: string): string {
  const idx = playerOrder.indexOf(onPlayer);
  return playerOrder[(idx - 1 + playerOrder.length) % playerOrder.length];
}

export function getTeamIndex(state: GameState, playerId: string): number {
  return state.teams.findIndex((team) => team.playerIds.includes(playerId));
}

export function playerName(state: GameState, playerId: string | null): string {
  if (!playerId) return "";
  return state.players[playerId]?.name ?? "someone";
}

/**
 * Until someone calls, the round's trumpSuit is just a server placeholder.
 */
export function isTrumpUncalled(round: RoundState): boolean {
  return round.callPlayer === null && !round.isFinalCall;
}

/**
 * The trump suit as far as the players know. Before a call, treat it as
 * no-trump ("Joker") - that still groups jokers and trump-rank cards.
 */
export function getKnownTrumpSuit(round: RoundState): Suit {
  if (isTrumpUncalled(round)) return "Joker";
  return round.trumpSuit ?? "Joker";
}

export function describeCard(card: Card): string {
  if (card.suit === "Joker")
    return card.rank === 16 ? "Big Joker" : "Small Joker";
  return `${levelLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

export function describeCall(cards: Card[]): string {
  if (cards.length === 0) return "";
  const label = describeCard(cards[0]);
  return cards.length > 1 ? `${label} ×${cards.length}` : label;
}

function beatsCurrentCall(cards: Card[], round: RoundState): boolean {
  return (
    getCallLevel(cards, round.trumpRank) >
    getCallLevel(round.callCards, round.trumpRank)
  );
}

/**
 * Why `cards` can't be used to call/overturn trump right now, or null if
 * they can. Mirrors the server's checks, which reject a losing call.
 */
export function getCallError(cards: Card[], round: RoundState): string | null {
  const rank = levelLabel(round.trumpRank);
  if (cards.length === 0) return `select a ${rank} or a joker pair`;
  if (getCallLevel(cards, round.trumpRank) === -1)
    return `call with matching ${rank}s or a joker pair`;
  if (!beatsCurrentCall(cards, round)) return "doesn't beat the current call";
  return null;
}

export function canCallTrump(
  cards: Card[],
  round: RoundState,
  playerId: string,
): boolean {
  if (round.phase !== "drawing" || round.callPlayer === playerId) return false;
  return getCallError(cards, round) === null;
}

/** Mirrors the server's reinforceTrump checks. */
export function canReinforceTrump(
  cards: Card[],
  round: RoundState,
  playerId: string,
): boolean {
  if (round.phase !== "drawing" || round.callPlayer !== playerId) return false;
  return (
    isTrickInList(round.callCards, cards) &&
    cards.every(
      (card) => card.rank === round.trumpRank && card.suit === round.trumpSuit,
    ) &&
    beatsCurrentCall(cards, round)
  );
}

export function canOverturnTrump(cards: Card[], round: RoundState): boolean {
  return (
    (round.phase === "asking" || round.phase === "asking_before_bottoming") &&
    getCallError(cards, round) === null
  );
}
