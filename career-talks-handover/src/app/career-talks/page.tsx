"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import type { AuthUser } from "@/app/lib/api/types";
// Share the page chrome (background, navbar offset, grid columns),
// the mini-profile card, and the search-bar pill with /home, /jobs,
// /company and /events so this page never visually drifts from the
// rest of the listing pages. Career-talks-specific styles (right
// column wrapper, stats box, search slider button) live in
// `careerTalks.module.css`.
// Career-talks-OWNED chrome CSS — a self-contained copy of the
// shared `home.module.css` so this page does NOT depend on `home/`.
// Lets the file be dropped into any project (with its own /home or
// without one) and still render pixel-identical to the source build.
import chromeStyles from "./_chrome.module.css";
import styles from "./careerTalks.module.css";
import { useCareerTalks } from "@/app/lib/career-talks/useCareerTalks";

/** Extra profile fields returned by /api/mobile/profile beyond AuthUser
 *  — same subset the home / jobs / company pages consume for the
 *  mini-profile card. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

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

function LocationIcon() {
  // Per user spec — exact YP location-pin SVG, preserved verbatim
  // (viewBox 0 0 9 11, fill #A0AEC0, single path). Do not modify.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="11" viewBox="0 0 9 11" fill="none">
      <path d="M4.403 9.92454C5.54419 8.90293 6.41749 7.92303 7.0229 6.98483C7.6283 6.04664 7.931 5.22492 7.931 4.51967C7.931 3.45625 7.59315 2.58203 6.91746 1.897C6.24176 1.21197 5.40361 0.869458 4.403 0.869458C3.40239 0.869458 2.56424 1.21197 1.88854 1.897C1.21285 2.58203 0.875 3.45625 0.875 4.51967C0.875 5.22492 1.1777 6.04664 1.7831 6.98483C2.38851 7.92303 3.26181 8.90293 4.403 9.92454ZM4.403 10.7568C4.28935 10.7568 4.17569 10.7372 4.06204 10.698C3.94829 10.6588 3.84543 10.598 3.75346 10.5158C3.23001 10.0333 2.74016 9.53653 2.2839 9.02533C1.82773 8.51424 1.43121 8.00329 1.09433 7.49248C0.757361 6.98167 0.490729 6.47539 0.294438 5.97363C0.0981459 5.47176 0 4.98711 0 4.51967C0 3.17353 0.43541 2.08372 1.30623 1.25023C2.17715 0.416743 3.2094 0 4.403 0C5.5966 0 6.62885 0.416743 7.49977 1.25023C8.37059 2.08372 8.806 3.17353 8.806 4.51967C8.806 4.98711 8.70785 5.47079 8.51156 5.97071C8.31527 6.47072 8.04961 6.97706 7.71458 7.48971C7.37946 8.00236 6.98381 8.51331 6.52765 9.02256C6.07148 9.53191 5.58162 10.0277 5.05808 10.5101C4.96747 10.5923 4.86447 10.654 4.74906 10.6951C4.63376 10.7363 4.5184 10.7568 4.403 10.7568ZM4.40402 5.46306C4.69423 5.46306 4.94234 5.35972 5.14835 5.15302C5.35446 4.94633 5.45752 4.69788 5.45752 4.40767C5.45752 4.11746 5.35417 3.8693 5.14748 3.66319C4.94078 3.45717 4.69228 3.35417 4.40198 3.35417C4.11177 3.35417 3.86366 3.45751 3.65765 3.66421C3.45153 3.8709 3.34848 4.1194 3.34848 4.40971C3.34848 4.69992 3.45183 4.94803 3.65852 5.15404C3.86522 5.36006 4.11372 5.46306 4.40402 5.46306Z" fill="#A0AEC0"/>
    </svg>
  );
}

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

/** Skeleton placeholder for a single talk card in the 3×3 grid.
 *  Mirrors the real `.talkCard` layout exactly — image block on top
 *  (same 16:9 aspect via `.talkImage`) followed by a content block
 *  with a title line and a date line. Uses the same shimmer classes
 *  (`.skeleton`, `.skelLine`, `.skelName`, `.skelRole`) from
 *  home.module.css so the animation matches the rest of the app and
 *  the colour tokens follow the current theme automatically. */
function CareerTalkCardSkeleton() {
  return (
    <article
      className={styles.talkCard}
      aria-hidden="true"
      style={{ cursor: "default" }}
    >
      <div className={styles.talkImage}>
        <div
          className={`${styles.talkImageInner} ${chromeStyles.skeleton}`}
        />
      </div>
      <div className={styles.talkContent}>
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skelName} ${chromeStyles.skeleton}`}
        />
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skelRole} ${chromeStyles.skeleton}`}
        />
      </div>
    </article>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 22 22"
      /* `fill="currentColor"` so the glyph inherits the parent's
         text color — light mode = dark navy via theme overrides,
         dark mode = soft `#E3E3E3` via `--text-secondary`. Width
         + height come from the parent `.searchIconWrap` (20×20)
         per user spec, so we omit them here and let CSS rule. */
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z" />
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

/** Sort glyph used in the SEARCH BAR (the icon that toggles the
 *  Sort+Filter panel below the search). Font-Awesome–style
 *  "sort by amount" icon (4 ascending bars + a down arrow on the
 *  left). Rendered at 20×20 via the 640-unit viewBox, white fill,
 *  rotated 180° so the arrow points down. */
function SortIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20"
      width="20"
      viewBox="0 0 640 640"
      /* `fill: currentColor` so the glyph inherits whatever colour
         the parent button is set to. Dark mode parent is near-white
         (#f1eeee) → glyph reads white. Light mode parent gets flipped
         to navy (#0f172a) via the `[data-theme="light"] .searchSliders`
         rule in careerTalks.module.css → glyph reads dark automatically.
         Previously this was hardcoded `rgb(255, 255, 255)` which kept
         the icon white even on the light-mode white search bar. */
      style={{ transform: "rotate(180deg)", fill: "currentColor" }}
      aria-hidden="true"
    >
      <path d="M352 96C334.3 96 320 110.3 320 128C320 145.7 334.3 160 352 160L384 160C401.7 160 416 145.7 416 128C416 110.3 401.7 96 384 96L352 96zM352 224C334.3 224 320 238.3 320 256C320 273.7 334.3 288 352 288L448 288C465.7 288 480 273.7 480 256C480 238.3 465.7 224 448 224L352 224zM352 352C334.3 352 320 366.3 320 384C320 401.7 334.3 416 352 416L512 416C529.7 416 544 401.7 544 384C544 366.3 529.7 352 512 352L352 352zM352 480C334.3 480 320 494.3 320 512C320 529.7 334.3 544 352 544L576 544C593.7 544 608 529.7 608 512C608 494.3 593.7 480 576 480L352 480zM182.6 105.4C170.1 92.9 149.8 92.9 137.3 105.4L41.3 201.4C28.8 213.9 28.8 234.2 41.3 246.7C53.8 259.2 74.1 259.2 86.6 246.7L128 205.3L128 512C128 529.7 142.3 544 160 544C177.7 544 192 529.7 192 512L192 205.3L233.4 246.7C245.9 259.2 266.2 259.2 278.7 246.7C291.2 234.2 291.2 213.9 278.7 201.4L182.7 105.4z" />
    </svg>
  );
}

/** Lucide `sliders-horizontal` glyph — sits to the left of the
 *  "Filter" label inside the Filter chip. `currentColor` so it
 *  inherits the pill's text colour automatically (white on dark,
 *  navy on light). */
function FiltersSlidersIcon() {
  return (
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
      aria-hidden="true"
    >
      <path d="M10 5H3" />
      <path d="M12 19H3" />
      <path d="M14 3v4" />
      <path d="M16 17v4" />
      <path d="M21 12h-9" />
      <path d="M21 19h-5" />
      <path d="M21 5h-7" />
      <path d="M8 10v4" />
      <path d="M8 12H3" />
    </svg>
  );
}

/** Small clock glyph used inside RELEVANCE sort pills ("Most
 *  Recent" / "Recently Added"). 14×14 viewBox so it matches the
 *  pill's 14px font-size; `currentColor` so the stroke flips
 *  with the pill's active / inactive label colour automatically. */
function ClockPillIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <polyline
        points="12 7 12 12 15.5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Straight DOWN arrow — used inside the "A to Z" pill (smallest
 *  → largest reads as a downward sort indicator). */
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

/** Straight UP arrow — used inside the "Z to A" pill (largest →
 *  smallest reads as an upward sort indicator). */
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

/** Sort dropdown options — driven from a single source of truth so the
 *  button label, dropdown rows, and the active key stay in sync.
 *  Each option also carries a `group` tag ("relevance" / "title")
 *  so the panel can render them under their respective uppercase
 *  sub-labels (RELEVANCE / TITLE), and an `icon` JSX element that
 *  prefixes the label inside the pill — both matching the live YP
 *  reference SS layout. */
type SortKey = "recently_added" | "az" | "za";
type SortGroup = "relevance" | "title";
const SORT_OPTIONS: Array<{
  key: SortKey;
  label: string;
  group: SortGroup;
  icon: React.ReactNode;
}> = [
  { key: "recently_added", label: "Recently Added", group: "relevance", icon: <ClockPillIcon /> },
  { key: "az", label: "A to Z", group: "title", icon: <ArrowDownPillIcon /> },
  { key: "za", label: "Z to A", group: "title", icon: <ArrowUpPillIcon /> },
];

/** Static option lists for the two filter chips. Mirrors the
 *  shape /jobs and /company use for their `filterOptions` payload
 *  but is hardcoded here because the career-talks backend hasn't
 *  shipped a /search-filters endpoint yet — these can be swapped
 *  to a fetched list when the API arrives without touching any UI. */
const EMPLOYER_OPTIONS: string[] = [
  "A&O Shearman",
  "AICPA & CIMA",
  "Arbuthnot Latham",
  "BDO LLP",
  "Baker McKenzie",
  "Bird & Bird",
  "Bloomberg",
  "Browne Jacobson LLP",
  "Charles Russell Speechlys LLP",
  "City Century",
  "Clifford Chance",
  "Deloitte",
  "Experian",
  "Farrer & Co",
  "Fidelity International",
  "Forvis Mazars",
  "Fragomen",
  "Freeths",
  "Goldman Sachs",
];

const INDUSTRY_OPTIONS: string[] = [
  "Accounting",
  "Apprenticeships",
  "Banking & Finance",
  "Business & Consulting",
  "Construction & Engineering",
  "Emergency Services",
  "Government Services",
  "Health & Fitness",
  "Healthcare",
  "Human Resources",
  "Intelligence",
];

/** Which filter chip's dropdown is currently open, if any. `null`
 *  means every chip is collapsed. */
type FilterChipKey = "employers" | "industry";

/** Outline calendar glyph for the date row on each card. */
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

/** Right-panel view modes — each clickable row in the left stats box
 *  selects one. Same structural pattern /jobs uses; backed by static
 *  data for now until the talks API ships. */
type ViewMode = "all" | "saved" | "watched";

export default function CareerTalksPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  /** Career Talks page opts into the light/dark theme: we read the
   *  global theme state and stamp `data-theme="..."` on this page's
   *  root container. Because the CSS-variable tokens cascade through
   *  the DOM, every descendant (navbar, mini-profile, cards, etc.)
   *  rendered inside this container picks up the matching palette
   *  automatically. Pages that don't set this attribute keep the
   *  default dark values from `:root` in globals.css. */
  const { theme } = useTheme();
  /** Career Talks data — populated from `localStorage` (set by the
   *  temporary `/career-talks/upload` page). When the real backend
   *  ships, only the body of `useCareerTalks` changes — this page
   *  doesn't. Static fallback is intentionally OFF per spec, so
   *  `talks` is `[]` until the viewer uploads a sheet. */
  const { talks, loading: talksLoading } = useCareerTalks();
  const [searchText, setSearchText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  // Sort is SINGLE-select with RADIO-button semantics — exactly one
  // option is always active (Recently Added by default). Clicking
  // a different option replaces the selection; clicking the
  // currently-active option does nothing (does NOT deselect).
  // This guarantees the chip label always reads "Sort: <Name>"
  // and never collapses to just "Sort". State stays as an array
  // so `clearAll`, `hasActiveSelections`, and the pill's `isActive`
  // checks all keep working unchanged.
  //
  // Default `["recently_added"]` so the chip reads "Sort: Recently
  // Added" on first paint and cards are pre-sorted newest-first.
  const [sortKeys, setSortKeys] = useState<SortKey[]>(["recently_added"]);
  const toggleSortKey = (key: SortKey) => {
    // Always set — never clear. Clicking the already-active option
    // is a no-op (state stays the same, no re-render needed).
    setSortKeys((prev) => (prev[0] === key ? prev : [key]));
  };

  // Compact-bar dropdown state — the new UI shows two pill buttons
  // (Filter + Sort) below the search bar instead of the old expanded
  // panel with section headings. Each pill has its own open/close
  // state so they're independent.
  const [compactFilterOpen, setCompactFilterOpen] = useState(false);
  const [compactSortOpen, setCompactSortOpen] = useState(false);

  /** Apply the active sort to the talks array — produces a NEW array
   *  on every render (cheap, the talks list is small). The active
   *  sort is `sortKeys[0]` because the toggle above is single-select.
   *
   *    • "recently_added" → sort by publish date DESCENDING (newest
   *       first). Empty / unparseable dates sink to the bottom so
   *       they don't pretend to be the most recent.
   *    • "az" → sort titles A → Z using `localeCompare` so accented
   *       characters (é, ü, ñ) order naturally for the viewer's
   *       locale instead of by raw Unicode code points.
   *    • "za" → reverse of A → Z.
   *    • no active sort → return talks as-is (whatever order they
   *       came out of the upload sheet in).
   *
   *  `[...talks]` clones the array first so `sort()` (which mutates
   *  in place) doesn't mess with the original. Important because
   *  `talks` comes from `useCareerTalks` and is shared with other
   *  consumers — mutating it would cause hard-to-debug bugs. */
  const sortedTalks = (() => {
    const activeSort = sortKeys[0];
    if (!activeSort) return talks;
    const out = [...talks];
    switch (activeSort) {
      case "recently_added":
        out.sort((a, b) => {
          // Push missing dates to the bottom regardless of direction.
          if (!a.dateISO && !b.dateISO) return 0;
          if (!a.dateISO) return 1;
          if (!b.dateISO) return -1;
          // ISO YYYY-MM-DD strings sort correctly with plain string
          // comparison — no Date conversion needed. Descending so
          // the most recent date appears first.
          return b.dateISO.localeCompare(a.dateISO);
        });
        break;
      case "az":
        out.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "za":
        out.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    return out;
  })();

  // (Old `sortOpen` state + `sortMenuRef` removed — the standalone
  //  floating sort dropdown is gone. Sort and Filter controls now
  //  live inside a single combined panel below the search bar,
  //  whose visibility is driven by `filtersOpen` above.)

  // Filter chip state — mirrors the multi-select pattern /jobs and
  // /company use. `openFilterDropdown` tracks which chip's panel is
  // visible (only one open at a time, like jobs). The per-chip text
  // states drive live narrowing of the dropdown options as the
  // viewer types into the chip itself.
  const [openFilterDropdown, setOpenFilterDropdown] =
    useState<FilterChipKey | null>(null);
  const [selectedEmployers, setSelectedEmployers] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [employerFilterText, setEmployerFilterText] = useState("");
  const [industryFilterText, setIndustryFilterText] = useState("");

  // ── DRAFT (staged) state for the Filter modal ──
  // Per spec: changes the viewer makes inside the modal (checkbox
  // toggles, Clear All, search text) must NOT commit to the visible
  // filter chip until Apply is clicked. If they close the modal via
  // X / backdrop / Clear All without hitting Apply, the chip stays
  // showing whatever it was before they opened the modal.
  //
  // Implementation: a parallel "draft" copy of every filter field.
  //   • On modal OPEN  → sync draft ← committed (so the modal mirrors
  //     the current chip state).
  //   • Inside the modal → all UI reads + writes the DRAFT only.
  //   • On Apply       → commit draft → committed, close modal.
  //   • On X/backdrop  → just close; draft is discarded on next open.
  // The pattern is identical to GitHub Issues' "Apply filter" modal.
  const [draftEmployers, setDraftEmployers] = useState<string[]>([]);
  const [draftIndustries, setDraftIndustries] = useState<string[]>([]);
  const [draftEmployerText, setDraftEmployerText] = useState("");
  const [draftIndustryText, setDraftIndustryText] = useState("");

  const [modalDirty, setModalDirty] = useState(false);

  // Sync draft ← committed every time the modal opens. Effect fires
  // both on initial mount (no-op since modal is closed) and on each
  // open→close→open cycle (resetting any stale draft from a previous
  // session the viewer abandoned without hitting Apply).
  useEffect(() => {
    if (compactFilterOpen) {
      setDraftEmployers(selectedEmployers);
      setDraftIndustries(selectedIndustries);
      setDraftEmployerText(employerFilterText);
      setDraftIndustryText(industryFilterText);
      // Fresh open = no interactions yet → Apply muted (if draft empty).
      setModalDirty(false);
    }
  
  }, [compactFilterOpen]);

  // Draft equivalents — used INSIDE the filter modal so the viewer's
  // staged ticks don't leak into the live chip until Apply commits.
  // Both also flip `modalDirty` so the Apply button knows the viewer
  // has touched the modal.
  const toggleDraftEmployer = (name: string) => {
    setDraftEmployers((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
    setModalDirty(true);
  };
  const toggleDraftIndustry = (name: string) => {
    setDraftIndustries((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
    setModalDirty(true);
  };

  // Apply = commit the draft → real state, then close the modal.
  // This is the ONLY path that mutates `selectedEmployers` /
  // `selectedIndustries` / `*FilterText` from inside the modal.
  const applyModalChanges = () => {
    setSelectedEmployers(draftEmployers);
    setSelectedIndustries(draftIndustries);
    setEmployerFilterText(draftEmployerText);
    setIndustryFilterText(draftIndustryText);
    setCompactFilterOpen(false);
  };

  // Draft-text versions — feed the modal's search inputs so typing
  // narrows the list live without committing the search text to the
  // real `*FilterText` state until Apply.
  const filteredDraftEmployers = EMPLOYER_OPTIONS.filter((name) =>
    name.toLowerCase().includes(draftEmployerText.trim().toLowerCase())
  );
  const filteredDraftIndustries = INDUSTRY_OPTIONS.filter((name) =>
    name.toLowerCase().includes(draftIndustryText.trim().toLowerCase())
  );

  // ── Clear All — wipes every selection that the viewer has made
  // across the filter chips AND the sort dropdown in one click.
  // Mirrors the /jobs `clearAll` pattern exactly. */
  // Sort defaults to `["recently_added"]`, so `sortKeys.length > 0`
  // is ALWAYS true — using it directly made the "Clear All" button
  // visible on first paint even when the viewer hadn't touched
  // anything. Count sort as "active" only when it's been changed
  // AWAY from the default. Now Clear All stays hidden until the
  // viewer actually picks a non-default sort, ticks an Employer /
  // Industry checkbox, or types into one of the section searches.
  const hasActiveSelections =
    selectedEmployers.length > 0 ||
    selectedIndustries.length > 0 ||
    (sortKeys.length > 0 && sortKeys[0] !== "recently_added") ||
    employerFilterText.length > 0 ||
    industryFilterText.length > 0;

  const clearAll = () => {
    setSelectedEmployers([]);
    setSelectedIndustries([]);
    setEmployerFilterText("");
    setIndustryFilterText("");
    // Reset sort to the DEFAULT (Recently Added) — NOT empty —
    // so the Sort chip always reads "Sort: Recently Added"
    // instead of collapsing to just "Sort" after Clear All.
    setSortKeys(["recently_added"]);
    /* Also collapse the per-chip dropdown (Employers / Industry
       panel) AND the whole filter section itself. Per user spec,
       hitting "Clear All" should reset the viewer back to the
       fresh, pristine state — every checkbox cleared AND the
       chip row + any open dropdown panels closed automatically,
       so the next click on the sliders icon opens a clean
       filter UI rather than the previous open state. */
    setOpenFilterDropdown(null);
    setFiltersOpen(false);
    // Also close the new compact Filter / Sort pill dropdowns —
    // Clear All should leave the whole UI in a fresh state.
    setCompactFilterOpen(false);
    setCompactSortOpen(false);
  };

  // Mirror the home page's "deleted image" suppression so the
  // mini-profile avatar renders consistently after the user removes
  // their photo on the profile page.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  // Re-hydrate the viewer's profile on mount. `useAuth()` starts with
  // `user: null` after every hard refresh (state isn't persisted across
  // reloads — only the HttpOnly cookie is), so without this fetch the
  // page would see `!user` and bounce the viewer away. We hit the same
  // `/api/mobile/profile` endpoint that /jobs and /home use; the
  // backend reads the auth cookie and returns the AuthUser, which we
  // push back into AuthContext via `setUser`. If the fetch fails
  // (e.g. genuinely logged-out), `user` stays null and the early
  // `return null` below keeps the page blank rather than crashing.
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
        // Silent fail — UI falls through to the `!user` blank below.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // (Old `sortOpen` outside-click effect removed — the floating
  //  sort dropdown is gone; sort lives inside the combined panel
  //  driven by `filtersOpen` which has its own toggle button.)

  // Close the currently-open filter dropdown when the viewer clicks
  // anywhere that is NOT inside a `[data-filter-menu]` element. Same
  // pattern as /jobs so the two pages stay behaviourally consistent.
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

  // Close the compact Filter / Sort dropdown when the viewer clicks
  // anywhere outside a `[data-compact-menu]` wrapper. Mirrors the
  // pattern above; runs only when at least one of them is open so
  // we're not adding a global listener for nothing.
  //
  // BUG FIX — uses `e.composedPath()` (the original DOM path at the
  // moment the event was dispatched), NOT `e.target.closest(...)`.
  // Why: clicking the modal's "Clear All" button mutates draft state
  // → the button's surrounding conditional flips to `<span/>` → React
  // unmounts the button SYNCHRONOUSLY before this document handler
  // runs. `closest()` on a detached element returns null, which
  // wrongly looked like "click was outside the menu" and closed the
  // modal. `composedPath()` is captured at dispatch time, so the
  // detached button + the still-mounted `[data-compact-menu]` wrapper
  // are both in the path and the check correctly says "inside menu".
  useEffect(() => {
    if (!compactFilterOpen && !compactSortOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      const path = e.composedPath();
      const insideMenu = path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.matches?.("[data-compact-menu]")
      );
      if (!insideMenu) {
        setCompactFilterOpen(false);
        setCompactSortOpen(false);
      }
    };
    const t = window.setTimeout(() => {
      document.addEventListener("click", handleDocClick);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", handleDocClick);
    };
  }, [compactFilterOpen, compactSortOpen]);

  // (Duplicate `fetchProfile` useEffect removed — the rehydration
  // effect above is the single source of truth for profile fetching.
  // Previously two identical effects existed which both fired on
  // mount and could race. Also removed the `if (!user) return null`
  // blank-screen guard so the page now renders skeletons (defined
  // below in the JSX, gated on `profile === null`) during the fetch
  // instead of an empty page.)

  // Derive mini-profile display values from the profile loaded into
  // AuthContext — same pattern as /jobs, /company, /events.
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

  // Static stats rows for the second left box. Counts are placeholders
  // until the career-talks API ships — clicking switches the right
  // panel view mode just like /jobs.
  const statsRows: Array<{ key: ViewMode; label: string; count: number }> = [
    // "Career Talks" reflects the live count of the talks array
    // (rendered as `Career Talks (N)` via the format in the JSX
    // below — `${label} (${count})`). Saved + Watched stay at 0 —
    // those views will get their own data sources when the API ships.
    { key: "all", label: "Career Talks", count: talks.length },
    { key: "saved", label: "Saved Talks", count: 0 },
    { key: "watched", label: "Watched", count: 0 },
  ];

  return (
    <div
      className={`${chromeStyles.page} ${styles.talksPage}`}
      data-theme={theme}
    >
      <Navbar />
      <main className={`${chromeStyles.content} ${styles.talksContent}`}>
        <aside
          className={chromeStyles.leftCol}
          aria-label="Profile and career talks navigation"
        >
          {profile === null ? (
            <MiniProfileSkeleton />
          ) : (
            <section
              className={chromeStyles.miniProfile}
              aria-label="Your profile"
            >
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

          {/* Stats rows — "All Talks" / "Saved Talks" / "Watched".
              Active row gets the cyan highlight; clicking switches the
              right-panel view mode. Counts will become live once the
              career-talks API is wired in. */}
          <section className={styles.statsBox} aria-label="Talk categories">
            {statsRows.map((row) => {
              const isActive = viewMode === row.key;
              return (
                <p
                  key={row.key}
                  className={`${styles.statsRow} ${styles.statsClickable} ${
                    isActive ? styles.statsActive : ""
                  }`}
                  onClick={() => setViewMode(row.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewMode(row.key);
                    }
                  }}
                >
                  {row.label} ({row.count})
                </p>
              );
            })}
          </section>
        </aside>

        <section
          className={styles.rightOuter}
          aria-label="Career talks listings"
        >
          <div className={styles.rightHeader}>
            <h1 className={styles.rightTitle}>All Career Talks</h1>
            <div className={styles.searchClearWrap}>
              <div className={styles.searchWrap}>
                <div className={chromeStyles.searchBar}>
                  <span
                    className={chromeStyles.searchIconWrap}
                    aria-hidden="true"
                  >
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={chromeStyles.searchInput}
                    placeholder="Search"
                    aria-label="Search career talks"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText ? (
                    <button
                      type="button"
                      className={chromeStyles.searchClear}
                      aria-label="Clear search"
                      onClick={() => setSearchText("")}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  {/* Sort icon — sole control in the search pill now
                      (the old filter-sliders glyph was removed per the
                      new combined-panel spec). Clicking this toggles
                      the unified Sort+Filter panel below the search
                      bar (controlled by `filtersOpen` state — kept
                      the existing name so the existing grid-row open/
                      close animation just keeps working). */}
                  <button
                    type="button"
                    className={styles.searchSliders}
                    aria-label={filtersOpen ? "Hide sort & filter panel" : "Show sort & filter panel"}
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    <SortIcon />
                  </button>
                </div>
              </div>
              {/* Top-right Clear All — wipes ALL selections (filters
                  + sort) AND closes every dropdown in one click.
                  Visibility rules:
                    • Hidden when no active selections.
                    • Hidden when the FILTER MODAL is open — the modal
                      has its own Clear All inside the footer that
                      follows the staged-changes flow (clears DRAFT,
                      modal stays open, commit only on Apply). Showing
                      BOTH at once let the viewer accidentally click
                      this one and have the modal close + everything
                      wipe in a single click, which is the wrong flow.
                    • Otherwise shown whenever any non-modal dropdown
                      is open (`filtersOpen` for the search-bar panel
                      OR `compactSortOpen` for the Sort chip dropdown)
                      so the viewer can wipe sort + filter together. */}
              {hasActiveSelections &&
              !compactFilterOpen &&
              (filtersOpen || compactSortOpen) ? (
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

          {/* Filter chips — hidden by default, revealed only after
              the viewer clicks the slider icon in the search pill.
              The OUTER `.filtersOuter` wrapper handles the smooth
              open/close height animation using the CSS Grid
              `grid-template-rows: 0fr ↔ 1fr` trick (see careerTalks
              .module.css for details) — this animates the actual
              content height rather than a guessed `max-height`,
              giving a perfectly proportional motion in both
              directions with no jolts on close.
              The INNER `.filters` div keeps the original flex-wrap
              chip row layout untouched, plus the `overflow: hidden`
              that clips during animation and flips to `visible`
              once open so the chip dropdowns can still pop below
              their chips. `aria-hidden` mirrors the open state
              for screen readers.
              Each chip mirrors /jobs exactly: the chip is itself
              the text input (placeholder shows "Employers" or
              "Employers (N)" depending on selection), with a clear
              X when text or a value is present and a chevron
              toggle on the right edge. Click on the chip OR
              chevron opens its dropdown. */}
          <div
            className={`${styles.filtersOuter}${
              filtersOpen ? ` ${styles.filtersOuterOpen}` : ""
            }`}
            aria-hidden={!filtersOpen}
          >
            <div className={styles.panelInner}>
              {/* ── Compact bar — two pill buttons ──
                  Replaces the old Sort By + Filter By section panel.
                  Each pill is a self-contained dropdown:
                    • "Filter" → opens a dropdown holding the existing
                      Employers + Industry multi-select chips.
                    • "Sort: X" → opens a dropdown listing the 3 sort
                      options; the pill's label shows the current
                      active sort (or just "Sort" when none active).
                  Underlying state (sortKeys, openFilterDropdown,
                  selectedEmployers/Industries, etc.) is unchanged —
                  only the visual wrapping changed. */}
              <div className={styles.compactBar}>
                {/* ── Filter pill ── */}
                <div className={styles.compactWrap} data-compact-menu>
                  <button
                    type="button"
                    className={`${styles.compactBtn}${
                      compactFilterOpen ||
                      selectedEmployers.length > 0 ||
                      selectedIndustries.length > 0
                        ? ` ${styles.compactBtnActive}`
                        : ""
                    }`}
                    onClick={() => {
                      setCompactFilterOpen((v) => !v);
                      setCompactSortOpen(false);
                    }}
                    aria-expanded={compactFilterOpen}
                  >
                    <FiltersSlidersIcon />
                    <span>Filter</span>
                    {/* Active-FILTER-CATEGORY badge — counts how many
                        sub-categories (Industry / Employer) currently
                        have at least one selection, NOT how many
                        individual options are picked. So picking 5
                        employers + 0 industries = "1"; picking 2
                        employers + 3 industries = "2". Maximum value
                        is 2 (the number of categories). Hidden when
                        neither category has any selection. */}
                    {(() => {
                      const categoryCount =
                        (selectedEmployers.length > 0 ? 1 : 0) +
                        (selectedIndustries.length > 0 ? 1 : 0);
                      if (categoryCount === 0) return null;
                      return (
                        <span className={styles.compactBtnCountBadge}>
                          {categoryCount}
                        </span>
                      );
                    })()}
                  </button>
                  {/* Filter modal — full-screen overlay with a
                      centred card. Replaces the old inline chip-style
                      dropdown. Each filter category (Industry,
                      Employer) is a section with a search input + a
                      scrollable checkbox list. Backdrop click and the
                      X button both close. Selections happen live
                      (the checkboxes write straight to existing
                      state); "Apply" just closes the modal. */}
                  {compactFilterOpen ? (
                    <div
                      className={styles.filterModalBackdrop}
                      onClick={() => setCompactFilterOpen(false)}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Filter career talks"
                    >
                      <div
                        className={styles.filterModal}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className={styles.filterModalHeader}>
                          <h2 className={styles.filterModalTitle}>Filter</h2>
                          <button
                            type="button"
                            className={styles.filterModalClose}
                            onClick={() => setCompactFilterOpen(false)}
                            aria-label="Close filter modal"
                          >
                            <CrossSmallIcon />
                          </button>
                        </div>

                        {/* Body — Industry + Employer sections */}
                        <div className={styles.filterModalBody}>
                          {/* Industry section — reads + writes DRAFT
                              state so staged changes only commit on
                              Apply. */}
                          <div className={styles.filterModalSection}>
                            <div className={styles.filterModalSectionHeader}>
                              <h3 className={styles.filterModalSectionTitle}>
                                Industry
                              </h3>
                              {draftIndustries.length > 0 ? (
                                <span className={styles.filterModalCountBadge}>
                                  {draftIndustries.length}
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.filterModalSearchWrap}>
                              <span
                                className={styles.filterModalSearchIcon}
                                aria-hidden="true"
                              >
                                <SearchIcon />
                              </span>
                              <input
                                type="text"
                                className={styles.filterModalSearch}
                                placeholder="Search industry..."
                                value={draftIndustryText}
                                onChange={(e) => {
                                  setDraftIndustryText(e.target.value);
                                  setModalDirty(true);
                                }}
                                aria-label="Search industries"
                              />
                            </div>
                            <div
                              className={styles.filterModalOptionsList}
                              role="listbox"
                            >
                              {filteredDraftIndustries.length === 0 ? (
                                <p className={styles.filterModalEmpty}>
                                  No options
                                </p>
                              ) : (
                                filteredDraftIndustries.map((name) => {
                                  const checked =
                                    draftIndustries.includes(name);
                                  return (
                                    <label
                                      key={name}
                                      className={`${styles.filterModalOption}${
                                        checked
                                          ? ` ${styles.filterModalOptionChecked}`
                                          : ""
                                      }`}
                                    >
                                      <span
                                        className={`${styles.filterModalCheckbox} ${
                                          checked
                                            ? styles.filterModalCheckboxChecked
                                            : ""
                                        }`}
                                        aria-hidden="true"
                                      />
                                      <input
                                        type="checkbox"
                                        className={styles.filterModalCheckboxInput}
                                        checked={checked}
                                        onChange={() => toggleDraftIndustry(name)}
                                      />
                                      <span>{name}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Employer section — DRAFT state (same
                              staged-commit pattern as Industry above). */}
                          <div className={styles.filterModalSection}>
                            <div className={styles.filterModalSectionHeader}>
                              <h3 className={styles.filterModalSectionTitle}>
                                Employer
                              </h3>
                              {draftEmployers.length > 0 ? (
                                <span className={styles.filterModalCountBadge}>
                                  {draftEmployers.length}
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.filterModalSearchWrap}>
                              <span
                                className={styles.filterModalSearchIcon}
                                aria-hidden="true"
                              >
                                <SearchIcon />
                              </span>
                              <input
                                type="text"
                                className={styles.filterModalSearch}
                                placeholder="Search employer..."
                                value={draftEmployerText}
                                onChange={(e) => {
                                  setDraftEmployerText(e.target.value);
                                  setModalDirty(true);
                                }}
                                aria-label="Search employers"
                              />
                            </div>
                            <div
                              className={styles.filterModalOptionsList}
                              role="listbox"
                            >
                              {filteredDraftEmployers.length === 0 ? (
                                <p className={styles.filterModalEmpty}>
                                  No options
                                </p>
                              ) : (
                                filteredDraftEmployers.map((name) => {
                                  const checked =
                                    draftEmployers.includes(name);
                                  return (
                                    <label
                                      key={name}
                                      className={`${styles.filterModalOption}${
                                        checked
                                          ? ` ${styles.filterModalOptionChecked}`
                                          : ""
                                      }`}
                                    >
                                      <span
                                        className={`${styles.filterModalCheckbox} ${
                                          checked
                                            ? styles.filterModalCheckboxChecked
                                            : ""
                                        }`}
                                        aria-hidden="true"
                                      />
                                      <input
                                        type="checkbox"
                                        className={styles.filterModalCheckboxInput}
                                        checked={checked}
                                        onChange={() => toggleDraftEmployer(name)}
                                      />
                                      <span>{name}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer — Clear All (clears only the filter
                            selections, not the sort) + Apply (closes
                            the modal). */}
                        <div className={styles.filterModalFooter}>
                          {/* Clear All — only rendered when the viewer
                              has actually ticked at least one checkbox
                              OR typed into one of the section searches.
                              Per spec: when the modal FIRST OPENS with
                              no selections, the Clear All link is hidden
                              entirely. As soon as the viewer ticks any
                              option (or types in either search), Clear
                              All appears so they can wipe it in one
                              click. The Apply button stays in its
                              fixed right-side slot the whole time. */}
                          {draftEmployers.length > 0 ||
                          draftIndustries.length > 0 ||
                          draftEmployerText.length > 0 ||
                          draftIndustryText.length > 0 ? (
                            <button
                              type="button"
                              className={styles.filterModalClearAll}
                              /* Clears DRAFT state only (checkboxes
                                 unticked inside the modal, search text
                                 cleared). Modal stays open. Chip badge
                                 OUTSIDE is unchanged — those committed
                                 selections only clear when the viewer
                                 then clicks Apply. */
                              onClick={() => {
                                setDraftEmployers([]);
                                setDraftIndustries([]);
                                setDraftEmployerText("");
                                setDraftIndustryText("");
                                // Mark dirty so the Apply button stays
                                // BLUE after clearing — the viewer has
                                // expressed a change they may want to
                                // commit (the cleared state).
                                setModalDirty(true);
                              }}
                            >
                              Clear All
                            </button>
                          ) : (
                            // Empty span so `space-between` still pushes
                            // Apply to the right edge of the footer even
                            // when Clear All is hidden.
                            <span />
                          )}
                          <button
                            type="button"
                            /* Always clickable so the viewer can close
                               + commit the cleared state after hitting
                               Clear All. Visual `Muted` class is added
                               when the draft is empty so the button
                               reads as not-yet-ready until at least
                               one option is ticked — matches the
                               "no blue bg until any option selected"
                               spec without removing the click ability. */
                            /* Muted on EVERY fresh open until the
                               viewer interacts with something inside
                               the modal — even when the modal opens
                               with existing committed selections.
                               The moment they tick a box, type in a
                               search, or hit Clear All, `modalDirty`
                               flips and the button turns blue. This
                               makes Apply read as a "commit changes"
                               action rather than a "you have filters"
                               indicator: there's nothing to commit
                               until the viewer changes something. */
                            className={`${styles.filterModalApply}${
                              !modalDirty
                                ? ` ${styles.filterModalApplyMuted}`
                                : ""
                            }`}
                            onClick={applyModalChanges}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ── Sort pill ── */}
                <div className={styles.compactWrap} data-compact-menu>
                  <button
                    type="button"
                    /* Sort pill uses ONLY `.compactSortBtn` — its own
                       standalone CSS rule, fully independent of
                       `.compactBtn` (which Filter uses). Editing
                       Filter's CSS will never affect this pill, and
                       vice versa. */
                    className={`${styles.compactSortBtn}${
                      compactSortOpen || sortKeys.length > 0
                        ? ` ${styles.compactSortBtnActive}`
                        : ""
                    }`}
                    onClick={() => {
                      setCompactSortOpen((v) => !v);
                      setCompactFilterOpen(false);
                    }}
                    aria-expanded={compactSortOpen}
                  >
                    {/* The CHIP uses `SortChipIcon` (the muted-gray
                        Lucide arrow-up-down). The SEARCH BAR sort
                        toggle keeps using `SortIcon` (the bigger
                        Font-Awesome 4-bars glyph). Two separate
                        components so they never collide. */}
                    <SortChipIcon />
                    <span>
                      Sort
                      {sortKeys[0]
                        ? `: ${
                            SORT_OPTIONS.find((o) => o.key === sortKeys[0])
                              ?.label ?? ""
                          }`
                        : ""}
                    </span>
                    {/* Lucide chevron-down — exact spec provided. The
                        `.compactChevron` / `.compactChevronOpen` CSS
                        classes still drive the 180° rotation on open
                        (the inline style fallback in the user's spec
                        was just the resting state). */}
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
                        compactSortOpen ? ` ${styles.compactChevronOpen}` : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {/* ALWAYS rendered so CSS can transition opacity +
                      transform on both open AND close. The
                      `.compactDropdownOpen` modifier flips the panel
                      between hidden (default) and visible states; the
                      transition timing on `.compactDropdown` handles
                      the smooth fade-out when the modifier is removed. */}
                  <div
                    className={`${styles.compactDropdown}${
                      compactSortOpen ? ` ${styles.compactDropdownOpen}` : ""
                    }`}
                    role="menu"
                    aria-hidden={!compactSortOpen}
                  >
                      {/* Group sort options by `group` field so the
                          dropdown renders RELEVANCE + TITLE section
                          labels above their respective rows, matching
                          the live YP SS pixel-for-pixel. The active
                          row gets a right-aligned cyan checkmark. */}
                      {(["relevance", "title"] as const).map((group) => {
                        const groupOptions = SORT_OPTIONS.filter(
                          (o) => o.group === group
                        );
                        if (groupOptions.length === 0) return null;
                        return (
                          <div key={group} role="group">
                            <div className={styles.compactSortGroupLabel}>
                              {group === "relevance" ? "RELEVANCE" : "TITLE"}
                            </div>
                            {groupOptions.map((opt) => {
                              const isActive = sortKeys.includes(opt.key);
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={isActive}
                                  className={`${styles.compactSortItem}${
                                    isActive ? ` ${styles.compactSortItemActive}` : ""
                                  }`}
                                  onClick={() => {
                                    toggleSortKey(opt.key);
                                    setCompactSortOpen(false);
                                  }}
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

          {/* Career-talk cards — 3×3 static grid placed below the
              search/filter bar. Each card holds a thumbnail with a
              centered play-button overlay, the talk title (clamped
              to 2 lines), and the date with a small calendar icon.
              Visuals (dark-glass surface, border, hover cyan tint)
              are ported from the listing cards on /jobs and /events
              so the four pages stay visually consistent. The image
              is rendered as a static gradient block until the talks
              API ships real thumbnail URLs — swap the gradient div
              for an <img> at that point and the rest of the card
              keeps working unchanged. */}
          <div className={styles.talksGridWrap}>
            <div className={styles.talksGrid}>
              {/* Loading state: while the profile fetch is in flight
                  (`profile === null`), render a 3×3 grid of skeleton
                  cards that mirrors the real card layout (image +
                  title + date) exactly so the page reads as one
                  cohesive loading state and there's no layout shift
                  when the real data lands. The skeletons follow the
                  current theme automatically via the same `.skeleton`
                  shimmer classes used by /events, /jobs, /company. */}
              {/* Render order:
                    1. Auth profile still loading OR data hook still
                       loading → 6 skeleton cards (so the grid has
                       a sensible default footprint while either
                       async source completes).
                    2. Both loaded but the data array is empty (no
                       upload yet) → centred "No career talks yet"
                       empty state (per spec — no instructions text).
                    3. Both loaded + data present → real cards. */}
              {profile === null || talksLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <CareerTalkCardSkeleton key={`skel-${i}`} />
                ))
              ) : talks.length === 0 ? (
                <div className={styles.talksEmptyState}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/icons/nav/career-talks-outline.svg"
                    alt=""
                    width={32}
                    height={32}
                    className={styles.talksEmptyIcon}
                  />
                  <span>No career talks yet</span>
                </div>
              ) : (
                // `sortedTalks` reflects whatever the user picked in
                // the Sort By panel (Recently Added / A-Z / Z-A). If
                // no sort is active it's identical to `talks`. We
                // keep `talks.length === 0` for the empty-state check
                // above since length is the same either way.
                sortedTalks.map((talk) => (
                  <article
                    key={talk.id}
                    className={styles.talkCard}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/career-talks/${encodeURIComponent(talk.id)}`
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(
                          `/career-talks/${encodeURIComponent(talk.id)}`
                        );
                      }
                    }}
                  >
                    <div className={styles.talkImage}>
                      {/* Real photo when `imageUrl` is present,
                          neutral dark gradient fallback otherwise.
                          The gradient is fixed (not per-card like
                          the old hardcoded data) — every uploaded
                          row that has no image just uses the same
                          neutral block, which keeps the grid visually
                          calm. */}
                      <div
                        className={styles.talkImageInner}
                        style={
                          talk.imageUrl
                            ? { backgroundImage: `url(${talk.imageUrl})` }
                            : {
                                background:
                                  "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)",
                              }
                        }
                      />
                      {/* No-image fallback — mirrors the details-page
                          banner pattern: when the talk has no image, the
                          dark gradient hosts the talk title centred so
                          the card never reads as an empty rectangle.
                          Rendered behind the play button (z-index 1 vs
                          the button's z-index 2) so the play affordance
                          still sits on top and stays tappable. */}
                      {!talk.imageUrl && (
                        <span className={styles.talkImageFallbackTitle}>
                          {talk.title}
                        </span>
                      )}
                      <span className={styles.talkPlayBtn} aria-hidden="true">
                        <i className="fas fa-play video-icon" />
                      </span>
                    </div>
                    <div className={styles.talkContent}>
                      <h3 className={styles.talkTitle}>{talk.title}</h3>
                      <span className={styles.talkDate}>
                        <CalendarIcon />
                        {/* Wrapping the date STRING in its own span so
                            the truncation rules on `.talkDateText`
                            below (white-space + overflow + ellipsis)
                            have an element to attach to. The bare
                            text node inside the flex container can't
                            carry these rules on its own. */}
                        <span className={styles.talkDateText}>{talk.date}</span>
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
