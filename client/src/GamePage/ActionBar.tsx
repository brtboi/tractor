import type { Card } from "@tractor/shared";
import CardHand from "./CardHand";
import styles from "./GamePage.module.scss";

type Props = {
  cards: Card[];
  handlePlay: () => void;
};

export default function ActionBar({ cards }: Props) {
  return (
    <div className={styles.actionBar}>
      <div className={styles.cardHandOptions}>
        <button>play</button>
        <button>sort</button>
      </div>
      <CardHand
        cards={cards}
        isFaceDown={false}
        orientation="bottom"
        isSelectable={true}
      />
      <div>
        <button>
          herro
        </button>
      </div>
    </div>
  );
}
