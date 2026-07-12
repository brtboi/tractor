import { Card, GameState } from "./gameTypes.js";

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
  RENAME_PLAYER: (
    payload: { roomId: string; newName: string },
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
  | "NOT_YOUR_TURN"
  | "INVALID_TRICK"
  | "PLAYER_NOT_IN_ROOM"
  | "UNKNOWN_ERROR";
