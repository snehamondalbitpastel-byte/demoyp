"use client";

import styles from "./CompleteProfilePopup.module.css";

interface CompleteProfilePopupProps {
  onYes: () => void;
  onNo: () => void;
}

export default function CompleteProfilePopup({ onYes, onNo }: CompleteProfilePopupProps) {
  return (
    <div className={styles.popup}>
      <h2 className={styles.heading}>Are you sure?</h2>

      <div className={styles.buttonRow}>
        <button type="button" className={styles.yesBtn} onClick={onYes}>
          Yes
        </button>
        <button type="button" className={styles.noBtn} onClick={onNo}>
          No
        </button>
      </div>
    </div>
  );
}
