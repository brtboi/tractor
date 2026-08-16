import { getCanonicalRank, isCardSame, type Card, type Suit } from "@tractor/shared";

export type Orientation = "top" | "bottom" | "left" | "right";

const SUIT_ORDER: Record<Suit, number> = {
  Spades: 0,
  Hearts: 1,
  Clubs: 2,
  Diamonds: 3,
  Joker: 4,
};

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

export const PHASE_LABELS: Record<string, string> = {
  breaking: "Breaking",
  drawing: "Drawing",
  bottoming: "Bottoming",
  asking: "Asking",
  playing: "Playing",
};
