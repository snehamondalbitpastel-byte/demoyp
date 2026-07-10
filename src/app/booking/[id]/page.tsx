"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset) is shared with /home,
// /jobs, /jobs/[id], /company, /company/[id], /events,
// /events/[id] and /notifications via the home module. Detail-
// specific styles (banner, info card, payment summary, status
// rows, View Event button) live in `bookingDetails.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./bookingDetails.module.css";

// ── Backend types ────────────────────────────────────────────────────────

/** Raw row from POST /api/mobile/event/booking-detail. Only the
 *  fields rendered on this page are typed; the rest are ignored. */
type ApiBookingDetail = {
  booking_id: string;
  booking_number?: string | null;
  event?: {
    id?: string;
    title?: string | null;
    start_datetime?: string | null;
    banner_image_url?: string | null;
    event_status?: string | null;
    status?: string | null;
  } | null;
  num_seats?: number | null;
  unit_price?: string | null;
  subtotal?: string | null;
  discount_amount?: string | null;
  total_amount?: string | null;
  coupon_code?: string | null;
  /** "paid" / "cancelled" / "pending" / "confirmed" — drives the
   *  Booking Status chip's tone. */
  booking_status?: string | null;
  payment?: {
    payment_status?: string | null;
    amount?: string | null;
    currency?: string | null;
    stripe_receipt_url?: string | null;
    paid_at?: string | null;
    refunded_at?: string | null;
    failure_reason?: string | null;
  } | null;
  created_at?: string | null;
};

// ── Icons (kept inline so this page is self-contained) ──────────────────

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
      <line x1="13" y1="5" x2="13" y2="19" />
    </svg>
  );
}

// ── Formatters ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "30 April 2026" — used for the date row under the title. */
function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "28 April 2026 at 6:38 pm" — used for the "Paid at" row.
 *  Renders in 12-hour form with lowercase am/pm. The API returns
 *  the timestamp as ISO-UTC (`…+00:00`); we read it back in the
 *  viewer's LOCAL timezone so a viewer in IST sees IST time, a
 *  viewer in BST sees BST time, etc. — same behaviour the live
 *  YP /booking page uses. Returns an empty string for invalid /
 *  missing input so the caller can decide whether to render the
 *  row at all. */
function formatPaidAt(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${day} ${month} ${year} at ${hours}:${mm} ${ampm}`;
}

/** Format a numeric string as `£NNNN.NN`, with sane handling for
 *  missing / non-numeric input ("" → "£0.00"). */
function formatGBP(amount: string | number | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "£0.00";
  return `£${n.toFixed(2)}`;
}

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setUser } = useAuth();

  // Defensive decode for base64-padded ids (those ending in `=`
  // arrive as `…%3D` from the listing page's encoded push).
  const rawId = typeof params?.id === "string" ? params.id : "";
  const bookingId = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();

  // ── Page state ──
  // `null` → loading (skeleton renders); booking populated once the
  // API resolves. `bookingError` triggers the error card path.
  const [booking, setBooking] = useState<ApiBookingDetail | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Seed the AuthContext on mount so the navbar avatar resolves
  // out of its skeleton state on hard-refresh / paste-link. Same
  // pattern every other detail page in the app uses.
  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const res = await fetch("/api/mobile/profile", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.status === "OK" && json.data) {
          setUser(json.data as AuthUser);
        }
      } catch {
        // Silent fail — navbar shows initials fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // ── Booking-details fetch ── re-runs whenever the URL `id`
  // changes. POSTs `{ booking_id }` to the proxy and stores the
  // mapped record in `booking`. On error, sets `bookingError` so
  // the body switches to the error card.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    setBooking(null);
    setBookingError(null);
    async function fetchBooking() {
      try {
        const res = await fetch("/api/mobile/event/booking-detail", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId }),
        });
        if (!res.ok) {
          if (!cancelled) setBookingError("Couldn't load this booking.");
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: ApiBookingDetail;
        };
        if (cancelled) return;
        if (json?.status === "OK" && json.data) {
          setBooking(json.data);
          setBookingError(null);
        } else {
          setBookingError("Couldn't load this booking.");
        }
      } catch {
        if (!cancelled) setBookingError("Couldn't load this booking.");
      }
    }
    fetchBooking();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // ── Derived values ──
  const eventTitle = (booking?.event?.title ?? "").trim();
  const eventDate = formatLongDate(booking?.event?.start_datetime);
  const bannerUrl = (booking?.event?.banner_image_url ?? "").trim();
  const seats = booking?.num_seats ?? 1;
  const bookingStatus = (booking?.booking_status ?? "").trim();
  const paymentStatus = (booking?.payment?.payment_status ?? "").trim();
  const paidAt = formatPaidAt(booking?.payment?.paid_at);
  const receiptUrl = (booking?.payment?.stripe_receipt_url ?? "").trim();

  // Status-chip tone derived from the API's status strings. Same
  // rules the events listing uses for the per-card chip.
  const bookingStatusClass = (() => {
    const s = bookingStatus.toLowerCase();
    if (
      s === "cancelled" ||
      s === "canceled" ||
      s === "refunded" ||
      s === "failed"
    )
      return styles.chipDanger;
    if (s === "paid" || s === "confirmed" || s === "completed")
      return styles.chipSuccess;
    return styles.chipNeutral;
  })();

  const paymentStatusClass = (() => {
    const s = paymentStatus.toLowerCase();
    if (s === "completed" || s === "paid" || s === "succeeded")
      return styles.chipSuccess;
    if (s === "failed" || s === "refunded" || s === "cancelled")
      return styles.chipDanger;
    return styles.chipNeutral;
  })();

  /** Open the upstream event-details page in the same tab — the
   *  "View Event" button at the bottom of the page. Encodes the
   *  id so base64-style ids round-trip cleanly. */
  const goToEvent = () => {
    const id = booking?.event?.id;
    if (!id) return;
    router.push(`/events/${encodeURIComponent(id)}`);
  };

  return (
    <div className={`${homeStyles.page} ${styles.pageBookingDetails}`}>
      <Navbar />
      <div className={styles.scrollArea}>
      <main className={styles.main}>
        {/* ── Page title row — back arrow + heading. ── */}
        <div className={styles.titleRow}>
          <button
            type="button"
            className={styles.backBtn}
            aria-label="Back to events"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/events");
              }
            }}
          >
            <BackArrowIcon />
          </button>
          <h1 className={styles.title}>Booking Details</h1>
        </div>

        {/* Form-like narrow column wrapping the banner card + View
            Event button. The title row above stays at the original
            wide position; only this inner column is constrained. */}
        <div className={styles.formContainer}>
        {booking === null && bookingError === null ? (
          // Full-state skeleton — mirrors the loaded layout
          // structure exactly so when the API resolves nothing
          // shifts. Banner block, then card body with title +
          // date, divider, two-column meta, divider, payment
          // summary heading + rows, divider, total row, divider,
          // status rows + receipt link area. The "View Event"
          // pill below the card also has its own placeholder.
          <>
            <section className={styles.card} aria-hidden="true">
              <div className={`${styles.banner} ${homeStyles.skeleton}`} />
              <div className={styles.cardBody}>
                {/* Title + date placeholders */}
                <div
                  className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                  style={{ height: 22, width: "70%", borderRadius: 6 }}
                />
                <div
                  className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                  style={{ height: 14, width: "30%", borderRadius: 6 }}
                />

                <hr className={styles.divider} />

                {/* Two-column meta — booking number + seats */}
                <div className={styles.metaGrid}>
                  <div>
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                      style={{ height: 10, width: "55%", borderRadius: 4 }}
                    />
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                      style={{
                        height: 16,
                        width: "70%",
                        borderRadius: 6,
                        marginTop: 8,
                      }}
                    />
                  </div>
                  <div>
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                      style={{ height: 10, width: "30%", borderRadius: 4 }}
                    />
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                      style={{
                        height: 16,
                        width: "20%",
                        borderRadius: 6,
                        marginTop: 8,
                      }}
                    />
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Payment Summary heading + summary rows */}
                <div
                  className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                  style={{ height: 16, width: "32%", borderRadius: 6 }}
                />
                <div className={styles.summaryRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "25%", borderRadius: 4 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "18%", borderRadius: 4 }}
                  />
                </div>
                <div className={styles.summaryRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "32%", borderRadius: 4 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "18%", borderRadius: 4 }}
                  />
                </div>

                <hr className={styles.divider} />

                {/* Total row — large amount placeholder */}
                <div className={styles.totalRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 16, width: "30%", borderRadius: 6 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 22, width: "22%", borderRadius: 6 }}
                  />
                </div>

                <hr className={styles.divider} />

                {/* Status rows — booking + payment + paid at */}
                <div className={styles.statusRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "28%", borderRadius: 4 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 20, width: 90, borderRadius: 100 }}
                  />
                </div>
                <div className={styles.statusRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "28%", borderRadius: 4 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 20, width: 70, borderRadius: 100 }}
                  />
                </div>
                <div className={styles.statusRow}>
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "18%", borderRadius: 4 }}
                  />
                  <span
                    className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                    style={{ height: 12, width: "38%", borderRadius: 4 }}
                  />
                </div>

                {/* Receipt link placeholder */}
                <div
                  className={`${homeStyles.skelLine} ${homeStyles.skeleton}`}
                  style={{
                    height: 14,
                    width: 180,
                    borderRadius: 6,
                    alignSelf: "center",
                    marginTop: 6,
                  }}
                />
              </div>
            </section>

            {/* View Event button placeholder */}
            <div
              className={`${homeStyles.skeleton}`}
              style={{
                height: 48,
                width: "100%",
                borderRadius: 100,
              }}
              aria-hidden="true"
            />
          </>
        ) : bookingError !== null ? (
          <section className={styles.errorState} aria-live="polite">
            <p>{bookingError}</p>
          </section>
        ) : booking !== null ? (
          <>
            {/* ── Single rounded card holding banner → title/date →
                booking number + seats → payment summary → totals
                → status rows → View Payment Receipt link. The
                "View Event" gradient pill renders BELOW the card. */}
            <section className={styles.card} aria-label="Booking summary">
              <div className={styles.banner}>
                {bannerUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={bannerUrl} alt="" />
                ) : (
                  <div className={styles.bannerPlaceholder}>{eventTitle}</div>
                )}
              </div>

              <div className={styles.cardBody}>
                {/* Event title + date */}
                <h2 className={styles.eventTitle}>{eventTitle || "—"}</h2>
                {eventDate ? (
                  <span className={styles.eventDate}>
                    <CalendarIcon />
                    {eventDate}
                  </span>
                ) : null}

                <hr className={styles.divider} />

                {/* Booking Number + Seats — two columns. */}
                <div className={styles.metaGrid}>
                  <div className={styles.metaBlock}>
                    <p className={styles.metaLabel}>BOOKING NUMBER</p>
                    <p className={styles.metaValue}>
                      {booking.booking_number ?? "—"}
                    </p>
                  </div>
                  <div className={styles.metaBlock}>
                    <p className={styles.metaLabel}>SEATS</p>
                    <p className={styles.metaValue}>{seats}</p>
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Payment Summary heading + line items. */}
                <h3 className={styles.sectionHeading}>Payment Summary</h3>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Unit Price</span>
                  <span className={styles.summaryValue}>
                    {formatGBP(booking.unit_price)}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>
                    Subtotal ({seats} {seats === 1 ? "seat" : "seats"})
                  </span>
                  <span className={styles.summaryValue}>
                    {formatGBP(booking.subtotal)}
                  </span>
                </div>
                {/* Discount row — only renders when a coupon was
                    applied (discount_amount > 0). The summary
                    column stays clean for the common no-coupon
                    case shown in the SS. */}
                {Number(booking.discount_amount ?? 0) > 0 ? (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Discount
                      {booking.coupon_code ? ` (${booking.coupon_code})` : ""}
                    </span>
                    <span className={styles.summaryValue}>
                      − {formatGBP(booking.discount_amount)}
                    </span>
                  </div>
                ) : null}

                <hr className={styles.divider} />

                {/* Total Amount — large cyan amount on the right. */}
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total Amount</span>
                  <span className={styles.totalValue}>
                    {formatGBP(booking.total_amount)}
                  </span>
                </div>

                <hr className={styles.divider} />

                {/* Booking + Payment status chips, then Paid at row.
                    Each row is `label … chip` aligned space-between
                    so the chips sit on the right edge of the card. */}
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Booking Status</span>
                  {bookingStatus ? (
                    <span
                      className={`${styles.chip} ${bookingStatusClass}`}
                    >
                      {bookingStatus.toUpperCase()}
                    </span>
                  ) : null}
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Payment Status</span>
                  {paymentStatus ? (
                    <span
                      className={`${styles.chip} ${paymentStatusClass}`}
                    >
                      {(paymentStatus.toLowerCase() === "completed"
                        ? "PAID"
                        : paymentStatus
                      ).toUpperCase()}
                    </span>
                  ) : null}
                </div>
                {paidAt ? (
                  <div className={styles.statusRow}>
                    <span className={styles.statusLabel}>Paid at</span>
                    <span className={styles.paidAtValue}>
                      <ClockIcon />
                      {paidAt}
                    </span>
                  </div>
                ) : null}

                {/* View Payment Receipt — cyan link with ticket icon.
                    Only renders when the API returns a stripe URL. */}
                {receiptUrl ? (
                  <a
                    className={styles.receiptLink}
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TicketIcon />
                    View Payment Receipt
                  </a>
                ) : null}
              </div>
            </section>

            {/* Gradient "View Event" pill — full-width, sits below
                the card. Disabled if the API didn't return a
                nested event id (defensive — the pill should always
                have a destination in practice). */}
            <button
              type="button"
              className={styles.btnViewEvent}
              onClick={goToEvent}
              disabled={!booking.event?.id}
            >
              View Event
            </button>
          </>
        ) : null}
        </div>
      </main>
      </div>
    </div>
  );
}
