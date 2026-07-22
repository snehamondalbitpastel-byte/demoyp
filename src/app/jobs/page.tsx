"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Compose home-page styles for the page chrome, grid, mini-profile card,
// recommended-jobs card and the search-bar pill so this page never visually
// drifts from the home feed. Jobs-specific styles (stats box + right
// column wrapper + filters + listings) live in `jobs.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./jobs.module.css";

/** Extra profile fields returned by /api/mobile/profile beyond AuthUser
 *  — same subset the home page consumes for the mini-profile card. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

/** Raw recommended-jobs API row — backend returns `result: ApiRecommendedJob[]`. */
type ApiRecommendedJob = {
  id: string;
  title?: string;
  company_name?: string;
  location?: string[];
  company_logo_url?: string | null;
  job_link?: string | null;
};

/** Mapped UI shape for a recommended job (left-column compact card). */
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  companyLogoUrl: string | null;
  jobLink: string | null;
};

/** Backend filter-options payload (response of GET /api/mobile/user/search-filters). */
type FilterOptionsApi = {
  data?: {
    company?: Array<{ id: string; name: string }>;
    employment_type?: Array<{ name: string; label: string }>;
    job_location?: string[];
  };
};

/** Mapped UI shape for filter dropdown options. */
type FilterOptions = {
  companies: Array<{ id: string; name: string }>;
  employmentTypes: Array<{ name: string; label: string }>;
  locations: string[];
};

/** Raw API job from POST /api/mobile/jobs. Shape mirrors the
 *  documented response — only the fields the listing card actually
 *  renders are typed; the rest are ignored. */
type ApiJob = {
  id: string;
  title?: string;
  company_name?: string;
  company_logo_url?: string | null;
  location?: string[] | null;
  created_at?: string;
  /** External URL on the hiring company's own careers site — Apply
   *  opens this in a new tab so the actual application happens on the
   *  company's website, not inside YP. */
  job_link?: string | null;
  /** Employment-type metadata used to drive the right-panel chip
   *  filter on the saved / applied / recommended tabs (the All tab
   *  filters server-side via the request body). The upstream ships
   *  this in several inconsistent shapes across the four endpoints —
   *  string, array of strings, array of `{name,label}` — so we accept
   *  the union and normalize it inside `mapApiJobToListing`. */
  employment_type?:
    | string
    | string[]
    | Array<{ name?: string | null; label?: string | null }>
    | null;
};

/** Mapped right-column listing card. */
type Listing = {
  id: string;
  title: string;
  company: string;
  locations: string[];
  postedAgo: string;
  logoUrl: string;
  jobLink: string | null;
  /** Normalized employment-type labels (e.g. "Full-time",
   *  "Part-time"). Drives the client-side Employment Type chip
   *  filter under the saved / applied / recommended tabs — those
   *  endpoints don't accept the `employment_type` query param so
   *  the chip filter has to read from the listing payload itself. */
  employmentTypes: string[];
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

function mapApiRecommendedJob(item: ApiRecommendedJob): Job {
  const company = item.company_name?.trim() ?? "";
  const locationList = Array.isArray(item.location) ? item.location : [];
  return {
    id: item.id,
    title: item.title?.trim() ?? "",
    company,
    location: locationList.filter(Boolean).join(", "),
    companyLogoUrl: item.company_logo_url ?? null,
    jobLink:
      typeof item.job_link === "string" && item.job_link ? item.job_link : null,
  };
}

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
      style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
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

/** Briefcase glyph used for the right-panel empty state ("No jobs
 *  found matching"). Outline-only so it picks up the parent text
 *  colour like the rest of the SVGs on this page. */
function JobsEmptyIcon() {
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
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M2.5 12h19" />
    </svg>
  );
}

/** Tiny X glyph for the per-filter "clear this category" button that
 *  appears inside a filter chip after the viewer has picked a value,
 *  and for the inline X next to a category dropdown's search input. */
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

/** Right-panel view modes — each row in the left stats box selects
 *  one. "all" honours the search + filter chips and posts to
 *  /api/mobile/jobs. The other three are filter-free per-list views:
 *    - "saved"        → /api/mobile/user/saved-jobs
 *    - "applied"      → /api/mobile/user/applied-jobs-list
 *    - "recommended"  → /api/mobile/user/recommended-jobs
 *  The header text and the highlighted stat row both follow this. */
type ViewMode = "all" | "saved" | "applied" | "recommended";

// Default fallback logo when a job has no `company_logo_url` (the
// production YP default-job SVG, hosted on the live site).
const DEFAULT_JOB_IMG =
  "https://youngprofessionals.global/_next/static/media/DefaultJobImage.f982d9f9.svg";

/** Compact relative-time string for "Posted N days ago" — abbreviated
 *  form to match the live YP listing card. */
function formatPostedAgo(iso: string | undefined): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const min = Math.floor(diffSec / 60);
  if (min < 60) return "Posted just now";
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Posted ${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 0) return "Posted today";
  if (day === 1) return "Posted 1 day ago";
  if (day < 30) return `Posted ${day} days ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `Posted ${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(mo / 12);
  return `Posted ${yr}y ago`;
}

/** Normalize `ApiJob.employment_type` into a flat list of labels
 *  the chip filter compares against. The backend has been observed
 *  shipping this in several shapes across the four jobs endpoints
 *  (`/jobs`, `/saved-jobs`, `/applied-jobs-list`, `/recommended-jobs`):
 *    - omitted / null
 *    - "Full-time"
 *    - ["Full-time", "Part-time"]
 *    - [{ name: "full_time", label: "Full-time" }]
 *  We read whatever's available, prefer the human-readable `label`
 *  when an object form is present, and fall back to `name`. Empty /
 *  whitespace strings are dropped. The dedupe is intentional — some
 *  endpoints accidentally double up. */
function extractEmploymentTypes(raw: ApiJob["employment_type"]): string[] {
  if (raw == null) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (v: string | null | undefined) => {
    const s = (v ?? "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  if (typeof raw === "string") {
    push(raw);
    return out;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        push(item);
      } else if (item && typeof item === "object") {
        push(item.label ?? item.name ?? "");
      }
    }
  }
  return out;
}

function mapApiJobToListing(j: ApiJob): Listing {
  return {
    id: j.id,
    title: (j.title ?? "").trim(),
    company: (j.company_name ?? "").trim(),
    locations: Array.isArray(j.location)
      ? j.location.filter((l): l is string => typeof l === "string")
      : [],
    postedAgo: formatPostedAgo(j.created_at),
    jobLink: typeof j.job_link === "string" && j.job_link ? j.job_link : null,
    logoUrl: j.company_logo_url || DEFAULT_JOB_IMG,
    employmentTypes: extractEmploymentTypes(j.employment_type),
  };
}

// ── Skeleton placeholders, mirroring home's mini-profile + job card. ────

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

function JobSkeleton() {
  return (
    <article className={homeStyles.jobItem} aria-hidden="true">
      <div className={homeStyles.jobHead}>
        <div className={`${homeStyles.jobLogo} ${homeStyles.skeleton}`} />
        <div className={homeStyles.jobInfo}>
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
      </div>
      <div className={homeStyles.jobActions}>
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
      </div>
    </article>
  );
}

/** Skeleton placeholder for the right-column listing card. Mirrors
 *  the real `.listingCard` grid (logo | info | actions) so the swap
 *  to live data doesn't shift any layout. Reuses the home module's
 *  shimmer pieces (`.skeleton`, `.skelLine`, `.skelName`, etc.) so
 *  the animation matches the recommended-jobs left-column skeletons. */
function ListingSkeleton() {
  return (
    <article
      className={`${styles.listingCard} ${styles.listingCardSkeleton}`}
      aria-hidden="true"
    >
      <div className={`${styles.listingLogo} ${homeStyles.skeleton}`} />
      <div className={styles.listingInfo}>
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
      <div className={styles.listingActions}>
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
      </div>
    </article>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);

  /** Navigate to the job-details route for a given job id. Encoded so
   *  ids that contain `=` / `+` / `/` (the API returns base64-style
   *  identifiers) survive the URL round-trip cleanly. */
  const openJobDetails = (jobId: string) => {
    router.push(`/jobs/${encodeURIComponent(jobId)}`);
  };
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  // Debounced version of `searchText` — only updates after the viewer
  // pauses typing for 400ms, AND only when the trimmed length is 0
  // (cleared) or ≥ 2 characters (matches the home-page search rule).
  // The jobs API fetch keys off this value, not the live input.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jobsExpanded, setJobsExpanded] = useState(true);
  // Filter dropdown row visibility — hidden by default, toggled open
  // by the slider button on the right edge of the search pill.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter options fetched from /api/mobile/user/search-filters.
  // Null while loading; populated after the GET resolves.
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  // Currently-selected filter values — MULTI-select per category.
  // Each chip holds an array of chosen values; the API request body
  // sends them as a comma-separated string (matches how /events
  // already accepts comma-list payloads via `company_ids`). Empty
  // arrays mean "no filter applied" for that chip.
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCompanyNames, setSelectedCompanyNames] = useState<string[]>(
    []
  );
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<
    string[]
  >([]);
  // Per-category search-within-dropdown text. Each dropdown has its
  // own searchable input at the top so a viewer can type "germ" and
  // instantly narrow a long list of cities/companies/types.
  const [locationFilterText, setLocationFilterText] = useState("");
  const [companyFilterText, setCompanyFilterText] = useState("");
  const [employmentFilterText, setEmploymentFilterText] = useState("");
  // Which filter dropdown is open right now — at most one at a time.
  // `null` = all closed. Click the same trigger again to close.
  const [openFilterDropdown, setOpenFilterDropdown] = useState<
    "location" | "company" | "employment" | null
  >(null);

  // Right-column listings fetched from /api/mobile/jobs. `null` =
  // initial loading; `[]` = loaded but empty (or fetch failed).
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);

  // Which view the right panel is showing. "all" = everything (default,
  // honours the search + filter chips); "saved" = only the viewer's
  // saved jobs (filters and search are ignored in this mode to match
  // the live website's UX).
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // Set of job ids the viewer has saved. Used to (a) render Save Job
  // vs Remove on each listing card, and (b) drive the "Saved Jobs (N)"
  // counter in the left stats box. Seeded on mount via the saved-jobs
  // API and kept in sync with optimistic save / remove actions.
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  // Set of job ids the viewer has applied to. Apply is one-way: an id
  // can be added (after a successful POST /applied-jobs) but never
  // removed by the viewer. Drives both the "Apply / Applied" pill on
  // each card and the "Applied Jobs (N)" counter in the stats box.
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Tracks which save-job network call is in flight, if any — used to
  // disable repeated clicks on the same card while the request resolves.
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  // Same idea for in-flight apply-job calls.
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // Total recommended-jobs count returned by the recommended-jobs API.
  // Falls back to 0 until the first fetch resolves — so during page
  // load OR if the API errors out, the stat row reads
  // "Recommended (0)" instead of a misleading static "9". Used only
  // for the stats-row label.
  const [recommendedTotal, setRecommendedTotal] = useState<number>(0);

  // Total all-jobs count returned by /api/mobile/jobs in `total_count`.
  // Updated ONLY when the listings fetch resolves under viewMode="all"
  // — searching/filtering in saved / applied / recommended views never
  // touches this number, so the "All Jobs (N)" stat row never bleeds
  // numbers across tabs. When a search IS active in all-view, the API
  // returns the filtered total (which is what we want — the count
  // tracks the visible result set in real time).
  const [allJobsTotal, setAllJobsTotal] = useState<number>(0);

  // Job id pending removal — non-null means the confirm dialog is open
  // ("Are you sure you want to remove this job from your saved list?").
  // Mirrors the home-feed "Remove Repost" dialog pattern exactly.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Mirror the home page's "deleted image" suppression so the mini-profile
  // avatar renders consistently after the user removes their photo.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  // Fetch the viewer's profile (so the mini-profile avatar/name/role
  // render even on a hard refresh of /jobs).
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
        // Silent fail — navbar will show fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Fetch the recommended-jobs list shown in the LEFT column. Same
  // endpoint, payload, and shape as the home feed's recommended jobs.
  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      try {
        const res = await fetch("/api/mobile/user/recommended-jobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 10 }),
        });
        if (!res.ok) {
          if (!cancelled) {
            setJobs([]);
            setJobsError("Couldn't load jobs right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiRecommendedJob[] };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setJobs(json.data.result.map(mapApiRecommendedJob));
          setJobsError(null);
        } else {
          setJobs([]);
          setJobsError(null);
        }
      } catch {
        if (!cancelled) {
          setJobs([]);
          setJobsError("Couldn't load jobs right now.");
        }
      }
    }
    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Filter options ── fetch the dropdown contents once on mount.
  // Failure is silent — the filter buttons just stay closed/empty.
  useEffect(() => {
    let cancelled = false;
    async function fetchFilters() {
      try {
        const res = await fetch("/api/mobile/user/search-filters", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as FilterOptionsApi;
        if (cancelled) return;
        const data = json?.data;
        if (!data) return;
        setFilterOptions({
          companies: Array.isArray(data.company)
            ? data.company.filter(
                (c): c is { id: string; name: string } =>
                  !!c && typeof c.id === "string" && typeof c.name === "string"
              )
            : [],
          employmentTypes: Array.isArray(data.employment_type)
            ? data.employment_type.filter(
                (e): e is { name: string; label: string } =>
                  !!e && typeof e.name === "string" && typeof e.label === "string"
              )
            : [],
          locations: Array.isArray(data.job_location)
            ? data.job_location.filter(
                (l): l is string => typeof l === "string"
              )
            : [],
        });
      } catch {
        // Silent fail.
      }
    }
    fetchFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Search debounce ── 400ms after the viewer pauses typing,
  // commit the trimmed value to `debouncedSearch`. Single-character
  // queries are skipped (no API call) per the home-page rule.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length === 1) return;
    const t = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // ── Listings fetch ── fires on mount AND whenever the debounced
  // search, any filter selection, or the view mode (all vs saved)
  // changes. Always fires — clearing the search resets
  // debouncedSearch to "" and re-fetches the unfiltered listings,
  // matching the home feed pattern.
  useEffect(() => {
    let cancelled = false;
    setListings(null);
    async function fetchListings() {
      // Endpoint and request shape vary by view:
      //   - "all"         → /api/mobile/jobs with search + filter chips
      //   - "saved"       → /api/mobile/user/saved-jobs
      //   - "applied"     → /api/mobile/user/applied-jobs-list
      //   - "recommended" → /api/mobile/user/recommended-jobs
      // The three "list" views all just take `{ page, limit }` and
      // ignore the search/filter chips by design (matches live UX).
      let endpoint = "/api/mobile/jobs";
      if (viewMode === "saved") endpoint = "/api/mobile/user/saved-jobs";
      else if (viewMode === "applied")
        endpoint = "/api/mobile/user/applied-jobs-list";
      else if (viewMode === "recommended")
        endpoint = "/api/mobile/user/recommended-jobs";

      const body: Record<string, unknown> = { page: 1, limit: 20 };
      if (viewMode === "all") {
        if (debouncedSearch) body.search_text = debouncedSearch;
        // Multi-select chips → comma-separated strings. Skip the
        // body field entirely when the array is empty so the API
        // sees the same payload it used to under single-select-no-
        // pick (matches the previous behaviour when nothing was
        // selected).
        if (selectedLocations.length > 0)
          body.job_location = selectedLocations.join(",");
        if (selectedCompanyNames.length > 0)
          body.company_name = selectedCompanyNames.join(",");
        if (selectedEmploymentTypes.length > 0)
          body.employment_type = selectedEmploymentTypes.join(",");
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          if (!cancelled) {
            setListings([]);
            setListingsError("Couldn't load jobs right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiJob[]; total_count?: number };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          const mapped = json.data.result.map(mapApiJobToListing);
          setListings(mapped);
          setListingsError(null);
          // Each list view is the source of truth for its companion
          // id-set / total counter, so mirror them whenever we land
          // on that view.
          if (viewMode === "saved") {
            setSavedJobIds(new Set(mapped.map((m) => m.id)));
          } else if (viewMode === "applied") {
            setAppliedJobIds(new Set(mapped.map((m) => m.id)));
          } else if (viewMode === "recommended") {
            const total =
              typeof json.data?.total_count === "number"
                ? json.data.total_count
                : mapped.length;
            setRecommendedTotal(total);
          } else if (viewMode === "all") {
            // Source of truth for "All Jobs (N)" — read from the API's
            // `total_count` (NOT `mapped.length`, which is bounded by
            // `limit: 20` in the request body). When a search/filter
            // is active the backend returns the filtered total here,
            // so the count naturally reflects the visible result set.
            const total =
              typeof json.data?.total_count === "number"
                ? json.data.total_count
                : mapped.length;
            setAllJobsTotal(total);
          }
        } else {
          setListings([]);
          setListingsError(null);
        }
      } catch {
        if (!cancelled) {
          setListings([]);
          setListingsError("Couldn't load jobs right now.");
        }
      }
    }
    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    selectedLocations,
    selectedCompanyNames,
    selectedEmploymentTypes,
    viewMode,
  ]);

  // ── Saved-job ids seed ── on mount only, fetch the saved-jobs API
  // once to populate `savedJobIds` so the All Jobs view immediately
  // renders the correct Save / Remove button on each card. Skipped
  // when the page is already opening in saved-view (the listings
  // fetch above already updates savedJobIds in that case).
  useEffect(() => {
    if (viewMode !== "all") return;
    let cancelled = false;
    async function seedSavedIds() {
      try {
        const res = await fetch("/api/mobile/user/saved-jobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 100 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: Array<{ id?: string }> };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setSavedJobIds(
            new Set(
              json.data.result
                .map((r) => r?.id)
                .filter((id): id is string => typeof id === "string")
            )
          );
        }
      } catch {
        // Silent — Save / Remove buttons just default to Save until
        // a save action runs.
      }
    }
    seedSavedIds();
    return () => {
      cancelled = true;
    };
    // Intentionally empty deps — only seed once on mount. Subsequent
    // saves/removes optimistically update `savedJobIds` directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Applied-job ids seed ── parallel to the saved-ids seed above.
  // Lets the All Jobs / Recommended / Saved views render the correct
  // Apply / Applied state on every card from first paint, before the
  // viewer ever clicks the Applied Jobs stat row.
  useEffect(() => {
    if (viewMode !== "all") return;
    let cancelled = false;
    async function seedAppliedIds() {
      try {
        const res = await fetch("/api/mobile/user/applied-jobs-list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 100 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: Array<{ id?: string }> };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setAppliedJobIds(
            new Set(
              json.data.result
                .map((r) => r?.id)
                .filter((id): id is string => typeof id === "string")
            )
          );
        }
      } catch {
        // Silent — Apply buttons just default to Apply until the
        // viewer applies for the first time in this session.
      }
    }
    seedAppliedIds();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recommended total seed ── one-shot on mount so the
  // "Recommended (N)" stat shows the real backend count even before
  // the viewer ever opens the Recommended view.
  useEffect(() => {
    let cancelled = false;
    async function seedRecommendedCount() {
      try {
        const res = await fetch("/api/mobile/user/recommended-jobs", {
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
          setRecommendedTotal(json.data.total_count);
        }
      } catch {
        // Silent — falls back to the static 9 placeholder.
      }
    }
    seedRecommendedCount();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── All-jobs total seed ── one-shot on mount with no search and no
  // filter chips, so the "All Jobs (N)" stat row carries the real
  // unfiltered total from first paint. The listings effect ALSO runs
  // on mount with viewMode="all" and overwrites this value, but that
  // call may carry a search/filter (none on first load — but defensive
  // for future deep-link entry points). Tiny overlap, no race issue —
  // both calls go to the same endpoint and the latest one wins.
  useEffect(() => {
    let cancelled = false;
    async function seedAllJobsTotal() {
      try {
        const res = await fetch("/api/mobile/jobs", {
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
          setAllJobsTotal(json.data.total_count);
        }
      } catch {
        // Silent — falls back to the static 0 placeholder.
      }
    }
    seedAllJobsTotal();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Click-outside ── close any open filter dropdown when the
  // viewer clicks somewhere else on the page. Bound only while a
  // dropdown is open so we don't hold a global listener.
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

  // ── Filter toggle helpers ── MULTI-select per category. Each
  // helper adds the value if absent, removes it if already present,
  // matching the visual checkbox affordance (click to toggle).
  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((v) => v !== loc) : [...prev, loc]
    );
  };
  const toggleCompany = (name: string) => {
    setSelectedCompanyNames((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
  };
  const toggleEmployment = (label: string) => {
    setSelectedEmploymentTypes((prev) =>
      prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label]
    );
  };

  // ── Per-dropdown search filtering ── the dropdown options are
  // narrowed live as the viewer types in each dropdown's search box.
  // A trimmed/lowercased substring match keeps it permissive.
  const locationQuery = locationFilterText.trim().toLowerCase();
  const companyQuery = companyFilterText.trim().toLowerCase();
  const employmentQuery = employmentFilterText.trim().toLowerCase();
  const filteredLocations = filterOptions
    ? filterOptions.locations.filter((l) =>
        locationQuery ? l.toLowerCase().includes(locationQuery) : true
      )
    : [];
  const filteredCompanies = filterOptions
    ? filterOptions.companies.filter((c) =>
        companyQuery ? c.name.toLowerCase().includes(companyQuery) : true
      )
    : [];
  const filteredEmployment = filterOptions
    ? filterOptions.employmentTypes.filter((e) =>
        employmentQuery ? e.label.toLowerCase().includes(employmentQuery) : true
      )
    : [];

  // True only when at least one filter chip has a value selected.
  // Drives the "Clear All" button beside the search pill — search
  // text alone does NOT show the button (search has its own X clear
  // already inside the pill); Clear All is specifically for resetting
  // dropdown chip selections.
  const hasActiveFilters =
    selectedLocations.length > 0 ||
    selectedCompanyNames.length > 0 ||
    selectedEmploymentTypes.length > 0;

  // One-shot reset of every filter chip — also wipes the per-
  // dropdown search text so reopening any dropdown shows the full
  // unfiltered option list again. Search text in the main search
  // bar is NOT wiped — Clear All is for chips, not the search input.
  const clearAll = () => {
    setSelectedLocations([]);
    setSelectedCompanyNames([]);
    setSelectedEmploymentTypes([]);
    setLocationFilterText("");
    setCompanyFilterText("");
    setEmploymentFilterText("");
  };

  // Switch the right-panel view (All / Saved / Applied / Recommended).
  // Clearing `searchText` + `debouncedSearch` here scopes the search
  // input to the active tab — typing "pA" while on Applied filters
  // ONLY Applied; clicking Saved resets the search so Saved shows its
  // full list again, and the user can type a fresh query for Saved
  // without dragging the previous tab's text along. The viewer's
  // filter chips on All-view are intentionally NOT wiped here (they
  // belong to All-view alone and are simply ignored by the other
  // three views, which don't accept those filters server-side).
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setSearchText("");
    setDebouncedSearch("");
  };

  /** POST /api/mobile/user/save-job for a given job id. While the call
   *  is in flight the button shows "Saving..." disabled; on success
   *  the id is added to `savedJobIds` so the button flips to Remove
   *  and the left-side "Saved Jobs (N)" counter ticks up. */
  const handleSaveJob = async (jobId: string) => {
    if (savingJobId) return;
    setSavingJobId(jobId);
    try {
      const res = await fetch("/api/mobile/user/save-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Save failed");
      }
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      toast.success("Job saved successfully");
    } catch {
      toast.error("Couldn't save this job. Please try again.");
    } finally {
      setSavingJobId(null);
    }
  };

  /** Apply flow: open the company's external careers page in a new
   *  tab so the viewer can complete the actual application there,
   *  then POST /applied-jobs to mark it as applied on YP. The pop-up
   *  is opened synchronously inside the click handler (before the
   *  await) so browsers don't blackhole it as a programmatic pop-up.
   *  Apply is one-way — there is no companion un-apply path. */
  const handleApplyJob = async (jobId: string, jobLink: string | null) => {
    if (applyingJobId) return;
    if (appliedJobIds.has(jobId)) return;

    if (jobLink) {
      // Open synchronously, inside the user-gesture click frame.
      window.open(jobLink, "_blank", "noopener,noreferrer");
    }

    setApplyingJobId(jobId);
    try {
      const res = await fetch("/api/mobile/user/applied-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      // The /applied-jobs endpoint returns only `{ id }` on success
      // (no `status` envelope), so accept any 2xx that gave us back
      // an id. The 4xx/5xx path falls through to the catch handler.
      if (!res.ok || !(json && (json.status === "OK" || json.id))) {
        throw new Error(json?.message || "Apply failed");
      }
      setAppliedJobIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      toast.success("Job applied successfully");
    } catch {
      toast.error("Couldn't apply for this job. Please try again.");
    } finally {
      setApplyingJobId(null);
    }
  };

  /** Confirm-then-call removal flow. The Remove button on a saved card
   *  opens the dialog (sets `confirmRemoveId`); the dialog's confirm
   *  button runs `confirmRemoveJob`, which posts to /remove-job, drops
   *  the id from `savedJobIds`, and (when we're in saved-view) drops
   *  the card from the visible listings too. */
  const requestRemoveJob = (jobId: string) => {
    if (savingJobId) return;
    setConfirmRemoveId(jobId);
  };

  const cancelRemove = () => {
    if (removing) return;
    setConfirmRemoveId(null);
  };

  const confirmRemoveJob = async () => {
    const jobId = confirmRemoveId;
    if (!jobId || removing) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/mobile/user/remove-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Remove failed");
      }
      // Drop the id from the saved-set so all-jobs view flips it back
      // to Save Job. In saved-view, also drop it from the visible
      // listings so the card disappears in place.
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      if (viewMode === "saved") {
        setListings((prev) =>
          prev ? prev.filter((l) => l.id !== jobId) : prev
        );
      }
      toast.success("Job removed successfully");
    } catch {
      toast.error("Couldn't remove this job. Please try again.");
    } finally {
      setRemoving(false);
      setConfirmRemoveId(null);
    }
  };

  // ── Stats rows ── derived live from state. The "Saved Jobs" and
  // "Applied Jobs" counts track their respective id-sets; the
  // "Recommended" count comes from the recommended-jobs API's
  // `total_count`. The active row reflects the current view mode.
  // The left-column Recommended Jobs card mirrors the right-panel
  // search ONLY when the viewer is on the "All Jobs" tab — typing
  // in the search bar while on Saved / Applied / Recommended tabs
  // is meant to scope the right-panel listings only and must NOT
  // bleed into the left mini-list (the left card is a separate
  // recommendation feed, not a search target). On those three
  // tabs the left list always renders the full unfiltered set.
  // An empty filtered list under All-with-search renders the
  // "No recommended jobs found." placeholder per the SS.
  const recommendedSearchQuery =
    viewMode === "all" ? searchText.trim().toLowerCase() : "";
  const visibleRecommendedJobs =
    jobs && recommendedSearchQuery
      ? jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(recommendedSearchQuery) ||
            j.company.toLowerCase().includes(recommendedSearchQuery) ||
            j.location.toLowerCase().includes(recommendedSearchQuery)
        )
      : jobs;

  // ── Right-panel filtering ── all-jobs view runs server-side
  // search + chip filtering via the listings fetch effect (it
  // forwards `search_text`, `job_location`, `company_name`,
  // `employment_type` to /api/mobile/jobs). The other three
  // views (saved / applied / recommended) hit endpoints that
  // don't accept those fields, so we narrow their already-
  // fetched results CLIENT-SIDE here:
  //   - search:   match title / company / location substring
  //               (debounced, ≥ 2 chars — same rule as server)
  //   - location: match if the listing's locations[] intersects
  //               the selected locations
  //   - company:  match if the listing's company is in the
  //               selected company-name set
  //   - employment type: match if the listing's employmentTypes[]
  //               (extracted by `mapApiJobToListing`) intersects
  //               the selected types. Read case-insensitively
  //               because the upstream sometimes ships the same
  //               label with mixed capitalisation across the four
  //               endpoints.
  // Pure derivation — never mutates `listings`, so counts in the
  // stats box (which key off the raw arrays) are unaffected.
  const listingsSearchQuery = debouncedSearch.trim().toLowerCase();
  const visibleListings = (() => {
    if (listings === null) return null;
    if (viewMode === "all") return listings;

    let filtered = listings;
    if (listingsSearchQuery) {
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(listingsSearchQuery) ||
          l.company.toLowerCase().includes(listingsSearchQuery) ||
          l.locations.some((loc) =>
            loc.toLowerCase().includes(listingsSearchQuery)
          )
      );
    }
    if (selectedLocations.length > 0) {
      const wanted = new Set(selectedLocations);
      filtered = filtered.filter((l) =>
        l.locations.some((loc) => wanted.has(loc))
      );
    }
    if (selectedCompanyNames.length > 0) {
      const wanted = new Set(selectedCompanyNames);
      filtered = filtered.filter((l) => wanted.has(l.company));
    }
    if (selectedEmploymentTypes.length > 0) {
      const wanted = new Set(
        selectedEmploymentTypes.map((t) => t.toLowerCase())
      );
      filtered = filtered.filter((l) =>
        l.employmentTypes.some((t) => wanted.has(t.toLowerCase()))
      );
    }
    return filtered;
  })();

  // Whether the viewer has an active search / chip on a
  // saved / applied / recommended tab — drives the empty-state
  // message ("no match" vs the per-tab "you haven't saved any /
  // applied to any / no recommendations yet" defaults).
  const isClientFilterActive =
    viewMode !== "all" &&
    (listingsSearchQuery !== "" ||
      selectedLocations.length > 0 ||
      selectedCompanyNames.length > 0 ||
      selectedEmploymentTypes.length > 0);

  // "All Jobs" count tracks the API's `total_count` (captured into
  // `allJobsTotal` whenever the listings fetch resolves under
  // viewMode="all"). This is independent of `listings.length` (which
  // is bounded by `limit: 20`) and independent of which view the
  // viewer is currently in — switching to / searching in saved /
  // applied / recommended will NOT mutate this number, satisfying
  // the "search in one tab must not affect another tab's count" rule.
  // When a search/filter IS active under all-view, the backend
  // returns the filtered total here, so the count tracks the visible
  // result set in real time.
  const statsRows: Array<{
    key: ViewMode;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All Jobs", count: allJobsTotal },
    { key: "applied", label: "Applied Jobs", count: appliedJobIds.size },
    { key: "saved", label: "Saved Jobs", count: savedJobIds.size },
    { key: "recommended", label: "Recommended", count: recommendedTotal },
  ];

  /** Heading text shown above the search bar in the right panel —
   *  swaps based on which view the viewer has selected. */
  const rightPanelTitle =
    viewMode === "saved"
      ? "Saved Jobs"
      : viewMode === "applied"
        ? "Applied Jobs"
        : viewMode === "recommended"
          ? "Recommended"
          : "All Jobs";

  // Derive the avatar / name / role / location from AuthContext, with
  // the same deleted-image guard the home page uses.
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

  return (
    <div className={`${homeStyles.page} ${styles.pageJobs}`}>
      <Navbar />
      {/* Apply `contentJobsCollapsed` to the grid container exactly like
          the home page does — without it, the tablet media query's
          `grid-template-rows` override never fires, so the left column
          keeps its full allocated row height and a big empty band sits
          between the collapsed Recommended Jobs card and the right
          panel. With the modifier the row sizes to content, the gap
          collapses, and the right panel slides up underneath the
          mini-profile + stats + collapsed-header stack. */}
      <main
        className={`${homeStyles.content} ${styles.contentJobsPage}${
          !jobsExpanded ? ` ${homeStyles.contentJobsCollapsed}` : ""
        }`}
      >
        {/* ── LEFT COLUMN ── identical structure to the home feed:
            mini-profile on top, then the new (static) stats box, then
            the recommended-jobs card with internal scroll. ── */}
        <aside
          className={homeStyles.leftCol}
          aria-label="Profile and recommended jobs"
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

          {/* Stats rows — "All Jobs" and "Saved Jobs" are clickable and
              switch the right panel between the two views. The active
              row gets the cyan-tinted highlight. Counts update live as
              the viewer saves / removes jobs. */}
          <section className={styles.statsBox} aria-label="Job categories">
            {statsRows.map((row) => {
              const isActive = viewMode === row.key;
              return (
                <p
                  key={row.key}
                  className={`${styles.statsRow} ${styles.statsClickable} ${
                    isActive ? styles.statsActive : ""
                  }`}
                  onClick={() => switchView(row.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      switchView(row.key);
                    }
                  }}
                >
                  {row.label} ({row.count})
                </p>
              );
            })}
          </section>

          <section
            className={`${homeStyles.jobsCard} ${styles.jobsCardOnJobsPage}${
              !jobsExpanded ? ` ${homeStyles.jobsCardCollapsed}` : ""
            }`}
            aria-label="Recommended jobs"
          >
            <div className={homeStyles.jobsHeader}>
              <h2 className={homeStyles.jobsTitle}>Recommended Jobs</h2>
              <button
                type="button"
                className={homeStyles.jobsToggle}
                onClick={() => setJobsExpanded((v) => !v)}
                aria-expanded={jobsExpanded}
                aria-label={
                  jobsExpanded
                    ? "Collapse recommended jobs"
                    : "Expand recommended jobs"
                }
              >
                <ChevronCollapseIcon collapsed={!jobsExpanded} />
              </button>
            </div>
            <div
              className={`${homeStyles.jobsScroll}${
                !jobsExpanded ? ` ${homeStyles.jobsScrollCollapsed}` : ""
              }`}
            >
              {jobs === null ? (
                <>
                  <JobSkeleton />
                  <JobSkeleton />
                  <JobSkeleton />
                </>
              ) : visibleRecommendedJobs && visibleRecommendedJobs.length === 0 ? (
                <p className={homeStyles.feedState}>
                  {recommendedSearchQuery
                    ? "No recommended jobs found."
                    : (jobsError ?? "No jobs to show yet.")}
                </p>
              ) : (
                (visibleRecommendedJobs ?? []).map((job) => (
                  <article
                    key={job.id}
                    className={homeStyles.jobItem}
                    onClick={() => openJobDetails(job.id)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openJobDetails(job.id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={homeStyles.jobHead}>
                      <div className={homeStyles.jobLogo} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.companyLogoUrl ?? DEFAULT_JOB_IMG}
                          alt=""
                        />
                      </div>
                      <div className={homeStyles.jobInfo}>
                        <p className={homeStyles.jobTitle}>{job.title}</p>
                        <p className={homeStyles.jobCompany}>{job.company}</p>
                        <p className={homeStyles.jobLocation}>
                          <LocationIcon />
                          <span
                            className={homeStyles.jobLocationText}
                            title={job.location || "Not Specified"}
                          >
                            {job.location || "Not Specified"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className={homeStyles.jobActions}>
                      {/* Apply / Applied / Applying — apply state mirrors
                          the right-panel listings exactly so a job
                          applied via the right column shows "Applied"
                          here too, and vice-versa. */}
                      {appliedJobIds.has(job.id) ? (
                        <button
                          type="button"
                          className={`${homeStyles.btnApply} ${styles.btnApplied}`}
                          disabled
                          aria-label="Already applied"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Applied
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={homeStyles.btnApply}
                          disabled={applyingJobId === job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyJob(job.id, job.jobLink);
                          }}
                        >
                          {applyingJobId === job.id ? "Applying..." : "Apply"}
                        </button>
                      )}
                      {/* Save Job ↔ Remove — same dialog/confirm flow
                          as the right panel; clicking Remove on a
                          recommended card pops the confirm dialog and
                          hits /api/mobile/user/remove-job on confirm. */}
                      {savedJobIds.has(job.id) ? (
                        <button
                          type="button"
                          className={homeStyles.btnSave}
                          disabled={
                            savingJobId === job.id ||
                            (removing && confirmRemoveId === job.id)
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            requestRemoveJob(job.id);
                          }}
                        >
                          {removing && confirmRemoveId === job.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={homeStyles.btnSave}
                          disabled={savingJobId === job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveJob(job.id);
                          }}
                        >
                          {savingJobId === job.id ? "Saving..." : "Save Job"}
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* ── RIGHT COLUMN — single rounded card holding the heading,
            search, filters, and listings. Static UI for now; the
            handlers + data wiring slot in here later. ── */}
        <section
          className={styles.rightOuter}
          aria-label="Recommended job listings"
        >
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
                    placeholder="Search jobs..."
                    aria-label="Search jobs"
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
                  onClick={clearAll}
                >
                  Clear All
                </button>
              ) : null}
            </div>
          </div>

          {/* Filter dropdowns — hidden by default, revealed only after the
              viewer clicks the slider icon in the search pill. Each
              dropdown's options come from /api/mobile/user/search-filters
              (cached in `filterOptions`). Multi-select via checkboxes;
              selecting a value triggers a re-fetch of the listings. */}
          {filtersOpen ? (
            <div className={styles.filters}>
              {/* Location ── the chip itself is the text input. Typing
                  here narrows the dropdown options live; the placeholder
                  shows "Location" or "Location (1)" depending on whether
                  a value is currently selected. The X clear button drops
                  the typing first; if there's no typing, it drops the
                  selection. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedLocations.length > 0 ||
                    openFilterDropdown === "location"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("location")}
                  title={selectedLocations.join(", ") || undefined}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedLocations.length > 0
                        ? `Location (${selectedLocations.length})`
                        : "Location"
                    }
                    value={locationFilterText}
                    onChange={(e) => setLocationFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("location")}
                    aria-label="Filter by location"
                  />
                  {locationFilterText || selectedLocations.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear location filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (locationFilterText) {
                          setLocationFilterText("");
                        } else {
                          setSelectedLocations([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle location dropdown"
                    aria-expanded={openFilterDropdown === "location"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "location" ? null : "location"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "location" && filterOptions ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredLocations.length === 0 ? (
                      <p className={styles.filterEmpty}>No options</p>
                    ) : (
                      filteredLocations.map((loc) => {
                        const checked = selectedLocations.includes(loc);
                        return (
                          <label
                            key={loc}
                            className={styles.filterOption}
                          >
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
                              onChange={() => toggleLocation(loc)}
                            />
                            <span>{loc}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {/* Company — multi-select. Each picked company name is
                  forwarded to the API as part of a comma-separated
                  `company_name` body field. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedCompanyNames.length > 0 ||
                    openFilterDropdown === "company"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("company")}
                  title={selectedCompanyNames.join(", ") || undefined}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedCompanyNames.length > 0
                        ? `Company (${selectedCompanyNames.length})`
                        : "Company"
                    }
                    value={companyFilterText}
                    onChange={(e) => setCompanyFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("company")}
                    aria-label="Filter by company"
                  />
                  {companyFilterText || selectedCompanyNames.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear company filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (companyFilterText) {
                          setCompanyFilterText("");
                        } else {
                          setSelectedCompanyNames([]);
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
                {openFilterDropdown === "company" && filterOptions ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredCompanies.length === 0 ? (
                      <p className={styles.filterEmpty}>no options</p>
                    ) : (
                      filteredCompanies.map((c) => {
                        const checked = selectedCompanyNames.includes(c.name);
                        return (
                          <label
                            key={c.id}
                            className={styles.filterOption}
                          >
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
                              onChange={() => toggleCompany(c.name)}
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {/* Employment Type — multi-select. Forwarded as
                  comma-separated `employment_type` body field. */}
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedEmploymentTypes.length > 0 ||
                    openFilterDropdown === "employment"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("employment")}
                  title={selectedEmploymentTypes.join(", ") || undefined}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedEmploymentTypes.length > 0
                        ? `Employment Type (${selectedEmploymentTypes.length})`
                        : "Employment Type"
                    }
                    value={employmentFilterText}
                    onChange={(e) => setEmploymentFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("employment")}
                    aria-label="Filter by employment type"
                  />
                  {employmentFilterText ||
                  selectedEmploymentTypes.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear employment type filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (employmentFilterText) {
                          setEmploymentFilterText("");
                        } else {
                          setSelectedEmploymentTypes([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle employment type dropdown"
                    aria-expanded={openFilterDropdown === "employment"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "employment" ? null : "employment"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "employment" && filterOptions ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredEmployment.length === 0 ? (
                      <p className={styles.filterEmpty}>no matching  options there</p>
                    ) : (
                      filteredEmployment.map((e) => {
                        const checked = selectedEmploymentTypes.includes(
                          e.label
                        );
                        return (
                          <label
                            key={e.name}
                            className={styles.filterOption}
                          >
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
                              onChange={() => toggleEmployment(e.label)}
                            />
                            <span>{e.label}</span>
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
            {visibleListings === null ? (
              <>
                <ListingSkeleton />
                <ListingSkeleton />
                <ListingSkeleton />
              </>
            ) : visibleListings.length === 0 ? (
              <div className={styles.listingsEmpty}>
                <span
                  className={styles.listingsEmptyIcon}
                  aria-hidden="true"
                >
                  <JobsEmptyIcon />
                </span>
                <p className={styles.listingsEmptyText}>
                  {/* Empty-state message reflects whether a filter
                      is active. On non-"all" tabs with an active
                      search/chip, show "No jobs found matching"; on
                      those tabs with no filter active, show the
                      per-tab "no items yet" message. The All tab
                      keeps the existing error / generic message. */}
                  {viewMode !== "all" && isClientFilterActive
                    ? "No jobs found matching"
                    : viewMode === "saved"
                      ? "You haven't saved any jobs yet."
                      : viewMode === "applied"
                        ? "You haven't applied to any jobs yet."
                        : viewMode === "recommended"
                          ? "No recommended jobs to show."
                          : (listingsError ?? "No jobs found matching")}
                </p>
              </div>
            ) : (
              visibleListings.map((job) => (
                <article
                  key={job.id}
                  className={styles.listingCard}
                  onClick={() => openJobDetails(job.id)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openJobDetails(job.id);
                    }
                  }}
                >
                  <div className={styles.listingLogo} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={job.logoUrl} alt="" />
                  </div>
                  <div className={styles.listingInfo}>
                    <p className={styles.listingTitle} title={job.title}>
                      {job.title}
                    </p>
                    <p className={styles.listingCompany}>{job.company}</p>
                    {job.locations.length > 0 ? (
                      <div className={styles.listingChips}>
                        {job.locations.map((loc) => (
                          <span key={loc} className={styles.listingChip}>
                            <LocationIcon />
                            {loc}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {job.postedAgo ? (
                      <p className={styles.listingPosted}>{job.postedAgo}</p>
                    ) : null}
                  </div>
                  <div className={styles.listingActions}>
                    {/* Save / Remove ── flips based on whether the viewer
                        has already saved this job id. Action buttons
                        stop click propagation so they don't also trigger
                        the card-level navigation to the details page.
                        Both buttons reuse the existing `.btnSave`
                        gradient-outline pill style for visual parity. */}
                    {savedJobIds.has(job.id) ? (
                      <button
                        type="button"
                        className={styles.btnSave}
                        disabled={
                          savingJobId === job.id ||
                          (removing && confirmRemoveId === job.id)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          requestRemoveJob(job.id);
                        }}
                      >
                        {removing && confirmRemoveId === job.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnSave}
                        disabled={savingJobId === job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveJob(job.id);
                        }}
                      >
                        {savingJobId === job.id ? "Saving..." : "Save Job"}
                      </button>
                    )}
                    {/* Apply / Applied / Applying — apply is a one-way
                        action (no un-apply path). Once the id lands in
                        `appliedJobIds`, the gradient-fill button is
                        replaced by the gradient-outline "Applied" pill
                        with cyan text, disabled, matching the SS. */}
                    {appliedJobIds.has(job.id) ? (
                      <button
                        type="button"
                        className={`${styles.btnApply} ${styles.btnApplied}`}
                        disabled
                        aria-label="Already applied"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Applied
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnApply}
                        disabled={applyingJobId === job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyJob(job.id, job.jobLink);
                        }}
                      >
                        {applyingJobId === job.id ? "Applying..." : "Apply"}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Confirm-remove dialog — same chrome as the home feed's
          "Remove Repost" dialog, just relabelled for the saved-jobs
          list. Posts to /api/mobile/user/remove-job on confirm. */}
      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove saved job?"
        message="Are you sure you want to remove this job from your saved list?"
        confirmLabel="Yes, Remove"
        cancelLabel="No"
        loadingLabel="Removing..."
        loading={removing}
        onConfirm={confirmRemoveJob}
        onCancel={cancelRemove}
      />
    </div>
  );
}
