import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  type GameState,
  type ClientToServerEvents,
  type ServerToClientEvents,
  ServerError,
} from "@tractor/shared";
import {
  createRoom,
  addPlayer,
  startGame,
  startTestGame,
  stateForPlayer,
  playTrick,
  renamePlayer,
} from "./gameState.js";

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

const rooms: Record<string, GameState> = {};
const playerToRoom: Record<string, string> = {};

function getPlayerId(socket: any): string {
  const playerId = socket.data.playerId;
  if (!playerId) throw new ServerError("NOT_REGISTERED");
  return playerId;
}

function broadcastState(roomId: string) {
  const state = rooms[roomId];
  Object.keys(state.players).forEach((playerId) => {
    io.to(playerId).emit("GAME_STATE", stateForPlayer(state, playerId));
  });
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("REGISTER", ({ playerId }, ack) => {
    socket.data.playerId = playerId;
    socket.join(playerId);

    const roomId = playerToRoom[playerId];
    if (roomId && rooms[roomId]?.players[playerId]) {
      socket.join(roomId);
      socket.emit("GAME_STATE", stateForPlayer(rooms[roomId], playerId));
    }
    ack?.();
  });

  socket.on("CREATE_ROOM", ({ name }) => {
    try {
      const playerId = getPlayerId(socket);
      const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
      rooms[roomId] = createRoom(roomId);
      rooms[roomId] = addPlayer(rooms[roomId], playerId, name || playerId);
      playerToRoom[playerId] = roomId;

      socket.join(roomId);
      socket.emit("ROOM_CREATED", { state: rooms[roomId] });
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  socket.on("JOIN_ROOM", ({ roomId, name }) => {
    try {
      const playerId = getPlayerId(socket);
      if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
      // idempotent: skip addPlayer if already in room (handles reconnect)
      if (!rooms[roomId].players[playerId]) {
        rooms[roomId] = addPlayer(rooms[roomId], playerId, name || playerId);
      }

      playerToRoom[playerId] = roomId;
      socket.join(roomId);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  socket.on("ADD_GHOST_PLAYER", ({ roomId }) => {
    if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
    rooms[roomId] = addPlayer(
      rooms[roomId],
      Math.random().toString(36).slice(2, 7).toUpperCase(),
      "Ghost Player",
    );
    broadcastState(roomId);
  });

  // TODO: Leave room

  socket.on("RENAME_PLAYER", ({ roomId, newName }) => {
    try {
      const playerId = getPlayerId(socket);
      if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
      rooms[roomId] = renamePlayer(
        rooms[roomId],
        playerId,
        newName || playerId,
      );
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  socket.on("START_GAME", ({ roomId }, ack) => {
    try {
      rooms[roomId] = startGame(rooms[roomId]);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }

    ack?.();
  });

  socket.on("START_TEST_GAME", ({ roomId }, ack) => {
    try {
      rooms[roomId] = startTestGame(rooms[roomId]);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }

    ack?.();
  });

  socket.on("PLAY_TRICK", ({ roomId, trick }) => {
    try {
      const playerId = getPlayerId(socket);
      rooms[roomId] = playTrick(rooms[roomId], playerId, trick);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
    // intentionally do nothing — player can reconnect and REGISTER again
  });
});

httpServer.listen(3000, () =>
  console.log("Server running on http://localhost:3000"),
);
