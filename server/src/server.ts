import express from "express";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import {
  type GameState,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type AckResult,
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
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: { origin: "*" },
});

const rooms: Record<string, GameState> = {};
const playerToRoom: Record<string, string> = {};

function getPlayerId(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >,
): string {
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

function toAckResult(e: unknown): AckResult {
  if (e instanceof ServerError) {
    return { ok: false, error: e.message, code: e.code };
  }
  return { ok: false, error: "Unknown error", code: "UNKNOWN_ERROR" };
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("REGISTER", async ({ playerId }): Promise<AckResult> => {
    socket.data.playerId = playerId;
    socket.join(playerId);

    const roomId = playerToRoom[playerId];
    if (roomId && rooms[roomId]?.players[playerId]) {
      socket.join(roomId);
      socket.emit("GAME_STATE", stateForPlayer(rooms[roomId], playerId));
    }

    return { ok: true };
  });

  socket.on("CREATE_ROOM", async ({ name }): Promise<AckResult> => {
    try {
      const playerId = getPlayerId(socket);
      const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
      rooms[roomId] = createRoom(roomId);
      rooms[roomId] = addPlayer(rooms[roomId], playerId, name || playerId);
      playerToRoom[playerId] = roomId;

      socket.join(roomId);
      socket.emit("ROOM_CREATED", { state: rooms[roomId] });
      broadcastState(roomId);

      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  socket.on("JOIN_ROOM", async ({ roomId, name }): Promise<AckResult> => {
    try {
      const playerId = getPlayerId(socket);
      if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
      if (!rooms[roomId].players[playerId]) {
        rooms[roomId] = addPlayer(rooms[roomId], playerId, name || playerId);
      }

      playerToRoom[playerId] = roomId;
      socket.join(roomId);
      broadcastState(roomId);

      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  socket.on("ADD_GHOST_PLAYER", async ({ roomId }): Promise<AckResult> => {
    try {
      if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
      rooms[roomId] = addPlayer(
        rooms[roomId],
        Math.random().toString(36).slice(2, 7).toUpperCase(),
        "Ghost Player",
      );
      broadcastState(roomId);

      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  // TODO: Leave room

  socket.on(
    "RENAME_PLAYER",
    async ({ roomId, newName }): Promise<AckResult> => {
      try {
        const playerId = getPlayerId(socket);
        if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
        rooms[roomId] = renamePlayer(
          rooms[roomId],
          playerId,
          newName || playerId,
        );
        broadcastState(roomId);

        return { ok: true };
      } catch (e: unknown) {
        return toAckResult(e);
      }
    },
  );

  socket.on("START_GAME", async ({ roomId }): Promise<AckResult> => {
    try {
      rooms[roomId] = startGame(rooms[roomId]);
      broadcastState(roomId);
      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  socket.on("START_TEST_GAME", async ({ roomId }): Promise<AckResult> => {
    try {
      rooms[roomId] = startTestGame(rooms[roomId]);
      broadcastState(roomId);
      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  socket.on("PLAY_TRICK", async ({ roomId, trick }): Promise<AckResult> => {
    try {
      const playerId = getPlayerId(socket);
      rooms[roomId] = playTrick(rooms[roomId], playerId, trick);
      broadcastState(roomId);
      return { ok: true };
    } catch (e: unknown) {
      return toAckResult(e);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
  });
});

httpServer.listen(3000, () =>
  console.log("Server running on http://localhost:3000"),
);
