import { Card, Suit, TrickSequence } from "./gameTypes.js";

export function cardToString(card: Card): string {
  const rank = card.rank.toString().padStart(2, "0");
  return `${card.suit}_${rank}`;
}

function isTrump(card: Card, trumpSuit: Suit, trumpRank: number): boolean {
  return (
    card.suit === trumpSuit || card.suit === "Joker" || card.rank === trumpRank
  );
}

export function getPointValue(card: Card): number {
  if (card.rank === 5) return 5;
  if (card.rank === 10) return 10;
  if (card.rank === 13) return 0;
  return 0;
}

/**
 * returns canonical/absolute rank of a card
 * Trump: small trump 502-513 (skip trump rank), trump rank 514, 515, jokers 516, 517.
 * Trump if no trump suit: jokers 515, 516.
 * Spades: 402-413 (skip trump rank), Hearts: 302-313 (skip trump rank),
 * Clubs: 202-213 (skip trump rank), Diamonds: 102-113 (skip trump rank).
 */
function getCanonicalRank(
  card: Card,
  trumpSuit: Suit,
  trumpRank: number,
): number {
  // small trump 502-513 (skip trump rank)
  if (card.suit === trumpSuit && card.rank < trumpRank) return card.rank + 500;
  if (card.suit === trumpSuit && card.rank > trumpRank) return card.rank + 499;

  // trump rank 514, 515
  if (card.suit !== trumpSuit && card.rank === trumpRank) return 514;
  if (card.suit === trumpSuit && card.rank === trumpRank) return 515;

  // Jokers 516, 517
  if (trumpSuit !== "Joker" && card.rank === 15) return 516; // small joker
  if (trumpSuit !== "Joker" && card.rank === 16) return 517; // big joker

  // Jokers no trump 515, 516
  if (trumpSuit === "Joker" && card.rank === 15) return 515; // small joker
  if (trumpSuit === "Joker" && card.rank === 16) return 516; // big joker

  // Spades 402-413 (skip trump rank)
  if (card.suit === "Spades" && card.rank < trumpRank) return card.rank + 400;
  if (card.suit === "Spades" && card.rank > trumpRank) return card.rank + 399;

  // Hearts 302-313 (skip trump rank)
  if (card.suit === "Hearts" && card.rank < trumpRank) return card.rank + 300;
  if (card.suit === "Hearts" && card.rank > trumpRank) return card.rank + 299;

  // Clubs 202-213 (skip trump rank)
  if (card.suit === "Clubs" && card.rank < trumpRank) return card.rank + 200;
  if (card.suit === "Clubs" && card.rank > trumpRank) return card.rank + 199;

  // Diamonds 102-113 (skip trump rank)
  if (card.suit === "Diamonds" && card.rank < trumpRank) return card.rank + 100;
  if (card.suit === "Diamonds" && card.rank > trumpRank) return card.rank + 99;

  throw new Error("Invalid card");
}

/**
 * returns suit of trick if all cards in trick are of same suit (or joker for trump).
 * returns null if trick is not suited.
 */
function getTrickSuit(
  trick: Card[],
  trumpSuit: Suit,
  trumpRank: number,
): Suit | null {
  if (trick.every((card) => isTrump(card, trumpSuit, trumpRank)))
    return "Joker";

  if (
    trick.every(
      (card) =>
        !isTrump(card, trumpSuit, trumpRank) && card.suit === trick[0].suit,
    )
  )
    return trick[0].suit;

  return null;
}

/**
 * From card[] to array of (number of cards, rank) for each set of consecutive pairs.
 * Assumes trick is sorted by canonical rank.
 * @example [22 33 44 77 A] -> [{numCards: 6, highestRank: 4}, {numCards: 2, highestRank: 7}, {numCards: 1, highestRank: 14}]
 * @param trick
 * @param trumpSuit
 * @param trumpRank
 * @returns
 */
function getTrickSequence(
  trick: Card[],
  trumpSuit: Suit,
  trumpRank: number,
): TrickSequence {
  if (!getTrickSuit(trick, trumpSuit, trumpRank)) return [];

  const degreeSequence: TrickSequence = [];
  let i = 0;
  while (i < trick.length) {
    const currentRank = getCanonicalRank(trick[i], trumpSuit, trumpRank);

    if (
      i + 1 >= trick.length ||
      getCanonicalRank(trick[i + 1], trumpSuit, trumpRank) !== currentRank
    ) {
      degreeSequence.push({
        numCards: 1,
        highestRank: currentRank,
      });

      i++;
    } else {
      let numConsecutivePairs = 1;
      while (
        i + 2 * numConsecutivePairs < trick.length &&
        getCanonicalRank(
          trick[i + 2 * numConsecutivePairs],
          trumpSuit,
          trumpRank,
        ) ===
          currentRank + 1 &&
        getCanonicalRank(
          trick[i + 2 * numConsecutivePairs + 1],
          trumpSuit,
          trumpRank,
        ) ===
          currentRank + 1
      ) {
        numConsecutivePairs++;
      }

      degreeSequence.push({
        numCards: 2 * numConsecutivePairs,
        highestRank: currentRank + numConsecutivePairs - 1,
      });

      i += 2 * numConsecutivePairs;
    }
  }
  return degreeSequence;
}

/**
 * All ways to split a run of `length` pairs (with highestRank) into contiguous sub-runs.
 * A "run" of length 1 is just a pair.
 * Returns array of TrickSequence (each is a list of groups from one split).
 */
function splitRun(length: number, highestRank: number): TrickSequence[] {
  if (length === 1) {
    // a pair: can stay as pair or split into two singles
    return [
      [{ numCards: 2, highestRank }],
      [
        { numCards: 1, highestRank },
        { numCards: 1, highestRank: highestRank },
      ],
    ];
  }

  // A run of `length` covers canonical ranks: (highestRank - length + 1) ... highestRank
  // Split into two contiguous sub-runs at every possible cut point
  const results: TrickSequence[] = [];

  // No split: keep as-is
  results.push([{ numCards: length * 2, highestRank }]);

  // Split at cut: left sub-run has ranks (lowestRank)..(lowestRank + leftLen - 1), right has the rest
  const lowestRank = highestRank - length + 1;
  for (let leftLen = 1; leftLen < length; leftLen++) {
    const rightLen = length - leftLen;
    const leftHighest = lowestRank + leftLen - 1;
    const rightHighest = highestRank;

    const leftSplits = splitRun(leftLen, leftHighest);
    const rightSplits = splitRun(rightLen, rightHighest);

    for (const left of leftSplits) {
      for (const right of rightSplits) {
        results.push([...left, ...right]);
      }
    }
  }

  return results;
}

/**
 * Generate all decompositions of a TrickSequence.
 * Each group in the sequence is independently split, and we take the cartesian product.
 */
function generateDecompositions(sequence: TrickSequence): TrickSequence[] {
  if (sequence.length === 0) return [[]];

  const [first, ...rest] = sequence;
  const restDecompositions = generateDecompositions(rest);

  let firstSplits: TrickSequence[];
  if (first.numCards === 1) {
    // singles can't be split further
    firstSplits = [[first]];
  } else {
    // numCards is always even for runs/pairs; length in pairs = numCards / 2
    firstSplits = splitRun(first.numCards / 2, first.highestRank);
  }

  const results: TrickSequence[] = [];
  for (const split of firstSplits) {
    for (const restDecomp of restDecompositions) {
      results.push([...split, ...restDecomp]);
    }
  }
  return results;
}

/**
 * Check if decomposition `bDecomp` beats `aSeq` via some bijection:
 * for every group in aSeq, there exists a group in bDecomp with same numCards and strictly higher rank.
 * Uses greedy matching (works because we just need existence of a perfect matching).
 */
function decompositionBeats(
  bDecomp: TrickSequence,
  aSeq: TrickSequence,
): boolean {
  if (bDecomp.length !== aSeq.length) return false;

  // Group by numCards, then check if every a-group has a b-group with higher rank
  // Use a greedy: for each a-group, find the lowest-rank b-group that beats it
  const bBySize = new Map<number, number[]>();
  for (const group of bDecomp) {
    if (!bBySize.has(group.numCards)) bBySize.set(group.numCards, []);
    bBySize.get(group.numCards)!.push(group.highestRank);
  }

  // Sort each size bucket ascending so we use the smallest sufficient rank
  for (const ranks of bBySize.values()) ranks.sort((x, y) => x - y);

  const aBySize = new Map<number, number[]>();
  for (const group of aSeq) {
    if (!aBySize.has(group.numCards)) aBySize.set(group.numCards, []);
    aBySize.get(group.numCards)!.push(group.highestRank);
  }

  for (const [size, aRanks] of aBySize.entries()) {
    const bRanks = bBySize.get(size);
    if (!bRanks || bRanks.length < aRanks.length) return false;

    // Sort a ascending, greedily match each a to smallest b that beats it
    const sortedA = [...aRanks].sort((x, y) => x - y);
    const usedB = new Set<number>(); // indices into bRanks

    for (const aRank of sortedA) {
      // Find smallest bRank > aRank not yet used
      let matched = false;
      for (let i = 0; i < bRanks.length; i++) {
        if (!usedB.has(i) && bRanks[i] > aRank) {
          usedB.add(i);
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
  }

  return true;
}

export function compareTricks(
  a: Card[],
  b: Card[],
  startingTrick: Card[],
  trumpSuit: Suit,
  trumpRank: number,
): number {
  if (a.length !== b.length)
    throw new Error("Can only compare tricks of the same length");

  const startSuit = getTrickSuit(startingTrick, trumpSuit, trumpRank);
  const aSuit = getTrickSuit(a, trumpSuit, trumpRank);
  const bSuit = getTrickSuit(b, trumpSuit, trumpRank);

  // b is not suited or doesn't follow lead suit/trump: a wins
  if (!bSuit) return 1;
  if (bSuit !== startSuit && bSuit !== "Joker") return 1;

  // a is non-trump, b is trump: b wins
  if (aSuit !== "Joker" && bSuit === "Joker") return -1;

  // a is trump, b is not: a wins
  if (aSuit === "Joker" && bSuit !== "Joker") return 1;

  // Both same suit: compare by decomposition
  const aSeq = getTrickSequence(a, trumpSuit, trumpRank);
  const bSeq = getTrickSequence(b, trumpSuit, trumpRank);
  const bDecompositions = generateDecompositions(bSeq);

  for (const bDecomp of bDecompositions) {
    if (decompositionBeats(bDecomp, aSeq)) return -1; // b wins
  }

  return 1; // a wins
}
