"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Compose home-page styles for the page chrome, grid, and mini-profile
// card so this page never visually drifts from the home / jobs feed.
// Company-specific styles (stats box, right column, filter chip,
// company card) live in `company.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./company.module.css";

/** Extra profile fields returned by /api/mobile/profile beyond AuthUser
 *  — same subset the home and jobs pages consume for the mini-profile. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

/** Raw API row from POST /api/mobile/companies. Only the fields
 *  the right-column card actually renders are typed here; the rest
 *  (`created_at`, `updated_at`, `website`) are ignored at this
 *  layer — the details page picks them up separately. */
type ApiCompany = {
  id: string;
  name?: string;
  description?: string | null;
  address?: string | null;
  logo_url?: string | null;
  industry_name?: string | null;
  follow_status?: boolean;
  follow_id?: string | null;
  website?: string | null;
};

/** Mapped UI shape for the right-column listing card. */
type CompanyCard = {
  id: string;
  name: string;
  address: string;
  description: string;
  /** Remote logo URL — when present, an `<img>` is rendered; when
   *  empty, the initials placeholder is shown instead. */
  logoUrl: string;
  /** Two-character initials derived from the company name as a
   *  fallback when `logoUrl` is missing or fails to load. */
  initials: string;
  industryName: string;
  followStatus: boolean;
  followId: string | null;
};

/** API filter-options payload (response of GET /api/mobile/user/search-filters).
 *  Same endpoint /jobs uses, but the company page only consumes
 *  `jobsector`. */
type FilterOptionsApi = {
  data?: {
    jobsector?: Array<{ id: string; name: string }>;
  };
};

/** Decode the common HTML entities the backend emits inside
 *  `description` (e.g. `&nbsp;`, `&amp;`) so they don't render as
 *  literal text in the listing card. Plain string transform — no
 *  `dangerouslySetInnerHTML` (the listing description is plain
 *  body copy, not rich HTML). */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Two-character initials fallback used when an API logo URL is
 *  missing or fails to load. "World Wide Technology" → "WW",
 *  "RSM UK" → "RU", single-word names use the first 2 characters. */
function getCompanyInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Map a raw API row to the UI shape rendered by the listing card. */
function mapApiCompany(c: ApiCompany): CompanyCard {
  const name = (c.name ?? "").trim();
  return {
    id: c.id,
    name,
    address: (c.address ?? "").trim(),
    description: decodeHtmlEntities((c.description ?? "").trim()),
    logoUrl: (c.logo_url ?? "").trim(),
    initials: getCompanyInitials(name),
    industryName: (c.industry_name ?? "").trim(),
    followStatus: c.follow_status === true,
    followId:
      typeof c.follow_id === "string" && c.follow_id ? c.follow_id : null,
  };
}

// (Static seeds removed — the right-column listings now come from
// POST /api/mobile/companies and the sector dropdown options come
// from GET /api/mobile/user/search-filters. See the fetch effects
// in `CompanyPage` below.)

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

/** Empty-state glyph for the right panel when no companies match the
 *  current filter / search text. Outline-only so it tracks the parent
 *  text colour like the rest of the page's SVGs. */
function CompaniesEmptyIcon() {
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
      <path d="M3 21V8a2 2 0 0 1 2-2h6v15" />
      <path d="M11 21V3h8a2 2 0 0 1 2 2v16" />
      <path d="M3 21h18" />
      <path d="M7 10h0M7 14h0M7 18h0M15 7h0M15 11h0M15 15h0M15 19h0" />
    </svg>
  );
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

// ── Skeletons mirroring the home / jobs page mini-profile + listing card. ──

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

/** Default fallback logo served by the live YP CDN — used whenever
 *  the API row has no `logo_url`, or the remote image fails to
 *  load. Mirrors the live website's "company-logo-default" asset
 *  exactly so this app's listing visually matches the production
 *  YP site row-for-row. */
const DEFAULT_COMPANY_LOGO =
  "https://youngprofessionals.global/_next/static/media/company-logo-default.29ff6a63.svg";

/** Per-card logo with a built-in load tracker. The remote logo URL
 *  takes a moment to download even after the API resolves, and the
 *  `.companyLogo` square was flashing white during that window on
 *  hard refresh. To fix:
 *    - Default surface is dark/translucent (set in CSS) so the
 *      skeleton shimmer overlay reads correctly during load.
 *    - Once `onLoad` fires, the `.companyLogoLoaded` modifier
 *      flips the surface to white so the brand logo sits on the
 *      light background it was designed for.
 *    - Empty url OR `onError` → fall back to the production YP
 *      default-logo SVG (initials are no longer used here; the
 *      fallback SVG replaces them so the listing visually matches
 *      the live YP page row-for-row). */
function CompanyLogo({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const useFallback = !url || errored;
  const finalSrc = useFallback ? DEFAULT_COMPANY_LOGO : url;
  // Fallback SVG renders instantly so it counts as "loaded" too.
  const isLoadedSurface = loaded || useFallback;
  return (
    <div
      className={`${styles.companyLogo}${
        isLoadedSurface ? ` ${styles.companyLogoLoaded}` : ""
      }${!isLoadedSurface ? ` ${homeStyles.skeleton}` : ""}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={{
          opacity: isLoadedSurface ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />
    </div>
  );
}

/** Skeleton placeholder for the right-column company card. Keeps
 *  the same grid (logo | info | actions) as the live card so when
 *  the API resolves the layout doesn't shift. Reuses the home
 *  module's shimmer pieces (`.skeleton`, `.skelLine`, etc.) so the
 *  animation matches the rest of the app's loading states. */
function CompanyCardSkeleton() {
  return (
    <article
      className={styles.companyCard}
      aria-hidden="true"
      style={{ cursor: "default" }}
    >
      <div className={`${styles.companyLogo} ${homeStyles.skeleton}`} />
      <div className={styles.companyInfo}>
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
        />
      </div>
      <div className={styles.companyActions}>
        <div className={`${homeStyles.skelBtn} ${homeStyles.skeleton}`} />
      </div>
    </article>
  );
}

/** Right-column listing card view modes — only two on the company page
 *  ("All" / "Following"). The two stat rows in the left box switch
 *  between them. The static step shows the same 10 cards under "All"
 *  and an empty state under "Following" until the dynamic step wires
 *  the real follow-state seed. */
type ViewMode = "all" | "following";

export default function CompanyPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  // Right-column search + filter state.
  const [searchText, setSearchText] = useState("");
  // Debounced version of `searchText` — only updates after the
  // viewer pauses typing for 400ms, AND only when the trimmed
  // length is 0 (cleared) or ≥ 2 characters (matches the home /
  // jobs page rule). The companies fetch keys off this value.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Sector filter — MULTI-select, keyed by ID. Each picked id is
  // forwarded to the API as part of a comma-separated
  // `job_sector_id` body field.
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [sectorFilterText, setSectorFilterText] = useState("");
  const [openFilterDropdown, setOpenFilterDropdown] = useState<"sector" | null>(
    null
  );

  // Which view-mode the right panel is showing — flips between "All"
  // and "Following" via the two stat rows on the left.
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // ── Companies listing state (live from POST /api/mobile/companies). ──
  // `null` = initial load (skeletons render); `[]` = loaded but
  // empty (or fetch failed). The error string drives the empty-
  // state caption.
  const [companies, setCompanies] = useState<CompanyCard[] | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  // ── Filter options state (live from GET /api/mobile/user/search-filters).
  // Only `jobsector` is consumed on this page — the company-specific
  // dropdown. The other filter categories are handled on /jobs.
  const [sectorOptions, setSectorOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // ── Total counts ──
  // `allTotal` is the API's `data.total_count` for /companies (the
  // global / search-filtered count). `followingTotal` is the
  // dedicated count from /user/followings — independent of the
  // current view so both stat rows can read accurate numbers no
  // matter which tab is active.
  const [allTotal, setAllTotal] = useState<number>(0);
  const [followingTotal, setFollowingTotal] = useState<number>(0);

  // Tracks which company has a follow / unfollow request in flight,
  // if any — drives the per-card "Following..." / "Unfollowing..."
  // transitional label and disables the button while the toggle
  // round-trips.
  const [followInFlightId, setFollowInFlightId] = useState<string | null>(
    null
  );

  // Mirror the home / jobs page's "deleted image" suppression so the
  // mini-profile avatar renders consistently after photo deletion.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  // Refresh the viewer's profile so the mini-profile avatar/name/role
  // render even on a hard refresh of /company. Same pattern jobs page uses.
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
        // Silent fail — navbar / mini-profile will show fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Click-outside: close the open sector dropdown when the viewer
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

  // ── Search debounce ── 400ms after the viewer pauses typing,
  // commit the trimmed value to `debouncedSearch`. Single-character
  // queries are skipped (no API call) per the jobs / home rule.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length === 1) return;
    const t = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // ── Filter options seed ── one-shot fetch on mount. The
  // /api/mobile/user/search-filters endpoint is shared with the
  // jobs page; we only consume `jobsector` here. Failure is silent
  // (chip just opens with "No options" until the next reload).
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
        const sectors = Array.isArray(json?.data?.jobsector)
          ? json.data!.jobsector!.filter(
              (s): s is { id: string; name: string } =>
                !!s && typeof s.id === "string" && typeof s.name === "string"
            )
          : [];
        setSectorOptions(sectors);
      } catch {
        // Silent — chip dropdown will render "No options".
      }
    }
    fetchFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Listings fetch ── fires on mount AND whenever the active
  // view, the debounced search, or the selected sector changes.
  //   - "all"       → POST /api/mobile/companies with the search +
  //                   filter chips (matches the jobs-page pattern).
  //                   `limit: 100` is large enough to fetch every
  //                   company in one page (the API currently has
  //                   ~48 total). The total_count from the response
  //                   drives the "All (N)" stat row.
  //   - "following" → POST /api/mobile/user/followings with `{}`.
  //                   Returns ONLY the companies the viewer follows
  //                   (every row has follow_status=true). Search /
  //                   sector filters are intentionally ignored in
  //                   this view — the live website's "following"
  //                   tab is filter-free and matches that UX.
  useEffect(() => {
    let cancelled = false;
    setCompanies(null);
    async function fetchCompanies() {
      try {
        let res: Response;
        if (viewMode === "following") {
          res = await fetch("/api/mobile/user/followings", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        } else {
          const body: Record<string, unknown> = {
            page: 1,
            limit: 100,
            search_text: debouncedSearch || "",
            // Multi-select sector chip → comma-separated id list.
            // Empty array → empty string (API treats that as "no
            // filter applied"). Single selections produce the same
            // payload as the previous single-select code path.
            job_sector_id: selectedSectorIds.join(","),
          };
          res = await fetch("/api/mobile/companies", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        if (!res.ok) {
          if (!cancelled) {
            setCompanies([]);
            setCompaniesError("Couldn't load companies right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiCompany[]; total_count?: number };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          const mapped = json.data!.result!.map(mapApiCompany);
          setCompanies(mapped);
          setCompaniesError(null);
          // Update the count for whichever view we just fetched. The
          // OTHER view's count keeps its last known value — the
          // separate seed below ensures both counts are populated
          // on first paint.
          const total =
            typeof json.data!.total_count === "number"
              ? json.data!.total_count
              : mapped.length;
          if (viewMode === "all") {
            setAllTotal(total);
          } else {
            setFollowingTotal(total);
          }
        } else {
          setCompanies([]);
          setCompaniesError(null);
        }
      } catch {
        if (!cancelled) {
          setCompanies([]);
          setCompaniesError("Couldn't load companies right now.");
        }
      }
    }
    fetchCompanies();
    return () => {
      cancelled = true;
    };
  }, [viewMode, debouncedSearch, selectedSectorIds]);

  // ── Seed both counters on mount ── so the left-side stat box
  // always shows accurate numbers no matter which tab is active.
  // The listings fetch above only updates the count for the view
  // it's currently fetching; this one-shot effect makes sure the
  // OTHER count is populated too, so a viewer who lands on /company
  // with viewMode="all" still sees the real "Following (N)" total
  // immediately (and vice versa).
  useEffect(() => {
    let cancelled = false;
    async function seedFollowingCount() {
      try {
        const res = await fetch("/api/mobile/user/followings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { total_count?: number; result?: ApiCompany[] };
        };
        if (cancelled) return;
        if (json?.status === "OK") {
          const total =
            typeof json.data?.total_count === "number"
              ? json.data.total_count
              : (json.data?.result?.length ?? 0);
          setFollowingTotal(total);
        }
      } catch {
        // Silent — the dedicated listings fetch above will refresh
        // the count when the viewer switches to the Following tab.
      }
    }
    async function seedAllCount() {
      try {
        const res = await fetch("/api/mobile/companies", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: 1,
            limit: 1,
            search_text: "",
            job_sector_id: "",
          }),
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
    seedFollowingCount();
    seedAllCount();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Follow (one-way on the listing page) ──
  // The shared toggle endpoint can both follow AND unfollow, but on
  // the LISTING page the viewer can only ever transition to
  // following. Once a card flips to follow_status=true, its button
  // becomes a disabled "Following" pill — the live website only
  // exposes the un-follow action on the company-details page (with
  // a confirmation popup). This keeps the listing's UX identical to
  // youngprofessionals.global/company.
  const handleFollow = async (companyId: string) => {
    if (followInFlightId) return;
    const current = companies?.find((c) => c.id === companyId);
    if (!current) return;
    setFollowInFlightId(companyId);
    try {
      const res = await fetch("/api/mobile/company/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Follow failed");
      }
      // The toggle endpoint reports back `action: "FOLLOWED"` for
      // the happy path here. If by some race condition it reports
      // UNFOLLOWED (viewer was already following), respect that and
      // mirror the new server state into local UI.
      const nowFollowing = json.action !== "UNFOLLOWED";
      setCompanies((prev) =>
        prev === null
          ? prev
          : prev.map((c) =>
              c.id === companyId ? { ...c, followStatus: nowFollowing } : c
            )
      );
      if (nowFollowing) {
        setFollowingTotal((prev) => prev + 1);
      }
      toast.success(json.message || "Company followed successfully");
    } catch {
      toast.error("Couldn't follow this company. Please try again.");
    } finally {
      setFollowInFlightId(null);
    }
  };

  // ── Right-panel rendering filter ──
  // The "all" view applies search + sector filtering server-side
  // via the /companies endpoint, so the JSX renders `companies`
  // unchanged. The "following" view fetches the FULL followed-
  // companies list from /user/followings (which doesn't accept
  // filters server-side) and we narrow it CLIENT-SIDE here so the
  // search input + sector chip work on the Following tab too —
  // matching the live YP behaviour where each tab's results
  // operate independently. Match against name / address /
  // industry name (substring, case-insensitive) for search; for
  // sector, look the selected sector ids back to their names and
  // require the company's `industryName` to be in that set.
  const visibleCompanies = useMemo(() => {
    if (companies === null) return null;
    if (viewMode !== "following") return companies;

    let filtered = companies;
    // Use debouncedSearch (NOT the live searchText) so the
    // client-side filter only fires after the viewer pauses
    // typing for 400ms AND the trimmed query is ≥ 2 characters.
    // Same min-2-char rule the server-side `/companies` search
    // uses on the All tab — single-character queries never run
    // on either tab.
    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.industryName.toLowerCase().includes(query)
      );
    }

    if (selectedSectorIds.length > 0) {
      const selectedSectorNames = new Set(
        selectedSectorIds
          .map((id) => sectorOptions.find((s) => s.id === id)?.name)
          .filter((name): name is string => typeof name === "string")
      );
      if (selectedSectorNames.size > 0) {
        filtered = filtered.filter(
          (c) => c.industryName && selectedSectorNames.has(c.industryName)
        );
      }
    }

    return filtered;
  }, [
    companies,
    viewMode,
    debouncedSearch,
    selectedSectorIds,
    sectorOptions,
  ]);

  // Whether the viewer has an active search / filter on the
  // Following tab — drives the empty-state message: "no matches"
  // when a filter narrowed the list to zero, vs "you aren't
  // following any" when the underlying list is empty. Uses the
  // debounced search value so the empty-state caption flips at
  // the same moment the filter actually applies.
  const isFollowingFilterActive =
    viewMode === "following" &&
    (debouncedSearch.trim() !== "" || selectedSectorIds.length > 0);

  // Narrow the sector dropdown options live as the viewer types in
  // the chip's input. Mirrors the same per-dropdown search behaviour
  // used on the jobs page filter chips.
  const sectorQuery = sectorFilterText.trim().toLowerCase();
  const filteredSectors = sectorQuery
    ? sectorOptions.filter((s) =>
        s.name.toLowerCase().includes(sectorQuery)
      )
    : sectorOptions;

  // Look up the selected sectors' display names from their ids
  // (the chip shows "Job Sector (N)" when values are picked; the
  // title attribute lists the actual names for hover and a11y).
  const selectedSectorNames = selectedSectorIds
    .map((id) => sectorOptions.find((s) => s.id === id)?.name ?? "")
    .filter(Boolean)
    .join(", ");

  // True only when the sector chip has values selected. Drives
  // the "Clear All" button beside the search pill — search text
  // alone does NOT show the button (search has its own X clear
  // already inside the pill); Clear All resets dropdown chips only.
  const hasActiveFilters = selectedSectorIds.length > 0;

  // One-shot reset of every filter chip. Per-dropdown search text
  // is wiped too so reopening any dropdown shows the full
  // unfiltered option list again. Search text in the main search
  // bar is NOT wiped — Clear All is for chips, not the search input.
  const clearAllFilters = () => {
    setSelectedSectorIds([]);
    setSectorFilterText("");
  };

  /** Multi-select toggle helper — adds / removes a value from an
   *  array setter. Keeps the per-chip onChange handlers compact. */
  const toggleInArray = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Stats counts — both come from API totals so they stay accurate
  // regardless of which tab is active.
  //   - `All (N)`       → /companies' `total_count` (search /
  //                        sector-filtered when those are active).
  //   - `Following (M)` → /user/followings' `total_count`,
  //                        adjusted by ±1 after each follow toggle.
  const allCount = allTotal;
  const followingCount = followingTotal;

  // Avatar / name / role / location — same derivation as jobs page so
  // the mini-profile renders identically across the two pages.
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
    <div className={`${homeStyles.page} ${styles.pageCompany}`}>
      <Navbar />
      <main
        className={`${homeStyles.content} ${styles.contentCompanyPage}`}
      >
        {/* ── LEFT COLUMN — mini-profile + stats box only. The company
            page does NOT have a Recommended Jobs panel underneath, so
            the left column collapses to just two cards (matching the
            SS exactly). ── */}
        <aside
          className={homeStyles.leftCol}
          aria-label="Profile and company categories"
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

          {/* Stats box — All (48) / Following (0). Clicking either row
              switches the right panel between the two views. */}
          <section className={styles.statsBox} aria-label="Company categories">
            <p
              className={`${styles.statsRow} ${styles.statsClickable} ${
                viewMode === "all" ? styles.statsActive : ""
              }`}
              onClick={() => setViewMode("all")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewMode("all");
                }
              }}
            >
              All ({allCount})
            </p>
            <p
              className={`${styles.statsRow} ${styles.statsClickable} ${
                viewMode === "following" ? styles.statsActive : ""
              }`}
              onClick={() => setViewMode("following")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewMode("following");
                }
              }}
            >
              Following ({followingCount})
            </p>
          </section>
        </aside>

        {/* ── RIGHT COLUMN — single rounded card holding heading,
            search, filter, and the company listings (inner-scrolled). ── */}
        <section className={styles.rightOuter} aria-label="Companies">
          <div className={styles.rightHeader}>
            <h1 className={styles.rightTitle}>Companies</h1>
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
                    placeholder="Search companies..."
                    aria-label="Search companies"
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

          {/* Sector dropdown — single filter, hidden by default and
              revealed by the slider icon. The chip itself is the
              text-search input; typing narrows the dropdown options
              live, matching the jobs-page filter behaviour. The
              selected option is keyed by ID so the API request body
              can carry a real `job_sector_id`. */}
          {filtersOpen ? (
            <div className={styles.filters}>
              <div className={styles.filterWrap} data-filter-menu>
                <div
                  className={`${styles.filterBtn}${
                    selectedSectorIds.length > 0 ||
                    openFilterDropdown === "sector"
                      ? ` ${styles.filterBtnActive}`
                      : ""
                  }`}
                  onClick={() => setOpenFilterDropdown("sector")}
                  title={selectedSectorNames || undefined}
                >
                  <input
                    type="text"
                    className={styles.filterBtnInput}
                    placeholder={
                      selectedSectorIds.length > 0
                        ? `Job Sector (${selectedSectorIds.length})`
                        : "Job Sector"
                    }
                    value={sectorFilterText}
                    onChange={(e) => setSectorFilterText(e.target.value)}
                    onFocus={() => setOpenFilterDropdown("sector")}
                    aria-label="Filter by job sector"
                  />
                  {sectorFilterText || selectedSectorIds.length > 0 ? (
                    <button
                      type="button"
                      className={styles.filterClearX}
                      aria-label="Clear sector filter"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sectorFilterText) {
                          setSectorFilterText("");
                        } else {
                          setSelectedSectorIds([]);
                        }
                      }}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filterChevronBtn}
                    aria-label="Toggle sector dropdown"
                    aria-expanded={openFilterDropdown === "sector"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown((v) =>
                        v === "sector" ? null : "sector"
                      );
                    }}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {openFilterDropdown === "sector" ? (
                  <div className={styles.filterDropdown} role="listbox">
                    {filteredSectors.length === 0 ? (
                      <p className={styles.filterEmpty}>No options</p>
                    ) : (
                      filteredSectors.map((s) => {
                        const checked = selectedSectorIds.includes(s.id);
                        return (
                          <label key={s.id} className={styles.filterOption}>
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
                                toggleInArray(setSelectedSectorIds, s.id)
                              }
                            />
                            <span>{s.name}</span>
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
            {visibleCompanies === null ? (
              // Initial fetch in flight — render skeleton placeholders
              // matching the company card grid so the layout doesn't
              // shift when live data lands.
              <>
                <CompanyCardSkeleton />
                <CompanyCardSkeleton />
                <CompanyCardSkeleton />
                <CompanyCardSkeleton />
              </>
            ) : visibleCompanies.length === 0 ? (
              <div className={styles.listingsEmpty}>
                <span
                  className={styles.listingsEmptyIcon}
                  aria-hidden="true"
                >
                  <CompaniesEmptyIcon />
                </span>
                <p className={styles.listingsEmptyText}>
                  {viewMode === "following"
                    ? isFollowingFilterActive
                      ? "No companies found matching"
                      : "You aren't following any companies yet."
                    : (companiesError ?? "No companies found matching")}
                </p>
              </div>
            ) : (
              visibleCompanies.map((c) => (
                <article
                  key={c.id}
                  className={styles.companyCard}
                  onClick={() => router.push(`/company/${c.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/company/${c.id}`);
                    }
                  }}
                >
                  <CompanyLogo url={c.logoUrl} />
                  <div className={styles.companyInfo}>
                    <p className={styles.companyName} title={c.name}>
                      {c.name}
                    </p>
                    {c.address ? (
                      <span className={styles.companyAddressChip}>
                        <LocationIcon />
                        {c.address}
                      </span>
                    ) : null}
                    {/* Fallback to "No Description Found" when the API
                        row has an empty description — keeps the card
                        layout consistent and gives the viewer a clear
                        signal instead of a blank gap below the name. */}
                    <p className={styles.companyDesc}>
                      {c.description || "No Description Found"}
                    </p>
                  </div>
                  <div className={styles.companyActions}>
                    {/* Follow / Following pill — listing-page version.
                        Listing is FOLLOW-ONLY: once a card is being
                        followed (`followStatus === true`), the button
                        renders as a disabled cyan "Following" pill
                        (matching the jobs-page Applied state) and is
                        non-interactive. Unfollowing happens only on
                        the company-details page, behind a
                        confirmation popup — same UX as the live
                        website. Click bubbling stopped on the
                        clickable Follow path so the action doesn't
                        also trigger card-level navigation. */}
                    {c.followStatus ? (
                      <button
                        type="button"
                        className={`${styles.btnFollow} ${styles.btnFollowing}`}
                        disabled
                        aria-pressed
                        onClick={(e) => e.stopPropagation()}
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnFollow}
                        disabled={followInFlightId === c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(c.id);
                        }}
                        aria-pressed={false}
                      >
                        {followInFlightId === c.id
                          ? "Following..."
                          : "Follow"}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
