import { Suit, Card, GameState, Rank } from "@tractor/shared";

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
  if (state.playerOrder.length >= 4) throw new Error("Room is full");

  return {
    ...state,
    playerOrder: [...state.playerOrder, playerId],
    players: { ...state.players, [playerId]: { id: playerId, name: playerName } },
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
  if (prev.playerOrder.length !== 4) throw new Error("Need 4 players");

  const playerIds = prev.playerOrder;

  const hands = testDeal(
    2,
    playerIds,
  );

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
      currentTrick: [],
      hands,
      discards: prev.playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
      topDiscardedTrick: prev.playerOrder.reduce(
        (acc, id) => ({ ...acc, [id]: [] }),
        {},
      ),
      points: [],
      bottom: [],
    },
  };
}

export function playCard(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  if (prev.phase !== "playing") throw new Error("Game not in progress");
  if (!prev.currentRound) throw new Error("No active round");

  const prevRound = prev.currentRound;

  if (prevRound.currentTurn !== playerId) throw new Error("Not your turn");
  if (cards.some((card) => !prevRound.hands[playerId].includes(card)))
    throw new Error("Card not in hand");

  const newTrick = [...prevRound.currentTrick, { playerId, cards }];
  const newHand = prevRound.hands[playerId].filter(
    (card) => !cards.includes(card),
  );
  const newDiscards = [...prevRound.discards[playerId], ...cards];
  const newTopDiscardedTrick = {
    ...prevRound.topDiscardedTrick,
    [playerId]: cards,
  };
  const newCurrentTurn = (prev.playerOrder.indexOf(playerId) + 1) % prev.playerOrder.length;

  // next Trick: find winner & updates points
  if (newTrick.length >= prev.playerOrder.length) {
    let winnerIndex = 0;
    for (let i = 1; i < newTrick.length; i++) {
  }






  return {
    ...prev,

  };
}

export function nextTrick(prev: GameState): GameState {
  return {
    ...prev,
    currentRound: {
      ...prev.currentRound,
      currentTurn: ...
      currentTrick: {
        currentTurn: prev.currentRound?.currentTrick.winner?.playerId ?? prev.playerOrder[0],
        winner: null,
        plays: [],
        points: [],
      },
    },
  };
}

// Filter state so a player only sees their own hand
export function stateForPlayer(state: GameState, playerId: string) {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: p.id === playerId ? p.hand : `(${p.hand.length} cards)`,
    })),
  };
}
