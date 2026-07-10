"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import BookingConfirmDialog from "@/app/components/event/BookingConfirmDialog/BookingConfirmDialog";
import PaymentModal from "@/app/components/event/PaymentModal/PaymentModal";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset) is shared with /home,
// /jobs, /jobs/[id], /company, /company/[id], and /events via the
// home module. Detail-specific styles (banner, two-column body,
// pricing / booking sidebar) live in `eventDetails.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./eventDetails.module.css";

// ── Backend types ────────────────────────────────────────────────────────

/** Raw API event from POST /api/mobile/event. Only the fields this
 *  page actually renders are typed; the rest are ignored. */
type ApiEventDetail = {
  id: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  banner_image_url?: string | null;
  sidebar_image_url?: string | null;
  event_type?: string | null;
  event_type_display?: string | null;
  location?: string[] | null;
  platform_name?: string | null;
  platform_link?: string | null;
  external_registration_url?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  registration_close_date?: string | null;
  timing_info?: string | null;
  list_price?: string | null;
  offer_price?: string | null;
  total_seats?: number | null;
  min_seats_per_booking?: number | null;
  max_seats_per_booking?: number | null;
  pricing_type?: "paid" | "free" | string | null;
  is_registration_open?: boolean;
  event_status?: string | null;
  seats_available?: number | null;
  availability_status?: string | null;
  /** Tag chips rendered in the Keywords card under the description.
   *  Optional — the card is only rendered if at least one entry is
   *  present. */
  keywords?: string[] | null;
  /** Additional banner images beyond `banner_image_url` and
   *  `sidebar_image_url`. The API ships extra images as an array
   *  of `{ id, image_url, sort_order }` objects under
   *  `gallery_images`. All non-empty entries are merged into the
   *  carousel image list (deduped, banner_image_url first, then
   *  sidebar, then gallery sorted by `sort_order`), so the
   *  carousel scales to whatever the API returns — events with
   *  4+ images show all of them. */
  gallery_images?: Array<{
    id?: string | null;
    image_url?: string | null;
    sort_order?: number | null;
  }> | null;
  /** Legacy fallback fields kept defensive in case the upstream
   *  ever ships a flat string array under a different key — the
   *  current contract only uses `gallery_images`. */
  images?: string[] | null;
  media_urls?: string[] | null;
  event_images?: string[] | null;
  gallery?: string[] | null;
  /** The current viewer's booking for this event, if any.
   *  `null` (or absent) when the viewer has not registered.
   *  When non-null, the right-panel UI flips to a "Registered"
   *  state — the gradient Register Now / seat counter is replaced
   *  by a cyan-tinted disabled "Registered" pill, and the
   *  "Join this event for free" prose disappears (the viewer
   *  is already in). The shape mirrors a row from
   *  `/api/mobile/event/my-bookings` — only the fields the
   *  details page actually reads are typed; everything else is
   *  ignored. */
  user_booking?: {
    booking_id?: string | null;
    booking_status?: string | null;
    /** Seats the viewer booked. Populated locally when create-booking
     *  resolves; populated from `/event/booking-detail` on initial
     *  page load if the API didn't ship it. Used to render the
     *  "You have booked this event (N seat(s))." chip. */
    num_seats?: number | null;
  } | null;
  /** Organizer company. When present, the title card below the
   *  Date & Time block renders an "Organized by" section with a
   *  clickable chip (logo + name) that navigates to
   *  `/company/{company.id}`. The whole section is omitted from
   *  the DOM when the API doesn't ship a company object — there's
   *  no placeholder. */
  company?: {
    id?: string | null;
    name?: string | null;
    logo_url?: string | null;
  } | null;
};

/** Loose shape for the apply-coupon response. The error path is
 *  `{ status: "ERROR", message }`; the success path returns
 *  discount metadata under `data` whose exact shape we don't
 *  fully document here — we just surface `message` as a toast. */
type ApiCouponResponse = {
  status?: string;
  message?: string;
  data?: {
    /** Per-seat discount amount as a stringified decimal. */
    discount_amount?: string | number | null;
    /** Already-discounted total (if the upstream returns it). */
    total_amount?: string | number | null;
  } | null;
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

function LocationPinIcon() {
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UsersIcon() {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function VideoIcon() {
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
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function ExternalLinkIcon() {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/** Circular loading spinner used inside the Register Now button
 *  while the booking POST is in flight. Same arc-of-circle shape
 *  the live YP /events/[id] flow uses — open ring with a single
 *  visible quarter that rotates via CSS keyframes. The rotation
 *  is wired to the `.spinner` class in eventDetails.module.css. */
function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Long-form weekday + date — "Thursday, April 30, 2026". */
function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${WEEKDAY_NAMES[d.getUTCDay()]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Format a price string into the displayed amount. Mirrors the
 *  listing card's formatter — `pricing_type === "free"` always
 *  renders as "FREE" regardless of the numeric `list_price`. */
function formatGBP(amount: number, pricingType?: string | null): string {
  if (pricingType === "free") return "FREE";
  if (!Number.isFinite(amount) || amount <= 0) return "FREE";
  return `£${amount.toFixed(2)}`;
}

// ── BannerCarousel ────────────────────────────────────────────────────────
//
// Self-contained carousel that owns its OWN drag/index/transition
// state. Rendered by `EventDetailsPage` with a stable key so React
// fully UNMOUNTS the component when the event id (or image set)
// changes:
//
//     <BannerCarousel
//       key={images.join("|")}
//       images={bannerImages}
//       placeholderText={event.title ?? ""}
//     />
//
// Why this exists as a child component (instead of inline state on
// the page): with state on the parent, navigating across events —
// /jobs/[id] → /events → /events/[id], or A → B inside the same
// dynamic route — could leave behind stale `displayIndex` /
// `dragOffset` / `isDragging` values from the previous carousel,
// because the parent component instance was preserved. Several
// rounds of in-place reset attempts (useEffect, render-time
// "store-prev-prop" pattern, ref synchronisation) all left at
// least one race window where a stuck state could survive into
// the next navigation, requiring a hard refresh to recover.
//
// Hoisting the carousel into its own component + keying by the
// image-list fingerprint sidesteps the entire problem class:
// every event's images set produces a different key, React tears
// the old instance down and constructs a fresh one, every
// `useState`/`useRef` re-initialises from scratch. There is no
// state path that can survive across a key change.
//
// Renders the banner div + thumbnail row as a fragment so the
// page's outer flow (banner → thumbnails → body) stays
// byte-identical to the previous inline implementation.
function BannerCarousel({
  images,
  placeholderText,
}: {
  images: string[];
  placeholderText: string;
}) {
  // displayIndex walks the cloned-slides array (length N+2):
  //   [lastClone, real0, real1, …, realN-1, firstClone]
  // 0 = last clone (visually = realN-1), 1..N = real slots,
  // N+1 = first clone (visually = real0). The transition-end
  // handler snaps 0→N and N+1→1 instantly so the wrap reads as
  // a seamless infinite loop. Initial value 1 = first real
  // image's slot.
  const [displayIndex, setDisplayIndex] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Drag start clientX as a ref so move/up handlers always read
  // the latest value synchronously; with state, fast re-renders
  // could leave the move handler reading stale `null`.
  const dragStartXRef = useRef<number | null>(null);

  // Cloned slides array — only built when there are 2+ images.
  // Single-image carousels skip the clones (no looping needed).
  const carouselSlides = useMemo(() => {
    if (images.length < 2) return images;
    return [images[images.length - 1], ...images, images[0]];
  }, [images]);

  // The "real" image index used by the counter and the
  // thumbnail row's active marker.
  const realBannerIndex = (() => {
    const len = images.length;
    if (len <= 1) return 0;
    if (displayIndex <= 0) return len - 1;
    if (displayIndex >= len + 1) return 0;
    return displayIndex - 1;
  })();
  const currentBanner = images[realBannerIndex] ?? "";

  // Snap-back when the slide animation lands on a clone slot.
  // Disabling the transition for one frame makes the snap
  // visually instantaneous; the rAF effect below re-enables it
  // before the next user-initiated slide animates. The
  // `e.target !== e.currentTarget` guard ignores bubbled
  // transitionend events from any future child-element CSS
  // transitions.
  const handleCarouselTransitionEnd = (
    e: React.TransitionEvent<HTMLDivElement>
  ) => {
    if (e.target !== e.currentTarget) return;
    if (images.length < 2) return;
    if (displayIndex === 0) {
      setTransitionEnabled(false);
      setDisplayIndex(images.length);
    } else if (displayIndex === images.length + 1) {
      setTransitionEnabled(false);
      setDisplayIndex(1);
    }
  };

  // After a snap (transition was disabled), re-enable it on the
  // next frame so the next user drag animates again.
  useEffect(() => {
    if (transitionEnabled) return;
    const id = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [transitionEnabled]);

  // Global pointerup / pointercancel / blur safety net while
  // mid-drag. If the captured pointer drops (window blur,
  // navigation, gesture interrupt) and the local pointerup
  // never fires, this guarantees the drag state still resets so
  // the carousel can never end up frozen in `isDragging: true`.
  useEffect(() => {
    if (!isDragging) return;
    const reset = () => {
      dragStartXRef.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };
    window.addEventListener("pointerup", reset);
    window.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
    };
  }, [isDragging]);

  // Thumbnail click — jump to the clicked real index.
  const goToBanner = (realIdx: number) => {
    setTransitionEnabled(true);
    setDisplayIndex(realIdx + 1);
  };

  return (
    <>
      <div
        className={styles.banner}
        aria-hidden="true"
        {...(images.length > 1
          ? {
              onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
                const len = images.length;
                // Force-finish any pending clone-slot snap-back
                // synchronously before accepting this drag — so
                // the next setDisplayIndex(±1) starts from a real
                // slot, not the clone. Without this, a fast
                // second drag while the first is still animating
                // toward a clone would step past the clone and
                // jam the carousel.
                if (len >= 2) {
                  if (displayIndex <= 0) {
                    setTransitionEnabled(false);
                    setDisplayIndex(len);
                  } else if (displayIndex >= len + 1) {
                    setTransitionEnabled(false);
                    setDisplayIndex(1);
                  } else {
                    setTransitionEnabled(true);
                  }
                }
                dragStartXRef.current = e.clientX;
                setDragOffset(0);
                setIsDragging(true);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // setPointerCapture unsupported on older
                  // browsers — silent fallback.
                }
              },
              onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
                const startX = dragStartXRef.current;
                if (startX === null) return;
                setDragOffset(e.clientX - startX);
              },
              onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
                const startX = dragStartXRef.current;
                if (startX === null) return;
                const dx = e.clientX - startX;
                dragStartXRef.current = null;
                setDragOffset(0);
                setIsDragging(false);
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  // releasePointerCapture is a no-op when not
                  // captured.
                }
                if (Math.abs(dx) >= 40) {
                  setDisplayIndex((i) => (dx < 0 ? i + 1 : i - 1));
                }
              },
              onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
                dragStartXRef.current = null;
                setDragOffset(0);
                setIsDragging(false);
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
              },
              onPointerLeave: () => {
                if (dragStartXRef.current === null) return;
                const dx = dragOffset;
                dragStartXRef.current = null;
                setDragOffset(0);
                setIsDragging(false);
                if (Math.abs(dx) >= 40) {
                  setDisplayIndex((i) => (dx < 0 ? i + 1 : i - 1));
                }
              },
              style: {
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "pan-y",
              },
            }
          : {})}
      >
        {images.length > 1 ? (
          <div
            className={styles.bannerTrack}
            style={{
              transform: `translateX(calc(-${displayIndex * 100}% + ${dragOffset}px))`,
              transition:
                transitionEnabled && !isDragging
                  ? "transform 0.3s ease"
                  : "none",
            }}
            onTransitionEnd={handleCarouselTransitionEnd}
          >
            {carouselSlides.map((src, i) => (
              // Each slide is a wrapper that holds:
              //   • a blurred + dimmed copy of the source image
              //     as the background, scaled to cover (so it
              //     fills the slot edge-to-edge),
              //   • a sharp copy of the same image on top, sized
              //     with `object-fit: contain` (so the FULL
              //     frame is always visible — nothing cropped).
              // Net result: the image is shown whole, and the
              // empty space around portrait / off-ratio sources
              // is filled by a soft blurred wash of the same
              // image rather than a flat dark bar. This is the
              // pattern Instagram, YouTube Shorts, Spotify, and
              // Apple Music all use for image presentation.
              <div
                key={`slide-${i}`}
                className={styles.bannerSlide}
              >
                <div
                  className={styles.bannerSlideBlur}
                  style={{ backgroundImage: `url("${src}")` }}
                  aria-hidden="true"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className={styles.bannerSlideImg}
                />
              </div>
            ))}
          </div>
        ) : currentBanner ? (
          // Single-image branch — same wrapper pattern as the
          // carousel slides above so the whole image renders
          // intact with a blurred fill around it instead of flat
          // dark bars.
          <div className={styles.bannerSingle}>
            <div
              className={styles.bannerSlideBlur}
              style={{ backgroundImage: `url("${currentBanner}")` }}
              aria-hidden="true"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentBanner}
              alt=""
              className={styles.bannerSlideImg}
            />
          </div>
        ) : (
          <div className={styles.bannerPlaceholder}>{placeholderText}</div>
        )}
        {images.length > 1 ? (
          <span
            className={styles.bannerCounter}
            aria-label={`Image ${realBannerIndex + 1} of ${images.length}`}
          >
            {realBannerIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className={styles.bannerThumbs} role="tablist">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === realBannerIndex}
              aria-label={`Show image ${i + 1}`}
              className={`${styles.bannerThumb} ${
                i === realBannerIndex ? styles.bannerThumbActive : ""
              }`}
              onClick={() => goToBanner(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setUser } = useAuth();

  // Defensive decode for base64-padded ids (those ending in `=`
  // arrive as `…%3D` from the listing page's encoded push).
  const rawId = typeof params?.id === "string" ? params.id : "";
  const eventId = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();

  // ── Page state ──
  // `null` → loading (skeleton renders); event populated once API
  // resolves. `eventError` triggers the error card path.
  const [event, setEvent] = useState<ApiEventDetail | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);

  // Booking state — seat counter + coupon input.
  const [seats, setSeats] = useState<number>(1);
  const [coupon, setCoupon] = useState<string>("");

  // Coupon flow: while the request is in flight, disable the Apply
  // button + show "Applying..." label. On success, store the
  // discount returned by the API so the summary panel can show
  // the discounted total. On failure, surface the API's message
  // as a toast (e.g. "Invalid coupon code").
  const [couponInFlight, setCouponInFlight] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    /** Per-seat discount in pounds. Single source of truth — the
     *  total displayed discount (the green "Coupon discount —
     *  £X.XX" chip in the summary panel) is computed at render
     *  time as `discountPerSeat × seats`, so changing the seat
     *  counter while a coupon is active automatically re-derives
     *  the savings without a stale snapshot. */
    discountPerSeat: number;
  } | null>(null);

  // Book Now / Register Now: while the validation + create-booking
  // calls are in flight we disable the button + show
  // "Checking..." (paid) / "Registering..." (free) so the viewer
  // doesn't double-click.
  const [bookingInFlight, setBookingInFlight] = useState(false);

  // ── Paid-event booking-flow modal state ──
  // Two-step modal sequence for paid events:
  //   • `confirmBookingOpen` — the "Confirm Booking" dialog with
  //     the refund-policy link. Opens when the viewer clicks
  //     Book Now; closing it abandons the flow.
  //   • `paymentModalOpen` — the Stripe-style payment form. Opens
  //     after the create-booking POST returns successfully (next
  //     iteration will wire that POST; this iteration just
  //     advances the UI sequence on Proceed).
  // Free events don't use either of these — they go through
  // `handleFreeRegister` and the existing free panel directly.
  const [confirmBookingOpen, setConfirmBookingOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // Stripe handoff state — populated by /event/create-booking,
  // then handed to PaymentModal for `confirmCardPayment` and to
  // `handlePaymentSuccess` for the follow-up /confirm-payment POST.
  // Cleared whenever the viewer cancels the modal so a stale
  // client_secret can't leak into the next booking attempt.
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null
  );
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  // Description Read More / Show Less. Default collapsed so the
  // description card respects a fixed max-height; clicking the
  // cyan toggle flips between the two states. The toggle is
  // always rendered when a description exists — short descriptions
  // are rare enough on this page that always-show is a more
  // reliable UX than measuring overflow on every event.
  const [descExpanded, setDescExpanded] = useState(false);

  // Banner-carousel state lives inside the `BannerCarousel` child
  // component. The parent passes `key={bannerImages.join("|")}`
  // when rendering it, so navigating between events fully
  // remounts the carousel with fresh state — no carousel state
  // exists at this level.

  // Seed the AuthContext on mount so the navbar avatar resolves
  // out of its skeleton state on hard-refresh / paste-link.
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

  // ── Event details fetch ── re-runs whenever the URL `id` changes.
  // Sets `event` on success or `eventError` on failure. Resets the
  // seat counter to 1 when a new event lands so the +/− buttons
  // start from the correct minimum.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setEvent(null);
    setEventError(null);
    setAppliedCoupon(null);
    async function fetchEvent() {
      try {
        const res = await fetch("/api/mobile/event", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: eventId }),
        });
        if (!res.ok) {
          if (!cancelled) setEventError("Couldn't load this event.");
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: ApiEventDetail;
        };
        if (cancelled) return;
        if (json?.status === "OK" && json.data) {
          setEvent(json.data);
          setEventError(null);
          // Clamp the seat counter to the API's minimum so the
          // counter buttons don't disable incorrectly when the
          // viewer navigates between events with different mins.
          setSeats(json.data.min_seats_per_booking ?? 1);
        } else {
          setEventError("Couldn't load this event.");
        }
      } catch {
        if (!cancelled) setEventError("Couldn't load this event.");
      }
    }
    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Reset Read More every time a new event loads so navigation
  // between events doesn't carry over the previous "expanded"
  // state. Carousel state is owned by `BannerCarousel`, which
  // remounts on event change via its `key` prop — no reset
  // needed here for the banner.
  useEffect(() => {
    setDescExpanded(false);
  }, [event?.description, event?.id]);

  // ── Booking-detail backfill ──
  // The /event endpoint ships `user_booking` with just booking_id +
  // booking_status. To render "You have booked this event (N
  // seat(s))." we need `num_seats`, which isn't in that payload —
  // it lives on /event/booking-detail. So whenever we land on a
  // page where the viewer has a booking but no seat count, fetch
  // the detail and patch num_seats into local state. Skipped for
  // bookings created in this session (handlePaymentSuccess sets
  // num_seats from the local seat counter directly).
  useEffect(() => {
    const booking = event?.user_booking;
    if (!booking?.booking_id) return;
    if (typeof booking.num_seats === "number") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mobile/event/booking-detail", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.booking_id }),
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          status?: string;
          data?: { num_seats?: number | null } | null;
        } | null;
        if (cancelled) return;
        const seatsCount = json?.data?.num_seats;
        if (json?.status === "OK" && typeof seatsCount === "number") {
          setEvent((prev) =>
            prev && prev.user_booking
              ? {
                  ...prev,
                  user_booking: {
                    ...prev.user_booking,
                    num_seats: seatsCount,
                  },
                }
              : prev
          );
        }
      } catch {
        // Silent fail — the chip falls back to "(1 seat)" via the
        // default below if we can't fetch booking-detail.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event?.user_booking?.booking_id, event?.user_booking?.num_seats]);

  // ── Derived values ── computed every render from the API record.
  // `null` short-circuits guard the JSX from rendering broken
  // numbers while the event is still loading.
  const minSeats = event?.min_seats_per_booking ?? 1;
  const maxSeats = event?.max_seats_per_booking ?? 1;
  const seatsAvailable = event?.seats_available ?? event?.total_seats ?? 0;

  // Per-seat price prefers `offer_price` (when present + non-zero)
  // over `list_price`. Coupon discount is applied per-seat on top.
  const baseListPrice = Number(event?.list_price ?? 0);
  const offerPrice = Number(event?.offer_price ?? 0);
  const usingOffer =
    Number.isFinite(offerPrice) && offerPrice > 0 && offerPrice < baseListPrice;
  const baseSeatPrice = usingOffer ? offerPrice : baseListPrice;
  const discountedSeatPrice = useMemo(() => {
    if (!appliedCoupon) return baseSeatPrice;
    return Math.max(0, baseSeatPrice - appliedCoupon.discountPerSeat);
  }, [appliedCoupon, baseSeatPrice]);

  const totalAmount = discountedSeatPrice * seats;

  // Booked surface gate — `true` ONLY when the viewer has an
  // actually-paid booking for this event. A `pending` booking
  // (created by /create-booking but never followed by a
  // successful Stripe payment) is NOT considered booked: the
  // viewer hasn't given any money, the upstream booking row is
  // sitting around waiting for payment, and the right panel
  // should keep showing Book Now so they can complete the
  // flow (or expire / cancel server-side).
  // Confirmed-equivalent statuses: "paid" (the Stripe
  // PaymentIntent succeeded), "confirmed" (free event
  // registration), "completed" (post-event accounting state).
  const userBookingStatus = (
    event?.user_booking?.booking_status ?? ""
  ).toLowerCase();
  const hasActiveBooking =
    !!event?.user_booking?.booking_id &&
    ["paid", "confirmed", "completed"].includes(userBookingStatus);
  const bookedSeats = event?.user_booking?.num_seats ?? 1;

  // Combine every banner image the API returns into one ordered
  // carousel list. The API ships images across `banner_image_url`,
  // `sidebar_image_url`, and a `gallery_images` array of objects
  // (each with `image_url` + `sort_order`). We merge them in
  // declaration order: banner first, sidebar second, then the
  // gallery sorted by `sort_order` ascending. Duplicates and empty
  // strings are dropped. The legacy string-array fields are kept
  // as a defensive fallback. The carousel scales to whatever count
  // the API ships, from 1 image up to N — with only one image the
  // carousel chrome (indicator + thumbnails + drag handlers) is
  // hidden.
  const bannerImages = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const push = (raw: string | null | undefined) => {
      const url = (raw ?? "").trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push(url);
    };
    push(event?.banner_image_url);
    push(event?.sidebar_image_url);

    if (Array.isArray(event?.gallery_images)) {
      const sortedGallery = [...event.gallery_images].sort((a, b) => {
        const ao = typeof a?.sort_order === "number" ? a.sort_order : 0;
        const bo = typeof b?.sort_order === "number" ? b.sort_order : 0;
        return ao - bo;
      });
      for (const item of sortedGallery) push(item?.image_url);
    }

    const arrays: Array<string[] | null | undefined> = [
      event?.images,
      event?.media_urls,
      event?.event_images,
      event?.gallery,
    ];
    for (const arr of arrays) {
      if (!Array.isArray(arr)) continue;
      for (const url of arr) push(url);
    }
    return list;
  }, [
    event?.banner_image_url,
    event?.sidebar_image_url,
    event?.gallery_images,
    event?.images,
    event?.media_urls,
    event?.event_images,
    event?.gallery,
  ]);

  // Carousel-related computations (cloned slides, real index,
  // snap-back transitionend handler, rAF re-enable, drag-state
  // safety listeners, thumbnail click handler) all live in the
  // `BannerCarousel` child component below. The parent only
  // computes `bannerImages` and passes it down — every other
  // bit of carousel state is owned by the child instance and
  // re-initialised when its `key` changes.

  // Only show the Read More / Show Less toggle when the description
  // is actually long enough to warrant truncation. Short descriptions
  // (a sentence or two) render in full with no toggle — matching the
  // live YP behaviour. Threshold counts characters AFTER stripping
  // HTML tags + collapsing whitespace, so the API's `<p>` wrappers
  // and inline styles don't inflate the length artificially.
  const descShouldTruncate = useMemo(() => {
    const html = event?.description ?? "";
    if (!html) return false;
    const plain = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length > 300;
  }, [event?.description]);

  // Address line shown under the Location heading. The API ships
  // `location` as an array of strings; join with a comma so multi-
  // line addresses render on one row without losing data.
  const locationAddress = useMemo(() => {
    if (!event?.location || !Array.isArray(event.location)) return "";
    return event.location.filter(Boolean).join(", ");
  }, [event?.location]);

  // Cyan caps row above the title — derived from the API's
  // `event_type_display`, with a safe fallback when the field is
  // missing or unexpected.
  const eventTypeLabel = useMemo(() => {
    const display = event?.event_type_display ?? "";
    if (display.toLowerCase().includes("virtual")) return "VIRTUAL EVENT";
    if (display.toLowerCase().includes("physical")) return "PHYSICAL EVENT";
    return display.toUpperCase();
  }, [event?.event_type_display]);

  // ── Seat counter handlers ── clamp to [min, min(max, available)]
  // so the counter never lets the viewer select more seats than
  // the API says are available.
  const effectiveMax = Math.min(maxSeats, seatsAvailable || maxSeats);
  const incSeats = () => {
    setSeats((s) => Math.min(effectiveMax, s + 1));
  };
  const decSeats = () => {
    setSeats((s) => Math.max(minSeats, s - 1));
  };

  // ── Apply coupon ── POSTs `{ event_id, coupon_code, num_seats }`.
  // Toast surfaces the API's own message on success / error. On
  // success, the returned discount is stored in `appliedCoupon`
  // so the summary panel can render the new per-seat price.
  const applyCoupon = async () => {
    if (!event || couponInFlight) return;
    const code = coupon.trim();
    if (!code) {
      toast.error("Enter a coupon code first");
      return;
    }
    setCouponInFlight(true);
    try {
      const res = await fetch("/api/mobile/event/apply-coupon", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          coupon_code: code,
          num_seats: seats,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiCouponResponse | null;
      if (!res.ok || json?.status !== "OK") {
        // Clear any previously-applied coupon so the displayed
        // total returns to the un-discounted amount.
        setAppliedCoupon(null);
        toast.error(json?.message || "Invalid coupon code");
        return;
      }
      // Try to read a per-seat discount out of the response. The
      // upstream contract isn't fully documented for the success
      // case — we look at `discount_amount` first (if present),
      // otherwise back-compute from `total_amount` against the
      // current seats / per-seat price.
      // Reduce the upstream's response to a single per-seat
      // discount figure — the only thing we need to remember.
      // Total discount + total amount are both derivable from
      // `discountPerSeat × seats` at render time, so storing
      // either of those would just be redundant state that
      // could drift out of sync with the seat counter.
      let discountPerSeat = 0;
      const da = Number(json?.data?.discount_amount ?? 0);
      if (Number.isFinite(da) && da > 0) {
        // Upstream returns the TOTAL discount for the seat
        // count we asked about — convert to per-seat.
        discountPerSeat = da / Math.max(1, seats);
      } else if (json?.data?.total_amount != null) {
        // Defensive fallback: some response variants ship only
        // `total_amount`. Back-compute per-seat discount from
        // (subtotal − total) / seats.
        const total = Number(json.data.total_amount);
        if (Number.isFinite(total) && total >= 0) {
          const totalDiscount = Math.max(
            0,
            baseSeatPrice * Math.max(1, seats) - total
          );
          discountPerSeat = totalDiscount / Math.max(1, seats);
        }
      }
      setAppliedCoupon({ code, discountPerSeat });
      toast.success(json?.message || "Coupon applied successfully");
    } catch {
      setAppliedCoupon(null);
      toast.error("Couldn't validate this coupon. Please try again.");
    } finally {
      setCouponInFlight(false);
    }
  };

  // ── Book Now ── (paid events) opens the two-step booking
  // sequence:
  //   1. `BookingConfirmDialog` — "You are about to book N seats
  //      for £X. Bookings are non-cancellable and non-refundable
  //      once confirmed. By proceeding, you agree to our refund
  //      policy." with Cancel / Proceed.
  //   2. `PaymentModal` — Stripe-style card form (number /
  //      expiration / CVC / country) with full client-side
  //      validation. Opens after the viewer hits Proceed in step 1.
  //
  // Both API handoffs are now live: `handleConfirmBooking` POSTs
  // /event/create-booking and stashes the resulting Stripe
  // PaymentIntent client_secret + booking_id; the PaymentModal
  // drives `stripe.confirmCardPayment`; on Stripe success the
  // modal calls `handlePaymentSuccess` which POSTs
  // /event/confirm-payment + flips the local user_booking so the
  // panel re-renders into the Booked surface.
  const handleBookNow = () => {
    if (!event || bookingInFlight) return;
    if (!event.is_registration_open) {
      toast.error("Registration is closed for this event.");
      return;
    }
    setConfirmBookingOpen(true);
  };

  // ── Step 1 → Step 2 transition ──
  // Fires when the viewer clicks Proceed inside the Confirm
  // Booking dialog. POSTs `/event/create-booking` so the upstream
  // can reserve the seats + create a Stripe PaymentIntent, stashes
  // the resulting `client_secret` + `booking_id`, and only opens
  // the PaymentModal once both are in hand. If create-booking
  // fails, the dialog stays closed and a toast surfaces the error.
  const handleConfirmBooking = async () => {
    if (!event || bookingInFlight) return;
    // Close the Confirm Booking dialog IMMEDIATELY so the viewer
    // sees the Book Now button transition to its loading-spinner
    // state without the dialog hanging on screen during the
    // create-booking POST. Matches the live YP UX exactly.
    setConfirmBookingOpen(false);

    // ── Reuse path ──
    // If the viewer already started a booking in THIS session
    // (clicked Proceed, opened the Stripe modal, then closed it
    // without paying), the upstream booking is still in
    // `pending` state with the same Stripe PaymentIntent. Calling
    // create-booking again would be rejected with an "already
    // booked" error. So when we have a stashed bookingId +
    // clientSecret from a previous attempt, we just reopen the
    // payment modal pointed at that same session — the viewer
    // can complete the payment they walked away from. The
    // upstream booking only flips out of `pending` on a
    // successful confirm-payment, so there's no risk of
    // re-using a stale row here.
    if (pendingBookingId && stripeClientSecret) {
      setPaymentModalOpen(true);
      return;
    }

    setBookingInFlight(true);
    try {
      // ── Stale pending cleanup ──
      // The viewer might have an `pending` booking row left over
      // from a previous session (typically: they hit Proceed, the
      // Stripe modal opened, they cancelled / refreshed the page
      // without paying, the in-memory client_secret was wiped on
      // page reload). The upstream `/event` endpoint surfaces
      // that row in `event.user_booking` with `booking_status:
      // "pending"`. If we go straight to create-booking, the
      // upstream sees the existing pending row and rejects with
      // "already booked". Cancel it here first so create-booking
      // gets a clean slot. This is best-effort: even if the
      // cancel call fails, we still attempt create-booking — the
      // surfaced upstream error will then be the source of truth.
      const stalePendingId = event.user_booking?.booking_id;
      const stalePendingStatus = (
        event.user_booking?.booking_status ?? ""
      ).toLowerCase();
      if (stalePendingId && stalePendingStatus === "pending") {
        await fetch("/api/mobile/event/cancel-booking", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: stalePendingId }),
        }).catch(() => {
          // Swallow — we'll let create-booking surface a real
          // error if the cancel didn't actually clear the slot.
        });
        // Drop the stale user_booking from local state so any
        // UI that mirrors `event.user_booking` (the booked chip,
        // the booking-detail backfill effect) doesn't keep
        // pointing at the now-cancelled row while the next
        // create-booking is in flight.
        setEvent((prev) => (prev ? { ...prev, user_booking: null } : prev));
      }

      const res = await fetch("/api/mobile/event/create-booking", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          num_seats: seats,
          coupon_code: appliedCoupon?.code ?? "",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        status?: string;
        message?: string;
        data?: {
          booking_id?: string | null;
          /** Stripe PaymentIntent client_secret ("pi_xxx_secret_xxx").
           *  May be wrapped under different keys depending on the
           *  upstream version, so we read defensively. */
          client_secret?: string | null;
          payment_intent_client_secret?: string | null;
          stripe_client_secret?: string | null;
          payment?: {
            client_secret?: string | null;
          } | null;
        } | null;
      } | null;
      if (!res.ok || (json?.status && json.status !== "OK")) {
        toast.error(
          (json && json.message) || "Couldn't start the booking. Please try again."
        );
        return;
      }
      const data = json?.data ?? null;
      const bookingId = data?.booking_id ?? null;
      const clientSecret =
        data?.client_secret ??
        data?.payment_intent_client_secret ??
        data?.stripe_client_secret ??
        data?.payment?.client_secret ??
        null;
      if (!bookingId || !clientSecret) {
        toast.error(
          "We couldn't open the payment form. Please refresh and try again."
        );
        return;
      }
      setPendingBookingId(bookingId);
      setStripeClientSecret(clientSecret);
      setPaymentModalOpen(true);
    } catch {
      toast.error("Couldn't start the booking. Please try again.");
    } finally {
      setBookingInFlight(false);
    }
  };

  // ── Step 2 success ──
  // Fires once the PaymentModal's `stripe.confirmCardPayment` call
  // resolves with a succeeded (or processing) PaymentIntent. The
  // upstream backend doesn't get notified by Stripe directly until
  // its webhook fires, so we POST `/event/confirm-payment` here
  // to nudge the booking row out of `pending` immediately. On
  // success we patch local `event.user_booking` so the right
  // panel flips to the booked surface (green chip + disabled
  // "Booked" pill) without needing a re-fetch.
  const handlePaymentSuccess = async () => {
    if (!event || !pendingBookingId) return;
    setBookingInFlight(true);
    try {
      const res = await fetch("/api/mobile/event/confirm-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: pendingBookingId }),
      });
      const json = (await res.json().catch(() => null)) as {
        status?: string;
        message?: string;
        data?: {
          booking_id?: string | null;
          booking_status?: string | null;
          payment_status?: string | null;
        } | null;
      } | null;
      // The upstream returns `status: "OK"` even when the payment
      // is still `processing` — Stripe's webhook may not have
      // fired by the time we hit confirm-payment. Either way we
      // surface a Booked state locally; the periodic refresh on
      // page revisit will reflect the eventual webhook result.
      if (!res.ok || (json?.status && json.status !== "OK")) {
        toast.error(
          (json && json.message) ||
            "Payment was taken but we couldn't confirm the booking. Please refresh."
        );
        return;
      }
      // Force `booking_status: "paid"` locally regardless of what
      // /confirm-payment echoed back. By the time we reach this
      // handler we KNOW Stripe.confirmCardPayment succeeded
      // (the modal only calls onPaymentSuccess on a succeeded /
      // processing PaymentIntent), so the money has changed
      // hands. The upstream might still report `pending` for a
      // few seconds while it waits for the Stripe webhook to
      // fire — our hasActiveBooking gate would then refuse to
      // flip the right panel into Booked. Stamping "paid" here
      // makes the UX correct immediately; the next /event fetch
      // (on refresh / re-navigation) will read the eventual
      // upstream value, which by then should be "paid" anyway.
      // Capture the external survey URL BEFORE we close the modal —
      // we want to open it after both API hops resolve so the
      // viewer sees the spinner during the network round-trip,
      // then the survey opens in a new tab + the booked state
      // appears on this tab simultaneously. Same flow the free-
      // event Register Now button uses (handleFreeRegister).
      const externalUrl = event.external_registration_url || "";
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              user_booking: {
                booking_id: pendingBookingId,
                booking_status: "paid",
                num_seats: seats,
              },
            }
          : prev
      );
      setPaymentModalOpen(false);
      setStripeClientSecret(null);
      setPendingBookingId(null);
      // Open the SurveyMonkey / external registration URL in a new
      // tab. Modern browsers allow `window.open` for a few seconds
      // after a user gesture even after `await`s — Stripe's
      // confirmCardPayment + our /confirm-payment together typically
      // resolve within 2-4 seconds which sits inside that window.
      // If a browser blocks the popup the booking is still safely
      // confirmed server-side and the right panel still flips to
      // the booked surface; only the survey tab would be missing.
      if (externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Booking Successful", { duration: 10000 });
    } catch {
      toast.error(
        "Payment was taken but we couldn't confirm the booking. Please refresh."
      );
    } finally {
      setBookingInFlight(false);
    }
  };

  // Cancelling the PaymentModal — keeps the booking handoff
  // state stashed so the viewer can re-enter the SAME payment
  // session by clicking Book Now → Proceed again. The upstream
  // booking stays in `pending` state (no payment confirmed yet)
  // until they actually pay or it expires server-side, so
  // creating a new booking would just trip an "already booked"
  // error. handleConfirmBooking checks for the stash and
  // short-circuits straight to opening the modal when found.
  // Only `handlePaymentSuccess` clears these (after
  // confirm-payment succeeds, the session is consumed).
  const handlePaymentCancel = () => {
    setPaymentModalOpen(false);
  };

  // ── Register Now ── (free events) drives the documented YP
  // booking flow end-to-end:
  //   1. POST /event/check-availability  — validate seats are
  //      still open and registration hasn't closed.
  //   2. POST /event/create-booking      — actually creates the
  //      booking. For 100%-off / free events the upstream
  //      returns the finalised booking row directly (no Stripe
  //      PaymentIntent, no need to call /confirm-payment).
  //   3. Open `external_registration_url` (the SurveyMonkey form)
  //      in a new tab AFTER both API calls resolve. The order is
  //      load-bearing: opening the popup synchronously inside the
  //      click handler used to steal focus before React could
  //      render the spinner state, so the viewer never saw
  //      "Registering…" on the source tab — they just got slammed
  //      onto SurveyMonkey. Opening the tab AFTER the awaits keeps
  //      the spinner visible during the network round-trip, which
  //      matches the live YP UX (and what the user explicitly
  //      asked for).
  //   4. Patch local `event.user_booking` from the response so
  //      the right panel flips to the cyan-ring "Registered"
  //      pill, and fire the "Registration Complete" toast.
  //
  // Popup-blocker note: most browsers allow `window.open` for a
  // few seconds after a user gesture even after `await`s. With
  // the YP API typically responding in well under a second this
  // is fine in practice. If the popup is blocked the booking is
  // still safely created server-side and the panel still flips
  // to Registered + the toast still fires — only the survey tab
  // would be missing, and the user can re-open via the
  // external_registration_url anywhere else (e.g. by clicking
  // Register Now again — the second click would hit
  // create-booking which the upstream surfaces as "already
  // booked", but it would re-attempt the popup in a fresh
  // gesture).
  //
  // This handler is wired ONLY to the free-event variant of the
  // right panel — paid events still go through `handleBookNow`,
  // which keeps the legacy "open external URL + check-availability"
  // shape until the Stripe PaymentSheet flow lands.
  const handleFreeRegister = () => {
    if (!event || bookingInFlight) return;
    if (!event.is_registration_open) {
      toast.error("Registration is closed for this event.");
      return;
    }
    const externalUrl = event.external_registration_url || "";
    setBookingInFlight(true);
    (async () => {
      try {
        // Step 1: validate seats.
        const availRes = await fetch(
          "/api/mobile/event/check-availability",
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: event.id,
              num_seats: 1,
            }),
          }
        );
        const availJson = (await availRes.json().catch(() => null)) as {
          status?: string;
          message?: string;
        } | null;
        if (!availRes.ok || (availJson?.status && availJson.status !== "OK")) {
          toast.error(
            (availJson && availJson.message) ||
              "Couldn't reserve a seat. Please try again."
          );
          return;
        }
        // Step 2: create the booking. For 100%-off / free events
        // the upstream returns the booking directly — no Stripe
        // dance needed. We don't pass `coupon_code` because the
        // free-event panel has no coupon input.
        const bookRes = await fetch("/api/mobile/event/create-booking", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: event.id,
            num_seats: 1,
          }),
        });
        const bookJson = (await bookRes.json().catch(() => null)) as {
          status?: string;
          message?: string;
          data?: {
            booking_id?: string | null;
            booking_status?: string | null;
          } | null;
        } | null;
        if (!bookRes.ok || (bookJson?.status && bookJson.status !== "OK")) {
          toast.error(
            (bookJson && bookJson.message) ||
              "Couldn't register for this event."
          );
          return;
        }
        // Step 3: open the survey form in a new tab now that both
        // API calls resolved. The spinner has been visible on this
        // tab the whole time the network round-trip was running.
        if (externalUrl) {
          window.open(externalUrl, "_blank", "noopener,noreferrer");
        }
        // Step 4: patch local event state so the right panel flips
        // to the "Registered" cyan-ring pill. Pull booking_id +
        // booking_status from the response so the local shape
        // matches what the GET /event endpoint returns on a
        // subsequent reload — no field drift.
        const newBooking = {
          booking_id: bookJson?.data?.booking_id ?? null,
          booking_status: bookJson?.data?.booking_status ?? "confirmed",
        };
        setEvent((prev) =>
          prev ? { ...prev, user_booking: newBooking } : prev
        );
        // Step 5: toast. Fixed text "Registration Complete" per
        // the live YP copy — we no longer fall back to the
        // upstream `message` (which can be a more verbose
        // "Booking created successfully" or similar) so the
        // toast reads exactly the way the user asked for. Long
        // duration (10s) so the toast is still on screen if the
        // viewer is mid-survey when it fires and only switches
        // back a few seconds later.
        toast.success("Registration Complete", { duration: 10000 });
      } catch {
        toast.error("Couldn't register for this event. Please try again.");
      } finally {
        setBookingInFlight(false);
      }
    })();
  };

  // ── Render ──
  // Loading / error / loaded branches. All three share the
  // page-title row + back arrow at the top.
  return (
    <div className={`${homeStyles.page} ${styles.pageEventDetails}`}>
      <Navbar />
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
          <h1 className={styles.title}>Event Details</h1>
        </div>

        {event === null && eventError === null ? (
          // ── Loading skeleton ── full layout placeholder mirroring
          // the loaded state's structure (banner + two-column body
          // with left content cards + right pricing/booking cards)
          // so the page doesn't visually "pop" when data arrives.
          // Each shimmer bar sits at the rough size of the real
          // element it replaces.
          <>
            <div className={styles.banner} aria-hidden="true">
              <div
                className={`${homeStyles.skeleton} ${styles.bannerPlaceholder}`}
                style={{ background: "rgba(255, 255, 255, 0.06)" }}
              />
            </div>

            <div className={styles.body} aria-hidden="true">
              <div className={styles.left}>
                {/* Title + Date & Time card placeholder */}
                <section className={styles.card}>
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "30%", height: 12 }}
                  />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "78%", height: 22 }}
                  />
                  <hr className={styles.cardDivider} />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "26%", height: 16 }}
                  />
                  <div className={styles.dateGrid}>
                    <div className={styles.dateColumn}>
                      <div
                        className={`${homeStyles.skeleton} ${styles.skLine}`}
                        style={{ width: "55%", height: 10 }}
                      />
                      <div
                        className={`${homeStyles.skeleton} ${styles.skLine}`}
                        style={{ width: "78%", height: 14, marginTop: 6 }}
                      />
                    </div>
                    <div className={styles.dateColumn}>
                      <div
                        className={`${homeStyles.skeleton} ${styles.skLine}`}
                        style={{ width: "50%", height: 10 }}
                      />
                      <div
                        className={`${homeStyles.skeleton} ${styles.skLine}`}
                        style={{ width: "72%", height: 14, marginTop: 6 }}
                      />
                    </div>
                  </div>
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "32%", height: 12 }}
                  />
                </section>

                {/* Description card placeholder */}
                <section className={styles.card}>
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "32%", height: 14 }}
                  />
                  <hr className={styles.cardDivider} />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "98%", height: 10 }}
                  />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "94%", height: 10 }}
                  />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "88%", height: 10 }}
                  />
                  <div
                    className={`${homeStyles.skeleton} ${styles.skLine}`}
                    style={{ width: "70%", height: 10 }}
                  />
                </section>
              </div>

              {/* Right pricing + booking placeholder */}
              <aside className={styles.right}>
                <div
                  className={`${homeStyles.skeleton} ${styles.skBlock}`}
                  style={{ height: 70, borderRadius: 16 }}
                />
                <div
                  className={`${homeStyles.skeleton} ${styles.skBlock}`}
                  style={{ height: 220, borderRadius: 12 }}
                />
              </aside>
            </div>
          </>
        ) : eventError !== null ? (
          <section className={styles.card} aria-live="polite">
            <p className={styles.descBody}>{eventError}</p>
          </section>
        ) : event !== null ? (
          <>
            {/* ── Banner carousel ──
                Owns its own state inside `BannerCarousel`. The
                `key={bannerImages.join("|")}` prop tells React to
                fully unmount + remount the carousel whenever the
                image set changes (i.e., the user navigates to a
                different event). That guarantees no carousel
                state can leak across events — every event gets a
                clean slate, and the "stuck after navigation, need
                to refresh" failure mode is structurally
                impossible. */}
            <BannerCarousel
              key={bannerImages.join("|")}
              images={bannerImages}
              placeholderText={event.title ?? ""}
            />

            {/* ── Body — two-column grid (left = info / description /
                location, right = pricing + booking sidebar). ── */}
            <div className={styles.body}>
              <div className={styles.left}>
                {/* Title + Date & Time card. For virtual events the
                    Google Meet (or other platform) pill renders
                    between the title and the divider above the
                    Date & Time block — that's where the live YP
                    site puts the "where to attend" cue, replacing
                    the separate Platform card we used to render
                    below the description. */}
                <section
                  className={styles.card}
                  aria-label="Event title and date"
                >
                  <p className={styles.eventType}>{eventTypeLabel}</p>
                  <h2 className={styles.eventTitle}>{event.title ?? ""}</h2>

                  {event.event_type === "1" && event.platform_name ? (
                    <>
                      <hr className={styles.cardDivider} />
                      {event.platform_link ? (
                        <a
                          className={styles.googleMeetPill}
                          href={event.platform_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <VideoIcon />
                          {event.platform_name}
                        </a>
                      ) : (
                        <span className={styles.googleMeetPill}>
                          <VideoIcon />
                          {event.platform_name}
                        </span>
                      )}
                    </>
                  ) : null}

                  <hr className={styles.cardDivider} />

                  <h3 className={styles.sectionHeading}>
                    <CalendarIcon />
                    Date &amp; Time
                  </h3>
                  {(() => {
                    const startStr = formatLongDate(event.start_datetime);
                    const endStr = formatLongDate(event.end_datetime);
                    const hasEnd =
                      Boolean(endStr) && endStr !== startStr;
                    return (
                      <div className={styles.dateGrid}>
                        <div className={styles.dateColumn}>
                          <p className={styles.eventDateLabel}>
                            {hasEnd ? "Start Date" : "Event date"}
                          </p>
                          <p className={styles.eventDateValue}>
                            {startStr || "Not specified"}
                          </p>
                        </div>
                        {hasEnd ? (
                          <div className={styles.dateColumn}>
                            <p className={styles.eventDateLabel}>End Date</p>
                            <p className={styles.eventDateValue}>{endStr}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  {event.timing_info ? (
                    <p className={styles.timingInfo}>{event.timing_info}</p>
                  ) : null}

                  <hr className={styles.cardDivider} />

                  {/* Organized by — renders ONLY when the API ships a
                      `company` object on the event. Sits inside the
                      same title card as the Date & Time block (per the
                      live YP reference) so the heading + organizer
                      chip read as one continuous metadata strip. The
                      chip is a button that routes the viewer to
                      `/company/{company.id}` — same destination the
                      live site uses for its organizer affordance. */}
                  {event.company && event.company.name ? (
                    <>
                      <h3 className={styles.organizerHeading}>Organized by</h3>
                      <button
                        type="button"
                        className={styles.organizerChip}
                        onClick={() => {
                          if (event.company?.id) {
                            router.push(`/company/${event.company.id}`);
                          }
                        }}
                        disabled={!event.company.id}
                        aria-label={`View organizer ${event.company.name}`}
                      >
                        <span className={styles.organizerLogo}>
                          {/* Logo image — falls back to the same default
                              SVG the /company listing uses when the API
                              ships `logo_url: null` (or the remote URL
                              fails to load). Avoids a broken-image icon
                              and keeps the chip visually consistent
                              with the rest of the app's company chrome. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              event.company.logo_url ||
                              "https://youngprofessionals.global/_next/static/media/company-logo-default.29ff6a63.svg"
                            }
                            alt={event.company.name}
                            onError={(e) => {
                              const t = e.currentTarget;
                              if (
                                t.src !==
                                "https://youngprofessionals.global/_next/static/media/company-logo-default.29ff6a63.svg"
                              ) {
                                t.src =
                                  "https://youngprofessionals.global/_next/static/media/company-logo-default.29ff6a63.svg";
                              }
                            }}
                          />
                        </span>
                        <span className={styles.organizerName}>
                          {event.company.name}
                        </span>
                      </button>
                    </>
                  ) : null}
                </section>

                {/* Event Description card — HTML rich-text from API.
                    Collapsed by default to a fixed max-height; the
                    cyan "Read More" / "Show Less" toggle below the
                    text expands or re-collapses the section. The
                    toggle only appears when the rendered HTML
                    actually overflows the collapsed height (see
                    the descHasOverflow effect above). */}
                <section
                  className={styles.card}
                  aria-label="Event description"
                >
                  <h3 className={styles.cardHeading}>Event Description</h3>
                  <hr className={styles.cardDivider} />
                  {event.description ? (
                    <>
                      <div
                        className={`${styles.descBody} ${
                          descShouldTruncate && !descExpanded
                            ? styles.descCollapsed
                            : ""
                        }`}
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                      {descShouldTruncate ? (
                        <button
                          type="button"
                          className={styles.readMoreBtn}
                          onClick={() => setDescExpanded((s) => !s)}
                        >
                          {descExpanded ? "Show Less" : "Read More"}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className={styles.descBody}>
                      No description available.
                    </p>
                  )}
                </section>

                {/* Keywords card — chip list of API-supplied tags.
                    Renders only when the API returns at least one
                    keyword. Sits between Event Description and the
                    Location card so the eye reads description →
                    tags → where-to-attend. Same chrome (`.card`)
                    as the surrounding cards so it visually slots in. */}
                {Array.isArray(event.keywords) && event.keywords.length > 0 ? (
                  <section
                    className={`${styles.card} ${styles.keywordsCard}`}
                    aria-label="Event keywords"
                  >
                    <h3 className={styles.cardHeading}>Keywords</h3>
                    <hr className={styles.cardDivider} />
                    <div className={styles.keywordsList}>
                      {event.keywords.map((kw) => (
                        <span key={kw} className={styles.keywordChip}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Location card. Renders ONLY for physical events
                    with a real address — virtual events surface the
                    platform info via the Google Meet pill in the
                    title card above, so a separate Platform card
                    here would be redundant. For free events we show
                    the address text but hide the map placeholder
                    per the user's "no map holder boxcard for free"
                    rule. */}
                {locationAddress && event.event_type !== "1" ? (
                  <section
                    className={styles.card}
                    aria-label="Event location"
                  >
                    <h3 className={styles.sectionHeading}>
                      <LocationPinIcon />
                      Location
                    </h3>
                    <p className={styles.locationAddress}>
                      {locationAddress}
                    </p>

                    {event.pricing_type !== "free" ? (
                      <div className={styles.mapWrap}>
                        {/* Free Google Maps embed iframe — same URL
                            pattern the live YP /events/[id] page
                            uses. The address from the API drives
                            the pin placement (Google's geocoder
                            handles fuzzy matching), and the iframe
                            provides every native control out of the
                            box: pink location pin, bottom-left
                            satellite toggle, bottom-right fullscreen,
                            keyboard shortcuts, and the "Map data
                            ©2026 Google" footer. The "Open in Maps"
                            pill is a custom CSS overlay positioned
                            on top via `.openInMaps`.

                            URL strategy:
                              • `www.google.com/maps` (the modern
                                canonical) — handles the "search"
                                fallback better than the legacy
                                `maps.google.com/maps` host when the
                                API ships a non-strict address. If
                                Google's geocoder finds even a
                                partial / nearby match, this host
                                surfaces a pin where the legacy
                                host returned a no-pin default view.
                              • `z=14` (neighbourhood-scale zoom)
                                matches the live YP /events/[id]
                                reference exactly — the visible
                                map shows surrounding streets +
                                landmarks AND pins the address
                                clearly at the centre. Auto-zoom
                                (no `z=`) was too coarse for city
                                addresses like "London, UK" — Google
                                defaults to z≈11 (whole-city view)
                                which doesn't match the reference's
                                street-level context. `z=14` shows
                                ~1–2 km of horizontal extent which
                                is exactly where the live YP sits.
                              • `&iwloc=` was already dropped in
                                an earlier fix so Google doesn't
                                reserve vertical info-window space
                                below the marker.
                              • Caveat: an unmappable address (e.g.
                                a literal "sdfsdf" test value) will
                                still produce a pinless map — that's
                                Google's geocoder, not something we
                                can fix without latitude/longitude
                                coordinates from the API. With real
                                addresses (London / Bristol /
                                building names) the pin renders
                                centred. */}
                        <a
                          className={styles.openInMaps}
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in Maps
                          <ExternalLinkIcon />
                        </a>
                        <iframe
                          src={`https://www.google.com/maps?q=${encodeURIComponent(locationAddress)}&z=14&hl=en&output=embed`}
                          title={`Map showing ${locationAddress}`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a
                        className={styles.openInMaps}
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ position: "static", display: "inline-flex" }}
                      >
                        Open in Maps
                        <ExternalLinkIcon />
                      </a>
                    )}
                  </section>
                ) : null}
              </div>

              {/* ── RIGHT SIDEBAR ──────────────────────────────────
                  Two variants: free events get a stripped-down
                  registration panel (gradient header w/ "FREE" +
                  short copy + Register Now button) while paid
                  events keep the full booking flow (seats counter
                  + coupon + summary + Total bar). The outer
                  container chrome (border, glass fill, sticky
                  position, max-width 491px) is shared. */}
              {event.pricing_type === "free" ? (
                <aside className={styles.right} aria-label="Event registration">
                  <section
                    className={`${styles.pricingCard} ${styles.pricingCardFree}`}
                  >
                    <div className={styles.pricingHeaderRowFree}>
                      <div className={styles.pricingTitleStack}>
                        <span className={styles.pricingTitleMain}>
                          Event Registration
                        </span>
                        <span className={styles.pricingPerPersonFree}>
                          (Per person)
                        </span>
                      </div>
                      <p className={styles.pricingAmountFree}>FREE</p>
                    </div>
                  </section>

                  {/* Two distinct states for the free-event panel,
                      driven by the API's `user_booking` field on
                      the event object (and patched locally after
                      the Register Now POST returns):
                        • Not registered → show the "Join this
                          event for free / No booking required..."
                          prose, the divider, and the gradient
                          Register Now button.
                        • Registered → hide the prose + divider
                          entirely (the viewer is already in;
                          extra copy reads as noise) and replace
                          the gradient button with a cyan-tinted
                          disabled "Registered" pill — same visual
                          treatment as the company-page Following
                          and jobs-page Applied confirm states so
                          the brand-confirmed UX reads identically
                          across the app. */}
                  {event.user_booking ? (
                    <button
                      type="button"
                      className={`${styles.freeRegisterBtn} ${styles.freeRegisteredBtn}`}
                      disabled
                      aria-label="Already registered"
                    >
                      Registered
                    </button>
                  ) : (
                    <>
                      <p className={styles.freeRegisterText}>
                        Join this event for free.
                        <br />
                        No booking required. Just register and you&apos;re in.
                      </p>

                      <hr className={styles.freeRegisterDivider} />

                      <button
                        type="button"
                        className={styles.freeRegisterBtn}
                        onClick={handleFreeRegister}
                        disabled={
                          bookingInFlight || !event.is_registration_open
                        }
                      >
                        {bookingInFlight ? (
                          <>
                            <span
                              className={styles.spinner}
                              aria-hidden="true"
                            >
                              <SpinnerIcon />
                            </span>
                            Registering...
                          </>
                        ) : (
                          "Register Now"
                        )}
                      </button>
                    </>
                  )}
                </aside>
              ) : (
              <aside
                className={`${styles.right} ${
                  hasActiveBooking ? styles.rightBooked : ""
                }`}
                aria-label="Booking"
              >
                {/* Gradient pricing header. */}
                <section className={styles.pricingCard}>
                  <div className={styles.pricingHeaderRow}>
                    <h3 className={styles.pricingTitle}>
                      Event Pricing
                      <span className={styles.pricingPerPerson}>
                        (Per person)
                      </span>
                    </h3>
                    <p className={styles.pricingAmount}>
                      {formatGBP(baseSeatPrice, event.pricing_type).replace(
                        ".00",
                        ""
                      )}
                    </p>
                  </div>
                  <p className={styles.pricingSeats}>
                    {seatsAvailable.toLocaleString()} seats available
                  </p>
                </section>

                {/* Booked-state chip — only renders when the viewer
                    has an active (non-cancelled) booking. Sits as
                    its own full-width box BETWEEN the gradient
                    pricing card and the seat-selection card,
                    matching the live YP layout exactly. Clock icon
                    on the left, green text + green outline. */}
                {hasActiveBooking ? (
                  <div className={styles.bookedChip} role="status">
                    <span
                      className={styles.bookedChipIcon}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <span>
                      You have booked this event ({bookedSeats}{" "}
                      {bookedSeats === 1 ? "seat" : "seats"}).
                    </span>
                  </div>
                ) : null}

                {/* Booking card — Select Seats + counter + coupon +
                    summary. Inputs disable when the viewer has an
                    active booking so they read as a final summary
                    of what was booked rather than something the
                    viewer can edit. */}
                <section className={styles.bookingCard}>
                  <h3 className={styles.selectSeatsHeading}>
                    <UsersIcon />
                    Select Seats
                  </h3>

                  <div className={styles.seatsRow}>
                    <div>
                      <p className={styles.seatsLabel}>Number of Seats</p>
                      <span className={styles.seatsLabelSub}>
                        (Min: {minSeats}, Max: {effectiveMax})
                      </span>
                    </div>
                    <div className={styles.seatsCounter}>
                      <button
                        type="button"
                        className={styles.seatsBtn}
                        aria-label="Decrease seats"
                        onClick={decSeats}
                        disabled={hasActiveBooking || seats <= minSeats}
                      >
                        <MinusIcon />
                      </button>
                      <span className={styles.seatsCount}>
                        {hasActiveBooking ? bookedSeats : seats}
                      </span>
                      <button
                        type="button"
                        className={styles.seatsBtn}
                        aria-label="Increase seats"
                        onClick={incSeats}
                        disabled={hasActiveBooking || seats >= effectiveMax}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </div>

                  {/* Cyan-bordered summary panel. */}
                  <div className={styles.summaryPanel}>
                    {appliedCoupon ? (
                      // Applied state — input + Apply button is
                      // replaced by a "{code} applied" badge on the
                      // left and a Remove button on the right. The
                      // discount line below also lights up green.
                      <div
                        className={`${styles.couponRow} ${styles.couponRowApplied}`}
                      >
                        <span className={styles.couponAppliedLabel}>
                          {appliedCoupon.code} applied
                        </span>
                        <button
                          type="button"
                          className={styles.couponRemove}
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCoupon("");
                          }}
                          disabled={hasActiveBooking || couponInFlight}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className={styles.couponRow}>
                        <input
                          type="text"
                          className={styles.couponInput}
                          placeholder="Enter Coupon Code"
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value)}
                          disabled={hasActiveBooking || couponInFlight}
                          aria-label="Coupon code"
                        />
                        <button
                          type="button"
                          className={styles.couponApply}
                          onClick={applyCoupon}
                          disabled={
                            hasActiveBooking || couponInFlight || !coupon.trim()
                          }
                        >
                          {couponInFlight ? "Applying..." : "Apply"}
                        </button>
                      </div>
                    )}

                    <p className={styles.summaryLine}>
                      Price per seat
                      <span className={styles.summaryLineValue}>
                        {formatGBP(baseSeatPrice, event.pricing_type)}
                      </span>
                    </p>
                    <p className={styles.summaryLine}>
                      Number of seats
                      <span className={styles.summaryLineValue}>
                        x {hasActiveBooking ? bookedSeats : seats}
                      </span>
                    </p>
                    {appliedCoupon ? (
                      <p className={styles.summaryDiscount}>
                        <span>Coupon discount</span>
                        {/* Computed dynamically from per-seat
                            discount × current seat count so the
                            chip stays in sync if the viewer
                            changes the seat counter after applying
                            a coupon (or restores their booked-seat
                            count post-payment). The API ships a
                            single discount_amount for the seat
                            count at apply-time, but we keep
                            discountPerSeat alongside it for this
                            re-derivation. */}
                        <span className={styles.summaryDiscountValue}>
                          - {formatGBP(
                            appliedCoupon.discountPerSeat *
                              (hasActiveBooking ? bookedSeats : seats),
                            event.pricing_type
                          )}
                        </span>
                      </p>
                    ) : null}
                    <hr className={styles.summaryDivider} />
                    <p className={styles.summaryTotal}>
                      Total Amount
                      <span className={styles.summaryTotalValue}>
                        {formatGBP(
                          hasActiveBooking
                            ? discountedSeatPrice * bookedSeats
                            : totalAmount,
                          event.pricing_type
                        )}
                      </span>
                    </p>
                  </div>
                </section>

                {/* Bottom bar — pre-booking shows Total + gradient
                    Book Now pill side-by-side; once the viewer has
                    an active booking the row collapses to a
                    full-width disabled "Booked" pill (Total label
                    drops since the summary panel above already
                    spells out the total in cyan). */}
                {hasActiveBooking ? (
                  <div
                    className={`${styles.bookBar} ${styles.bookBarBooked}`}
                  >
                    <button
                      type="button"
                      className={`${styles.bookNowBtn} ${styles.bookedBtn}`}
                      onClick={() => {
                        // Re-open the SurveyMonkey / external
                        // registration URL the viewer was sent to
                        // post-payment. Lets them re-grab the joining
                        // link if they closed the original tab.
                        const url = event.external_registration_url || "";
                        if (url) {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      aria-label="Booked — open survey again"
                    >
                      Booked
                    </button>
                  </div>
                ) : (
                  <div className={styles.bookBar}>
                    <span className={styles.bookBarTotal}>
                      Total
                      <span className={styles.bookBarTotalValue}>
                        {formatGBP(totalAmount, event.pricing_type)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={styles.bookNowBtn}
                      onClick={handleBookNow}
                      disabled={
                        bookingInFlight ||
                        !event.is_registration_open ||
                        seats < minSeats
                      }
                    >
                      {bookingInFlight && !paymentModalOpen ? (
                        // Spinner only while create-booking is in
                        // flight (modal not yet open). Once the
                        // payment modal is open, the "in flight"
                        // signal belongs to the modal's own Pay
                        // button — the Book Now button behind the
                        // modal should stay in its idle state.
                        <span
                          className={styles.spinner}
                          aria-label="Loading"
                        >
                          <SpinnerIcon />
                        </span>
                      ) : (
                        "Book Now"
                      )}
                    </button>
                  </div>
                )}
              </aside>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* ── Paid-event booking flow modals ──
          Two-step sequence opened by Book Now on a paid event:
          BookingConfirmDialog → PaymentModal. Both render as
          full-screen overlays via their own portals (so they
          escape the sticky right-sidebar's stacking context) and
          are gated on `event` being non-null so they can't open
          before the event details have loaded. */}
      {event ? (
        <>
          <BookingConfirmDialog
            open={confirmBookingOpen}
            numSeats={seats}
            totalAmount={formatGBP(totalAmount, event.pricing_type)}
            loading={bookingInFlight}
            onCancel={() => setConfirmBookingOpen(false)}
            onConfirm={handleConfirmBooking}
          />
          <PaymentModal
            open={paymentModalOpen}
            totalAmount={formatGBP(totalAmount, event.pricing_type)}
            clientSecret={stripeClientSecret}
            loading={bookingInFlight}
            onCancel={handlePaymentCancel}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </>
      ) : null}
    </div>
  );
}
