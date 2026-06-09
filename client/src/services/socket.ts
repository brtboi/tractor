// client/src/services/socket.ts
import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@tractor/shared";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socket: AppSocket = io("http://localhost:3000", {
  autoConnect: false,
});

export default socket;
