import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import styles from "./NotFound.module.scss";

type Props = {
  title: ReactNode;
  message?: ReactNode;
  // defaults to going back home
  action?: { label: string; onClick: () => void };
};

export default function NotFound({ title, message, action }: Props) {
  const navigate = useNavigate();
  const { label, onClick } = action ?? {
    label: "Back to home",
    onClick: () => navigate("/", { replace: true }),
  };

  return (
    <motion.div
      className={styles.notFound}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.img
        className={styles.card}
        src="/cardSprites/back_red.png"
        alt=""
        draggable={false}
        initial={{ rotate: 0 }}
        animate={{ rotate: -8 }}
        transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
      />
      <h1 className={styles.title}>{title}</h1>
      {message && <p className={styles.message}>{message}</p>}
      <button className={styles.homeButton} onClick={onClick}>
        {label}
      </button>
    </motion.div>
  );
}
