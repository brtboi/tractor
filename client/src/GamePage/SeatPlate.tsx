import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import styles from "./GamePage.module.scss";

type Props = {
  name: string;
  // 0 or 1; colors the team marker
  team: number;
  isTurn: boolean;
  tag?: string | null;
  count: number;
  countLabel?: string;
};

/** name, team marker and card count for one seat at the table */
export default function SeatPlate({
  name,
  team,
  isTurn,
  tag,
  count,
  countLabel,
}: Props) {
  return (
    <div className={clsx(styles.seatPlate, isTurn && styles.activeTurn)}>
      <span className={clsx(styles.teamMarker, team === 1 && styles.teamB)} />
      <span className={styles.seatName}>{name}</span>
      {tag && <span className={styles.seatTag}>{tag}</span>}
      <span className={styles.seatCount}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
        {countLabel && <span className={styles.seatCountLabel}>{countLabel}</span>}
      </span>
    </div>
  );
}
