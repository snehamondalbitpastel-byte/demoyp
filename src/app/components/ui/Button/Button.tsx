"use client";

import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
}

export default function Button({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]}`}
      disabled={disabled}
      onClick={onClick}
      /* Browser form-filler / password-manager extensions (LastPass,
         1Password, Bitwarden, Edge autofill, etc.) inject an
         `fdprocessedid="..."` attribute onto every form button they
         detect BEFORE React hydrates, producing a server/client
         attribute mismatch warning. Scope of suppression is intentionally
         narrow — our own props are still hydration-checked elsewhere. */
      suppressHydrationWarning
    >
      {children}
    </button>
  );
}
