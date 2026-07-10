"use client";

import styles from "./BookingConfirmDialog.module.css";

/**
 * Pre-payment confirm dialog shown when the viewer clicks Book Now
 * on a paid event. Mirrors the live YP /events/[id] reference: the
 * message embeds an inline cyan "refund policy" link so the viewer
 * has a single click to see the policy without losing the modal
 * state. Cancel + Proceed buttons drive the next step (Proceed
 * triggers the create-booking POST and opens the payment modal).
 *
 * Composition note: this is a separate component from the generic
 * `profile/ConfirmDialog` because that one takes a plain string
 * message — embedding a link inside it would require a wider API
 * change that other callers don't need. Keeping a dedicated
 * component scoped to the booking flow avoids touching shared code.
 */
type BookingConfirmDialogProps = {
  open: boolean;
  /** Number of seats being booked. */
  numSeats: number;
  /** Pre-formatted total amount string ("£1250.00"). */
  totalAmount: string;
  /** URL the inline "refund policy" link points to. */
  refundPolicyUrl?: string;
  /** While `true`, the Proceed button shows a "Processing..." label
   *  and both buttons are disabled — used to gate against double-
   *  click while the create-booking POST is in flight. */
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function BookingConfirmDialog({
  open,
  numSeats,
  totalAmount,
  refundPolicyUrl = "/privacy-policy",
  loading = false,
  onCancel,
  onConfirm,
}: BookingConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={loading ? undefined : onCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="booking-confirm-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onCancel}
          disabled={loading}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="booking-confirm-title" className={styles.title}>
          Confirm Booking
        </h2>

        <p className={styles.message}>
          You are about to book {numSeats}{" "}
          {numSeats === 1 ? "seat" : "seats"} for {totalAmount}. Bookings
          are non-cancellable and non-refundable once confirmed. By
          proceeding, you agree to our{" "}
          <a
            className={styles.refundLink}
            href={refundPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            refund policy
          </a>
          .
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.proceedBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
