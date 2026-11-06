import { existsSync, readFileSync, writeFileSync } from "fs";
import type { GameState } from "@tractor/shared";

// dev only: keep rooms on disk so a nodemon restart (after saving a file)
// doesn't wipe the game you're testing. clients re-register on reconnect and
// pick their room straight back up. enabled by nodemon.json, never in prod.
const ENABLED = process.env.TRACTOR_DEV_ROOMS === "1";
const FILE = new URL("../.dev-rooms.json", import.meta.url);

type Snapshot = {
  rooms: Record<string, GameState>;
  playerToRoom: Record<string, string>;
};

export function loadDevRooms(): Snapshot | null {
  if (!ENABLED || !existsSync(FILE)) return null;
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as Snapshot;
  } catch (e) {
    console.warn("couldn't restore dev rooms, starting fresh:", e);
    return null;
  }
}

export function saveDevRooms(snapshot: Snapshot) {
  if (!ENABLED) return;
  try {
    writeFileSync(FILE, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("couldn't save dev rooms:", e);
  }
}
