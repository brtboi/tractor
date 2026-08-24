import { Card, GameSettings, GameState } from "./gameTypes.js";

export type AckResult =
  | { ok: true }
  | { ok: false; error: string; code: ErrorCode };

// Client -> Server
export type ClientToServerEvents = {
  REGISTER: (
    payload: { playerId: string },
    ack: (res: AckResult) => void,
  ) => void;
  CREATE_ROOM: (
    payload: { name: string },
    ack: (res: AckResult) => void,
  ) => void;
  JOIN_ROOM: (
    payload: { roomId: string; name: string },
    ack: (res: AckResult) => void,
  ) => void;
  ADD_GHOST_PLAYER: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  LEAVE_ROOM: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  RENAME_PLAYER: (
    payload: { roomId: string; newName: string },
    ack: (res: AckResult) => void,
  ) => void;
  RENAME_TEAM: (
    payload: { roomId: string; teamIndex: number; newName: string },
    ack: (res: AckResult) => void,
  ) => void;
  REORDER_PLAYERS: (
    payload: { roomId: string; newPlayerOrder: string[] },
    ack: (res: AckResult) => void,
  ) => void;
  UPDATE_SETTINGS: (
    payload: { roomId: string; settings: Partial<GameSettings> },
    ack: (res: AckResult) => void,
  ) => void;
  START_GAME: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  START_TEST_GAME: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  BREAK_DECK: (
    payload: { roomId: string; breakAt: number },
    ack: (res: AckResult) => void,
  ) => void;
  FINISH_BREAKING: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  DRAW_CARD: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  CALL_TRUMP: (
    payload: { roomId: string; cards: Card[] },
    ack: (res: AckResult) => void,
  ) => void;
  REINFORCE_TRUMP: (
    payload: { roomId: string; cards: Card[] },
    ack: (res: AckResult) => void,
  ) => void;
  SET_BOTTOM: (
    payload: { roomId: string; newBottom: Card[]; newHand: Card[] },
    ack: (res: AckResult) => void,
  ) => void;
  SKIP_ASK: (
    payload: { roomId: string },
    ack: (res: AckResult) => void,
  ) => void;
  OVERTURN_TRUMP: (
    payload: { roomId: string; cards: Card[] },
    ack: (res: AckResult) => void,
  ) => void;
  PLAY_TRICK: (
    payload: { roomId: string; trick: Card[] },
    ack: (res: AckResult) => void,
  ) => void;
  DISCONNECT: () => void;
};

// Server -> Client
export type ServerToClientEvents = {
  CONNECTED: (payload: { socketId: string }) => void;
  GAME_STATE: (state: GameState) => void;
  ROOM_CREATED: (payload: { state: GameState }) => void;
  PLAYER_JOINED: (payload: { state: GameState }) => void;
};

export interface SocketData {
  playerId?: string;
}

// errors
export class ServerError extends Error {
  constructor(
    public code: ErrorCode,
    message: string = "An error occurred",
  ) {
    super(message);
    this.name = "ServerError";
  }
}

export type ErrorCode =
  | "FEATURE_NOT_IMPLEMENTED"
  | "NOT_REGISTERED"
  | "ROOM_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "INVALID_NUM_PLAYERS"
  | "ROOM_FULL"
  | "GAME_NOT_IN_PROGRESS"
  | "NO_ACTIVE_ROUND"
  | "GAME_ALREADY_STARTED"
  | "INVALID_PHASE"
  | "NOT_YOUR_TURN"
  | "INVALID_BREAK"
  | "INVALID_CALL"
  | "INVALID_BOTTOM"
  | "INVALID_TRICK"
  | "INVALID_SETTINGS"
  | "PLAYER_NOT_IN_ROOM"
  | "UNKNOWN_ERROR";
