"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset, grid columns, mini-profile
// card, search-bar pill) is shared with /home, /jobs and /company
// via the home module. Events-specific styles (stats box, right
// column wrapper, filter chips, event card) live in
// `events.module.css`. Anything that already looks right on those
// pages is NOT redeclared here so all four pages stay visually in sync.
import homeStyles from "@/app/home/home.module.css";
import styles from "./events.module.css";

/** Extra profile fields returned by /api/mobile/profile beyond
 *  AuthUser — same subset the home / jobs / company pages consume. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

/** Raw API row from POST /api/mobile/events. Only the fields the
 *  card actually renders are typed here.
 *
 *  Images: the API ships event imagery across THREE possible
 *  fields, populated independently per event:
 *    • `banner_image_url`   — string (single banner)
 *    • `sidebar_image_url`  — string (square sidebar variant)
 *    • `gallery_images`     — array of `{ image_url, sort_order }`
 *  Many listing rows ship only the array form (banner_image_url
 *  arrives as `null`). `pickFirstImageUrl` tries each source in
 *  declaration order so the card always renders the real banner
 *  when ANY of these fields carries one. */
type ApiEvent = {
  id: string;
  title?: string | null;
  description?: string | null;
  banner_image_url?: string | null;
  sidebar_image_url?: string | null;
  gallery_images?: Array<{
    id?: string | null;
    image_url?: string | null;
    sort_order?: number | null;
  }> | null;
  event_type_display?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  list_price?: string | null;
  pricing_type?: "paid" | "free" | string | null;
};

/** Raw row inside POST /api/mobile/event/my-bookings → `data.bookings`.
 *  The booking carries a nested event object (title / banner /
 *  start datetime / event type / pricing type) that's enough for
 *  the card without a follow-up details call. */
type ApiBooking = {
  booking_id: string;
  /** "paid" / "cancelled" / "pending" / "completed" — drives the
   *  per-card status chip in the right-top corner. */
  booking_status?: string | null;
  event?: {
    id?: string;
    title?: string | null;
    start_datetime?: string | null;
    banner_image_url?: string | null;
    sidebar_image_url?: string | null;
    gallery_images?: Array<{
      id?: string | null;
      image_url?: string | null;
      sort_order?: number | null;
    }> | null;
    event_type_display?: string | null;
    pricing_type?: string | null;
    /** Hosting company info nested on the booking — used by the
     *  client-side Company chip filter on the My Bookings tab. */
    company_id?: string | null;
    company_name?: string | null;
  };
  num_seats?: number;
  total_amount?: string | null;
};

/** Mapped UI shape rendered by the right-column event card. */
type EventCard = {
  id: string;
  /** Cyan caps label above the title — "PHYSICAL EVENT" / "VIRTUAL
   *  EVENT". Derived from the API's `event_type_display`. */
  type: "PHYSICAL EVENT" | "VIRTUAL EVENT";
  title: string;
  /** Pre-formatted date range ("30, April 2026" or
   *  "14, April 2026 - 30, June 2026"). Built from the API's
   *  `start_datetime` / `end_datetime` ISO strings. */
  date: string;
  /** Pre-formatted price string ("£2300.00", "£0.50", or "FREE").
   *  "FREE" is shown when `pricing_type === "free"` regardless of
   *  the numeric `list_price`. */
  price: string;
  /** Banner image URL from the API (`banner_image_url`). Empty →
   *  gradient placeholder with the title centred over it. */
  imageUrl: string;
  /** Short text rendered centred over the gradient placeholder
   *  when `imageUrl` is empty. */
  imageLabel: string;
  /** Background gradient shown ONLY when `imageUrl` is empty. */
  imageBg: string;
  /** Booking-specific fields. Populated only on the My Bookings
   *  tab via `mapApiBooking`; the All Events tab leaves them
   *  undefined, so the status-chip JSX short-circuits and the
   *  View button targets `/events/[id]` instead of /booking. */
  bookingId?: string;
  bookingStatus?: string;
  /** Hosting company id / name stored on the card so the client-
   *  side Company chip filter on My Bookings can match against
   *  the same `selectedCompanyIds` set the All tab uses server-
   *  side. Either field is enough — id is preferred for accuracy,
   *  name is the fallback when the API only returns the name. */
  companyId?: string;
  companyName?: string;
};

/** Long-form month names used by the date formatter. */
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

/** Format a single ISO datetime as "30, April 2026". Returns an
 *  empty string for invalid / missing input so the caller can
 *  decide whether to render anything. */
function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCDate()}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Format the full date row shown on the card. When start and end
 *  fall on the same calendar day we show one date; otherwise we
 *  show "start - end". */
function formatEventDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = formatLongDate(start);
  const e = formatLongDate(end);
  if (!s && !e) return "";
  if (!e || s === e) return s;
  if (!s) return e;
  return `${s} - ${e}`;
}

/** Format the card's price line. Free events render as "FREE",
 *  paid events render as `£<amount>` with two decimals. */
function formatPrice(
  listPrice: string | null | undefined,
  pricingType: string | null | undefined
): string {
  if (pricingType === "free") return "FREE";
  const n = Number(listPrice ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "FREE";
  return `£${n.toFixed(2)}`;
}

/** Pick a stable gradient placeholder background based on event
 *  type — physical events lean warm, virtual events lean violet. */
function pickEventGradient(typeDisplay: string | null | undefined): string {
  const isVirtual = (typeDisplay ?? "").toLowerCase().includes("virtual");
  return isVirtual
    ? "linear-gradient(135deg, #6b3aa0 0%, #8b4dc7 50%, #3d1f5e 100%)"
    : "linear-gradient(135deg, #1a4d8c 0%, #2c7bb6 50%, #0d2447 100%)";
}

/** Pick the first available banner image URL from any of the
 *  fields the API may populate. Mirrors the merge order the
 *  event-details page (`bannerImages` useMemo) uses so a single
 *  banner is consistent between the listing card and the
 *  details page. Returns "" when nothing is available so the
 *  card falls through to the gradient placeholder. */
function pickFirstImageUrl(source: {
  banner_image_url?: string | null;
  sidebar_image_url?: string | null;
  gallery_images?: Array<{ image_url?: string | null; sort_order?: number | null }> | null;
}): string {
  // 1. Single banner field (legacy / primary).
  const banner = (source.banner_image_url ?? "").trim();
  if (banner) return banner;
  // 2. Square sidebar variant — when no banner ships, the
  //    sidebar image still represents the event well enough to
  //    use as the listing thumbnail.
  const sidebar = (source.sidebar_image_url ?? "").trim();
  if (sidebar) return sidebar;
  // 3. First image in `gallery_images`, sorted by `sort_order`
  //    so we always pick the same one each render even if the
  //    API returns the array in arbitrary order.
  if (Array.isArray(source.gallery_images) && source.gallery_images.length > 0) {
    const sorted = [...source.gallery_images].sort((a, b) => {
      const sa = typeof a.sort_order === "number" ? a.sort_order : 0;
      const sb = typeof b.sort_order === "number" ? b.sort_order : 0;
      return sa - sb;
    });
    for (const img of sorted) {
      const url = (img.image_url ?? "").trim();
      if (url) return url;
    }
  }
  return "";
}

/** Map an API event row to the UI shape. */
function mapApiEvent(e: ApiEvent): EventCard {
  const display = e.event_type_display ?? "";
  const isVirtual = display.toLowerCase().includes("virtual");
  const title = (e.title ?? "").trim();
  return {
    id: e.id,
    type: isVirtual ? "VIRTUAL EVENT" : "PHYSICAL EVENT",
    title,
    date: formatEventDateRange(e.start_datetime, e.end_datetime),
    price: formatPrice(e.list_price, e.pricing_type),
    imageUrl: pickFirstImageUrl(e),
    imageLabel: title || (isVirtual ? "Virtual Event" : "Physical Event"),
    imageBg: pickEventGradient(display),
  };
}

/** Map a "My Bookings" row (nested event) to the same EventCard
 *  shape so the listing JSX is identical for both tabs. The
 *  booking endpoint doesn't return `list_price` — `total_amount`
 *  is what was paid, and `num_seats` lets us derive a per-seat
 *  display price. For now we just show the booking total
 *  (already covers seats × per-seat price for the card label). */
function mapApiBooking(b: ApiBooking): EventCard {
  const ev = b.event ?? {};
  const display = ev.event_type_display ?? "";
  const isVirtual = display.toLowerCase().includes("virtual");
  const title = (ev.title ?? "").trim();
  const status = (b.booking_status ?? "").trim();
  const companyId = (ev.company_id ?? "").trim();
  const companyName = (ev.company_name ?? "").trim();
  return {
    id: ev.id ?? b.booking_id,
    type: isVirtual ? "VIRTUAL EVENT" : "PHYSICAL EVENT",
    title,
    date: formatLongDate(ev.start_datetime),
    price: formatPrice(b.total_amount, ev.pricing_type),
    imageUrl: pickFirstImageUrl(ev),
    imageLabel: title || (isVirtual ? "Virtual Event" : "Physical Event"),
    imageBg: pickEventGradient(display),
    bookingId: b.booking_id,
    bookingStatus: status,
    companyId: companyId || undefined,
    companyName: companyName || undefined,
  };
}

/** Filter-options API payload (GET /api/mobile/user/search-filters).
 *  The events page only consumes `company` from this response;
 *  event type and pricing type are intrinsic enums (mapped below). */
type FilterOptionsApi = {
  data?: {
    company?: Array<{ id: string; name: string }>;
  };
};

/** Static enum mappings — both the user-facing label AND the
 *  request-body value the events API expects for each chip. */
const EVENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "Physical" },
  { value: "1", label: "Virtual" },
];

const PRICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

// ── Icons (kept inline so this page is self-contained) ──────────────────

function LocationIcon() {
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

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FiltersSlidersIcon() {
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
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="18" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="14" y2="18" />
      <line x1="18" y1="18" x2="20" y2="18" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  );
}

function ChevronDownIcon() {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CrossSmallIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Calendar glyph rendered next to each event date row. Matches the
 *  outline calendar visible on the live YP /events page. */
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

/** Empty-state glyph for the right panel when no events match the
 *  current filter / search text, or when the viewer has no
 *  bookings yet under the My Bookings view. */
function EventsEmptyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  );
}

/** Pick a CSS class from the events module's status-chip palette
 *  based on the API's booking_status string. Rules:
 *    - cancelled / refunded / failed → red
 *    - paid / confirmed / completed / booked → green
 *    - everything else (pending, etc.) → neutral grey
 *  The chip label itself comes from the raw status (uppercased)
 *  so even unknown future statuses still render readably.
 *  `"booked"` is the label the All Events tab uses to flag a
 *  card the viewer has already registered for — same green
 *  treatment as paid / confirmed since it represents the same
 *  positive state. */
function statusChipClass(
  status: string,
  styles: Record<string, string>
): string {
  const s = status.trim().toLowerCase();
  if (
    s === "cancelled" ||
    s === "canceled" ||
    s === "refunded" ||
    s === "failed"
  ) {
    return styles.statusChipDanger ?? "";
  }
  if (
    s === "paid" ||
    s === "confirmed" ||
    s === "completed" ||
    s === "booked"
  ) {
    return styles.statusChipSuccess ?? "";
  }
  return styles.statusChipNeutral ?? "";
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return f + l || "U";
}

function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Skeleton mirroring the home / jobs / company mini-profile. ─────────

function MiniProfileSkeleton() {
  return (
    <section className={homeStyles.miniProfile} aria-hidden="true">
      <div className={`${homeStyles.miniAvatar} ${homeStyles.skeleton}`} />
      <div className={homeStyles.miniInfo}>
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
        />
      </div>
    </section>
  );
}

/** Skeleton placeholder for the right-column event card. Mirrors
 *  the live `.eventCard` grid (image | info | actions) so when the
 *  API resolves the layout doesn't shift. Reuses the home module's
 *  shimmer pieces (`.skeleton`, `.skelLine`, etc.) so the animation
 *  matches the rest of the app's loading states. */
function EventCardSkeleton() {
  return (
    <article
      className={styles.eventCard}
      aria-hidden="true"
      style={{ cursor: "default" }}
    >
      <div className={`${styles.eventImage} ${homeStyles.skeleton}`} />
      <div className={styles.eventInfo}>
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
        />
      </div>
      <div className={styles.eventActions}>
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
      </div>
    </article>
  );
}

/** Right-column listing card view modes — only two on the events
 *  page ("All Events" / "My Bookings"). The two stat rows in the
 *  left box switch between them. The static step shows the same 3
 *  cards under "All Events" and an empty state under "My Bookings"
 *  until the dynamic step wires the real bookings seed. */
type ViewMode = "all" | "bookings";

export default function EventsPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  /** Navigate to the event-details route for a given event id. The
   *  id is encoded so future API ids that contain `=` / `+` / `/`
   *  (matching the base64-style identifiers other YP endpoints
   *  return) survive the URL round-trip cleanly. */
  const openEventDetails = (id: string) => {
    router.push(`/events/${encodeURIComponent(id)}`);
  };

  /** Navigate to the booking-details route for a given booking id.
   *  Used by My Bookings cards instead of `openEventDetails` —
   *  same encoding rule for base64-style ids. */
  const openBookingDetails = (id: string) => {
    router.push(`/booking/${encodeURIComponent(id)}`);
  };

  // Right-column search + filter state. The search input is
  // debounced (400ms, ≥2 chars) and forwarded to the events API
  // as `search_text`; the filter chips are wired by ID / value
  // and forwarded as `company_ids`, `event_type`, `pricing_type`.
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Three filter chips, each MULTI-select. Each holds an array of
  // chosen values; the API request body sends them as a comma-
  // separated string (matches the `company_ids` field name which
  // the upstream `/events` endpoint already accepts as comma-list).
  //   - selectedCompanyIds   → [company id, company id, ...]
  //   - selectedEventTypes   → ["0"] (Physical) | ["1"] (Virtual) | ["0","1"]
  //   - selectedPrices       → ["free"] | ["paid"] | ["free","paid"]
  // Toggling a checkbox adds / removes from the array; the chip's
  // active styling fires whenever the array is non-empty.
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);

  /** Toggle helper for the array filter state — keeps the per-chip
   *  setter calls compact and consistent across the three chips. */
  const toggleInArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Per-dropdown search-within-list text. Each chip is its own input —
  // typing here narrows that dropdown's option list live.
  const [companyFilterText, setCompanyFilterText] = useState("");
  const [eventTypeFilterText, setEventTypeFilterText] = useState("");
  const [priceFilterText, setPriceFilterText] = useState("");

  // Company dropdown options, fetched from search-filters on mount.
  // Empty until the fetch resolves; the chip just shows "No options"
  // until then if the dropdown happens to be opened early.
  const [companyOptions, setCompanyOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Which filter dropdown is open right now — at most one at a time.
  const [openFilterDropdown, setOpenFilterDropdown] = useState<
    "company" | "eventType" | "price" | null
  >(null);

  // Which view-mode the right panel is showing — flips between
  // "All Events" and "My Bookings" via the two stat rows on the left.
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // ── Listings state (live from POST /api/mobile/events for "all"
  // and POST /api/mobile/event/my-bookings for "bookings"). `null`
  // = initial load (skeletons render); `[]` = loaded but empty.
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // ── Total counts ── separate counters for each tab so the left-
  // side stat rows stay accurate regardless of which view is
  // active. Both seeded on mount via dedicated one-shot fetches
  // below; the listings effect refreshes whichever count belongs
  // to the active tab on each fetch.
  const [allTotal, setAllTotal] = useState<number>(0);
  const [bookingsTotal, setBookingsTotal] = useState<number>(0);

  // Map of `event_id → raw booking_status` for every event the
  // viewer has booked (used by the All Events tab to flip a
  // green "BOOKED" chip onto the matching card). Seeded on
  // mount via the same /my-bookings fetch that drives the
  // bookings count, and refreshed whenever the listings effect
  // refetches /my-bookings (e.g. after the viewer switches to
  // the My Bookings tab and back). Cancelled / refunded /
  // failed statuses are excluded from this map at populate time
  // so a previously-cancelled booking doesn't keep painting
  // the All Events card with a stale Booked chip — only active
  // bookings (confirmed / paid / completed) leave a mark.
  const [bookingStatusByEventId, setBookingStatusByEventId] = useState<
    Record<string, string>
  >({});

  // Counts read by the JSX — both live from API totals now.
  const allCount = allTotal;
  const bookingsCount = bookingsTotal;

  // Mirror the home / jobs / company "deleted image" suppression so
  // the mini-profile avatar renders consistently after photo deletion.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  // Refresh the viewer's profile so the mini-profile renders even on
  // a hard refresh of /events. Same pattern jobs / company use.
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
        // Silent fail — navbar / mini-profile shows fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Click-outside: close any open filter dropdown when the viewer
  // clicks outside any `data-filter-menu` element.
  useEffect(() => {
    if (openFilterDropdown === null) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-filter-menu]")) {
        setOpenFilterDropdown(null);
      }
    };
    const t = window.setTimeout(() => {
      document.addEventListener("click", handleDocClick);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", handleDocClick);
    };
  }, [openFilterDropdown]);

  // ── Listings fetch ── re-runs whenever the active tab, the
  // debounced search, or any of the three filter chips change.
  //   - "all"      → POST /api/mobile/events with the search /
  //                  filter chip values forwarded as
  //                  `search_text`, `company_ids`, `event_type`,
  //                  `pricing_type` per the API contract. Server
  //                  does the filter work; the client just renders
  //                  whatever comes back.
  //   - "bookings" → POST /api/mobile/event/my-bookings with `{}`.
  //                  Returns the viewer's bookings (each carries a
  //                  nested `event` object). Search / filter chips
  //                  are intentionally ignored on this tab to
  //                  match the live website's filter-free bookings
  //                  view.
  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    async function fetchListings() {
      try {
        let res: Response;
        if (viewMode === "bookings") {
          res = await fetch("/api/mobile/event/my-bookings", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        } else {
          // Multi-select → comma-separated body values. When the
          // viewer picks ALL options of a chip (e.g. both Paid and
          // Free, or both Physical and Virtual), that's logically
          // identical to "no filter at all" — and the upstream
          // /events endpoint can choke on `paid,free` as a literal
          // string and return zero results. Collapsing the
          // all-selected case to an empty string makes the chip
          // behave as expected: every option ticked = full list,
          // matching the way the Event Type chip already works.
          const allEventTypes = selectedEventTypes.length === EVENT_TYPE_OPTIONS.length;
          const allPrices = selectedPrices.length === PRICE_OPTIONS.length;
          const body: Record<string, unknown> = {
            page: 1,
            limit: 100,
            search_text: debouncedSearch || "",
            company_ids: selectedCompanyIds.join(","),
            event_type: allEventTypes ? "" : selectedEventTypes.join(","),
            pricing_type: allPrices ? "" : selectedPrices.join(","),
          };
          res = await fetch("/api/mobile/events", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        if (!res.ok) {
          if (!cancelled) {
            setEvents([]);
            setEventsError("Couldn't load events right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: {
            result?: ApiEvent[];
            bookings?: ApiBooking[];
            total_count?: number;
          };
        };
        if (cancelled) return;
        if (json?.status === "OK") {
          if (viewMode === "bookings") {
            const list = Array.isArray(json.data?.bookings)
              ? json.data!.bookings!
              : [];
            const mapped = list.map(mapApiBooking);
            setEvents(mapped);
            setBookingsTotal(
              typeof json.data?.total_count === "number"
                ? json.data.total_count
                : mapped.length
            );
            // Refresh the event-id → status map from the
            // bookings list every time we land on this tab so
            // the All Events tab's Booked chips stay current
            // (e.g. after a registration completes on
            // /events/[id] and the viewer flips back). Same
            // exclusion rule as the seed: cancelled / refunded
            // / failed bookings don't leave a mark.
            const map: Record<string, string> = {};
            for (const b of list) {
              const eventId = (b.event?.id ?? "").trim();
              const status = (b.booking_status ?? "").trim().toLowerCase();
              if (!eventId) continue;
              if (
                status === "cancelled" ||
                status === "canceled" ||
                status === "refunded" ||
                status === "failed"
              ) {
                continue;
              }
              map[eventId] = status || "booked";
            }
            setBookingStatusByEventId(map);
          } else {
            const list = Array.isArray(json.data?.result)
              ? json.data!.result!
              : [];
            const mapped = list.map(mapApiEvent);
            setEvents(mapped);
            setAllTotal(
              typeof json.data?.total_count === "number"
                ? json.data.total_count
                : mapped.length
            );
          }
          setEventsError(null);
        } else {
          setEvents([]);
          setEventsError(null);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
          setEventsError("Couldn't load events right now.");
        }
      }
    }
    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    debouncedSearch,
    selectedCompanyIds,
    selectedEventTypes,
    selectedPrices,
  ]);

  // ── Search debounce ── 400ms after the viewer pauses typing,
  // commit the trimmed value to `debouncedSearch`. Single-character
  // queries are skipped (no API call) per the jobs / company /
  // home rule.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length === 1) return;
    const t = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // ── Filter options seed ── one-shot fetch on mount. The
  // /api/mobile/user/search-filters endpoint is shared with /jobs
  // and /company; we only consume `data.company` here. Failure is
  // silent (Company chip just opens with "No options" in that case).
  useEffect(() => {
    let cancelled = false;
    async function fetchFilterOptions() {
      try {
        const res = await fetch("/api/mobile/user/search-filters", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as FilterOptionsApi;
        if (cancelled) return;
        const companies = Array.isArray(json?.data?.company)
          ? json.data!.company!.filter(
              (c): c is { id: string; name: string } =>
                !!c && typeof c.id === "string" && typeof c.name === "string"
            )
          : [];
        setCompanyOptions(companies);
      } catch {
        // Silent fail — chip dropdown will render "No options".
      }
    }
    fetchFilterOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Seed both counters on mount ── so the stat box reads accurate
  // numbers no matter which tab the viewer lands on first. Lightweight
  // separate calls; their failure is silent (the listings effect
  // above will refresh the count when the viewer switches tabs).
  useEffect(() => {
    let cancelled = false;
    async function seedAllCount() {
      try {
        const res = await fetch("/api/mobile/events", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 1 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { total_count?: number };
        };
        if (cancelled) return;
        if (
          json?.status === "OK" &&
          typeof json.data?.total_count === "number"
        ) {
          setAllTotal(json.data.total_count);
        }
      } catch {
        // Silent.
      }
    }
    async function seedBookingsCount() {
      try {
        const res = await fetch("/api/mobile/event/my-bookings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { total_count?: number; bookings?: ApiBooking[] };
        };
        if (cancelled) return;
        if (json?.status === "OK") {
          setBookingsTotal(
            typeof json.data?.total_count === "number"
              ? json.data.total_count
              : (json.data?.bookings?.length ?? 0)
          );
          // Populate the event-id → status map for All Events
          // chip rendering. Skip cancelled / refunded / failed
          // bookings so a card the viewer once cancelled doesn't
          // keep showing the Booked chip; only active bookings
          // leave a mark.
          const bookings = json.data?.bookings ?? [];
          const map: Record<string, string> = {};
          for (const b of bookings) {
            const eventId = (b.event?.id ?? "").trim();
            const status = (b.booking_status ?? "").trim().toLowerCase();
            if (!eventId) continue;
            if (
              status === "cancelled" ||
              status === "canceled" ||
              status === "refunded" ||
              status === "failed"
            ) {
              continue;
            }
            map[eventId] = status || "booked";
          }
          setBookingStatusByEventId(map);
        }
      } catch {
        // Silent.
      }
    }
    seedAllCount();
    seedBookingsCount();
    return () => {
      cancelled = true;
    };
  }, []);

  // The "all" view applies search + chip filtering server-side via
  // the /events endpoint, so the JSX renders `events` unchanged.
  // The "bookings" view fetches the FULL bookings list from
  // /event/my-bookings (which doesn't accept filters server-side)
  // and we narrow it CLIENT-SIDE here so the search input + chips
  // work on the My Bookings tab too — matching the live YP
  // behaviour where each tab's results operate independently.
  // Search matches against title (case-insensitive substring);
  // chips (Company / Event Type / Price) check the ev's mapped
  // values against the selected sets.
  const visibleEvents = useMemo(() => {
    if (events === null) return null;
    if (viewMode !== "bookings") return events;

    let filtered = events;
    // Use debouncedSearch (NOT live searchText) so the client-side
    // filter only fires after the viewer pauses typing for 400ms
    // AND the trimmed query is ≥ 2 characters — same rule the
    // server-side `/events` search uses on the All tab.
    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((ev) =>
        ev.title.toLowerCase().includes(query)
      );
    }

    // Company chip — match by id when the booking carries one,
    // otherwise fall back to matching the company NAME against
    // the selected ids' resolved names from companyOptions.
    if (selectedCompanyIds.length > 0) {
      const wantedIds = new Set(selectedCompanyIds);
      const wantedNames = new Set(
        selectedCompanyIds
          .map((id) => companyOptions.find((c) => c.id === id)?.name)
          .filter((n): n is string => typeof n === "string")
      );
      filtered = filtered.filter((ev) => {
        if (ev.companyId && wantedIds.has(ev.companyId)) return true;
        if (ev.companyName && wantedNames.has(ev.companyName)) return true;
        return false;
      });
    }

    if (
      selectedEventTypes.length > 0 &&
      selectedEventTypes.length < EVENT_TYPE_OPTIONS.length
    ) {
      const wantsVirtual = selectedEventTypes.includes("1");
      const wantsPhysical = selectedEventTypes.includes("0");
      filtered = filtered.filter((ev) => {
        const isVirtual = ev.type === "VIRTUAL EVENT";
        return (isVirtual && wantsVirtual) || (!isVirtual && wantsPhysical);
      });
    }

    if (
      selectedPrices.length > 0 &&
      selectedPrices.length < PRICE_OPTIONS.length
    ) {
      const wantsFree = selectedPrices.includes("free");
      const wantsPaid = selectedPrices.includes("paid");
      filtered = filtered.filter((ev) => {
        const isFree = ev.price === "FREE";
        return (isFree && wantsFree) || (!isFree && wantsPaid);
      });
    }

    return filtered;
  }, [
    events,
    viewMode,
    debouncedSearch,
    selectedCompanyIds,
    selectedEventTypes,
    selectedPrices,
    companyOptions,
  ]);

  // Whether the viewer has an active search / chip on the My
  // Bookings tab — drives the empty-state message: "no match"
  // when a filter narrowed the list to zero, vs "no bookings
  // yet" when the underlying list is empty. Uses the debounced
  // search value so the empty-state caption flips at the same
  // moment the filter actually applies.
  const isBookingsFilterActive =
    viewMode === "bookings" &&
    (debouncedSearch.trim() !== "" ||
      selectedCompanyIds.length > 0 ||
      selectedEventTypes.length > 0 ||
      selectedPrices.length > 0);

  // Per-dropdown narrowing — typing in a chip's input narrows that
  // dropdown's options live (matches the jobs / company chip
  // behaviour). Match by `name` for company, `label` for event
  // type / price.
  const companyQuery = companyFilterText.trim().toLowerCase();
  const eventTypeQuery = eventTypeFilterText.trim().toLowerCase();
  const priceQuery = priceFilterText.trim().toLowerCase();
  const filteredCompanies = companyQuery
    ? companyOptions.filter((c) =>
        c.name.toLowerCase().includes(companyQuery)
      )
    : companyOptions;
  const filteredEventTypes = eventTypeQuery
    ? EVENT_TYPE_OPTIONS.filter((t) =>
        t.label.toLowerCase().includes(eventTypeQuery)
      )
    : EVENT_TYPE_OPTIONS;
  const filteredPrices = priceQuery
    ? PRICE_OPTIONS.filter((p) =>
        p.label.toLowerCase().includes(priceQuery)
      )
    : PRICE_OPTIONS;

  // Look up the selected companies' display names from their ids
  // (the chip's placeholder shows "Company (N)" when values are
  // picked; the title attribute lists the actual names for hover
  // and accessibility tools).
  const selectedCompanyNames = selectedCompanyIds
    .map((id) => companyOptions.find((c) => c.id === id)?.name ?? "")
    .filter(Boolean)
    .join(", ");

  // True only when at least one filter chip has values selected.
  // Drives the "Clear All" button beside the search pill — search
  // text alone does NOT show the button (search has its own X clear
  // already inside the pill); Clear All resets dropdown chips only.
  const hasActiveFilters =
    selectedCompanyIds.length > 0 ||
    selectedEventTypes.length > 0 ||
    selectedPrices.length > 0;

  // One-shot reset of every filter chip. Per-dropdown search text
  // (companyFilterText / eventTypeFilterText / priceFilterText) is
  // wiped too so reopening any dropdown shows the full unfiltered
  // option list again. Search text in the main search bar is NOT
  // wiped — Clear All is for chips, not the search input.
  const clearAllFilters = () => {
    setSelectedCompanyIds([]);
    setSelectedEventTypes([]);
    setSelectedPrices([]);
    setCompanyFilterText("");
    setEventTypeFilterText("");
    setPriceFilterText("");
  };

  // Switch the right-panel view (All Events / My Bookings). Clearing
  // `searchText` here scopes the search input to the active tab —
  // the same isolation rule the jobs page applies — so typing while
  // on All Events doesn't bleed into My Bookings.
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setSearchText("");
  };

  // Avatar / name / role / location — same derivation as company /
  // jobs so the mini-profile renders identically across pages.
  const profile = user as HomeProfile | null;
  const rawAvatarUrl = profile?.profile_image_url || null;
  const avatarUrl =
    rawAvatarUrl && rawAvatarUrl === deletedImageUrl ? null : rawAvatarUrl;
  const fullName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const initials = getInitials(profile?.first_name, profile?.last_name);
  const miniRole =
    titleCase(profile?.education?.trim() || "") ||
    profile?.study_field?.trim() ||
    "";
  const miniLocation = profile?.location?.trim() || "";

  // Heading text shown above the search bar in the right panel —
  // swaps based on which stat row the viewer has selected.
  const rightPanelTitle =
    viewMode === "bookings" ? "My Bookings" : "All Events";

  return (
    <div className={`${homeStyles.page} ${styles.pageEvents}`}>
      <Navbar />
      <main
        className={`${homeStyles.content} ${styles.contentEventsPage}`}
      >
        {/* ── LEFT COLUMN — mini-profile + stats box only. The events
            page has the same two-card left column as /company. ── */}
        <aside
          className={homeStyles.leftCol}
          aria-label="Profile and event categories"
        >
          {profile === null ? (
            <MiniProfileSkeleton />
          ) : (
            <section
              className={homeStyles.miniProfile}
              aria-label="Your profile"
            >
              <div className={homeStyles.miniAvatar} aria-hidden="true">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </div>
              <div className={homeStyles.miniInfo}>
                {fullName ? (
                  <p className={homeStyles.miniName}>{fullName}</p>
                ) : null}
                {miniRole ? (
                  <p className={homeStyles.miniRole}>{miniRole}</p>
                ) : null}
                {miniLocation ? (
                  <span className={homeStyles.miniLocation}>
                    <LocationIcon />
                    {miniLocation}
                  </span>
                ) : null}
              </div>
            </section>
          )}

          {/* Stats box — All Events (3) / My Bookings (2). Clicking
              either row switches the right panel between the two
              views (and clears the search input so the new view
              starts fresh). */}
          <section
            className={styles.statsBox}
            aria-label="Event categories"
          >
            <p
              className={`${styles.statsRow} ${styles.statsClickable} ${
                viewMode === "all" ? styles.statsActive : ""
              }`}
              onClick={() => switchView("all")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  switchView("all");
                }
              }}
            >
              All Events ({allCount})
            </p>
            <p
              className={`${styles.statsRow} ${styles.statsClickable} ${
                viewMode === "bookings" ? styles.statsActive : ""
              }`}
              onClick={() => switchView("bookings")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  switchView("bookings");
                }
              }}
            >
              My Bookings ({bookingsCount})
            </p>
          </section>
        </aside>

        {/* ── RIGHT COLUMN — single rounded card holding heading,
            search, filter chips, and the event listings (inner-
            scrolled on desktop, capped + page-scrolled on tablet /
            mobile). ── */}
        <section className={styles.rightOuter} aria-label="Events">
          <div className={styles.rightHeader}>
            <h1 className={styles.rightTitle}>{rightPanelTitle}</h1>
            <div className={styles.searchClearWrap}>
              <div className={styles.searchWrap}>
                <div className={homeStyles.searchBar}>
                  <span
                    className={homeStyles.searchIconWrap}
                    aria-hidden="true"
                  >
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={homeStyles.searchInput}
                    placeholder="Search events..."
                    aria-label="Search events"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText ? (
                    <button
                      type="button"
                      className={homeStyles.searchClear}
                      aria-label="Clear search"
                      onClick={() => setSearchText("")}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.searchSliders}
                    aria-label={filtersOpen ? "Hide filters" : "Show filters"}
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    <FiltersSlidersIcon />
                  </button>
                </div>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={clearAllFilters}
                >
                  Clear All
                </button>
              ) : null}
            </div>
          </div>

          {/* Three filter chips (Company / Event Type / Price) — same
              pill chrome and per-chip-search behaviour as the jobs
              page. Hidden by default; revealed by the slider icon. */}
          {filtersOpen ? (
            <div className={styles.filters}>
              {/* Company — multi-select, keyed by id. Each picked id
                  is forwarded to the API as part of a comma-separated
                  `company_ids` body field. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedCompanyIds.length > 0 ||
                    openFilterDropdown === "company"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("company")}
                  title={selectedCompanyNames || undefined}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedCompanyIds.length > 0
                        ? `Company (${selectedCompanyIds.length})`
                        : "Company"
                    }
                    value={companyFilterText}
                    onChange={(e) => setCompanyFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("company")}
                    aria-label="Filter by company"
                  />
                  {companyFilterText || selectedCompanyIds.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear company filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (companyFilterText) {
                          setCompanyFilterText("");
                        } else {
                          setSelectedCompanyIds([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle company dropdown"
                    aria-expanded={openFilterDropdown === "company"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "company" ? null : "company"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "company" ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredCompanies.length === 0 ? (
                      <p className={styles.filterEmpty}>No options</p>
                    ) : (
                      filteredCompanies.map((c) => {
                        const checked = selectedCompanyIds.includes(c.id);
                        return (
                          <label key={c.id} className={styles.filterOption}>
                            <span
                              className={`${styles.filterCheckbox} ${
                                checked ? styles.filterCheckboxChecked : ""
                              }`}
                              aria-hidden="true"
                            />
                            <input
                              type="checkbox"
                              className={styles.filterCheckboxInput}
                              checked={checked}
                              onChange={() =>
                                toggleInArray(setSelectedCompanyIds, c.id)
                              }
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {/* Event Type — multi-select. Forwarded to the API as
                  comma-separated `event_type` body field. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedEventTypes.length > 0 ||
                    openFilterDropdown === "eventType"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("eventType")}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedEventTypes.length > 0
                        ? `Event Type (${selectedEventTypes.length})`
                        : "Event Type"
                    }
                    value={eventTypeFilterText}
                    onChange={(e) => setEventTypeFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("eventType")}
                    aria-label="Filter by event type"
                  />
                  {eventTypeFilterText || selectedEventTypes.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear event type filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (eventTypeFilterText) {
                          setEventTypeFilterText("");
                        } else {
                          setSelectedEventTypes([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle event type dropdown"
                    aria-expanded={openFilterDropdown === "eventType"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "eventType" ? null : "eventType"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "eventType" ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredEventTypes.length === 0 ? (
                      <p className={styles.filterEmpty}>No options</p>
                    ) : (
                      filteredEventTypes.map((t) => {
                        const checked = selectedEventTypes.includes(t.value);
                        return (
                          <label key={t.value} className={styles.filterOption}>
                            <span
                              className={`${styles.filterCheckbox} ${
                                checked ? styles.filterCheckboxChecked : ""
                              }`}
                              aria-hidden="true"
                            />
                            <input
                              type="checkbox"
                              className={styles.filterCheckboxInput}
                              checked={checked}
                              onChange={() =>
                                toggleInArray(setSelectedEventTypes, t.value)
                              }
                            />
                            <span>{t.label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {/* Price — multi-select. Forwarded to the API as
                  comma-separated `pricing_type` body field. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedPrices.length > 0 ||
                    openFilterDropdown === "price"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("price")}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedPrices.length > 0
                        ? `Price (${selectedPrices.length})`
                        : "Price"
                    }
                    value={priceFilterText}
                    onChange={(e) => setPriceFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("price")}
                    aria-label="Filter by price"
                  />
                  {priceFilterText || selectedPrices.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear price filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (priceFilterText) {
                          setPriceFilterText("");
                        } else {
                          setSelectedPrices([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle price dropdown"
                    aria-expanded={openFilterDropdown === "price"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "price" ? null : "price"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "price" ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredPrices.length === 0 ? (
                      <p className={styles.filterEmpty}>No options</p>
                    ) : (
                      filteredPrices.map((p) => {
                        const checked = selectedPrices.includes(p.value);
                        return (
                          <label key={p.value} className={styles.filterOption}>
                            <span
                              className={`${styles.filterCheckbox} ${
                                checked ? styles.filterCheckboxChecked : ""
                              }`}
                              aria-hidden="true"
                            />
                            <input
                              type="checkbox"
                              className={styles.filterCheckboxInput}
                              checked={checked}
                              onChange={() =>
                                toggleInArray(setSelectedPrices, p.value)
                              }
                            />
                            <span>{p.label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={styles.listings}>
            {visibleEvents === null ? (
              // Initial fetch in flight — render skeleton event-card
              // placeholders that mirror the live grid (image | info |
              // actions) so the listings region doesn't shift when
              // the API resolves.
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : visibleEvents.length === 0 ? (
              <div className={styles.listingsEmpty}>
                <span
                  className={styles.listingsEmptyIcon}
                  aria-hidden="true"
                >
                  <EventsEmptyIcon />
                </span>
                <p className={styles.listingsEmptyText}>
                  {viewMode === "bookings"
                    ? isBookingsFilterActive
                      ? "No events found matching"
                      : "You don't have any bookings yet."
                    : (eventsError ?? "No events found matching")}
                </p>
              </div>
            ) : (
              visibleEvents.map((ev) => {
                // For My Bookings cards, View / card click navigates
                // to /booking/[booking_id] (the dedicated booking
                // details page). For All Events cards, both go to
                // /events/[event_id]. The chosen handler runs from
                // the article-level click AND from the View button,
                // so the destination stays consistent regardless of
                // which surface the viewer presses.
                const isBooking = !!ev.bookingId;
                const goTo = () =>
                  isBooking && ev.bookingId
                    ? openBookingDetails(ev.bookingId)
                    : openEventDetails(ev.id);
                // Status chip label resolution:
                //   • My Bookings tab → use the row's actual
                //     `bookingStatus` (CONFIRMED / CANCELLED /
                //     PAID / etc) so the viewer sees the real
                //     state of each booking.
                //   • All Events tab → look the event id up in
                //     `bookingStatusByEventId`; if found (i.e.
                //     the viewer has an active booking for this
                //     event), show a "Booked" chip. The label
                //     is fixed to "Booked" rather than the raw
                //     status because the All Events listing
                //     surfaces an event-level affordance — the
                //     viewer cares whether they've already
                //     booked, not which payment-state value the
                //     booking is in. Cancelled bookings are
                //     filtered out at populate time so they
                //     don't show up here.
                const chipStatus =
                  ev.bookingStatus ||
                  (bookingStatusByEventId[ev.id] ? "Booked" : "");
                return (
                  <article
                    key={ev.bookingId ?? ev.id}
                    className={styles.eventCard}
                    role="link"
                    tabIndex={0}
                    onClick={goTo}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goTo();
                      }
                    }}
                  >
                    <div
                      className={styles.eventImage}
                      aria-hidden="true"
                      style={{ background: ev.imageBg }}
                    >
                      {ev.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ev.imageUrl} alt="" />
                      ) : (
                        <span className={styles.eventImageLabel}>
                          {ev.imageLabel}
                        </span>
                      )}
                    </div>
                    <div className={styles.eventInfo}>
                      {/* Top row: PHYSICAL/VIRTUAL EVENT label on
                          the left + (mobile-only) status chip on
                          the right. The inline chip is hidden via
                          CSS on tablet/desktop where the chip
                          renders in the action column instead. */}
                      <div className={styles.eventTypeRow}>
                        <p className={styles.eventType}>{ev.type}</p>
                        {chipStatus ? (
                          <span
                            className={`${styles.statusChipInline} ${
                              statusChipClass(chipStatus, styles)
                            }`}
                          >
                            {chipStatus.toUpperCase()}
                          </span>
                        ) : null}
                      </div>
                      <p className={styles.eventTitle} title={ev.title}>
                        {ev.title}
                      </p>
                      <span className={styles.eventDate}>
                        <CalendarIcon />
                        {ev.date}
                      </span>
                      <p className={styles.eventPrice}>{ev.price}</p>
                    </div>
                    <div className={styles.eventActions}>
                      {/* Status chip — only renders for My Bookings
                          rows. On tablet/desktop this chip lives
                          here in the action column (top-right of
                          the card via absolute on tablet, bottom of
                          the action column on desktop). On mobile
                          it's hidden via CSS — the inline chip in
                          eventTypeRow above takes over so the chip
                          sits on the same row as PHYSICAL EVENT. */}
                      {chipStatus ? (
                        <span
                          className={`${styles.statusChip} ${
                            statusChipClass(chipStatus, styles)
                          }`}
                        >
                          {chipStatus.toUpperCase()}
                        </span>
                      ) : null}
                      {/* Gradient "View" pill — same navigation as
                          the card-level click. Click bubbling is
                          stopped so the article's onClick doesn't
                          also run and double-push the route. */}
                      <button
                        type="button"
                        className={styles.btnView}
                        onClick={(e) => {
                          e.stopPropagation();
                          goTo();
                        }}
                      >
                        View
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
