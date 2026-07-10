"use client";

import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** In-flight label shown on the confirm button while `loading` is
   *  true. Defaults to "Please wait..." for backwards compatibility
   *  with every existing caller that wasn't passing it. */
  loadingLabel?: string;
  danger?: boolean;
  loading?: boolean;
  /** Swap button order: Confirm (primary) first, then Cancel. */
  reverseButtons?: boolean;
  /** Override default sizing (e.g. for larger logout modal). */
  size?: "default" | "large";
  /** Hide the close X button. */
  hideClose?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loadingLabel = "Please wait...",
  loading = false,
  reverseButtons = false,
  size = "default",
  hideClose = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const cancelBtn = (
    <button
      type="button"
      className={styles.cancelBtn}
      onClick={onCancel}
      disabled={loading}
    >
      {cancelLabel}
    </button>
  );

  const confirmBtn = (
    <button
      type="button"
      className={styles.confirmBtn}
      onClick={onConfirm}
      disabled={loading}
    >
      {loading ? loadingLabel : confirmLabel}
    </button>
  );

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={`${styles.modal} ${size === "large" ? styles.modalLarge : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        {!hideClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <h2 className={`${styles.title} ${size === "large" ? styles.titleLarge : ""}`}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          {reverseButtons ? (
            <>
              {confirmBtn}
              {cancelBtn}
            </>
          ) : (
            <>
              {cancelBtn}
              {confirmBtn}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
