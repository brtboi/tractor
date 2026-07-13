import { useEffect, useRef, useState } from "react";
import { useGameSocket } from "../services/useGameSocket";
import styles from "./ErrorToast.module.scss";

const DISMISS_MS = 5000;

// TODO: bug give each toast error individual, independent timer

export default function ErrorToast() {
  const { errors, dismissError } = useGameSocket();

  return (
    <div className={styles.toastStack}>
      {errors.map((error, index) => (
        <ToastItem
          key={`${index}-${error}`}
          message={error}
          onDismiss={() => dismissError(index)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const remaining = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        onDismiss();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onDismiss]);

  return (
    <div className={styles.errorToast} onClick={onDismiss}>
      <div className={styles.toastContent}>
        <p>{message}</p>
        <button
          className={styles.closeButton}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss error"
        >
          x
        </button>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
