import { produce } from "immer";
import {
  Suit,
  Card,
  RoundPhase,
  RoundState,
  GameState,
  GameSettings,
  Rank,
  ServerError,
  compareTricks,
  isTrickInList,
  getPointValue,
  getCallLevel,
  isCardSame,
  getPlayError,
  Team,
  ThrowAttempt,
  checkThrow,
  isThrow,
  isThrowGuaranteed,
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
  if (state.phase !== "playing")
    throw new ServerError(
      "GAME_NOT_IN_PROGRESS",
      `expected game phase playing, found ${state.phase}`,
    );
  if (state.paused) throw new ServerError("GAME_PAUSED");

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

/**
 * Asserts the given player is the room host. Only the host can reorder
 * players, change settings, add ghost players, or start the game.
 */
export function requireHost(state: GameState, playerId: string): void {
  if (state.hostId !== playerId)
    throw new ServerError(
      "NOT_HOST",
      `expected host ${state.hostId}, found ${playerId}`,
    );
}

export function createRoom(roomId: string): GameState {
  return {
    roomId,
    phase: "waiting_start",
    winner: -1,
    currentRoundNumber: 0,
    players: {},
    playerOrder: [],
    hostId: null,
    paused: false,
    teams: [
      {
        name: "Team 1",
        playerIds: [],
        score: 2,
        hasPlayed: new Array(15).fill(0),
      },
      {
        name: "Team 2",
        playerIds: [],
        score: 2,
        hasPlayed: new Array(15).fill(0),
      },
    ],
    currentRound: null,
    lastRoundSummary: null,
    settings: {
      mustPlay: new Array(15).fill(0),
      maxScoreJump: 4,
    },
  };
}

/**
 * Moves a seat's identity from oldId to newId: playerOrder, players, team
 * membership, and (if a round is in progress) hands/discards and every
 * round-level playerId reference. Used when a new player takes over a seat
 * vacated by someone who left mid-game - they inherit that seat's team,
 * cards, and turn position exactly as they were.
 *
 * oldId === newId is the "same player reconnecting to their own vacant
 * seat" case - nothing needs to move, just flip them back to active.
 */
function replaceSeat(
  draft: GameState,
  oldId: string,
  newId: string,
  newName: string,
): void {
  if (oldId === newId) {
    draft.players[newId].active = true;
    draft.players[newId].name = newName;
    return;
  }

  const idx = draft.playerOrder.indexOf(oldId);
  draft.playerOrder[idx] = newId;
  delete draft.players[oldId];
  draft.players[newId] = {
    id: newId,
    name: newName,
    active: true,
    isGhost: false,
  };

  for (const team of draft.teams) {
    const teamIdx = team.playerIds.indexOf(oldId);
    if (teamIdx !== -1) team.playerIds[teamIdx] = newId;
  }

  const round = draft.currentRound;
  if (round) {
    round.hands[newId] = round.hands[oldId] ?? [];
    delete round.hands[oldId];
    round.discards[newId] = round.discards[oldId] ?? [];
    delete round.discards[oldId];

    if (round.onPlayer === oldId) round.onPlayer = newId;
    if (round.bottomPlayer === oldId) round.bottomPlayer = newId;
    if (round.callPlayer === oldId) round.callPlayer = newId;
    if (round.currentTurn === oldId) round.currentTurn = newId;

    round.currentTricks = round.currentTricks.map((t) =>
      t.playerId === oldId ? { ...t, playerId: newId } : t,
    );
    if (round.lastThrow?.playerId === oldId) round.lastThrow.playerId = newId;
    if (round.lastThrow?.beatenBy === oldId) round.lastThrow.beatenBy = newId;
  }
}

export function addPlayer(
  prev: GameState,
  playerId: string,
  playerName: string,
  isGhost: boolean = false,
): GameState {
  if (prev.phase !== "waiting_start") {
    // game already started: the only way in is taking over a vacant seat
    // (someone who left mid-game, or your own seat after reconnecting)
    const vacantId = prev.playerOrder.find((id) => !prev.players[id]?.active);
    if (!vacantId) throw new ServerError("GAME_ALREADY_STARTED");

    return produce(prev, (draft) => {
      replaceSeat(draft, vacantId, playerId, playerName);
      // resume automatically once every seat is filled again
      if (draft.playerOrder.every((id) => draft.players[id].active))
        draft.paused = false;
    });
  }

  if (prev.playerOrder.length >= 4) throw new ServerError("ROOM_FULL");

  return produce(prev, (draft) => {
    if (draft.playerOrder.length === 0) draft.hostId = playerId;
    draft.playerOrder.push(playerId);
    draft.players[playerId] = {
      id: playerId,
      name: playerName,
      active: true,
      isGhost,
    };
  });
}

export function removePlayer(prev: GameState, playerId: string): GameState {
  if (!prev.players[playerId]) throw new ServerError("PLAYER_NOT_FOUND");

  if (prev.phase === "waiting_start") {
    return produce(prev, (draft) => {
      draft.playerOrder = draft.playerOrder.filter((id) => id !== playerId);
      delete draft.players[playerId];

      // re-pair teams (seats 0&2 vs 1&3) from what's left of the seating order
      draft.teams[0].playerIds = [
        draft.playerOrder[0],
        draft.playerOrder[2],
      ].filter((id): id is string => !!id);
      draft.teams[1].playerIds = [
        draft.playerOrder[1],
        draft.playerOrder[3],
      ].filter((id): id is string => !!id);

      // hand the host title to the next player in line if the host left
      if (draft.hostId === playerId)
        draft.hostId = draft.playerOrder[0] ?? null;
    });
  }

  // mid-game: the round engine has no notion of a seat disappearing, so
  // instead of removing them we mark the seat vacant and pause - their
  // position, team, and hand stay put for whoever takes over the seat next
  if (!prev.players[playerId].active) return prev;

  return produce(prev, (draft) => {
    draft.players[playerId].active = false;
    draft.paused = true;

    if (draft.hostId === playerId) {
      draft.hostId =
        draft.playerOrder.find(
          (id) => id !== playerId && draft.players[id].active,
        ) ?? null;
    }
  });
}

export function pauseGame(prev: GameState, playerId: string): GameState {
  requireHost(prev, playerId);
  if (!prev.currentRound) throw new ServerError("NO_ACTIVE_ROUND");
  if (prev.paused) return prev;

  return produce(prev, (draft) => {
    draft.paused = true;
  });
}

export function resumeGame(prev: GameState, playerId: string): GameState {
  requireHost(prev, playerId);
  if (!prev.paused) return prev;
  if (prev.playerOrder.some((id) => !prev.players[id].active))
    throw new ServerError(
      "SEAT_VACANT",
      "cannot resume while a seat is still vacant",
    );

  return produce(prev, (draft) => {
    draft.paused = false;
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

export function updateSettings(
  prev: GameState,
  playerId: string,
  settings: Partial<GameSettings>,
): GameState {
  if (!prev.players[playerId]) throw new ServerError("PLAYER_NOT_FOUND");
  requireHost(prev, playerId);
  if (prev.phase !== "waiting_start")
    throw new ServerError("GAME_ALREADY_STARTED");

  if (settings.mustPlay !== undefined) {
    if (
      settings.mustPlay.length !== 15 ||
      settings.mustPlay.some((v) => v !== 0 && v !== 1 && v !== 2)
    )
      throw new ServerError(
        "INVALID_SETTINGS",
        "mustPlay must have length 15 with values 0, 1, or 2",
      );
  }
  if (settings.maxScoreJump !== undefined) {
    if (!Number.isInteger(settings.maxScoreJump) || settings.maxScoreJump < 1)
      throw new ServerError(
        "INVALID_SETTINGS",
        "maxScoreJump must be a positive integer",
      );
  }

  return produce(prev, (draft) => {
    if (settings.mustPlay !== undefined)
      draft.settings.mustPlay = settings.mustPlay;
    if (settings.maxScoreJump !== undefined)
      draft.settings.maxScoreJump = settings.maxScoreJump;
  });
}

export function reorderPlayers(
  prev: GameState,
  playerId: string,
  newPlayerOrder: string[],
): GameState {
  requireHost(prev, playerId);
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
    lastTrick: [],
    lastTrickWinner: null,
    lastThrow: null,

    drawPile: shuffleCards(2),
    hands: playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
    discards: playerOrder.reduce((acc, id) => ({ ...acc, [id]: [] }), {}),
    points: [],
    bottom: [],
  };
}

export function startTestGame(prev: GameState, playerId: string): GameState {
  requireHost(prev, playerId);
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

export function startGame(prev: GameState, playerId: string): GameState {
  requireHost(prev, playerId);
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
  if (
    !Number.isInteger(breakAt) ||
    breakAt < 1 ||
    breakAt >= round.drawPile.length
  )
    throw new ServerError(
      "INVALID_BREAK",
      `break index out of bounds: ${breakAt}`,
    );

  // cut the deck: the top `breakAt` cards go to the bottom
  return produce(prev, (draft) => {
    const draftRound = draft.currentRound!;
    const drawPile = draftRound.drawPile;
    draftRound.drawPile = [
      ...drawPile.slice(breakAt),
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
      } else if (draft.currentRoundNumber === 0) {
        // set on/off team if first round based off of who called
        round.onTeam = getTeam(round.callPlayer, draft.teams);
        round.onPlayer = round.callPlayer;
        round.bottomPlayer = round.callPlayer;
      }
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

  if (playerId === round.callPlayer)
    throw new ServerError(
      "INVALID_CALL",
      "you already called, reinforce instead",
    );
  if (getCallLevel(cards, round.trumpRank) === -1)
    throw new ServerError("INVALID_CALL", "not a valid call");
  if (
    getCallLevel(cards, round.trumpRank) <=
    getCallLevel(round.callCards, round.trumpRank)
  )
    throw new ServerError("INVALID_CALL", "call must beat the current call");

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
    // asking goes around starting after the bottom player; playing starts
    // with whoever is on
    round.currentTurn = round.isFinalCall
      ? round.onPlayer
      : getNextTurn(prev.playerOrder, playerId);
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
        // if nobody called during drawing, trump decided by third card on bottom
        // trump cannot be overturned if this happens
        // if first round, whoever drew first is on by default set at create new game
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
    draftRound.callPlayer = playerId;

    if (draft.currentRoundNumber === 0) {
      // first round: whoever calls/overturns last is on, takes the bottom
      // and leads
      draftRound.onTeam = getTeam(playerId, draft.teams);
      draftRound.onPlayer = playerId;
      draftRound.bottomPlayer = playerId;
    } else if (round.phase === "asking_before_bottoming") {
      // nobody called while drawing, so the bottom hasn't been taken yet;
      // it stays with whoever's on by rotation
      draftRound.bottomPlayer = draftRound.onPlayer;
    } else {
      // overturning after the bottom was buried: the overturner re-buries
      draftRound.bottomPlayer = playerId;
    }
    draftRound.currentTurn = draftRound.bottomPlayer;
  });
}

function getNextRound(
  draft: GameState,
  totalPoints: number,
  bottomPoints: number,
) {
  const round = draft.currentRound!;
  let onTeam = round.onTeam;

  let currentScore: number;
  let nextScore: number;

  // onTeam proceed: 0 -> +3, 5-35 -> +2, 40-75 -> +1
  if (totalPoints < 80) {
    currentScore = draft.teams[onTeam].score;
    draft.teams[onTeam].hasPlayed[currentScore] = 2;
    nextScore =
      currentScore +
      (totalPoints === 0 ? 3 : Math.floor((119 - totalPoints) / 40));
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

  // climb one level at a time, stopping early at any level this team still
  // has to play (settings.mustPlay); climbing past A (14) wins the game
  let level = currentScore;
  while (level < nextScore && level < 15) {
    if (draft.settings.mustPlay[level] > draft.teams[onTeam].hasPlayed[level])
      break;
    level++;
  }

  draft.lastRoundSummary = {
    roundNumber: draft.currentRoundNumber,
    onTeam: round.onTeam,
    points: totalPoints,
    bottom: round.bottom.map((card) => ({ ...card })),
    bottomPoints,
    levelingTeam: onTeam,
    fromLevel: currentScore,
    toLevel: level,
  };

  if (level === 15) {
    draft.phase = "game_over";
    draft.winner = onTeam;
    return;
  }

  draft.teams[onTeam].score = level;
  draft.teams[onTeam].hasPlayed[level] = Math.max(
    draft.teams[onTeam].hasPlayed[level],
    1,
  ) as 1 | 2;

  draft.phase = "waiting_next_round";
  draft.currentRoundNumber += 1;
  draft.currentRound = newRound(
    onTeam,
    getNextTurn(draft.playerOrder, round.onPlayer, totalPoints < 80 ? 2 : 1),
    draft.playerOrder,
    draft.teams[onTeam].score,
  );
}

/**
 * Moves from the round summary screen into the next round. Host only.
 */
export function nextRound(prev: GameState, playerId: string): GameState {
  requireHost(prev, playerId);
  if (prev.phase !== "waiting_next_round")
    throw new ServerError(
      "INVALID_PHASE",
      `expected game phase waiting_next_round, found ${prev.phase}`,
    );

  return produce(prev, (draft) => {
    draft.phase = "playing";
  });
}

/**
 * "Can I play this": a lead that isn't a single, pair or tractor gets
 * checked against everyone else's hands. If anyone (teammate included)
 * could beat part of it, only that part is played. Returns null for plain
 * leads and for throws that can't possibly be beaten.
 */
function resolveThrow(
  state: GameState,
  playerId: string,
  attempted: Card[],
): ThrowAttempt | null {
  const round = state.currentRound!;
  const trumpSuit = round.trumpSuit!;
  if (!isThrow(attempted, trumpSuit, round.trumpRank)) return null;

  // what the thrower can see for sure: their hand, everything played so
  // far, and the bottom if they buried it
  const known = [
    ...round.hands[playerId],
    ...Object.values(round.discards).flat(2),
    ...round.points,
    ...(round.bottomPlayer === playerId ? round.bottom : []),
  ];
  if (isThrowGuaranteed(attempted, known, trumpSuit, round.trumpRank))
    return null;

  const others: { playerId: string; hand: Card[] }[] = [];
  for (
    let id = getNextTurn(state.playerOrder, playerId);
    id !== playerId;
    id = getNextTurn(state.playerOrder, id)
  )
    others.push({ playerId: id, hand: round.hands[id] });

  const check = checkThrow(attempted, others, trumpSuit, round.trumpRank);
  return {
    playerId,
    attempted,
    played: check?.forced ?? attempted,
    beatenBy: check?.beatenBy ?? null,
  };
}

export function playTrick(
  prev: GameState,
  playerId: string,
  attempted: Card[],
): GameState {
  const prevRound = requireRound(prev, "playing");
  requireTurn(prevRound, playerId);

  if (!prevRound.trumpSuit)
    throw new ServerError("INVALID_TRICK", "Trump not set");

  const playError = getPlayError(
    attempted,
    prevRound.hands[playerId],
    prevRound.currentTricks[0]?.trick ?? null,
    prevRound.trumpSuit,
    prevRound.trumpRank,
  );
  if (playError) throw new ServerError("INVALID_TRICK", playError);

  const isLead = prevRound.currentTricks.length === 0;
  const throwAttempt = isLead ? resolveThrow(prev, playerId, attempted) : null;
  const trick = throwAttempt?.played ?? attempted;

  return produce(prev, (draft) => {
    const round = draft.currentRound!;
    if (isLead) round.lastThrow = throwAttempt;

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
            round.currentTricks[winnerIndex].trick,
            round.currentTricks[i].trick,
            round.currentTricks[0].trick,
            round.trumpSuit!,
            round.trumpRank,
          ) < 0
        )
          winnerIndex = i;
      }

      const winnerId = round.currentTricks[winnerIndex].playerId;

      // winner plays first next trick
      round.currentTurn = winnerId;

      const winningTeam = getTeam(winnerId, draft.teams);

      if (winningTeam === -1)
        throw new ServerError(
          "PLAYER_NOT_FOUND",
          `cannot find player ${winnerId} in teams. Team 0: ${draft.teams[0].playerIds}. Team 1: ${draft.teams[1].playerIds}`,
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

      round.lastTrick = round.currentTricks.map(({ playerId, trick }) => ({
        playerId,
        trick: trick.map((card) => ({ ...card })),
      }));
      round.lastTrickWinner = winnerId;
      round.currentTricks = [];

      // out of cards: end round
      if (round.hands[round.currentTurn].length === 0) {
        let totalPoints = getPointValue(round.points);

        // off team winning the last trick also wins the bottom's points
        let bottomPoints = 0;
        if (winningTeam !== round.onTeam)
          bottomPoints = trick.length * 2 * getPointValue(round.bottom);
        totalPoints += bottomPoints;

        getNextRound(draft, totalPoints, bottomPoints);
      }
    }
  });
}

// stand-in for a card whose identity must stay hidden from this player;
// array length (card count) is preserved, only the identity is scrubbed.
// safe to use anywhere since face-down rendering never reads card identity.
const HIDDEN_CARD: Card = { deck: 0, suit: "Spades", rank: 2 };

export function stateForPlayer(state: GameState, playerId: string): GameState {
  const round = state.currentRound;
  if (!round) return state;

  return produce(state, (draft) => {
    const draftRound = draft.currentRound!;

    // hands: only your own is visible; others are scrubbed but keep their
    // length so opponents' card counts are still visible
    for (const id of Object.keys(draftRound.hands)) {
      if (id === playerId) continue;
      draftRound.hands[id] = draftRound.hands[id].map(() => HIDDEN_CARD);
    }

    // draw pile: only its size is public
    draftRound.drawPile = draftRound.drawPile.map(() => HIDDEN_CARD);

    // discards: your own full history is visible; for everyone else, only
    // the most recently discarded trick is visible (mirrors a real table,
    // where older discards get buried under the pile)
    for (const id of Object.keys(draftRound.discards)) {
      if (id === playerId) continue;
      const tricks = draftRound.discards[id];
      draftRound.discards[id] =
        tricks.length > 0 ? [tricks[tricks.length - 1]] : [];
    }

    // bottom: hidden from everyone except whoever is bottoming, except for
    // bottom[2] once isFinalCall reveals it (nobody called trump, so that
    // card was flipped to decide trump and is public knowledge)
    if (playerId !== draftRound.bottomPlayer) {
      draftRound.bottom = draftRound.bottom.map((card, i) =>
        draftRound.isFinalCall && i === 2 ? card : HIDDEN_CARD,
      );
    }

    // currentTricks, points, callCards/callPlayer are all public information
    // already and need no filtering
  });
}
