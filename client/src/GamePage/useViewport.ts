import { useSyncExternalStore } from "react";
import type { CardSize } from "./CardComponent";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, () => window.innerWidth);
}

export function useViewportHeight(): number {
  return useSyncExternalStore(subscribe, () => window.innerHeight);
}

// below this the board can't fit 2x cards in the hand and on the table
const ROOMY_HEIGHT = 860;

/** sprites only stay crisp at whole-number scales, so prefer 2x when it fits */
export function useBoardCardSize(): CardSize {
  return useViewportHeight() >= ROOMY_HEIGHT ? "lg" : "md";
}
