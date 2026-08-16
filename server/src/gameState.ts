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
  isCardSame,
  Team,
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

function getTeam(playerId: string, teams: Team[]) {
  return teams.findIndex((team) => team.playerIds.includes(playerId));
}

export function createRoom(roomId: string): GameState {
  return {
    roomId,
    phase: "waiting_start",
    winner: -1,
    currentRoundNumber: 0,
    players: {},
    playerOrder: [],
    teams: [
      {
        name: "team 0",
        playerIds: [],
        score: 2,
        hasPlayed: new Array(15).fill(0),
      },
      {
        name: "team 1",
        playerIds: [],
        score: 2,
        hasPlayed: new Array(15).fill(0),
      },
    ],
    currentRound: null,
    settings: {
      mustPlay: new Array(15).fill(0),
      maxScoreJump: 4,
    },
  };
}

export function addPlayer(
  prev: GameState,
  playerId: string,
  playerName: string,
): GameState {
  if (prev.phase !== "waiting_start")
    throw new ServerError("GAME_ALREADY_STARTED");
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

export function renameTeam(
  prev: GameState,
  playerId: string,
  teamIndex: number,
  newName: string,
): GameState {
  if (!prev.players[playerId]) throw new ServerError("PLAYER_NOT_FOUND");
  if (getTeam(playerId, prev.teams) !== teamIndex)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `playerId: ${playerId}, not on team ${teamIndex}`,
    );
  return produce(prev, (draft) => {
    draft.teams[teamIndex].name = newName;
  });
}

export function reorderPlayers(
  prev: GameState,
  newPlayerOrder: string[],
): GameState {
  if (prev.phase !== "waiting_start")
    throw new ServerError("GAME_ALREADY_STARTED");
  if (newPlayerOrder.length !== prev.playerOrder.length)
    throw new ServerError(
      "INVALID_NUM_PLAYERS",
      `expected ${prev.playerOrder.length} players, found ${newPlayerOrder.length}`,
    );
  if (newPlayerOrder.some((playerId) => !prev.playerOrder.includes(playerId)))
    throw new ServerError("PLAYER_NOT_FOUND");

  return produce(prev, (draft) => {
    draft.playerOrder = newPlayerOrder;
    draft.teams[0].playerIds = [newPlayerOrder[0], newPlayerOrder[2]];
    draft.teams[1].playerIds = [newPlayerOrder[1], newPlayerOrder[3]];
  });
}

function newRound(
  onTeam: number,
  onPlayer: string,
  playerOrder: string[],
  trumpRank: number,
): RoundState {
  return {
    phase: "breaking",
    onTeam: onTeam,
    onPlayer: onPlayer,
    bottomPlayer: onPlayer,
    callCards: [],
    callPlayer: null,
    isFinalCall: false,
    trumpSuit: "Spades",
    trumpRank: trumpRank,
    currentTurn: onPlayer,
    currentTricks: [],

    drawPile: shuffleCards(2),
    hands: playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
    discards: playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
    points: [],
    bottom: [],
  };
}

export function startTestGame(prev: GameState): GameState {
  if (prev.phase !== "waiting_start")
    throw new ServerError("GAME_ALREADY_STARTED");
  if (prev.playerOrder.length !== 4)
    throw new ServerError(
      "INVALID_NUM_PLAYERS",
      `Need 4 players to start game, found ${prev.playerOrder.length}`,
    );

  const playerOrder = prev.playerOrder;

  return produce(prev, (draft) => {
    draft.phase = "playing";

    draft.teams[0].playerIds = [playerOrder[0], playerOrder[2]];
    draft.teams[1].playerIds = [playerOrder[1], playerOrder[3]];

    draft.currentRound = newRound(0, playerOrder[0], playerOrder, 2);
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

export function breakDeck(
  prev: GameState,
  playerId: string,
  breakAt: number,
): GameState {
  const round = requireRound(prev, "breaking");
  const breakerId = getNextTurn(prev.playerOrder, round.onPlayer, -1);
  if (playerId !== breakerId)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected playerId ${breakerId}, found ${playerId}`,
    );
  if (!Number.isInteger(breakAt) || breakAt < 0 || breakAt > 2 * 54)
    throw new ServerError(
      "INVALID_BREAK",
      `break index out of bounds: ${breakAt}`,
    );

  return produce(prev, (draft) => {
    const drawPile = draft.currentRound!.drawPile;
    if (breakAt === 2 * 54)
      round.drawPile = [drawPile[breakAt], ...drawPile.slice(0, breakAt - 1)];
    else
      round.drawPile = [
        ...drawPile.slice(breakAt + 1),
        ...drawPile.slice(0, breakAt),
      ];
  });
}

export function finishBreaking(prev: GameState, playerId: string): GameState {
  const round = requireRound(prev, "breaking");
  const breakerId = getNextTurn(prev.playerOrder, round.onPlayer, -1);
  if (playerId !== breakerId)
    throw new ServerError(
      "NOT_YOUR_TURN",
      `expected playerId ${breakerId}, found ${playerId}`,
    );

  return produce(prev, (draft) => {
    draft.currentRound!.phase = "drawing";
  });
}

/**
 * returns the playerId after `currentTurn` in `playerOrder`
 */
function getNextTurn(
  playerOrder: string[],
  currentTurn: string,
  increment: number = 1,
): string {
  const idx = playerOrder.indexOf(currentTurn);
  if (idx === -1)
    throw new Error(
      `getNextTurn: currentTurn ${currentTurn} not found in playerOrder`,
    );
  return playerOrder[
    (idx + increment + playerOrder.length) % playerOrder.length
  ];
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

    const isLastDraw = round.drawPile.length === 9;
    round.drawPile = round.drawPile.slice(1);

    if (isLastDraw) {
      round.phase = "bottoming";
      round.bottom = round.drawPile; // remaining 8 after slice
      round.drawPile = [];

      // ask around to call if nobody has called yet
      if (round.callPlayer === null) {
        round.phase = "asking_before_bottoming";
        round.currentTurn = round.onPlayer;
      }

      // todo set on team if first round
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
  // if it is VERY FIRST ROUND of the game, the first player to call becomes on team.
  // this can be changed if someone overturns BEFORE drawing is over
  // overturning trump after bottom eight has been bottomed does NOT change on team and off team
  // after bottoming, the on team and off team are locked in for the rest of the round with the person who bottomed/last called trump playing first
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
    // if trump was already locked in from the bottom (isFinalCall), nobody
    // can overturn anymore, so skip straight to playing instead of asking
    round.phase = round.isFinalCall ? "playing" : "asking";
    round.bottom = newBottom;
    round.hands[playerId] = newHand;
  });
}

export function skipAsk(prev: GameState, playerId: string): GameState {
  const round = requireRound(prev, ["asking", "asking_before_bottoming"]);
  requireTurn(round, playerId);

  const nextTurn = getNextTurn(prev.playerOrder, round.currentTurn);

  return produce(prev, (draft) => {
    const draftRound = draft.currentRound!;
    if (nextTurn === round.bottomPlayer) {
      // go to playing stage
      if (draftRound.phase === "asking") {
        draftRound.phase = "playing";
      } else {
        // nobody called trump the entire round: trump is decided by the
        // third card of the bottom eight, and can no longer be overturned
        draftRound.isFinalCall = true;
        draftRound.phase = "bottoming";
        draftRound.trumpSuit = round.bottom[2].suit;
      }

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
  const round = requireRound(prev, ["asking", "asking_before_bottoming"]);
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

function getNextRound(draft: GameState, totalPoints: number) {
  const round = draft.currentRound!;
  let onTeam = round.onTeam;

  let currentScore: number;
  let nextScore: number;

  // onTeam proceed
  if (totalPoints < 80) {
    currentScore = draft.teams[onTeam].score;
    draft.teams[onTeam].hasPlayed[currentScore] = 2;
    nextScore = currentScore + Math.floor((119 - totalPoints) / 40);
  }

  // offTeam proceed
  else {
    onTeam = 1 - onTeam;
    currentScore = draft.teams[onTeam].score;
    nextScore =
      currentScore +
      Math.min(
        Math.floor((totalPoints - 80) / 40),
        draft.settings.maxScoreJump,
      );
  }

  // check if they can jump all the way to nextScore
  for (; currentScore <= nextScore; currentScore++) {
    if (currentScore === 15) {
      draft.phase = "game_over";
      draft.winner = onTeam;
      return;
    }

    if (
      draft.settings.mustPlay[currentScore] >
      draft.teams[onTeam].hasPlayed[currentScore]
    )
      break;
  }

  draft.teams[onTeam].score = currentScore;
  draft.teams[onTeam].hasPlayed[currentScore] = 1;

  draft.phase = "waiting_next_round";
  draft.currentRound = newRound(
    onTeam,
    getNextTurn(draft.playerOrder, round.onPlayer, totalPoints < 80 ? 2 : 1),
    draft.playerOrder,
    draft.teams[onTeam].score,
  );
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
      (card) => !trick.some((c) => isCardSame(c, card)),
    );
    round.currentTurn = getNextTurn(prev.playerOrder, playerId);

    // next trick: find winner & update points
    if (round.currentTricks.length === prev.playerOrder.length) {
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

      const winningTeam = getTeam(playerId, draft.teams);

      if (winningTeam === -1)
        throw new ServerError(
          "PLAYER_NOT_FOUND",
          `cannot find player ${playerId} in teams. Team 0: ${draft.teams[0].playerIds}. Team 1: ${draft.teams[1].playerIds}`,
        );

      for (const {
        playerId: trickPlayerId,
        trick: playedTrick,
      } of round.currentTricks) {
        if (winningTeam === round.onTeam) {
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

      // out of cards: end round
      if (round.hands[round.currentTurn].length === 0) {
        draft.phase = "waiting_next_round";

        let totalPoints = getPointValue(round.points);

        // get points from bottom
        if (winningTeam !== round.onTeam)
          totalPoints += trick.length * 2 * getPointValue(round.bottom);

        getNextRound(draft, totalPoints);
      }
    }
  });
}

// TODO: Filter state so a player only sees their own hand
export function stateForPlayer(state: GameState, playerId: string) {
  // TODO: remember to give bottom eight to correct person
  // show everyone bottom eight if game phase is waiting next round

  // when currentRound.isFinalCall is true, trumpSuit was determined by
  // round.bottom[2] (nobody called trump for the whole round, so the third
  // card of the bottom eight was revealed to set trump). trumpSuit itself is
  // already safe to send to everyone at that point, but round.bottom as a
  // whole should still stay hidden from non-bottomPlayer players (besides
  // that one revealed card) until the round reaches "waiting_next_round" -
  // so here, if isFinalCall is true and playerId !== bottomPlayer, send only
  // round.bottom[2] (e.g. as a single-card array) instead of the full bottom.

  return state;
}
