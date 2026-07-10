"use client";

import { useEffect, useState } from "react";
import styles from "./EditAboutModal.module.css";

const MAX_WORDS = 400;

interface EditAboutModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: AboutUpdatePayload) => Promise<void> | void;
  initial: string;
}

export interface AboutUpdatePayload {
  about: string;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function EditAboutModal({
  open,
  onClose,
  onSave,
  initial,
}: EditAboutModalProps) {
  const [about, setAbout] = useState<string>(initial);

  useEffect(() => {
    if (open) setAbout(initial);
  }, [open, initial]);

  const wordCount = countWords(about);
  const wordsLeft = MAX_WORDS - wordCount;
  const overLimit = wordCount > MAX_WORDS;
  const canSave = about.trim().length > 0 && !overLimit;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setAbout(e.target.value);
  }

  async function handleSave() {
    if (!canSave) return;
    await onSave({ about: about.trim() });
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Edit About</h2>
            <p className={styles.subtitle}>Update your About information</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>
            About <span className={styles.required}>*</span>
          </label>
          <textarea
            className={`${styles.textarea} ${overLimit ? styles.textareaError : ""}`}
            value={about}
            onChange={handleChange}
            placeholder="Tell something about yourself..."
            rows={4}
          />
          <div className={styles.meta}>
            {overLimit ? (
              <span className={styles.errorText}>
                Maximum word limit is {MAX_WORDS}. You have {wordCount} words.
              </span>
            ) : (
              <span className={styles.wordCount}>
                {wordCount} / {MAX_WORDS} words ({wordsLeft} remaining)
              </span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
