import { produce } from "immer";
import {
  Suit,
  Card,
  RoundPhase,
  RoundState,
  GameState,
  Rank,
  ServerError,
  compareTricks,
  isTrickInList,
  getPointValue,
  getCallLevel,
} from "@tractor/shared";

// TODO: check ServerError types lowk

/**
 * Asserts that the round exists and (optionally) is in one of the expected
 * phases. Returns the narrowed, non-null round for convenience.
 */
function requireRound(
  state: GameState,
  expectedPhase?: RoundPhase | RoundPhase[],
): RoundState {
  const round = state.currentRound;
  if (!round) throw new ServerError("NO_ACTIVE_ROUND");

  if (expectedPhase) {
    const allowed = Array.isArray(expectedPhase)
      ? expectedPhase
      : [expectedPhase];
    if (!allowed.includes(round.phase)) {
      throw new ServerError(
        "INVALID_PHASE",
        `expected phase ${allowed.join(" or ")}, found ${round.phase}`,
      );
    }
  }

  return round;
}

/**
 * Asserts it's the given player's turn. Call after requireRound.
 */
function requireTurn(
  round: Pick<RoundState, "currentTurn">,
  playerId: string,
): void {
  if (round.currentTurn !== playerId)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected turn ${round.currentTurn}, found ${playerId}`,
    );
}

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
  prev: GameState,
  playerId: string,
  playerName: string,
): GameState {
  if (prev.phase !== "waiting") throw new ServerError("GAME_ALREADY_STARTED");
  if (prev.playerOrder.length >= 4) throw new ServerError("ROOM_FULL");

  return produce(prev, (draft) => {
    draft.playerOrder.push(playerId);
    draft.players[playerId] = { id: playerId, name: playerName };
  });
}

export function renamePlayer(
  prev: GameState,
  playerId: string,
  newName: string,
): GameState {
  if (!prev.players[playerId]) throw new ServerError("PLAYER_NOT_FOUND");

  return produce(prev, (draft) => {
    draft.players[playerId].name = newName;
  });
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
  if (prev.phase !== "waiting") throw new ServerError("GAME_ALREADY_STARTED");
  if (prev.playerOrder.length !== 4)
    throw new ServerError(
      "INVALID_NUM_PLAYERS",
      `Need 4 players to start game, found ${prev.playerOrder.length}`,
    );

  const playerIds = prev.playerOrder;

  return produce(prev, (draft) => {
    draft.phase = "playing";

    draft.teams = [
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
    ];

    draft.currentRound = {
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
    };
  });
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
    deck.push({ suit: "Joker", rank: 15, deck: i }); // Small Joker
    deck.push({ suit: "Joker", rank: 16, deck: i }); // Big Joker
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

/**
 * returns the playerId after `currentTurn` in `playerOrder`
 */
function getNextTurn(playerOrder: string[], currentTurn: string): string {
  const idx = playerOrder.indexOf(currentTurn);
  if (idx === -1)
    throw new Error(
      `getNextTurn: currentTurn ${currentTurn} not found in playerOrder`,
    );
  return playerOrder[(idx + 1) % playerOrder.length];
}

export function drawCard(prev: GameState, playerId: string): GameState {
  const round = requireRound(prev, "drawing");
  requireTurn(round, playerId);

  return produce(prev, (draft) => {
    const round = draft.currentRound!;
    const drawnCard = round.drawPile[0];
    round.hands[playerId].push(drawnCard);

    
    if (!round.trumpSuit) {
      round.trumpSuit = round.drawPile[3].suit;
      round.callCards = [round.drawPile[3]];
    }

    // TODO: set on team if first round

    const isLastDraw = round.drawPile.length === 9;
    round.drawPile = round.drawPile.slice(1);
    // TODO: check if nobody has called yet
    
    if (isLastDraw) {
      round.phase = "bottoming";
      round.bottom = round.drawPile; // remaining 8 after slice
      round.drawPile = [];
    } else {
      round.phase = "drawing";
      round.currentTurn = getNextTurn(prev.playerOrder, playerId);
    }
  });
}

export function reinforceTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  const round = requireRound(prev, "drawing");

  if (playerId !== round.callPlayer)
    throw new ServerError(
      "INVALID_CALL",
      `expected call player ${round.callPlayer}, found player ${playerId}, you can't reinforce trump unless you called`,
    );
  if (!isTrickInList(cards, round.hands[playerId]))
    throw new ServerError("INVALID_CALL", "cards not found in hand");
  if (
    !isTrickInList(round.callCards, cards) ||
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

  return produce(prev, (draft) => {
    draft.currentRound!.callCards = cards;
  });
}

export function callTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  const round = requireRound(prev, "drawing");

  const hand = round.hands[playerId];
  if (!isTrickInList(cards, hand))
    throw new ServerError("INVALID_CALL", "cards not found in hand");

  if (playerId === round.callPlayer) return prev;
  if (
    getCallLevel(cards, round.trumpRank) <=
    getCallLevel(round.callCards, round.trumpRank)
  )
    return prev;

  // TODO: switch on/off team on first round
  return produce(prev, (draft) => {
    const round = draft.currentRound!;
    round.callCards = cards;
    round.callPlayer = playerId;
    round.trumpSuit = cards[0].suit;
  });
}

export function setBottom(
  prev: GameState,
  playerId: string,
  newBottom: Card[],
  newHand: Card[],
): GameState {
  const round = requireRound(prev, "bottoming");

  if (playerId !== round.bottomPlayer)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected bottom player ${round.bottomPlayer}, found ${playerId}`,
    );

  const fullPrevHand = [...round.bottom, ...round.hands[playerId]];

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

  return produce(prev, (draft) => {
    const round = draft.currentRound!;
    round.phase = "asking";
    round.bottom = newBottom;
    round.hands[playerId] = newHand;
  });
}

export function skipAsk(prev: GameState, playerId: string): GameState {
  const round = requireRound(prev, "asking");
  requireTurn(round, playerId);

  const nextTurn = getNextTurn(prev.playerOrder, round.currentTurn);

  return produce(prev, (draft) => {
    const draftRound = draft.currentRound!;
    if (nextTurn === round.bottomPlayer) {
      // go to playing stage
      draftRound.phase = "playing";
      draftRound.currentTurn = round.onPlayer;
    } else {
      draftRound.currentTurn = nextTurn;
    }
  });
}

export function overturnTrump(
  prev: GameState,
  playerId: string,
  cards: Card[],
): GameState {
  const round = requireRound(prev, "asking");
  requireTurn(round, playerId);

  if (!isTrickInList(cards, round.hands[playerId]))
    throw new ServerError("INVALID_CALL", "cards not in hand");
  if (
    getCallLevel(cards, round.trumpRank) <=
    getCallLevel(round.callCards, round.trumpRank)
  )
    throw new ServerError("INVALID_CALL", "must call with higher call level");

  return produce(prev, (draft) => {
    const draftRound = draft.currentRound!;
    draftRound.phase = "bottoming";
    draftRound.trumpSuit = cards[0].suit;
    draftRound.callCards = cards;
    draftRound.bottomPlayer = playerId;
    draftRound.currentTurn = playerId;
  });
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

  const prevRound = requireRound(prev);
  requireTurn(prevRound, playerId);

  if (!prevRound.trumpSuit)
    throw new ServerError("INVALID_TRICK", "Trump not set");
  if (!isTrickInList(trick, prevRound.hands[playerId]))
    throw new ServerError("INVALID_TRICK", "cards not found in hand");

  return produce(prev, (draft) => {
    const round = draft.currentRound!;

    round.currentTricks.push({ playerId, trick });
    round.hands[playerId] = round.hands[playerId].filter(
      (card) => !trick.includes(card),
    );
    round.currentTurn = getNextTurn(prev.playerOrder, playerId);

    // next trick: find winner & update points
    if (round.currentTricks.length >= prev.playerOrder.length) {
      let winnerIndex = 0;
      for (let i = 1; i < round.currentTricks.length; i++) {
        if (
          compareTricks(
            round.currentTricks[i].trick,
            round.currentTricks[winnerIndex].trick,
            round.currentTricks[0].trick,
            round.trumpSuit!,
            round.trumpRank,
          ) > 0
        )
          winnerIndex = i;
      }

      // winner plays first next trick
      round.currentTurn = round.currentTricks[winnerIndex].playerId;

      const winningTeam = prev.teams.find((team) =>
        team.playerIds.includes(round.currentTricks[winnerIndex].playerId),
      )!;

      for (const {
        playerId: trickPlayerId,
        trick: playedTrick,
      } of round.currentTricks) {
        if (winningTeam.id === round.onTeam) {
          // onTeam won: all cards are discards
          round.discards[trickPlayerId].push(playedTrick);
        } else {
          // offTeam won: split each trick into points and discards
          const points: Card[] = [];
          const discard: Card[] = [];

          for (const card of playedTrick) {
            if (getPointValue(card)) points.push(card);
            else discard.push(card);
          }

          round.points.push(...points);
          round.discards[trickPlayerId].push(discard);
        }
      }

      round.currentTricks = [];
    }
  });
}

// TODO: Filter state so a player only sees their own hand
export function stateForPlayer(state: GameState, playerId: string) {
  // TODO: remember to give bottom eight to correct person
  return state;
}
