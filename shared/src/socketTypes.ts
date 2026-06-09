// shared/src/socketTypes.ts

import { Card, GameState } from "./gameTypes.js";

// Client -> Server
export type ClientToServerEvents = {
  CREATE_ROOM: (payload: { name: string }) => void;
  JOIN_ROOM: (payload: { roomId: string; name: string }) => void;
  START_GAME: (payload: { roomId: string }) => void;
  START_TEST_GAME: (payload: { roomId: string }) => void;
  PLAY_TRICK: (payload: { roomId: string; trick: Card[] }) => void;
  DISCONNECT: () => void;
};

// Server -> Client
export type ServerToClientEvents = {
  CONNECTED: (payload: { playerId: string }) => void;
  GAME_STATE: (state: GameState) => void;
  ROOM_CREATED: (payload: { roomId: string }) => void;
  PLAYER_JOINED: (payload: { name: string }) => void;
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
  | "ROOM_NOT_FOUND"
  | "INVALID_NUM_PLAYERS"
  | "ROOM_FULL"
  | "GAME_NOT_IN_PROGRESS"
  | "NO_ACTIVE_ROUND"
  | "GAME_ALREADY_STARTED"
  | "NOT_YOUR_TURN"
  | "INVALID_TRICK"
  | "PLAYER_NOT_IN_ROOM";
