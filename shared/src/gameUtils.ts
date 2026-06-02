import { Card, Suit, TrickSequence } from "./gameTypes.js";

function isTrump(card: Card, trumpSuit: Suit, trumpRank: number): boolean {
  return (
    card.suit === trumpSuit || card.suit === "Joker" || card.rank === trumpRank
  );
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

// function getTrickDegreeSequence(
//   trick: Card[],
//   trumpSuit: Suit,
//   trumpRank: number,
// ): TrickDegree[] {
//   if (!getTrickSuit(trick, trumpSuit, trumpRank))
//     return [];

//   const rankCounts: number[] = [];
//   trick.forEach((card) => {
//     const rank = getCanonicalRank(card, trumpSuit, trumpRank);
//     rankCounts[rank] = (rankCounts[rank] ?? 0) + 1;
//   });

//   // let pairSequence: number[] = [];
//   // let numSingles = 0;

//   // let highestPairs: number[] = [];
//   // let highestSingle = 0;
//   // let i = 0;

//   // while (i < rankCounts.length) {
//   //   if (rankCounts[i] === 1) {
//   //     numSingles++;
//   //     highestSingle = i;
//   //   } else if (rankCounts[i] === 2) {
//   //     let numConsecuivePairs = 1;

//   //     while (i + 1 < rankCounts.length && rankCounts[i + 1] === 2) {
//   //       numConsecuivePairs++;
//   //       i++;
//   //     }

//   //     pairSequence.push(numConsecuivePairs);
//   //     highestPairs.push(i);
//   //   } else {
//   //     throw new Error(`Invalid trick with rank ${i} count ${rankCounts[i]}`);
//   //   }

//   //   i++;
//   // }
//   return {
//     pairSequence,
//     numSingles,
//     highestPairs,
//     highestSingle,
//   };
// }

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

  let degreeSequence: TrickSequence = [];
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
 * returns list of all possible downgrade sequences from trickSequence to targetSequence.
 * @param trickSequence
 * @param targetSequence
 * @param allDowngrades
 * @returns
 */
function generateDowngrades(
  trickSequence: TrickSequence,
  targetSequence: TrickSequence,
  allDowngrades: TrickSequence[] = [],
): TrickSequence[] {
  if (
    trickSequence.reduce((sum, { numCards }) => sum + numCards, 0) !==
    targetSequence.reduce((sum, { numCards }) => sum + numCards, 0)
  ) {
    throw new Error("Can only compare tricks of the same length");
  }

  // sort by number of cards descending
  trickSequence.sort((a, b) => b.numCards - a.numCards);
  targetSequence.sort((a, b) => b.numCards - a.numCards);

  const trickMaxnumCards = trickSequence[0].numCards;
  const targetMaxnumCards = targetSequence[0].numCards;

  // found valid downgrade sequence
  if (
    trickSequence.every(
      ({ numCards }, i) => numCards === targetSequence[i].numCards,
    )
  )
    allDowngrades.push(trickSequence);
  // if trick has fewer cards in highest set than target, can't downgrade
  else if (trickMaxnumCards < targetMaxnumCards) return [];

  // if both reduced to only singles (max for both is 1) and different lengths, can't downgrade
  if (
    trickMaxnumCards === 1 &&
    targetMaxnumCards === 1 &&
    trickSequence.length !== targetSequence.length
  )
    return [];

  // if trick and target have same number of cards in highest set, downgrade rest of sets
  if (trickMaxnumCards === targetMaxnumCards)
    return generateDowngrades(
      trickSequence.slice(1),
      targetSequence.slice(1),
    ).map((downgrade) => [trickSequence[0], ...downgrade]);

  // if target is singles but trick is not, can downgrade
  if (targetMaxnumCards === 1 && trickMaxnumCards !== 1)
    return generateDowngrades(
      [
        {
          numCards: 1,
          highestRank: trickSequence[0].highestRank,
        },
        {
          numCards: 1,
          highestRank: trickSequence[0].highestRank,
        },
        ...(trickMaxnumCards - 2 === 0
          ? []
          : [
              {
                numCards: trickMaxnumCards - 2,
                highestRank: trickSequence[0].highestRank - 1,
              },
            ]),
        ...trickSequence.slice(1),
      ],
      targetSequence,
    ).concat(
      generateDowngrades(
        [
          {
            numCards: trickSequence[0].numCards - 2,
            highestRank: trickSequence[0].highestRank,
          },
          {
            numCards: 1,
            highestRank:
              trickSequence[0].highestRank - trickSequence[0].numCards + 2,
          },
          {
            numCards: 1,
            highestRank:
              trickSequence[0].highestRank - trickSequence[0].numCards + 2,
          },
          ...trickSequence.slice(1),
        ],
        targetSequence,
      ),
    );

  return generateDowngrades(
    [
      {
        numCards: 2,
        highestRank: trickSequence[0].highestRank,
      },
      {
        numCards: trickSequence[0].numCards - 2,
        highestRank: trickSequence[0].highestRank - 1,
      },
      ...trickSequence.slice(1),
    ],
    targetSequence,
  ).concat(
    generateDowngrades(
      [
        {
          numCards: trickSequence[0].numCards - 2,
          highestRank: trickSequence[0].highestRank,
        },
        {
          numCards: 2,
          highestRank:
            trickSequence[0].highestRank - trickSequence[0].numCards + 2,
        },
        ...trickSequence.slice(1),
      ],
      targetSequence,
    ),
  );
}

/**
 * Assumes a was played before b. Returns positive number if a wins, negative if b wins
 * @param a current winning cards of trick. Assumed to be suited and valid
 */
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

  if (!bSuit) return 1;
  if (bSuit !== startSuit && bSuit !== "Joker") return 1;
  if (aSuit === "Joker" && bSuit !== "Joker") return 1;
}
