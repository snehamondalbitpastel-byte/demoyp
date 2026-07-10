/**
 * Resources API client — Phase 2 wiring.
 *
 * Three functions, one per backend endpoint. Each function:
 *   1. POSTs to the local Next.js proxy at `/api/mobile/resources/*`
 *      (the proxy forwards to the real YP backend + attaches the
 *      access_token from HttpOnly cookies — no auth concerns here).
 *   2. Validates the response envelope (`{ status: "OK"|"ERROR", data }`).
 *   3. Maps RAW backend fields → the UI shape declared in `./types`.
 *
 * Why the mapping layer:
 *   - The backend returns `excerpt` / `thumbnail_url` / `published_at`
 *     etc. but the UI consumes `description` / `cover_image_url` /
 *     `date_label`. Keeping the mapping here means the JSX never has
 *     to know about the raw field names.
 *   - The backend does NOT return `primary_media_type` (despite what
 *     earlier docs said). We derive it from the URL path segment +
 *     extension so the card overlay can show the right badge.
 */

import type {
  Category,
  MediaType,
  ResourceDetail,
  ResourceListItem,
  ResourceListResponse,
  ResourceMedia,
  SortBy,
} from "./types";

// ── Raw backend shapes (only the fields we read) ──────────────────────

interface RawCategory {
  id: string;
  category_name: string;
  banner_text?: string | null;
  banner_image_url?: string | null;
}

interface RawListItem {
  id: string;
  title?: string | null;
  excerpt?: string | null;
  category?: { id?: string; category_name?: string } | null;
  thumbnail_url?: string | null;
  media_count?: number | null;
  is_featured?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
}

interface RawListData {
  count?: number;
  total_count?: number;
  result?: RawListItem[];
}

interface RawDetailMedia {
  id: string;
  media_type?: string | null;
  url?: string | null;
  sort_order?: number | null;
  thumbnail_url?: string | null;
  name?: string | null;
  size?: number | null;
  duration?: number | null;
}

interface RawDetail {
  id: string;
  title?: string | null;
  body?: string | null;
  is_featured?: boolean | null;
  view_count?: number | null;
  category?: { id?: string; category_name?: string } | null;
  published_at?: string | null;
  created_at?: string | null;
  media?: RawDetailMedia[];
}

interface Envelope<T> {
  status?: string;
  message?: string;
  data?: T;
}

// ── Helpers ───────────────────────────────────────────────────────────

const MEDIA_TYPES: MediaType[] = ["image", "video", "audio", "pdf", "document"];

/** Infer media type from a URL.
 *
 * The backend's `thumbnail_url` is just the first media item URL —
 * not necessarily an image. Backend URLs follow a path pattern:
 *   .../resources/images/<uuid>.webp   → image
 *   .../resources/videos/<uuid>.mp4    → video
 *   .../resources/audio/<uuid>.mp3     → audio
 * Extension fallback covers backends that don't use those folders. */
export function deriveMediaType(url: string | null | undefined): MediaType | null {
  if (!url) return null;
  const lower = url.toLowerCase();

  // Path segment match — fastest + most reliable for this backend.
  if (lower.includes("/audio/")) return "audio";
  if (lower.includes("/videos/") || lower.includes("/video/")) return "video";
  if (lower.includes("/images/") || lower.includes("/image/")) return "image";
  if (lower.includes("/pdf/") || lower.includes("/documents/")) {
    return lower.endsWith(".pdf") ? "pdf" : "document";
  }

  // Extension fallback.
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(lower)) return "audio";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(lower)) return "video";
  if (/\.(webp|jpe?g|png|gif|avif|svg)(\?|$)/i.test(lower)) return "image";
  if (/\.pdf(\?|$)/i.test(lower)) return "pdf";

  return "document";
}

/** "2026-06-18T06:03:49Z" → "18 Jun, 2026". Null/blank → "". */
export function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${mon}, ${year}`;
}

/** "2026-06-18T06:03:49Z" → "41m ago" / "4d ago" / "1w ago" / etc.
 *  Mirrors the live YP list-card time pill format. Buckets:
 *      < 60s   → "{n}s ago"   (rare; covers fresh posts)
 *      < 60m   → "{n}m ago"
 *      < 24h   → "{n}h ago"
 *      < 7d    → "{n}d ago"
 *      < 5w    → "{n}w ago"
 *      < 12mo  → "{n}mo ago"
 *      else    → "{n}y ago"
 *  Future timestamps (clock skew) → "just now". Null/blank → "". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

/** Estimate reading time from rendered HTML body — ~200 wpm, min 1. */
function estimateReadTimeMinutes(html: string): number {
  if (!html) return 1;
  // Strip tags + collapse whitespace before counting words.
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 1;
  const words = text.split(" ").length;
  return Math.max(1, Math.round(words / 200));
}

function coerceMediaType(raw: string | null | undefined, urlHint?: string | null): MediaType {
  const norm = (raw ?? "").toLowerCase().trim();
  if ((MEDIA_TYPES as string[]).includes(norm)) return norm as MediaType;
  // Fall back to URL inference.
  return deriveMediaType(urlHint) ?? "document";
}

function mapCategoryFallback(
  c: { id?: string; category_name?: string; banner_text?: string | null; banner_image_url?: string | null } | null | undefined
): Category {
  // Pass-through ALL category fields the backend may include. The list
  // endpoint only returns {id, category_name}; the detail endpoint also
  // returns {banner_text, banner_image_url}. Both are forwarded so a
  // future UI (category hero banner, etc.) can read them without a
  // re-fetch.
  return {
    id: c?.id ?? "",
    category_name: c?.category_name ?? "Resource",
    banner_text: c?.banner_text ?? null,
    banner_image_url: c?.banner_image_url ?? null,
  };
}

// ── Mapping (raw → UI) ────────────────────────────────────────────────

export function mapRawListItem(raw: RawListItem): ResourceListItem {
  const thumbnail = raw.thumbnail_url ?? null;
  const mediaType = deriveMediaType(thumbnail);
  // Treat the thumbnail as a cover IMAGE only when it actually points
  // at an image. For audio/video URLs we hand the page `null` so it
  // renders a gradient placeholder instead of <img src="...mp3">.
  const coverImage = mediaType === "image" ? thumbnail : null;
  const published = raw.published_at ?? raw.created_at ?? null;
  return {
    id: raw.id,
    title: raw.title ?? "",
    description: raw.excerpt ?? "",
    cover_image_url: coverImage,
    // Preserve the raw thumbnail URL regardless of media type. The
    // card UI uses this for `<video preload="metadata">` previews on
    // video items (first frame as a still).
    media_url: thumbnail,
    primary_media_type: mediaType,
    category: mapCategoryFallback(raw.category),
    is_featured: raw.is_featured === true,
    published_at: published,
    date_label: formatDateLabel(published),
    relative_time: formatRelativeTime(published),
    media_count: typeof raw.media_count === "number" ? raw.media_count : 0,
  };
}

export function mapRawListResponse(d: RawListData): ResourceListResponse {
  return {
    count: typeof d.count === "number" ? d.count : 0,
    total_count: typeof d.total_count === "number" ? d.total_count : 0,
    result: Array.isArray(d.result) ? d.result.map(mapRawListItem) : [],
  };
}

export function mapRawDetail(raw: RawDetail): ResourceDetail {
  const bodyHtml = raw.body ?? "";
  const published = raw.published_at ?? raw.created_at ?? null;
  const media: ResourceMedia[] = (Array.isArray(raw.media) ? raw.media : [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({
      id: m.id,
      media_type: coerceMediaType(m.media_type, m.url),
      url: m.url ?? "",
      sort_order: typeof m.sort_order === "number" ? m.sort_order : 0,
      thumbnail_url: m.thumbnail_url ?? null,
      name: m.name ?? null,
      size: typeof m.size === "number" ? m.size : null,
      duration: typeof m.duration === "number" ? m.duration : null,
    }));
  return {
    id: raw.id,
    title: raw.title ?? "",
    body_html: bodyHtml,
    is_featured: raw.is_featured === true,
    view_count: typeof raw.view_count === "number" ? raw.view_count : 0,
    category: mapCategoryFallback(raw.category),
    media,
    published_at: published,
    date_label: formatDateLabel(published),
    read_time_minutes: estimateReadTimeMinutes(bodyHtml),
  };
}

// ── Fetchers ──────────────────────────────────────────────────────────

async function postJson<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<Envelope<T>> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Envelope<T>;
}

/** Fetch the category list (raw → mapped). Client prepends "All" itself. */
export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const env = await postJson<RawCategory[]>("/api/mobile/resources/categories", {}, signal);
  if (env.status !== "OK" || !Array.isArray(env.data)) return [];
  return env.data.map((c) => ({
    id: c.id,
    category_name: c.category_name ?? "",
    banner_text: c.banner_text ?? null,
    banner_image_url: c.banner_image_url ?? null,
  }));
}

export interface FetchListParams {
  page: number;
  limit: number;
  search_text?: string;
  category_id?: string; // "all" or "" → omit the field
  sort_by?: SortBy;     // "recently_added" → omit (backend default)
  signal?: AbortSignal;
}

/** Fetch the resources list — translates client-friendly param names
 *  to the backend body shape (`search` / `category` / `sort_by`). */
export async function fetchResourcesList(params: FetchListParams): Promise<ResourceListResponse> {
  const body: Record<string, unknown> = {
    page: params.page,
    limit: params.limit,
  };
  const s = params.search_text?.trim();
  if (s) body.search = s;
  if (params.category_id && params.category_id !== "all") {
    body.category = params.category_id;
  }
  if (params.sort_by && params.sort_by !== "recently_added") {
    body.sort_by = params.sort_by;
  }
  const env = await postJson<RawListData>("/api/mobile/resources/list", body, params.signal);
  if (env.status !== "OK" || !env.data) {
    return { count: 0, total_count: 0, result: [] };
  }
  return mapRawListResponse(env.data);
}

/** Fetch a single resource by id. Returns null when backend says
 *  the resource is gone (ERROR envelope) so the page can render the
 *  "no longer available" empty state. */
export async function fetchResourceDetail(id: string, signal?: AbortSignal): Promise<ResourceDetail | null> {
  const env = await postJson<RawDetail>("/api/mobile/resources/detail", { id }, signal);
  if (env.status !== "OK" || !env.data) return null;
  return mapRawDetail(env.data);
}
