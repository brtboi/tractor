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
