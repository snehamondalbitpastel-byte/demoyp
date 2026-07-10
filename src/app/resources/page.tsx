"use client";

/**
 * Resources tab — wired to the real YP backend.
 *
 * Structure MIRRORS /career-talks 1:1 — global <Navbar />, same
 * `_chrome.module.css` (page background, content grid, left column,
 * mini-profile card, search bar), and the same right-panel pattern.
 * Only the CARDS inside the right panel are resource-specific.
 *
 * Real user data is read from AuthContext (matches the live mini-profile
 * on /home, /jobs, /events, /career-talks).
 *
 * Data flow (Phase 2):
 *   - Categories: `fetchCategories()` → POST /api/mobile/resources/categories
 *   - List:       `fetchResourcesList({page,limit,search,category,sort})`
 *                 → POST /api/mobile/resources/list, debounced on search
 *                 + AbortController-cancelled on rapid changes
 *   - Per-card thumbnail/cover handled by `mapRawListItem` in lib/api.ts —
 *     `thumbnail_url` can be an image / video / audio URL; only images
 *     are rendered as <img>, others get a placeholder + media badge.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import type { AuthUser } from "@/app/lib/api/types";
import chromeStyles from "./_chrome.module.css";
import styles from "./resources.module.css";
import { fetchCategories, fetchResourcesList } from "./lib/api";
import type { Category, ResourceListItem, SortBy } from "./lib/types";

// Extended profile shape (matches what career-talks reads off /api/profile).
type ResourcesProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return f + l || "U";
}

function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Synthetic "All" chip prepended client-side per the API doc note.
const ALL_CATEGORY: Category = { id: "all", category_name: "All" };

/** Mini-profile skeleton — identical structure to /career-talks. The
 *  shimmer classes (`.skeleton`, `.skelLine`, `.skelName`, `.skelRole`,
 *  `.skelChip`) live in `_chrome.module.css` so the animation matches
 *  career-talks pixel-for-pixel and auto-follows light / dark theme. */
function MiniProfileSkeleton() {
  return (
    <section className={chromeStyles.miniProfile} aria-hidden="true">
      <div className={`${chromeStyles.miniAvatar} ${chromeStyles.skeleton}`} />
      <div className={chromeStyles.miniInfo}>
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skelName} ${chromeStyles.skeleton}`}
        />
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skelRole} ${chromeStyles.skeleton}`}
        />
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skelChip} ${chromeStyles.skeleton}`}
        />
      </div>
    </section>
  );
}

/** Category-row skeleton — one shimmer bar per row, mirrors the real
 *  `.categoryRow` height + `margin-bottom: 22px`. Renders six rows so
 *  the sidebar's vertical footprint matches the typical real category
 *  count (4 real categories + "All" chip + a spare). */
function CategoryListSkeleton() {
  return (
    <section className={styles.categoriesBox} aria-hidden="true">
      {/* Empty header placeholder — keeps the layout aligned with
          the real categories box on mobile/tablet (where the title
          + chevron row is visible). On desktop the header is
          hidden via CSS so this just collapses to nothing. */}
      <div className={styles.catsHeader} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`cat-skel-${i}`}
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{
            width: `${[55, 75, 65, 80, 60, 70][i] ?? 70}%`,
            height: 14,
            marginBottom: i === 5 ? 0 : 22,
          }}
        />
      ))}
    </section>
  );
}

/** Single resource card skeleton — matches the real `.rcard` layout
 *  exactly: 16:9 media block on top + title line + 2 description lines
 *  in the body. Avoids layout shift when real data lands. */
function ResourceCardSkeleton() {
  return (
    <article
      className={styles.rcard}
      aria-hidden="true"
      style={{ cursor: "default" }}
    >
      {/* Media block — 16:8 aspect placeholder matching `.rmedia`.
          Has its own shimmer so the top of each card reads as a
          loading image area. The card's own background fills the
          rest, so the placeholder doesn't appear as a floating
          shape. */}
      <div className={`${styles.rmedia} ${chromeStyles.skeleton}`} />
      <div className={styles.rbody}>
        {/* Category chip placeholder — narrow pill at the top of
            the body, mirroring the real card's uppercase
            "WORK EXPERIENCE" / "COVER LETTERS" chip. */}
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: 110, height: 18, borderRadius: 20, marginBottom: 6 }}
        />
        {/* Title placeholder — 2 lines representing the real
            two-line truncated title. */}
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: "92%", height: 14, marginBottom: 4 }}
        />
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: "68%", height: 14, marginBottom: 10 }}
        />
        {/* Description placeholder — 2 lines representing the
            two-line truncated body excerpt under the title. Each
            line slightly narrower than the one above so the block
            reads as natural paragraph text. */}
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: "100%", height: 11, marginBottom: 4 }}
        />
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: "82%", height: 11 }}
        />
      </div>
    </article>
  );
}

/** Location SVG used inside the mini-profile chip — copied from
 *  career-talks so the icon glyph + viewBox are identical. */
function LocationIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4.5 0C2.01875 0 0 2.01875 0 4.5C0 7.875 4.5 11 4.5 11C4.5 11 9 7.875 9 4.5C9 2.01875 6.98125 0 4.5 0ZM4.5 6.125C3.60625 6.125 2.875 5.39375 2.875 4.5C2.875 3.60625 3.60625 2.875 4.5 2.875C5.39375 2.875 6.125 3.60625 6.125 4.5C6.125 5.39375 5.39375 6.125 4.5 6.125Z"
        fill="#A0AEC0"
      />
    </svg>
  );
}

/** Search SVG — EXACT byte-for-byte port of the career-talks
 *  `SearchIcon` per user "use exact same SVG as career-talks page"
 *  spec. Key differences from the previous outlined feather/lucide
 *  glyph (which was hardcoded at 16×16):
 *    1. NO inline `width` / `height` attributes → the CSS rule
 *       `.searchIconWrap svg { width: 24px; height: 24px }` is
 *       now what sizes the icon, matching career-talks exactly.
 *    2. `viewBox="0 0 22 22"` (was 24 24) — same as career-talks.
 *    3. `fill="currentColor"` SOLID glyph (was stroke-based
 *       outline) — career-talks ships the filled magnifying
 *       glass shape.
 *    4. Single `<path>` with the exact path data career-talks
 *       uses, so the visible glyph is pixel-identical. */
function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 22 22"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z" />
    </svg>
  );
}

/** Chevron-up glyph used as the categories sidebar collapse/expand
 *  toggle — EXACT port of the home page's `ChevronCollapseIcon`.
 *  Rotates 180° when collapsed so the same glyph serves both states
 *  with a smooth 0.2s rotate transition. */
function ChevronCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

/** Small "X" clear glyph rendered inside the search bar whenever the
 *  user has typed anything. Same path data as /home's `ClearIcon`. */
function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Muted-gray Lucide arrow-up-down used inside the Sort CHIP (the
 *  pill that appears in the panel below the search bar). Same glyph
 *  career-talks uses for its `.compactSortBtn`. */
function SortChipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A0AEC0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

/** Filter/sort SVG inside the search bar — same Font-Awesome
 *  "sort by amount" glyph career-talks uses for its `.searchSliders`
 *  button. Rotated 180° + fill: currentColor so it inherits the
 *  parent's color (near-white in dark, brand-blue in light). */
function SortIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20"
      width="20"
      viewBox="0 0 640 640"
      style={{ transform: "rotate(180deg)", fill: "currentColor" }}
      aria-hidden="true"
    >
      <path d="M352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160L384 160C401.7 160 416 145.7 416 128C416 110.3 401.7 96 384 96L352 96zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288L448 288C465.7 288 480 273.7 480 256C480 238.3 465.7 224 448 224L352 224zM352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416L512 416C529.7 416 544 401.7 544 384C544 366.3 529.7 352 512 352L352 352zM352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544L576 544C593.7 544 608 529.7 608 512C608 494.3 593.7 480 576 480L352 480zM182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4z" />
    </svg>
  );
}

/** Straight DOWN arrow — used inside the "A to Z" dropdown row
 *  (smallest → largest reads as a downward sort indicator). */
function ArrowDownPillIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line
        x1="12" y1="5" x2="12" y2="19"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
      <polyline
        points="6 13 12 19 18 13"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Straight UP arrow — used inside the "Z to A" dropdown row
 *  (largest → smallest reads as an upward sort indicator). */
function ArrowUpPillIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line
        x1="12" y1="19" x2="12" y2="5"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
      <polyline
        points="6 11 12 5 18 11"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Lucide-style clock glyph used inside the "Recently Added"
 *  dropdown row — matches the relative-time pill on each card. */
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

/** Photo glyph used inside the per-card media-count badge in the
 *  top-left corner ("📷 N"). Matches the live YP list cards. */
function PhotoCountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="m21 17-5-5-4 4-3-3-6 6" />
    </svg>
  );
}

/** Lucide "music" glyph — EXACT path/circles port of the user-
 *  pasted live YP `.r_media_fallback_icon` SVG (two notes
 *  connected by a beam). Stroked (not filled) so it inherits
 *  `currentColor` cleanly from the parent text color. Used in
 *  the AUDIO card placeholder label. */
function AudioNoteIcon() {
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

/** Solid white triangular play glyph used for VIDEO card
 *  placeholders per user spec ("for video replacement use the
 *  video icon, not resource"). Matches the watermark in the
 *  card's bottom-right corner so the centre and corner read as
 *  the same visual language. */
function PlayTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

/** Resources open-book glyph — EXACT path lifted from the navbar
 *  asset (`/assets/icons/nav/resources-fill.svg`) so the listing-
 *  card placeholder matches the navbar tab icon pixel-for-pixel.
 *  Used for non-audio non-image card placeholders (video / pdf /
 *  document). Audio uses `AudioNoteIcon` above. The gradient +
 *  label below ("VIDEO" / "PDF" / "DOCUMENT") differentiates the
 *  media type. */
function CardPlaceholderIcon() {
  return (
    <svg viewBox="4 -6 132 132" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M67.649 107.379C66.9276 107.199 66.2791 106.941 65.7036 106.604C61.418 104.099 56.957 102.233 52.3205 101.007C47.6839 99.7802 42.8826 99.1667 37.9165 99.1667C34.8803 99.1667 31.898 99.4209 28.9696 99.9294C26.0423 100.438 23.1912 101.253 20.4165 102.375C18.3 103.22 16.3128 102.984 14.4548 101.668C12.5959 100.352 11.6665 98.5391 11.6665 96.2281V40.0706C11.6665 38.6269 12.0646 37.3256 12.8609 36.1667C13.6571 35.0078 14.7023 34.1853 15.9963 33.6992C19.4214 32.1884 22.9851 31.0552 26.6873 30.2998C30.3896 29.5444 34.1326 29.1667 37.9165 29.1667C43.6303 29.1667 49.1661 30.0456 54.524 31.8034C59.8829 33.5602 65.0415 35.8969 69.9998 38.8136V102.218C74.8833 99.1064 80.0662 96.8479 85.5486 95.4421C91.03 94.0363 96.5415 93.3334 102.083 93.3334C105.284 93.3334 108.187 93.5127 110.794 93.8715C113.4 94.2302 116.18 94.8437 119.134 95.7119C119.956 95.9365 120.723 95.955 121.434 95.7673C122.144 95.5806 122.5 94.9638 122.5 93.9167V32.8913C123.061 33.0031 123.597 33.1581 124.11 33.3565C124.622 33.5548 125.11 33.8183 125.574 34.1469C126.494 34.633 127.184 35.3247 127.643 36.2221C128.103 37.1204 128.333 38.1043 128.333 39.1738V96.0036C128.333 98.3145 127.348 100.109 125.377 101.388C123.406 102.667 121.251 102.921 118.909 102.15C116.211 101.103 113.453 100.345 110.636 99.874C107.821 99.4024 104.97 99.1667 102.083 99.1667C97.0422 99.1667 92.1286 99.7802 87.3423 101.007C82.5561 102.233 78.0207 104.099 73.7361 106.604C73.1596 106.941 72.5291 107.199 71.8446 107.379C71.1612 107.557 70.4714 107.647 69.7753 107.647C69.0801 107.647 68.3714 107.557 67.649 107.379ZM85.8053 83.7988C84.9828 84.524 84.0873 84.6752 83.119 84.2523C82.1507 83.8294 81.6665 83.0609 81.6665 81.9467V38.9711C81.6665 38.657 81.7394 38.3299 81.8853 37.9896C82.0311 37.6493 82.2124 37.3708 82.4292 37.154L106.659 12.9238C107.483 12.1003 108.384 11.9131 109.363 12.3623C110.343 12.8105 110.833 13.6033 110.833 14.7408V60.1621C110.833 60.5733 110.754 60.9302 110.597 61.2325C110.44 61.5358 110.254 61.7959 110.037 62.0127L85.8053 83.7988ZM64.1665 99.4467V42.2581C60.0608 39.9997 55.8146 38.2254 51.428 36.9352C47.0423 35.6451 42.5384 35 37.9165 35C34.3193 35 30.9875 35.3218 27.9211 35.9654C24.8547 36.6081 22.0916 37.4228 19.6319 38.4096C19.033 38.6342 18.528 38.9521 18.1167 39.3633C17.7055 39.7746 17.4998 40.2797 17.4998 40.8786V94.1748C17.4998 95.2219 17.8552 95.8388 18.5659 96.0254C19.2766 96.2121 20.0432 96.1562 20.8657 95.8577C23.2214 95.042 25.7768 94.4174 28.5321 93.9838C31.2884 93.5502 34.4165 93.3334 37.9165 93.3334C43.1364 93.3334 48.0403 93.9429 52.6282 95.1621C57.2171 96.3813 61.0632 97.8095 64.1665 99.4467Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Ionicons "book-outline" glyph — EXACT path + attributes from the
 *  live YP `r_media_fallback` (Claude-authored). Stroke-only (fill
 *  none, stroke-width 32, round caps/joins) so it inherits
 *  `currentColor` cleanly. Used TWICE in the fallback: once as the
 *  large faded `.r_ghost_glyph` behind the tile, and once inside the
 *  centred `.r_glass_tile`. */
function BookOutlineIcon() {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
      aria-hidden="true"
    >
      <path d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0 1 16 16v288a16 16 0 0 1-16 16c-128 0-177.45 25.81-208 64c-30.37-38-80-64-208-64c-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0 1 16-16c131.57.59 192 32.84 208 96m0 0v288" />
    </svg>
  );
}

/** Card title + description block with a height-preserving rule the
 *  senior asked for:
 *    - The TITLE is ALWAYS shown in FULL — never truncated, no
 *      matter how long (no line-clamp).
 *    - The DESCRIPTION clamps to 2 lines by DEFAULT, and drops to 1
 *      line ONLY when the (un-truncated) title wraps to MORE than 2
 *      lines. So a long title is shown completely while the
 *      description gives up a row to keep the card roughly the same
 *      height. Short/normal titles keep the default 2-line
 *      description.
 *  The decision is made dynamically per card by measuring the
 *  title's rendered line count, and re-measured on resize (the line
 *  count changes with the card width). */
function CardText({ title, description }: { title: string; description: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [descLines, setDescLines] = useState(2);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight);
      if (!lh) return;
      const lines = Math.round(el.scrollHeight / lh);
      setDescLines(lines > 2 ? 1 : 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [title]);

  return (
    <>
      <h3 ref={titleRef}>{title}</h3>
      {/* Inline `WebkitLineClamp` overrides the stylesheet's 2-line
          clamp when the title is long (drops to 1). String value so
          React doesn't append a unit. */}
      <p style={{ WebkitLineClamp: String(descLines) }}>{description}</p>
    </>
  );
}

/** Listing-card fallback glyph — chosen DYNAMICALLY from the
 *  resource's primary media type (the type of its FIRST media), so a
 *  VIDEO resource shows a play triangle, AUDIO shows a music note,
 *  and pdf / document / unknown fall back to the book outline. Used
 *  for BOTH the large faded ghost glyph and the centred glass tile in
 *  `.r_media_fallback`. (Image resources never reach this branch —
 *  they render their cover image instead.) */
function FallbackGlyph({ type }: { type?: string | null }) {
  if (type === "video") return <PlayTriangleIcon />;
  if (type === "audio") return <AudioNoteIcon />;
  // Book branch uses `CardPlaceholderIcon` — its path is the EXACT
  // navbar resources glyph (`/assets/icons/nav/resources-outline.svg`,
  // viewBox 4 -6 132 132), so the fallback book matches the navbar
  // tab icon pixel-for-pixel per user spec.
  return <CardPlaceholderIcon />;
}

/** Three sort options exposed in the dropdown — Recently Added is
 *  the API default (sent when `sortBy === "recently_added"`, i.e.
 *  the field is OMITTED from the wire body). Live YP shows it as
 *  the active label on first paint ("Sort: Recently Added"), so we
 *  surface it in the dropdown too. */
const SORT_OPTIONS: Array<{ key: SortBy; label: string; icon: React.ReactNode; group: "relevance" | "title" }> = [
  { key: "recently_added", label: "Recently Added", icon: <ClockIcon />, group: "relevance" },
  { key: "a_to_z", label: "A to Z", icon: <ArrowDownPillIcon />, group: "title" },
  { key: "z_to_a", label: "Z to A", icon: <ArrowUpPillIcon />, group: "title" },
];

export default function ResourcesPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { theme } = useTheme();

  // ── Re-hydrate the viewer's profile on mount (same pattern as
  // career-talks page.tsx so the mini-profile populates with the
  // logged-in user's name / avatar / role / location). ──
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
        const json = (await res.json()) as { status?: string; data?: unknown };
        if (cancelled) return;
        if (json?.status === "OK" && json.data) {
          setUser(json.data as AuthUser);
        }
      } catch {
        // Silent — keep whatever AuthContext already has.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Mini-profile display values — same derivation as career-talks.
  const profile = user as ResourcesProfile | null;
  const rawAvatarUrl = profile?.profile_image_url || null;
  const avatarUrl = rawAvatarUrl;
  const fullName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const initials = getInitials(profile?.first_name, profile?.last_name);
  const miniRole =
    titleCase(profile?.education?.trim() || "") ||
    titleCase(profile?.study_field?.trim() || "") ||
    titleCase(profile?.role?.trim() || "");
  const miniLocation = profile?.location?.trim() || "";

  // ── List state ──
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recently_added");
  // Sort UI is a TWO-STEP cascade mirroring /career-talks:
  //   1. `filtersOpen` — whether the panel below the search bar is
  //      revealed. Toggled by clicking the filter/sort glyph INSIDE
  //      the search bar.
  //   2. `sortChipOpen` — whether the actual A-Z / Z-A options
  //      dropdown is showing. Toggled by clicking the "Sort" CHIP
  //      that lives in the panel from step 1. The dropdown is
  //      anchored under the chip, not under the search bar.
  // "Recently Added" stays as the API default (sent when no user
  // pick is active) per user spec.
  // Panel default = CLOSED per user "sort chip open as default …
  // should not show as default open; it should open when user
  // clicks the filter icon from the search bar" spec. The chip
  // surface reveals ONLY after the user toggles the filter glyph
  // in the search bar — first paint is search-bar-only, no sort
  // chip below.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortChipOpen, setSortChipOpen] = useState(false);

  // ── Categories sidebar collapse state (mobile + tablet only) ──
  // Default `false` so the dropdown starts CLOSED on responsive
  // (mobile/tablet) per user spec — showing just the selected
  // category + chevron. The collapse class only takes effect inside
  // the `@media (max-width: 1024px)` block in `resources.module.css`,
  // so DESKTOP is never affected (the full list always shows there
  // and the chevron is hidden), even though the state starts
  // "collapsed".
  const [catsExpanded, setCatsExpanded] = useState(false);

  // Server state (replaces the old sample-data useMemos in Phase 2).
  const [fetchedCategories, setFetchedCategories] = useState<Category[] | null>(null);
  const [listing, setListing] = useState<ResourceListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  // Captured unfiltered total — set whenever a fetch runs with NO
  // category filter and NO search text. Drives the "All (N)" chip
  // in the sidebar so the All count never shrinks to match the
  // currently-filtered subset. Bug fix: previously the All chip
  // used `totalCount` directly, so picking a category that has 1
  // item made the All chip read "All (1)" instead of "All (5)".
  const [unfilteredTotal, setUnfilteredTotal] = useState<number>(0);
  // Captured per-category counts — same idea as `unfilteredTotal`
  // but for each individual category chip. Populated ONLY when an
  // unfiltered fetch runs (categoryId === "all" && no search), so
  // switching categories doesn't make the inactive chips read (0).
  // The map is empty until the first unfiltered fetch lands.
  const [unfilteredCounts, setUnfilteredCounts] = useState<Map<string, number>>(
    () => new Map()
  );
  const [listError, setListError] = useState<string | null>(null);

  // Always-visible "All" chip + whatever categories the API returned.
  const categories: Category[] = useMemo(
    () => [ALL_CATEGORY, ...(fetchedCategories ?? [])],
    [fetchedCategories]
  );

  // Debounce the live search input — 400ms matches /home's feed
  // search EXACTLY (tight enough to feel responsive, long enough
  // to skip multi-key bursts).
  //
  // Minimum-length rule: API only fires when the trimmed input is
  // either EMPTY (cleared search → reloads the unfiltered list) OR
  // has at least 2 characters. Single-character queries are
  // ignored — we don't update `debouncedSearch`, so no fetch is
  // triggered. Mirrors the /home page behaviour 1:1.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length === 1) {
      // Skip 1-character queries — keep whatever debouncedSearch
      // was so the current results stay until the user types a
      // 2nd char OR clears the field.
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // ── Fetch categories on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (!cancelled) setFetchedCategories(cats);
      } catch {
        if (!cancelled) setFetchedCategories([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── One-shot snapshot fetch ──
  // Populates `unfilteredTotal` + `unfilteredCounts` for the sidebar
  // chips. Runs INDEPENDENTLY of the filtered list fetch below so
  // that if the user clicks a category before the initial fetch
  // resolves, the snapshot still completes (no shared
  // AbortController, no re-runs on filter change). Without this,
  // a quick category click would abort the only chance we had to
  // snapshot the unfiltered totals → inactive chips would all
  // read "(0)". The snapshot is only refreshed on full page
  // re-mount, which is acceptable for chip counts. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchResourcesList({
          page: 1,
          // 200 is well above the live total (~5 today) but small
          // enough to be a cheap snapshot if the backend ever grows
          // significantly. If the count ever exceeds this, per-
          // category snapshot counts will be slightly under-reported
          // for the tail — accept that for now.
          limit: 200,
        });
        if (cancelled) return;
        setUnfilteredTotal(res.total_count);
        const counts = new Map<string, number>();
        for (const r of res.result) {
          counts.set(r.category.id, (counts.get(r.category.id) ?? 0) + 1);
        }
        setUnfilteredCounts(counts);
      } catch {
        // Silent — sidebar chips will fall back to counting the
        // current `listing` until a snapshot lands.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch listing whenever search / category / sort changes ──
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setListing(null);
    setListError(null);
    (async () => {
      try {
        const res = await fetchResourcesList({
          page: 1,
          limit: 50,
          search_text: debouncedSearch || undefined,
          category_id: categoryId,
          sort_by: sortBy,
          signal: ctrl.signal,
        });
        if (cancelled) return;
        setListing(res.result);
        setTotalCount(res.total_count);
        // Snapshot (`unfilteredTotal` + `unfilteredCounts`) is
        // populated by the dedicated one-shot useEffect above, NOT
        // here — moving it out of the filtered fetch ensures a
        // rapid category click doesn't abort the only chance we
        // had to capture chip counts.
      } catch (err) {
        if (cancelled) return;
        // AbortError is normal when the user types fast — ignore it.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setListing([]);
        setListError("Couldn't load resources right now.");
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [debouncedSearch, categoryId, sortBy]);

  // Per-category counts — derived locally from the in-memory listing.
  // The real backend doesn't return per-category counts; for the
  // "All" chip we use `total_count` from the most recent response,
  // and for the others we count the items currently rendered. */
  const countsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    // "All" chip — uses the captured UNFILTERED total so it doesn't
    // shrink when the user picks a category. Falls back to the
    // current totalCount during the initial fetch before
    // unfilteredTotal has been populated.
    m.set("all", unfilteredTotal || totalCount);
    // Per-category chips — read from the UNFILTERED snapshot so
    // inactive chips keep their real counts when another category
    // is selected. If the snapshot is empty (initial load before
    // the first fetch), fall back to counting the current listing.
    if (unfilteredCounts.size > 0) {
      for (const [catId, n] of unfilteredCounts) {
        m.set(catId, n);
      }
    } else {
      for (const r of listing ?? []) {
        m.set(r.category.id, (m.get(r.category.id) ?? 0) + 1);
      }
    }
    return m;
  }, [listing, totalCount, unfilteredTotal, unfilteredCounts]);

  // List is already filtered + sorted server-side. `filtered` stays
  // around as the JSX-facing name so the render block below is
  // unchanged. */
  const filtered: ResourceListItem[] = listing ?? [];

  // Dynamic empty-state message — three branches per user spec:
  //   1. Active search → "No resources match your search."
  //   2. Active category (no search) → "No resources found in {name}"
  //   3. Neither → generic "No resources available."
  // The category name is looked up by id from the fetched
  // category list (falls back to "this category" if the id
  // somehow isn't in the list).
  const activeCategoryName =
    categoryId === "all"
      ? null
      : (categories.find((c) => c.id === categoryId)?.category_name ?? "this category");
  const emptyMessage = debouncedSearch
    ? "No resources match your search."
    : activeCategoryName
      ? `No resources found in ${activeCategoryName}`
      : "No resources available.";

  // Label shown next to "Sort" inside the chip — always populated
  // so the pill reads "Sort: Recently Added" on first paint
  // (matches live YP). Picking an option overwrites it.
  const sortLabel =
    sortBy === "a_to_z"
      ? "A to Z"
      : sortBy === "z_to_a"
        ? "Z to A"
        : "Recently Added";

  // Close the chip dropdown when the user clicks anywhere OUTSIDE
  // the sort UI. Uses `composedPath()` + `[data-compact-menu]`
  // selector (career-talks pattern) instead of a ref because the
  // chip + its dropdown live OUTSIDE the search-bar wrapper in
  // their own panel below — a single ref can't cover both.
  // The 0ms timeout defers handler attachment past the very click
  // that opened the dropdown so it doesn't immediately re-close.
  useEffect(() => {
    if (!sortChipOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      const path = e.composedPath();
      const insideMenu = path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches?.("[data-compact-menu]")
      );
      if (!insideMenu) {
        setSortChipOpen(false);
      }
    };
    const t = window.setTimeout(() => {
      document.addEventListener("click", handleDocClick);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", handleDocClick);
    };
  }, [sortChipOpen]);

  // Close the categories dropdown when the user taps OUTSIDE it. While
  // open the header (and its chevron) is hidden via CSS so the list can
  // sit at the top with no duplicate/blank row — this gives back a way
  // to dismiss the dropdown without picking an option. Same
  // `composedPath()` + `[data-cats-menu]` pattern as the sort dropdown
  // above; the 0ms timeout defers attachment past the opening click so
  // it doesn't immediately re-close. No-op on desktop (the dropdown
  // never enters the expanded state there).
  useEffect(() => {
    if (!catsExpanded) return;
    const handleDocClick = (e: MouseEvent) => {
      const path = e.composedPath();
      const insideMenu = path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches?.("[data-cats-menu]")
      );
      if (!insideMenu) {
        setCatsExpanded(false);
      }
    };
    const t = window.setTimeout(() => {
      document.addEventListener("click", handleDocClick);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", handleDocClick);
    };
  }, [catsExpanded]);

  // Pick a sort option from the dropdown. With Recently Added now
  // a first-class option (matches live YP), the toggle-to-default
  // behaviour is gone — picking any option just sets that value.
  function pickSort(key: SortBy) {
    setSortBy(key);
    setSortChipOpen(false);
  }

  // Clear All — visible only when the viewer has actively picked a
  // non-default sort (or in the future ticked any filter). Matches
  // career-talks `hasActiveSelections` logic: the API default
  // ("recently_added") is NOT counted as active so Clear All stays
  // hidden on first paint. The trigger here is the user-spec ask:
  // "when any a to z or z to a clicked the clear all". */
  const hasActiveSelections = sortBy !== "recently_added";

  // Reset every active selection in one click — mirrors career-talks
  // `clearAll`: sort back to the default, panel + chip dropdown both
  // collapsed. After this runs `hasActiveSelections` flips false →
  // the Clear All button itself disappears.
  const clearAll = () => {
    setSortBy("recently_added");
    setSortChipOpen(false);
    setFiltersOpen(false);
  };

  return (
    <div className={`${chromeStyles.page} ${styles.resourcesPage}`} data-theme={theme}>
      <Navbar />
      <main className={`${chromeStyles.content} ${styles.resourcesContent}`}>
        <aside
          className={chromeStyles.leftCol}
          aria-label="Profile and resource categories"
        >
          {/* ── Mini-profile ──
              While the auth profile fetch is in flight (`profile === null`)
              render a skeleton; once the user lands, swap to the real card.
              Mirrors career-talks 1:1 — the shimmer classes used live in
              `_chrome.module.css` which is byte-identical to career-talks'. */}
          {profile === null ? (
            <MiniProfileSkeleton />
          ) : (
            <section className={chromeStyles.miniProfile} aria-label="Your profile">
              <div className={chromeStyles.miniAvatar} aria-hidden="true">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </div>
              <div className={chromeStyles.miniInfo}>
                {fullName ? (
                  <p className={chromeStyles.miniName}>{fullName}</p>
                ) : null}
                {miniRole ? (
                  <p className={chromeStyles.miniRole}>{miniRole}</p>
                ) : null}
                {miniLocation ? (
                  <span className={chromeStyles.miniLocation}>
                    <LocationIcon />
                    {miniLocation}
                  </span>
                ) : null}
              </div>
            </section>
          )}

          {/* ── Categories sidebar ──
              While the categories fetch is in flight (`fetchedCategories
              === null`) render a 6-row shimmer skeleton; once data lands,
              render the real chips. The "All" chip is always present
              once any category data is set, but during loading we show
              the skeleton so the sidebar height doesn't pop. */}
          {fetchedCategories === null ? (
            <CategoryListSkeleton />
          ) : (
            <section
              className={`${styles.categoriesBox}${
                !catsExpanded ? ` ${styles.categoriesBoxCollapsed}` : ""
              }`}
              aria-label="Resource categories"
              /* Marker used by the tap-outside-to-close handler — when
                 the dropdown is open the header (chevron) is hidden, so
                 a click anywhere outside this box collapses it. */
              data-cats-menu
            >
              {/* Header row (mobile + tablet ONLY — hidden on desktop
                  via CSS). Shows the CURRENTLY-SELECTED category as the
                  collapsed dropdown's label (defaults to "All") + the
                  chevron toggle. The selected row is hidden from the
                  list below on mobile/tablet (CSS), so "All" never
                  appears twice — the dropdown shows the label up top
                  and the REMAINING options inside. On desktop the
                  header is hidden and the full list (incl. the active
                  row, highlighted) shows. */}
              {/* Clicking ANYWHERE on the header bar OPENS the dropdown
                  (bigger tap target), per user spec. The arrow button
                  is the exception — it TOGGLES (so it can also close)
                  and stops the click from also firing the bar's open. */}
              <div
                className={styles.catsHeader}
                onClick={() => setCatsExpanded(true)}
                role="button"
                tabIndex={0}
                aria-expanded={catsExpanded}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setCatsExpanded(true);
                  }
                }}
              >
                {/* Header ALWAYS shows the selected category (so the
                    bar is never empty, open or closed). The open list
                    hides this selected row on mobile/tablet (CSS), so
                    it's never shown twice — and there's no "two All"
                    flash during the collapse animation. */}
                <span className={styles.catsHeaderLabel}>
                  {categories.find((c) => c.id === categoryId)?.category_name ?? "All"}
                </span>
                <button
                  type="button"
                  className={styles.catsToggle}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatsExpanded((v) => !v);
                  }}
                  aria-expanded={catsExpanded}
                  aria-label={
                    catsExpanded
                      ? "Collapse categories"
                      : "Expand categories"
                  }
                >
                  <ChevronCollapseIcon collapsed={!catsExpanded} />
                </button>
              </div>
              {/* Scrollable inner container — fixed max-height per
                  user "the collapse dropdown should have fixed height
                  of that container, use inner scroller to show all
                  options" spec. The max-height + inner scroll only
                  kick in at mobile/tablet widths (≤1024px) inside
                  the CSS media query; on desktop the rows are shown
                  in full (no scroller, no height cap). */}
              <div
                className={`${styles.catsScroll}${
                  !catsExpanded ? ` ${styles.catsScrollCollapsed}` : ""
                }`}
              >
                {categories.map((cat) => {
                  const isActive = categoryId === cat.id;
                  return (
                    <p
                      key={cat.id}
                      className={`${styles.categoryRow} ${isActive ? styles.categoryActive : ""}`}
                      /* Selecting a category sets it AND closes the
                         dropdown (auto-close on pick, per user spec).
                         Closing has no effect on desktop (no collapse
                         there). The picked row keeps its FIXED original
                         position in the list (e.g. a 3rd-position
                         category stays 3rd) — it is only highlighted in
                         place via `.categoryActive`, never reordered or
                         hidden, so reopening shows a stable order. */
                      onClick={() => {
                        setCategoryId(cat.id);
                        setCatsExpanded(false);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCategoryId(cat.id);
                          setCatsExpanded(false);
                        }
                      }}
                    >
                      {cat.category_name}
                    </p>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        <section
          className={styles.rightOuter}
          aria-label="Resources listings"
        >
          <div className={styles.rightHeader}>
            <h1 className={styles.rightTitle}>Resources</h1>
            <div className={styles.searchSortWrap}>
              {/* `.searchWrap` is now ONLY the search-bar wrapper —
                  the sort dropdown moved out into its own panel
                  below the search row (matching career-talks 2-step
                  pattern). */}
              <div className={styles.searchWrap}>
                <div className={chromeStyles.searchBar}>
                  <span className={chromeStyles.searchIconWrap} aria-hidden="true">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={chromeStyles.searchInput}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search resources"
                    aria-label="Search resources"
                  />
                  {/* Clear button — only shown when there is text in
                      the search input. Resets `searchText` to "",
                      which the debounce effect immediately commits
                      to `debouncedSearch` (empty trim path) → the
                      list fetch re-runs with no `search` body field
                      → unfiltered results return. Same pattern as
                      /home's feed search. */}
                  {searchText ? (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={() => setSearchText("")}
                      aria-label="Clear search"
                    >
                      <ClearIcon />
                    </button>
                  ) : null}
                  {/* Filter icon — STEP 1 of the 2-step cascade. Clicking
                      this toggles the panel BELOW the search bar that
                      holds the Sort chip. Same UX as career-talks — the
                      icon doesn't open the options dropdown directly. */}
                  <button
                    type="button"
                    className={styles.sortBtnInline}
                    onClick={() => {
                      setFiltersOpen((v) => !v);
                      // Closing the panel implicitly closes the chip
                      // dropdown too so reopening reads as a fresh
                      // start (matches career-talks behaviour).
                      setSortChipOpen(false);
                    }}
                    aria-label={filtersOpen ? "Hide sort panel" : "Show sort panel"}
                    aria-expanded={filtersOpen}
                  >
                    <SortIcon />
                  </button>
                </div>
              </div>
              {/* Clear All — sibling of `.searchWrap` so the CSS
                  `.searchWrap:has(+ .clearAllBtn)` rule fires and
                  shrinks the search pill from the right (left edge
                  stays anchored). Visible only after the viewer
                  picks A-Z or Z-A — `hasActiveSelections` flips
                  true at that point; clicking Clear All resets the
                  sort and the button itself disappears. */}
              {hasActiveSelections ? (
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={clearAll}
                >
                  Clear All
                </button>
              ) : null}
            </div>
          </div>

          {/* ── STEP 2 — Panel BELOW the search row, animated open via
              the CSS-Grid row trick (`.filtersOuter` ↔ `.filtersOuterOpen`).
              Holds a single "Sort" chip; clicking the chip opens the
              actual A-Z / Z-A dropdown. Identical structure to
              career-talks (which also has a Filter chip — resources
              doesn't expose filters so only the Sort chip lives here). */}
          <div
            className={`${styles.filtersOuter}${
              filtersOpen ? ` ${styles.filtersOuterOpen}` : ""
            }`}
            aria-hidden={!filtersOpen}
          >
            <div className={styles.panelInner}>
              <div className={styles.compactBar}>
                <div className={styles.compactWrap} data-compact-menu>
                  <button
                    type="button"
                    /* Sort pill uses the standalone `.compactSortBtn`
                       rule (independent of any future `.compactBtn`
                       filter chip) — verbatim port from career-talks. */
                    className={`${styles.compactSortBtn}${
                      sortChipOpen || sortBy !== "recently_added"
                        ? ` ${styles.compactSortBtnActive}`
                        : ""
                    }`}
                    onClick={() => setSortChipOpen((v) => !v)}
                    aria-expanded={sortChipOpen}
                  >
                    <SortChipIcon />
                    <span>
                      Sort{sortLabel ? `: ${sortLabel}` : ""}
                    </span>
                    {/* Lucide chevron-down — rotates 180° on open via
                        `.compactChevronOpen`. */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`${styles.compactChevron}${
                        sortChipOpen ? ` ${styles.compactChevronOpen}` : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {/* Options dropdown — always rendered so opacity +
                      transform can animate both directions. Anchored
                      to the LEFT edge of the chip above it. */}
                  <div
                    className={`${styles.compactDropdown}${
                      sortChipOpen ? ` ${styles.compactDropdownOpen}` : ""
                    }`}
                    role="menu"
                    aria-hidden={!sortChipOpen}
                  >
                    {/* Two groups — RELEVANCE (Recently Added) +
                        TITLE (A to Z / Z to A) — same structure as
                        /career-talks's sort dropdown. */}
                    {(["relevance", "title"] as const).map((group) => {
                      const groupOptions = SORT_OPTIONS.filter((o) => o.group === group);
                      if (groupOptions.length === 0) return null;
                      return (
                        <div key={group} role="group">
                          <div className={styles.compactSortGroupLabel}>
                            {group === "relevance" ? "RELEVANCE" : "TITLE"}
                          </div>
                          {groupOptions.map((opt) => {
                            const isActive = sortBy === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                className={`${styles.compactSortItem}${
                                  isActive ? ` ${styles.compactSortItemActive}` : ""
                                }`}
                                onClick={() => pickSort(opt.key)}
                              >
                                {opt.icon}
                                <span className={styles.compactSortItemLabel}>
                                  {opt.label}
                                </span>
                                {isActive ? (
                                  <svg
                                    className={styles.compactSortItemCheck}
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {listError ? (
              <div className={styles.empty}>{listError}</div>
            ) : listing === null ? (
              /* Loading: render 6 skeleton cards in the same 3×N grid
                 so the right-panel content area has its real footprint
                 from the first frame. Avoids the layout jump when the
                 real cards arrive. */
              <div className={styles.rgrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <ResourceCardSkeleton key={`rcard-skel-${i}`} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                {/* Filled resources open-book glyph — EXACT path
                    from the resources.html mockup (the senior's
                    reference doc) so the empty-state icon matches
                    the navbar icon (which now uses this same path).
                    Inlined so the muted #A0A0A0 fill applies
                    without an extra HTTP request. Sized via
                    `.emptyIcon` in CSS. */}
                <svg
                  className={styles.emptyIcon}
                  viewBox="4 -6 132 132"
                  fill="none"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M67.649 107.379C66.9276 107.199 66.2791 106.941 65.7036 106.604C61.418 104.099 56.957 102.233 52.3205 101.007C47.6839 99.7802 42.8826 99.1667 37.9165 99.1667C34.8803 99.1667 31.898 99.4209 28.9696 99.9294C26.0423 100.438 23.1912 101.253 20.4165 102.375C18.3 103.22 16.3128 102.984 14.4548 101.668C12.5959 100.352 11.6665 98.5391 11.6665 96.2281V40.0706C11.6665 38.6269 12.0646 37.3256 12.8609 36.1667C13.6571 35.0078 14.7023 34.1853 15.9963 33.6992C19.4214 32.1884 22.9851 31.0552 26.6873 30.2998C30.3896 29.5444 34.1326 29.1667 37.9165 29.1667C43.6303 29.1667 49.1661 30.0456 54.524 31.8034C59.8829 33.5602 65.0415 35.8969 69.9998 38.8136V102.218C74.8833 99.1064 80.0662 96.8479 85.5486 95.4421C91.03 94.0363 96.5415 93.3334 102.083 93.3334C105.284 93.3334 108.187 93.5127 110.794 93.8715C113.4 94.2302 116.18 94.8437 119.134 95.7119C119.956 95.9365 120.723 95.955 121.434 95.7673C122.144 95.5806 122.5 94.9638 122.5 93.9167V32.8913C123.061 33.0031 123.597 33.1581 124.11 33.3565C124.622 33.5548 125.11 33.8183 125.574 34.1469C126.494 34.633 127.184 35.3247 127.643 36.2221C128.103 37.1204 128.333 38.1043 128.333 39.1738V96.0036C128.333 98.3145 127.348 100.109 125.377 101.388C123.406 102.667 121.251 102.921 118.909 102.15C116.211 101.103 113.453 100.345 110.636 99.874C107.821 99.4024 104.97 99.1667 102.083 99.1667C97.0422 99.1667 92.1286 99.7802 87.3423 101.007C82.5561 102.233 78.0207 104.099 73.7361 106.604C73.1596 106.941 72.5291 107.199 71.8446 107.379C71.1612 107.557 70.4714 107.647 69.7753 107.647C69.0801 107.647 68.3714 107.557 67.649 107.379ZM85.8053 83.7988C84.9828 84.524 84.0873 84.6752 83.119 84.2523C82.1507 83.8294 81.6665 83.0609 81.6665 81.9467V38.9711C81.6665 38.657 81.7394 38.3299 81.8853 37.9896C82.0311 37.6493 82.2124 37.3708 82.4292 37.154L106.659 12.9238C107.483 12.1003 108.384 11.9131 109.363 12.3623C110.343 12.8105 110.833 13.6033 110.833 14.7408V60.1621C110.833 60.5733 110.754 60.9302 110.597 61.2325C110.44 61.5358 110.254 61.7959 110.037 62.0127L85.8053 83.7988ZM64.1665 99.4467V42.2581C60.0608 39.9997 55.8146 38.2254 51.428 36.9352C47.0423 35.6451 42.5384 35 37.9165 35C34.3193 35 30.9875 35.3218 27.9211 35.9654C24.8547 36.6081 22.0916 37.4228 19.6319 38.4096C19.033 38.6342 18.528 38.9521 18.1167 39.3633C17.7055 39.7746 17.4998 40.2797 17.4998 40.8786V94.1748C17.4998 95.2219 17.8552 95.8388 18.5659 96.0254C19.2766 96.2121 20.0432 96.1562 20.8657 95.8577C23.2214 95.042 25.7768 94.4174 28.5321 93.9838C31.2884 93.5502 34.4165 93.3334 37.9165 93.3334C43.1364 93.3334 48.0403 93.9429 52.6282 95.1621C57.2171 96.3813 61.0632 97.8095 64.1665 99.4467Z"
                    fill="#8495ad"
                  />
                </svg>
                <span className={styles.emptyTitle}>{emptyMessage}</span>
                {/* Search-specific subtitle — only renders when the
                    empty state is shown because a SEARCH returned
                    no matches. Hidden when the empty state is from
                    a category filter or an empty backend (where the
                    "try adjusting" hint doesn't apply). */}
                {debouncedSearch ? (
                  <span className={styles.emptySubtext}>
                    Try adjusting your search or category.
                  </span>
                ) : null}
              </div>
            ) : (
              <div className={styles.rgrid}>
                {filtered.map((r) => (
                  <article
                    key={r.id}
                    className={styles.rcard}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/resources/${encodeURIComponent(r.id)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/resources/${encodeURIComponent(r.id)}`);
                      }
                    }}
                  >
                    <div className={styles.rmedia}>
                      {r.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.cover_image_url} alt={r.title} loading="lazy" />
                      ) : r.primary_media_type === "video" && r.media_url ? (
                        // Video item with NO image cover → show the
                        // video's OWN first frame as the card preview
                        // instead of the generic fallback placeholder.
                        // `#t=0.1` nudges the browser to paint the frame
                        // at ~0.1s as a still poster; muted + playsInline
                        // + preload="metadata" keep it a silent poster,
                        // and `.rMediaVideo`'s pointer-events:none leaves
                        // the whole card as the click target. Only used
                        // when a real media URL exists — otherwise it
                        // falls through to the placeholder below. Data /
                        // fetch logic is untouched (media_url already
                        // mapped in lib/api.ts).
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          className={styles.rMediaVideo}
                          src={`${r.media_url}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      ) : (
                        // No image cover → render the EXACT live-YP
                        // `r_media_fallback` (Claude-authored on the
                        // live site). Four stacked layers inside the
                        // 16/8 `.rmedia` block, all uniform regardless
                        // of media type:
                        //   1. `.r_glow_top`    — soft white glow circle
                        //      clipped into the TOP-LEFT corner.
                        //   2. `.r_glow_bottom` — bluish glow circle in
                        //      the BOTTOM-RIGHT corner.
                        //   3. `.r_ghost_glyph` — large faded glyph on
                        //      the right (decorative).
                        //   4. `.r_glass_tile`  — centred frosted-glass
                        //      tile holding the glyph.
                        // The glyph in BOTH (3) and (4) is chosen
                        // DYNAMICALLY from `r.primary_media_type` — play
                        // triangle for video, music note for audio, book
                        // otherwise — so the fallback reflects the
                        // resource's first media type instead of always
                        // showing a book. Exact shades baked into the CSS
                        // module match the inline styles the user pasted.
                        <div className={styles.r_media_fallback} aria-hidden="true">
                          <span className={styles.r_glow_top} aria-hidden="true" />
                          <span className={styles.r_glow_bottom} aria-hidden="true" />
                          <span className={styles.r_ghost_glyph} aria-hidden="true">
                            <FallbackGlyph type={r.primary_media_type} />
                          </span>
                          <span className={styles.r_glass_tile}>
                            <FallbackGlyph type={r.primary_media_type} />
                          </span>
                        </div>
                      )}
                      {/* TOP-LEFT — media-count badge removed per
                          user spec ("remove the top-left gallery
                          icon SVG"). The `.rMediaCount` CSS rule
                          stays in resources.module.css for safety
                          in case the badge is re-introduced later,
                          but no JSX renders it now. */}
                      {/* TOP-RIGHT — relative-time pill ("41m ago" /
                          "4d ago" / "1w ago"). Replaces the old absolute
                          date label per live YP design. */}
                      {r.relative_time ? (
                        <span className={styles.rDatePill}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M12 7v5l3.5 2"/>
                          </svg>
                          {r.relative_time}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.rbody}>
                      {/* Uppercase category chip above the title —
                          matches the live YP card layout
                          ("THIS IS THE SECOND CATEGORY", etc.). */}
                      {r.category?.category_name ? (
                        <span className={styles.rCategoryChip}>
                          {r.category.category_name}
                        </span>
                      ) : null}
                      {/* Title shown in FULL (never truncated); the
                          description auto-shrinks to 1 line when the
                          title is long so the card height stays
                          stable. See `CardText`. */}
                      <CardText title={r.title} description={r.description} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
