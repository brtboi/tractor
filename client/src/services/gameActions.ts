// client/src/services/gameActions.ts
import type { Card } from "@tractor/shared";
import socket from "./socket";

export function createRoom(name: string) {
  socket.emit("CREATE_ROOM", { name });
}

export function joinRoom(roomId: string, name: string) {
  socket.emit("JOIN_ROOM", { roomId, name });
}

export function startGame(roomId: string) {
  socket.emit("START_GAME", { roomId });
}

export function startTestGame(roomId: string) {
  socket.emit("START_TEST_GAME", { roomId });
}

export function playTrick(roomId: string, trick: Card[]) {
  socket.emit("PLAY_TRICK", { roomId, trick });
}
