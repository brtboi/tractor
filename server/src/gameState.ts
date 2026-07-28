import {
  Suit,
  Card,
  GameState,
  Rank,
  ServerError,
  compareTricks,
  isTrickInList,
  getPointValue,
  getCallLevel,
} from "@tractor/shared";

// TODO: check ServerError types lowk
// TODO: lowk migrate to immer for immutable state handling

export function createRoom(roomId: string): GameState {
  return {
    roomId,
    phase: "waiting",
    currentRoundNumber: 0,
    players: {},
    playerOrder: [],
    teams: [
      {
        id: "A",
        playerIds: [],
        score: 0,
        hasPlayed2: false,
        hasPlayed11: false,
      },
      {
        id: "B",
        playerIds: [],
        score: 0,
        hasPlayed2: false,
        hasPlayed11: false,
      },
    ],

    currentRound: null,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  playerName: string,
): GameState {
  if (state.playerOrder.length >= 4) throw new ServerError("ROOM_FULL");

  return {
    ...state,
    playerOrder: [...state.playerOrder, playerId],
    players: {
      ...state.players,
      [playerId]: { id: playerId, name: playerName },
    },
  };
}

export function renamePlayer(
  state: GameState,
  playerId: string,
  newName: string,
): GameState {
  if (!state.players[playerId]) throw new ServerError("PLAYER_NOT_FOUND");

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], name: newName },
    },
  };
}

function testDeal(
  deckCount: number,
  playerIds: string[],
): Record<string, Card[]> {
  const deck = shuffleCards(deckCount);

  const hands: Record<string, Card[]> = playerIds.reduce(
    (acc, id) => ({ ...acc, [id]: [] }),
    {},
  );

  for (let i = 0; i < deck.length; i++) {
    const playerId = playerIds[i % playerIds.length];
    hands[playerId].push(deck[i]);
  }

  return hands;
}

export function startTestGame(prev: GameState): GameState {
  if (prev.playerOrder.length !== 4)
    throw new ServerError(
      "INVALID_NUM_PLAYERS",
      `Need 4 players to start game, found ${prev.playerOrder.length}`,
    );

  const playerIds = prev.playerOrder;

  // const hands = testDeal(2, playerIds);

  return {
    ...prev,
    phase: "playing",

    teams: [
      {
        id: "A",
        playerIds: [playerIds[0], playerIds[2]],
        score: 0,
        hasPlayed2: false,
        hasPlayed11: false,
      },
      {
        id: "B",
        playerIds: [playerIds[1], playerIds[3]],
        score: 0,
        hasPlayed2: false,
        hasPlayed11: false,
      },
    ],

    currentRound: {
      phase: "breaking",
      onTeam: "A",
      onPlayer: prev.teams[0].playerIds[0],
      bottomPlayer: prev.teams[0].playerIds[0],
      callCards: [],
      callPlayer: null,
      trumpSuit: "Spades",
      trumpRank: 2,
      currentTurn: playerIds[0],
      currentTricks: [],

      drawPile: shuffleCards(2),
      hands: prev.playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
      discards: prev.playerOrder.reduce(
        (acc, id) => ({ ...acc, [id]: [] }),
        {},
      ),
      points: [],
      bottom: [],
    },
  };
}

export function startGame(prev: GameState): GameState {
  throw new ServerError(
    "FEATURE_NOT_IMPLEMENTED",
    "startGame not implemented, please use startTestGame",
  );
}

function shuffleCards(deckCount: number): Card[] {
  const suits: Suit[] = ["Spades", "Hearts", "Diamonds", "Clubs"];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const deck: Card[] = [];

  for (let i = 0; i < deckCount; i++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, deck: i });
      }
    }

    // Add Jokers
    deck.push({ suit: "Joker", rank: 15, deck: i }); // Small Joker
    deck.push({ suit: "Joker", rank: 16, deck: i }); // Big Joker
  }

  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// TODO: breakDeck
// export function breakDeck(prev: GameState, playerId: string, breakAt: number): GameState {
//   if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
//   if (prev.currentRound.phase !== "breaking")
//     throw new ServerError(
//       "INVALID_PHASE",
//       `should be breaking, found ${prev.currentRound.phase}`,
//     );
//   if (
//     playerId !==
//     prev.playerOrder[
//       (prev.playerOrder.indexOf(prev.currentRound.currentTurn) - 1) %
//         prev.playerOrder.length
//     ]
//   )
//     throw new ServerError("NOT_YOUR_TURN");

//   if (breakAt < 0 || breakAt >= 2 * 54)
//     throw new ServerError("UNKNOWN_ERROR", "invalid breaking index");

//   const newDrawPile =

//   return {
//     ...prev,
//     currentRound: {
//       ...prev.currentRound
//       drawPile: prev.
//     }
//   }
// }

/**
 * return playerId of next player according to playerOrder. throws error if no currentRound/currentTurn
 */
function getNextTurn(prev: GameState): string {
  if (!prev.currentRound || !prev.currentRound.currentTurn)
    throw new Error("getNextTurn expected currentround found not that");
  const currentTurn = prev.currentRound.currentTurn;
  return prev.playerOrder[
    (prev.playerOrder.indexOf(currentTurn) + 1) % prev.playerOrder.length
  ];
}

export function drawCard(prev: GameState, playerId: string): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");

  const round = prev.currentRound;
  if (round.phase !== "drawing")
    throw new ServerError(
      "INVALID_PHASE",
      `should be drawing, found ${round.phase}`,
    );
  if (playerId !== round.currentTurn) throw new ServerError("NOT_YOUR_TURN");

  const newHand = [...round.hands[playerId], round.drawPile[0]];

  // drew last card
  // TODO: check if nobody has called yet
  if (!round.trumpSuit) {
    round.trumpSuit = round.drawPile[3].suit;
    round.callCards = [round.drawPile[3]];
  }

  // TODO: set on team if first round

  if (round.drawPile.length === 9)
    return {
      ...prev,
      currentRound: {
        ...round,
        phase: "bottoming",
        drawPile: [],
        hands: {
          ...round.hands,
          [playerId]: newHand,
        },
        bottom: round.drawPile.slice(1),
      },
    };

  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      phase: prev.currentRound.drawPile.length === 9 ? "bottoming" : "drawing",
      currentTurn: getNextTurn(prev),
      drawPile: prev.currentRound.drawPile.slice(1),
      hands: {
        ...prev.currentRound.hands,
        [playerId]: newHand,
      },
    },
  };
}

export function reinforceTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
  const round = prev.currentRound;

  if (round.phase !== "drawing")
    throw new ServerError(
      "INVALID_PHASE",
      `expected phase drawing, found ${round.phase}`,
    );
  if (playerId !== round.callPlayer)
    throw new ServerError(
      "INVALID_CALL",
      `expected call player ${round.callPlayer}, found player ${playerId}, you can't reinforce trump unless you called`,
    );

  if (!isTrickInList(cards, round.hands[playerId]))
    throw new ServerError("INVALID_CALL", "cards not found in hand");
  if (
    !isTrickInList(prev.currentRound.callCards, cards) ||
    cards.some(
      (card) => card.rank !== round.trumpRank || card.suit !== round.trumpSuit,
    )
  )
    throw new ServerError(
      "INVALID_CALL",
      "can only reinforce with the original callCards",
    );
  if (
    getCallLevel(cards, round.trumpRank) <=
    getCallLevel(round.callCards, round.trumpRank)
  )
    throw new ServerError(
      "INVALID_CALL",
      "reinforce trump must increase call level",
    );

  return {
    ...prev,
    currentRound: {
      ...round,
      callCards: cards,
    },
  };
}

export function callTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
  if (prev.currentRound.phase !== "drawing")
    throw new ServerError(
      "INVALID_PHASE",
      `should be drawing, found ${prev.currentRound.phase}`,
    );

  const hand = prev.currentRound.hands[playerId];
  if (!isTrickInList(cards, hand))
    throw new ServerError("INVALID_CALL", "cards not found in hand");

  if (playerId === prev.currentRound.callPlayer) return prev;

  if (
    getCallLevel(cards, prev.currentRound.trumpRank) <=
    getCallLevel(prev.currentRound.callCards, prev.currentRound.trumpRank)
  )
    return prev;

  // TODO: switch on/off team on first round
  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      callCards: cards,
      callPlayer: playerId,
      trumpSuit: cards[0].suit,
    },
  };
}

// TODO: individual actions per bottom card switch for others to see maybe
export function setBottom(
  prev: GameState,
  playerId: string,
  newBottom: Card[],
  newHand: Card[],
): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
  if (prev.currentRound.phase !== "bottoming")
    throw new ServerError(
      "INVALID_PHASE",
      `should be bottoming, found ${prev.currentRound.phase}`,
    );
  if (playerId !== prev.currentRound.bottomPlayer)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected bottom player ${prev.currentRound.bottomPlayer}, found ${playerId}`,
    );

  const fullPrevHand = [
    ...prev.currentRound.bottom,
    ...prev.currentRound.hands[playerId],
  ];

  if (
    !isTrickInList(newBottom, fullPrevHand) ||
    !isTrickInList(newHand, fullPrevHand)
  )
    throw new ServerError("INVALID_BOTTOM", "cards not found in hand");
  if (newBottom.length !== 8)
    throw new ServerError(
      "INVALID_BOTTOM",
      `new bottom length should be 8, found ${newBottom.length}`,
    );
  if (newHand.length !== 25)
    throw new ServerError(
      "INVALID_BOTTOM",
      `new hand should have length 25, found ${newHand.length}`,
    );

  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      phase: "asking",
      bottom: newBottom,
      hands: {
        ...prev.currentRound.hands,
        [playerId]: newHand,
      },
    },
  };
}

export function skipAsk(prev: GameState, playerId: string): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");

  const round = prev.currentRound;
  if (round.phase !== "asking")
    throw new ServerError(
      "INVALID_PHASE",
      `expected phase asking, found ${round.phase}`,
    );
  if (playerId !== round.currentTurn)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected turn ${round.currentTurn}, found ${playerId}`,
    );

  const nextTurn = getNextTurn(prev);
  // go to playing stage
  if (nextTurn === round.bottomPlayer)
    return {
      ...prev,
      currentRound: {
        ...round,
        phase: "playing",
        currentTurn: round.onPlayer,
      },
    };

  return {
    ...prev,
    currentRound: {
      ...round,
      currentTurn: nextTurn,
    },
  };
}

export function overturnTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");

  const round = prev.currentRound;
  if (round.phase !== "asking")
    throw new ServerError(
      "INVALID_PHASE",
      `expected phase asking, found ${round.phase}`,
    );
  if (playerId !== round.currentTurn)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected turn ${round.currentTurn}, found ${playerId}`,
    );
  if (!isTrickInList(cards, round.hands[playerId]))
    throw new ServerError("INVALID_CALL", "cards not in hand");

  // getCallLevel should check that it is valid call (calling with pair and stuff)
  if (
    getCallLevel(cards, round.trumpRank) <=
    getCallLevel(round.callCards, round.trumpRank)
  )
    throw new ServerError("INVALID_CALL", "must call with higher call level");

  return {
    ...prev,
    currentRound: {
      ...round,
      phase: "bottoming",
      trumpSuit: cards[0].suit,
      callCards: cards,
      bottomPlayer: playerId,
      currentTurn: playerId,
    },
  };
}

export function playTrick(
  prev: GameState,
  playerId: string,
  trick: Card[],
): GameState {
  if (prev.phase !== "playing")
    throw new ServerError(
      "GAME_NOT_IN_PROGRESS",
      `Expected phase to be 'playing', found '${prev.phase}'`,
    );
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");

  const prevRound = prev.currentRound;

  if (prevRound.currentTurn !== playerId)
    throw new ServerError("NOT_YOUR_TURN");
  if (!prevRound.trumpSuit)
    throw new ServerError("INVALID_TRICK", "Trump not set");

  if (!isTrickInList(trick, prevRound.hands[playerId]))
    throw new ServerError("INVALID_TRICK", "cards not found in hand");

  const newCurrentTricks = [
    ...prevRound.currentTricks,
    { playerId, trick: trick },
  ];
  const newHand = prevRound.hands[playerId].filter(
    (card) => !trick.includes(card),
  );
  const newDiscards = prevRound.discards;
  const newPoints = prevRound.points;
  let newCurrentTurn: string = getNextTurn(prev);

  // next Trick: find winner & updates points
  if (newCurrentTricks.length >= prev.playerOrder.length) {
    // find winning trick
    let winnerIndex = 0;
    for (let i = 1; i < newCurrentTricks.length; i++) {
      if (
        compareTricks(
          newCurrentTricks[i].trick,
          newCurrentTricks[winnerIndex].trick,
          newCurrentTricks[0].trick,
          prevRound.trumpSuit,
          prevRound.trumpRank,
        ) > 0
      )
        winnerIndex = i;
    }
    // winner plays first next trick
    newCurrentTurn = newCurrentTricks[winnerIndex].playerId;

    // update discards and points
    const winningTeam = prev.teams.find((team) =>
      team.playerIds.includes(newCurrentTricks[winnerIndex].playerId),
    )!;

    for (const { playerId, trick } of newCurrentTricks) {
      if (winningTeam.id === prevRound.onTeam) {
        // onTeam won: all cards are discards
        newDiscards[playerId] = [...newDiscards[playerId], trick];
      } else {
        // offTeam won: split each trick into points and discards
        const points: Card[] = [];
        const discard: Card[] = [];

        for (const card of trick) {
          if (getPointValue(card)) points.push(card);
          else discard.push(card);
        }

        newPoints.push(...points);
        newDiscards[playerId] = [...newDiscards[playerId], discard];
      }
    }
  }

  return {
    ...prev,
    currentRound: {
      ...prevRound,
      currentTurn: newCurrentTurn,
      currentTricks: newCurrentTricks,
      hands: {
        ...prevRound.hands,
        [playerId]: newHand,
      },
      discards: newDiscards,
      points: newPoints,
    },
  };
}

// TODO: Filter state so a player only sees their own hand
export function stateForPlayer(state: GameState, playerId: string) {
  // TODO: remember to give bottom eight to correct person
  return state;
}
