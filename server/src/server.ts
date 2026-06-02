import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { GameState, Card } from "@shared/gameTypes.js";
import {
  createRoom,
  addPlayer,
  startGame,
  playCard,
  clearTrick,
  stateForPlayer,
} from "./gameState.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }, // open for dev
});

// All rooms live here in memory (Redis would replace this later)
const rooms: Record<string, GameState> = {};

function broadcastState(roomId: string) {
  const state = rooms[roomId];
  // Each player gets a version with only their hand visible
  state.players.forEach((player) => {
    io.to(player.id).emit("game_state", stateForPlayer(state, player.id));
  });
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // Create a new room
  socket.on("create_room", ({ name }: { name: string }) => {
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = createRoom(roomId);
    rooms[roomId] = addPlayer(rooms[roomId], socket.id, name);
    socket.join(roomId);
    socket.emit("room_created", { roomId });
    broadcastState(roomId);
  });

  // Join an existing room
  socket.on(
    "join_room",
    ({ roomId, name }: { roomId: string; name: string }) => {
      try {
        if (!rooms[roomId]) throw new Error("Room not found");

        rooms[roomId] = addPlayer(rooms[roomId], socket.id, name);
        socket.join(roomId);
        io.to(roomId).emit("player_joined", { name });
        broadcastState(roomId);
      } catch (e: any) {
        socket.emit("error", e.message);
      }
    },
  );

  // Host starts the game
  socket.on("start_game", ({ roomId }: { roomId: string }) => {
    try {
      rooms[roomId] = startGame(rooms[roomId]);
      broadcastState(roomId);
    } catch (e: any) {
      socket.emit("error", e.message);
    }
  });

  // Player plays a card
  socket.on(
    "play_card",
    ({ roomId, card }: { roomId: string; card: string }) => {
      try {
        rooms[roomId] = playCard(rooms[roomId], socket.id, card);
        const trick = rooms[roomId].currentTrick;

        if (trick.length === 4) {
          // Trick complete — for now, first player wins (plug in real logic here)
          const winnerId = trick[0].playerId;
          broadcastState(roomId); // show completed trick first
          setTimeout(() => {
            rooms[roomId] = clearTrick(rooms[roomId], winnerId);
            broadcastState(roomId);
          }, 2000); // 2s pause so players can see the trick
        } else {
          broadcastState(roomId);
        }
      } catch (e: any) {
        socket.emit("error", e.message);
      }
    },
  );

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);
  });
});

httpServer.listen(3000, () =>
  console.log("Server running on http://localhost:3000"),
);
