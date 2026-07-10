"use client";

import styles from "./SocialButton.module.css";

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  variant?: "google" | "apple" | "linkedin";
  onClick?: () => void;
}

export default function SocialButton({ icon, label, variant = "google", onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.socialBtn} ${styles[variant]}`}
      onClick={onClick}
      /* Same `fdprocessedid` suppression pattern used on `Button`
         and `InputField` — browser autofill extensions tag every
         form-related button BEFORE React hydrates, which would
         otherwise fire a server/client attribute mismatch warning. */
      suppressHydrationWarning
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
