/**
 * Type contracts for the Resources tab and detail screen.
 * Shapes mirror the backend API exactly so swapping hardcoded sample
 * data → real `fetch("/api/mobile/resources/...")` calls in Phase 2 is
 * a single drop-in replacement with no field renames.
 *
 * Source of truth: docs/RESOURCES_API.md (the senior's API spec).
 */

// ── Media type — closed set used by both list and detail ──
export type MediaType = "image" | "video" | "audio" | "pdf" | "document";

// ── Category ──
export interface Category {
  id: string;
  category_name: string;
  banner_text?: string | null;
  banner_image_url?: string | null;
}

// ── List item (what each card on the Resources tab receives) ──
// Field names match the mapped UI shape in the API doc (not the raw
// backend names). The mapping from raw → this shape happens at the
// fetch boundary in Phase 2.
export interface ResourceListItem {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  /** Raw thumbnail URL from the API, regardless of media type. Used
   *  by the card UI to render a `<video preload="metadata">` preview
   *  for video items (first frame shown as a still). For images,
   *  this duplicates `cover_image_url`; for audio/pdf/document the
   *  URL points at the actual media file. */
  media_url: string | null;
  primary_media_type: MediaType | null;
  category: Category;
  is_featured: boolean;
  published_at: string | null;
  date_label: string;
  /** "41m ago" / "4d ago" / "1w ago" style relative-time string,
   *  matches the live YP list cards. Empty string if `published_at`
   *  is null/invalid. List cards use this; the detail page still
   *  uses absolute `date_label`. */
  relative_time: string;
  media_count: number;
}

// ── List response (the body of /api/mobile/resources/list `data` field) ──
export interface ResourceListResponse {
  count: number;
  total_count: number;
  result: ResourceListItem[];
}

// ── Detail media item ──
export interface ResourceMedia {
  id: string;
  media_type: MediaType;
  url: string;
  sort_order?: number;
  thumbnail_url?: string | null;
  name?: string | null;
  size?: number | null;
  duration?: number | null;
}

// ── Detail response (single resource) ──
export interface ResourceDetail {
  id: string;
  title: string;
  body_html: string;
  is_featured: boolean;
  view_count: number;
  category: Category;
  media: ResourceMedia[];
  published_at: string | null;
  date_label: string;
  read_time_minutes: number;
}

// ── Sort options ──
export type SortBy = "recently_added" | "a_to_z" | "z_to_a";

// ── List request params (what the page passes to the fetch fn) ──
export interface ListParams {
  page: number;
  limit: number;
  search_text?: string;
  category_id?: string; // pass "all" to omit filter (the API expects the field omitted)
  sort_by?: SortBy;     // pass "recently_added" to omit (the API default)
}
