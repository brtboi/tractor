// shared/src/socketTypes.ts

import { Card, GameState } from "./gameTypes.js";

// Client -> Server
export type ClientToServerEvents = {
  REGISTER: (payload: { playerId: string }, ack: () => void) => void;
  CREATE_ROOM: (payload: { name: string }) => void;
  JOIN_ROOM: (payload: { roomId: string; name: string }) => void;
  ADD_GHOST_PLAYER: (payload: { roomId: string }) => void;
  RENAME_PLAYER: (payload: { roomId: string; newName: string }) => void;
  START_GAME: (payload: { roomId: string }) => void;
  START_TEST_GAME: (payload: { roomId: string }) => void;
  PLAY_TRICK: (payload: { roomId: string; trick: Card[] }) => void;
  DISCONNECT: () => void;
};

// Server -> Client
export type ServerToClientEvents = {
  CONNECTED: (payload: { socketId: string }) => void;
  GAME_STATE: (state: GameState) => void;
  ROOM_CREATED: (payload: { state: GameState }) => void;
  PLAYER_JOINED: (payload: { state: GameState }) => void;
  ERROR: (message: string) => void;
};

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
  | "PLAYER_NOT_IN_ROOM";
