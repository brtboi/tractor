import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  Card,
  GameState,
  ClientToServerEvents,
  ServerToClientEvents,
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

// TODO: handle abandoned rooms

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" }, // open for dev
});

// All rooms live here in memory (Redis would replace this later)
const rooms: Record<string, GameState> = {};

function broadcastState(roomId: string) {
  const state = rooms[roomId];
  // Each player gets a version with only their hand visible
  Object.entries(state.players).forEach(([playerId, _player]) => {
    io.to(playerId).emit("GAME_STATE", stateForPlayer(state, playerId));
  });
}

io.on("connection", (socket) => {
  socket.emit("CONNECTED", { playerId: socket.id });
  console.log("connected:", socket.id);

  // Create a new room
  socket.on("CREATE_ROOM", ({ name }: { name: string }) => {
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = createRoom(roomId);
    rooms[roomId] = addPlayer(
      rooms[roomId],
      socket.id,
      name === "" ? socket.id : name,
    );

    socket.join(roomId);
    socket.emit("ROOM_CREATED", { state: rooms[roomId] });
    broadcastState(roomId);
  });

  // Join an existing room
  socket.on(
    "JOIN_ROOM",
    ({ roomId, name }: { roomId: string; name: string }) => {
      try {
        if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");
        name = name === "" ? socket.id : name;

        rooms[roomId] = addPlayer(rooms[roomId], socket.id, name);
        socket.join(roomId);
        
        socket.emit("GAME_STATE", rooms[roomId]);
        io.to(roomId).emit("PLAYER_JOINED", { state: rooms[roomId] });
        broadcastState(roomId);
      } catch (e: any) {
        socket.emit("ERROR", e.message);
      }
    },
  );

  socket.on(
    "RENAME_PLAYER",
    ({ roomId, newName }: { roomId: string; newName: string }) => {
      try {
        if (!rooms[roomId]) throw new ServerError("ROOM_NOT_FOUND");

        rooms[roomId] = renamePlayer(
          rooms[roomId],
          socket.id,
          newName === "" ? socket.id : newName,
        );
        broadcastState(roomId);
      } catch (e: any) {
        socket.emit("ERROR", e.message);
      }
    },
  );

  // Host starts the game
  socket.on("START_GAME", ({ roomId }: { roomId: string }) => {
    try {
      rooms[roomId] = startGame(rooms[roomId]);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  // Test game
  socket.on("START_TEST_GAME", ({ roomId }: { roomId: string }) => {
    try {
      rooms[roomId] = startTestGame(rooms[roomId]);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("ERROR", e.message);
    }
  });

  // Player plays a card
  socket.on(
    "PLAY_TRICK",
    ({ roomId, trick }: { roomId: string; trick: Card[] }) => {
      try {
        rooms[roomId] = playTrick(rooms[roomId], socket.id, trick);
        broadcastState(roomId);
      } catch (e: any) {
        socket.emit("ERROR", e.message);
      }
    },
  );

  socket.on("DISCONNECT", () => {
    console.log("disconnected:", socket.id);
  });
});

httpServer.listen(3000, () =>
  console.log("Server running on http://localhost:3000"),
);
