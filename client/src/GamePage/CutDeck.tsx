import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { AckResult } from "@tractor/shared";
import { CARD_HEIGHT, CARD_WIDTH } from "./GamePageHelpers";
import styles from "./GamePage.module.scss";

const DECK_WIDTH = 440;
const MOVE_MS = 650;

type Props = {
  count: number;
  canCut: boolean;
  onCut: (breakAt: number) => Promise<AckResult>;
};

/**
 * The undealt deck spread out as a fan. The breaker hovers to pick a cut
 * point and clicks to move that many cards from the top (left) to the
 * bottom (right). Cards are identical backs, so the only feedback is the
 * animation - it's tracked locally with stable ids per card.
 */
export default function CutDeck({ count, canCut, onCut }: Props) {
  const [order, setOrder] = useState(() =>
    Array.from({ length: count }, (_, i) => i),
  );
  const [hoverAt, setHoverAt] = useState<number | null>(null);
  const [moving, setMoving] = useState<Set<number>>(new Set());
  const busy = useRef(false);

  const step = (DECK_WIDTH - CARD_WIDTH) / Math.max(count - 1, 1);
  const positionOf = new Map(order.map((id, pos) => [id, pos]));

  function cutPointAt(clientX: number, rect: DOMRect): number {
    const x = clientX - rect.left - CARD_WIDTH / 2;
    return Math.min(Math.max(Math.round(x / step), 1), count - 1);
  }

  async function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canCut || busy.current) return;
    const at = cutPointAt(e.clientX, e.currentTarget.getBoundingClientRect());
    busy.current = true;
    const res = await onCut(at);
    if (res.ok) {
      setMoving(new Set(order.slice(0, at)));
      setOrder([...order.slice(at), ...order.slice(0, at)]);
      setHoverAt(null);
      setTimeout(() => {
        setMoving(new Set());
        busy.current = false;
      }, MOVE_MS);
    } else {
      busy.current = false;
    }
  }

  return (
    <div
      className={clsx(styles.cutDeck, canCut && styles.clickable)}
      style={{ width: DECK_WIDTH, height: CARD_HEIGHT + 32 }}
      onMouseMove={(e) => {
        if (!canCut || moving.size > 0) return;
        setHoverAt(
          cutPointAt(e.clientX, e.currentTarget.getBoundingClientRect()),
        );
      }}
      onMouseLeave={() => setHoverAt(null)}
      onClick={handleClick}
    >
      {Array.from({ length: count }, (_, id) => {
        const pos = positionOf.get(id) ?? id;
        const isMoving = moving.has(id);
        const isLifted = hoverAt !== null && pos < hoverAt;
        return (
          <motion.div
            key={id}
            className={styles.cutDeckCard}
            style={{ zIndex: pos + (isMoving ? count : 0) }}
            initial={false}
            animate={{
              x: pos * step,
              y: isMoving ? [0, -30, 0] : isLifted ? -10 : 0,
            }}
            transition={{
              x: { duration: MOVE_MS / 1000, ease: [0.22, 1, 0.36, 1] },
              y: isMoving
                ? { duration: MOVE_MS / 1000, times: [0, 0.4, 1] }
                : { type: "spring", stiffness: 500, damping: 32 },
            }}
          >
            <img src="/cardSprites/back_red.png" alt="" draggable={false} />
          </motion.div>
        );
      })}
    </div>
  );
}
