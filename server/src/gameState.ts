import {
  Suit,
  Card,
  GameState,
  Rank,
  isPoint,
  compareTricks,
  ServerError,
  ErrorCode,
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

  const hands = testDeal(2, playerIds);

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
      onTeam: "A",
      trumpSuit: "Spades",
      trumpRank: 2,
      currentTurn: playerIds[0],
      currentTricks: [],
      hands,
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
  throw new ServerError("FEATURE_NOT_IMPLEMENTED", "startGame not implemented, please use startTestGame");
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
    throw new ServerError(
      "NOT_YOUR_TURN",
      `Expected turn to be ${prevRound.currentTurn}, found ${playerId}`,
    );
  if (!prevRound.trumpSuit)
    throw new ServerError("INVALID_TRICK", "Trump not set");

  if (trick.some((card) => !prevRound.hands[playerId].includes(card)))
    throw new ServerError("INVALID_TRICK", `Card not in hand`);

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
          if (isPoint(card)) points.push(card);
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

// WIP: Filter state so a player only sees their own hand
export function stateForPlayer(state: GameState, playerId: string) {
  return state;
}
