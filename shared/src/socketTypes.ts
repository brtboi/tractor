// shared/src/socketTypes.ts

import { Card, GameState } from "./gameTypes.js";

// Client -> Server
export type ClientToServerEvents = {
  create_room: (payload: { name: string }) => void;
  join_room: (payload: { roomId: string; name: string }) => void;
  start_game: (payload: { roomId: string }) => void;
  start_test_game: (payload: { roomId: string }) => void;
  play_trick: (payload: { roomId: string; trick: Card[] }) => void;
};

// Server -> Client
export type ServerToClientEvents = {
  game_state: (state: GameState) => void;
  room_created: (payload: { roomId: string }) => void;
  player_joined: (payload: { name: string }) => void;
  error: (message: string) => void;
};
