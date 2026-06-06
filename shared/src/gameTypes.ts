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

export type TeamId = "A" | "B";

export type Team = {
  id: TeamId;
  playerIds: string[];
  score: number;
  hasPlayed2: boolean;
  hasPlayed11: boolean;
};

export type TrickSequence = {
  numCards: number;
  highestRank: number;
}[];

export type RoundState = {
  onTeam: TeamId;
  trumpSuit: Suit | null; // "Joker" for no trump
  trumpRank: number;

  currentTurn: string // playerId
  currentTricks: {playerId: string; trick: Card[]}[];

  hands: Record<string, Card[]>; // player ID -> hand
  discards: Record<string, Card[][]>; // player ID -> discarded cards by trick
  points: Card[]; // cards won by off team
  bottom: Card[]; // cards on the bottom
};

export type GamePhase = "waiting" | "playing" | "game_over";

export type GameState = {
  roomId: string;
  phase: GamePhase;
  players: Record<string, Player>; // player ID -> Player
  playerOrder: string[]; // player IDs in seating order
  teams: Team[];

  currentRound: RoundState | null;
};
