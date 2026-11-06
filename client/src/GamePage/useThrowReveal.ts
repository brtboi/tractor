import { useEffect, useState } from "react";
import type { RoundState, ThrowAttempt } from "@tractor/shared";
import { cardKey } from "./GamePageHelpers";

// the server already decided; this just stages the reveal so it reads like
// the table being asked around
export type ThrowStage = "asking" | "verdict" | "done";

const ASKING_MS = 1300;
const VERDICT_MS = 2400;

export type ThrowReveal = {
  attempt: ThrowAttempt;
  stage: Exclude<ThrowStage, "done">;
  // cards the thrower tried but has to take back
  returned: ThrowAttempt["attempted"];
};

function throwKey(attempt: ThrowAttempt | null | undefined): string | null {
  return attempt
    ? `${attempt.playerId}:${attempt.attempted.map(cardKey).join(",")}`
    : null;
}

/**
 * Plays out the latest throw check: "asking" (the whole throw sits on the
 * table while everyone is asked), then the "verdict", then nothing.
 */
export function useThrowReveal(round: RoundState | null): ThrowReveal | null {
  const attempt = round?.lastThrow ?? null;
  const key = throwKey(attempt);

  // a throw that's already there on first render (refresh, reconnect) is
  // old news, so it starts out done instead of replaying
  const [reveal, setReveal] = useState<{
    key: string | null;
    stage: ThrowStage;
  }>({ key, stage: "done" });
  if (key !== reveal.key) setReveal({ key, stage: key ? "asking" : "done" });

  useEffect(() => {
    if (!key || reveal.stage === "done") return;
    const timer = setTimeout(
      () =>
        setReveal((prev) =>
          prev.key !== key
            ? prev
            : { key, stage: prev.stage === "asking" ? "verdict" : "done" },
        ),
      reveal.stage === "asking" ? ASKING_MS : VERDICT_MS,
    );
    return () => clearTimeout(timer);
  }, [key, reveal.stage]);

  if (!attempt || reveal.key !== key || reveal.stage === "done") return null;
  const played = new Set(attempt.played.map(cardKey));
  return {
    attempt,
    stage: reveal.stage,
    returned: attempt.attempted.filter((card) => !played.has(cardKey(card))),
  };
}
