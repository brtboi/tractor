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

export function createRoom(roomId: string): GameState {
  return {
    roomId,
    phase: "waiting",
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
      bottomPlayer: prev.teams[0].playerIds[0],
      callLevel: 0,
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

export function drawCard(prev: GameState, playerId: string): GameState {
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
  if (prev.currentRound.phase !== "drawing")
    throw new ServerError(
      "INVALID_PHASE",
      `should be drawing, found ${prev.currentRound.phase}`,
    );
  if (playerId !== prev.currentRound.currentTurn)
    throw new ServerError("NOT_YOUR_TURN");

  const newHand = [
    ...prev.currentRound.hands[playerId],
    prev.currentRound.drawPile[0],
  ];

  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      drawPile: prev.currentRound.drawPile.slice(1),
      hands: {
        ...prev.currentRound.hands,
        playerId: newHand,
      },
    },
  };
}

// TODO: reinforce trump

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
    throw new ServerError("INVALID_TRICK", "cards not found in hand");

  if (playerId === prev.currentRound.callPlayer) return prev;

  const newCallLevel = getCallLevel(cards, prev.currentRound.trumpRank);

  if (newCallLevel <= prev.currentRound.callLevel) return prev;

  // TODO: switch on/off team on first round

  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      callLevel: newCallLevel,
      callPlayer: playerId,
      trumpSuit: cards[0].suit,
    },
  };
}

// TODO: bottom eight

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
  let newCurrentTurn =
    (prev.playerOrder.indexOf(playerId) + 1) % prev.playerOrder.length;

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
    newCurrentTurn = prev.playerOrder.indexOf(
      newCurrentTricks[winnerIndex].playerId,
    );

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
      currentTurn: prev.playerOrder[newCurrentTurn],
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
