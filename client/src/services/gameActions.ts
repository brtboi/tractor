import type { Card, AckResult } from "@tractor/shared";
import socket from "./socket";

export function createRoom(name: string = ""): Promise<AckResult> {
  return socket.emitWithAck("CREATE_ROOM", { name });
}

export function joinRoom(
  roomId: string,
  name: string = "",
): Promise<AckResult> {
  return socket.emitWithAck("JOIN_ROOM", { roomId, name });
}

export function addGhostPlayer(roomId: string): Promise<AckResult> {
  return socket.emitWithAck("ADD_GHOST_PLAYER", { roomId });
}

export function renamePlayer(
  roomId: string,
  newName: string,
): Promise<AckResult> {
  return socket.emitWithAck("RENAME_PLAYER", { roomId, newName });
}

export function startGame(roomId: string): Promise<AckResult> {
  return socket.emitWithAck("START_GAME", { roomId });
}

export function startTestGame(roomId: string): Promise<AckResult> {
  return socket.emitWithAck("START_TEST_GAME", { roomId });
}

export function playTrick(roomId: string, trick: Card[]): Promise<AckResult> {
  return socket.emitWithAck("PLAY_TRICK", { roomId, trick });
}

export function drawCard(roomId: string): Promise<AckResult> {
  return socket.emitWithAck("DRAW_CARD", { roomId });
}

export function callTrump(
  roomId: string,
  cards: Card[],
): Promise<AckResult> {
  return socket.emitWithAck("CALL_TRUMP", { roomId, cards });
}

export function reinforceTrump(
  roomId: string,
  cards: Card[],
): Promise<AckResult> {
  return socket.emitWithAck("REINFORCE_TRUMP", { roomId, cards });
}

export function setBottom(
  roomId: string,
  newBottom: Card[],
  newHand: Card[],
): Promise<AckResult> {
  return socket.emitWithAck("SET_BOTTOM", { roomId, newBottom, newHand });
}

export function skipAsk(roomId: string): Promise<AckResult> {
  return socket.emitWithAck("SKIP_ASK", { roomId });
}

export function overturnTrump(
  roomId: string,
  cards: Card[],
): Promise<AckResult> {
  return socket.emitWithAck("OVERTURN_TRUMP", { roomId, cards });
}
