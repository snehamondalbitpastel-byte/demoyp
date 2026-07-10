"use client";

import { useEffect } from "react";
import styles from "./ImagePreviewModal.module.css";

interface ImagePreviewModalProps {
  open: boolean;
  /** Profile image URL. If empty, shows initials fallback instead. */
  src?: string;
  alt?: string;
  /** Initials shown in a large circle when no image is available. */
  initials?: string;
  onClose: () => void;
}

export default function ImagePreviewModal({
  open,
  src,
  alt = "Profile photo",
  initials,
  onClose,
}: ImagePreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasImage = Boolean(src);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className={styles.initialsCircle}
          onClick={(e) => e.stopPropagation()}
        >
          {initials || "U"}
        </div>
      )}
    </div>
  );
}
