import { useContext, useLayoutEffect } from "react";
import {
  animate,
  PresenceContext,
  useMotionValue,
  type MotionValue,
} from "framer-motion";

/**
 * Where a newly mounted element should fly in from. `origin` names an
 * element tagged with `data-fly-origin` (the draw pile, a seat, the table).
 * `rotation` is the rotation of the element's own coordinate space, for
 * hands that are laid out horizontally and then turned sideways.
 */
export type FlyFrom = {
  origin: string;
  rotation?: number;
};

export const FLY_ORIGIN_FALLBACK = "table";

const flySpring = {
  type: "spring",
  stiffness: 210,
  damping: 26,
  mass: 0.9,
} as const;

function findOrigin(key: string): Element | null {
  return (
    document.querySelector(`[data-fly-origin="${key}"]`) ??
    document.querySelector(`[data-fly-origin="${FLY_ORIGIN_FALLBACK}"]`)
  );
}

// screen-space delta -> the element's local (possibly rotated) space
function toLocal(dx: number, dy: number, rotation: number): [number, number] {
  const rad = (-rotation * Math.PI) / 180;
  return [
    dx * Math.cos(rad) - dy * Math.sin(rad),
    dx * Math.sin(rad) + dy * Math.cos(rad),
  ];
}

type FlyIn = {
  // spread onto the inner motion element's style
  style: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    rotate: MotionValue<number>;
    scale: MotionValue<number>;
  };
  // 1 while still in flight, 0 once landed, for crossfading a card back
  progress: MotionValue<number>;
};

/**
 * Makes an element glide in from another spot on the board when it mounts.
 * `anchorRef` is the element that gets measured, so it must not itself carry
 * the returned fly transform - put that on an inner element. Children present
 * on an AnimatePresence's first render (initial={false}) stay put, so only
 * cards that actually arrive later animate.
 */
export function useFlyIn(
  anchorRef: React.RefObject<HTMLElement | null>,
  from: FlyFrom | null | undefined,
): FlyIn {
  const presence = useContext(PresenceContext);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scale = useMotionValue(1);
  const progress = useMotionValue(0);

  const skip = !from || presence?.initial === false;
  const origin = from?.origin;
  const rotation = from?.rotation ?? 0;

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (skip || !origin || !anchor) return;
    const source = findOrigin(origin);
    if (!source) return;

    const to = anchor.getBoundingClientRect();
    const fromRect = source.getBoundingClientRect();
    const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
    const [lx, ly] = toLocal(dx, dy, rotation);

    x.set(lx);
    y.set(ly);
    rotate.set(dx > 0 ? 8 : -8);
    scale.set(0.82);
    progress.set(1);
    // ride above the neighbours we're sliding between while in flight
    anchor.style.zIndex = "30";

    const controls = [
      animate(x, 0, flySpring),
      animate(y, 0, flySpring),
      animate(rotate, 0, flySpring),
      animate(scale, 1, flySpring),
      animate(progress, 0, { duration: 0.35, ease: "easeIn" }),
    ];
    let cancelled = false;
    Promise.all(controls).then(() => {
      if (!cancelled) anchor.style.zIndex = "";
    });
    return () => {
      cancelled = true;
      controls.forEach((c) => c.stop());
    };
    // only ever on mount; a card doesn't fly twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { style: { x, y, rotate, scale }, progress };
}
