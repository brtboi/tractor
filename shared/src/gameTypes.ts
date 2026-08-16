export type Suit = "Spades" | "Hearts" | "Diamonds" | "Clubs" | "Joker";

// 2-14 (where 11=J, 12=Q, 13=K, 14=A, 15=Small Joker, 16=Big Joker)
export type Rank =
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16;

export type Card = {
  deck: number; // 0 based index of deck
  suit: Suit;
  rank: Rank;
};

export type Player = {
  id: string;
  name: string;
};

export type TrickSequence = {
  numCards: number;
  highestRank: number;
}[];

export type RoundPhase =
  | "breaking"
  | "drawing"
  | "asking_before_bottoming"
  | "bottoming"
  | "asking"
  | "playing";

export type RoundState = {
  phase: RoundPhase;
  onTeam: number; // index in gameState.teams
  onPlayer: string; // playerId of who's on (who goes first)
  bottomPlayer: string | null; // playerId of whose bottom it is

  callCards: Card[];
  callPlayer: string | null;
  isFinalCall: boolean; // if nobody called during drawing -> trump decided from bottom
  trumpSuit: Suit | null; // "Joker" for no trump
  trumpRank: number;

  currentTurn: string; // playerId
  currentTricks: { playerId: string; trick: Card[] }[];

  drawPile: Card[];
  hands: Record<string, Card[]>; // player ID -> hand
  discards: Record<string, Card[][]>; // player ID -> discarded cards by trick
  points: Card[]; // cards won by off team
  bottom: Card[]; // cards on the bottom
};

// array of 0 | 1 | 2 for each score 2-14 (length 15)
// 0 for has not played at all
// 1 for has touched but not beaten
// 2 for has beaten
// index 0 and 1 of the array don't mean anything
export type PlayedScores = (0 | 1 | 2)[];

export type GameSettings = {
  // TODO: daniel vs brent style for overturning trump
  mustPlay: PlayedScores;
  // maximum number of levels the offTeam can jump
  maxScoreJump: number;
};

export type Team = {
  name: string;
  playerIds: string[];
  score: number;

  hasPlayed: PlayedScores;
};

export type GamePhase = "waiting_start" | "waiting_next_round" | "playing" | "game_over";

export type GameState = {
  roomId: string;
  phase: GamePhase;
  winner: number; // -1 for null
  players: Record<string, Player>; // player ID -> Player
  playerOrder: string[]; // player IDs in seating order
  teams: Team[];

  currentRoundNumber: number; // 0 index
  currentRound: RoundState | null;

  settings: GameSettings

  // TODO: chats?
  // TODO: player stats for that game: points scores, rounds won, mvp, etc.
  // TODO: be able to change number of decks
};
