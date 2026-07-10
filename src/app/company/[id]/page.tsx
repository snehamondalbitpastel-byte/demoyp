"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset) is shared with /home,
// /jobs, /jobs/[id], /company, /events and /events/[id] via the
// home module. Detail-specific styles (banner, hero card, About-
// the-Company card) live in `companyDetails.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./companyDetails.module.css";

/** Raw API row from POST /api/mobile/company-details. Only the
 *  fields rendered on this page are typed. */
type ApiCompanyDetail = {
  id: string;
  name?: string | null;
  description?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  industry_name?: string | null;
  follow_status?: boolean;
  follow_id?: string | null;
};

/** Mapped UI shape rendered by the page. */
type CompanyDetail = {
  id: string;
  name: string;
  /** Address (live `address` field) — rendered under "Location". */
  location: string;
  /** Live `industry_name` field — rendered under "Industry". */
  industry: string;
  /** HTML rich-text from the API (`<p>…</p>`) — rendered with
   *  `dangerouslySetInnerHTML` inside the About-the-Company card. */
  description: string;
  /** External URL the "Website" button opens in a new tab. */
  websiteUrl: string;
  /** Banner photo URL from the API. Empty → gradient placeholder. */
  bannerUrl: string;
  /** Logo URL from the API. Empty → initials fallback. */
  logoUrl: string;
  /** Two-letter fallback initials derived from the company name. */
  initials: string;
  /** Whether the viewer is currently following this company. */
  followStatus: boolean;
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

/** Two-character initials fallback used when the API logo URL is
 *  missing or fails to load. Same logic the listing page uses. */
function getCompanyInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Default fallback assets served by the live YP CDN — used when
 *  the API record is missing the corresponding image. Mirrors the
 *  production website's defaults so this app's company-details
 *  page visually matches the live YP page row-for-row. */
const DEFAULT_COMPANY_LOGO =
  "https://youngprofessionals.global/_next/static/media/company-logo-default.29ff6a63.svg";
const DEFAULT_COMPANY_BANNER =
  "https://youngprofessionals.global/_next/static/media/companyplaceholder.92093aa2.png";

/** Map a raw API response row to the shape the JSX consumes. */
function mapApiCompanyDetail(d: ApiCompanyDetail): CompanyDetail {
  const name = (d.name ?? "").trim();
  return {
    id: d.id,
    name,
    location: (d.address ?? "").trim(),
    industry: (d.industry_name ?? "").trim(),
    description: (d.description ?? "").trim(),
    websiteUrl: (d.website ?? "").trim(),
    bannerUrl: (d.banner_url ?? "").trim(),
    logoUrl: (d.logo_url ?? "").trim(),
    initials: getCompanyInitials(name),
    followStatus: d.follow_status === true,
  };
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setUser } = useAuth();

  // Decode the URL segment defensively — base64-style ids that end
  // with `=` arrive as `…%3D`; without `decodeURIComponent` here
  // we'd POST the literal `%3D` to the backend and get back a
  // "company not found" error for every padded id.
  const rawId = typeof params?.id === "string" ? params.id : "";
  const companyId = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();

  // ── Page state ──
  // `null` = loading (skeleton renders). Empty / load-failed →
  // `companyError` populated and an error card renders.
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Follow toggle state. `followInFlight` is true while a follow /
  // unfollow request is round-tripping. `confirmUnfollowOpen` opens
  // the confirmation dialog before any unfollow happens — matches
  // the "Remove saved job?" / "Unfollow company?" UX on the live
  // website.
  const [followInFlight, setFollowInFlight] = useState(false);
  const [confirmUnfollowOpen, setConfirmUnfollowOpen] = useState(false);

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

  // ── Company-details fetch ──
  // Re-runs whenever the URL `id` changes. POSTs `{ id }` to
  // /api/mobile/company-details and stores the mapped record in
  // `company`. On error, sets `companyError` so the body switches
  // to the error card instead of rendering a half-loaded card.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setCompany(null);
    setCompanyError(null);
    async function fetchCompany() {
      try {
        const res = await fetch("/api/mobile/company-details", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: companyId }),
        });
        if (!res.ok) {
          if (!cancelled) setCompanyError("Couldn't load this company.");
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: ApiCompanyDetail;
        };
        if (cancelled) return;
        if (json?.status === "OK" && json.data) {
          setCompany(mapApiCompanyDetail(json.data));
          setCompanyError(null);
        } else {
          setCompanyError("Couldn't load this company.");
        }
      } catch {
        if (!cancelled) setCompanyError("Couldn't load this company.");
      }
    }
    fetchCompany();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Click handler for the Follow button. Two paths:
  //   - Not currently following → fire the toggle endpoint
  //     immediately (same as the listing page's Follow flow).
  //   - Currently following     → open the confirmation popup.
  //                                Actual unfollow runs from
  //                                `runUnfollow` after the user
  //                                confirms.
  const handleFollowClick = async () => {
    if (!company || followInFlight) return;
    if (company.followStatus) {
      setConfirmUnfollowOpen(true);
      return;
    }
    setFollowInFlight(true);
    try {
      const res = await fetch("/api/mobile/company/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: company.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Follow failed");
      }
      setCompany((prev) =>
        prev ? { ...prev, followStatus: true } : prev
      );
      toast.success(json.message || "Company followed successfully");
    } catch {
      toast.error("Couldn't follow this company. Please try again.");
    } finally {
      setFollowInFlight(false);
    }
  };

  // Confirmed unfollow — fired from the dialog's primary button.
  // Same toggle endpoint as Follow; the response's `action` field
  // confirms the new state.
  const runUnfollow = async () => {
    if (!company || followInFlight) return;
    setFollowInFlight(true);
    try {
      const res = await fetch("/api/mobile/company/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: company.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Unfollow failed");
      }
      setCompany((prev) =>
        prev ? { ...prev, followStatus: false } : prev
      );
      toast.success(json.message || "Company unfollowed successfully");
    } catch {
      toast.error("Couldn't unfollow this company. Please try again.");
    } finally {
      setFollowInFlight(false);
      setConfirmUnfollowOpen(false);
    }
  };

  const cancelUnfollow = () => {
    if (followInFlight) return;
    setConfirmUnfollowOpen(false);
  };

  return (
    <div className={`${homeStyles.page} ${styles.pageCompanyDetails}`}>
      <Navbar />
      <main className={styles.main}>
        {/* ── Page title row — back arrow + heading. ── */}
        <div className={styles.titleRow}>
          <button
            type="button"
            className={styles.backBtn}
            aria-label="Back to companies"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/company");
              }
            }}
          >
            <BackArrowIcon />
          </button>
          <h1 className={styles.title}>Company Details</h1>
        </div>

        {company === null && companyError === null ? (
          // Loading skeleton — banner placeholder + hero placeholder
          // + About the Company placeholder. Mirrors the loaded
          // layout's outer chrome (same `.aboutCompany` card with
          // its border + glass fill) so the page doesn't visually
          // shift when data arrives — only the inner shimmer bars
          // are replaced by real content.
          <>
            <div className={styles.banner} aria-hidden="true">
              <div
                className={`${styles.bannerSkeleton} ${homeStyles.skeleton}`}
              />
            </div>
            <section
              className={`${styles.hero} ${styles.heroSkeleton}`}
              aria-hidden="true"
            >
              <div
                className={`${styles.heroLogo} ${homeStyles.skeleton}`}
              />
              <div className={styles.heroInfo}>
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
            <section className={styles.aboutCompany} aria-hidden="true">
              {/* Heading bar — sits where the "About the Company"
                  title lives, sized roughly to the rendered title's
                  width so the page doesn't reflow when the real
                  text replaces it. */}
              <div
                className={homeStyles.skeleton}
                style={{
                  width: 220,
                  maxWidth: "60%",
                  height: 18,
                  borderRadius: 6,
                  background: "rgba(255, 255, 255, 0.06)",
                }}
              />
              {/* Body paragraph lines — five rows of varying widths
                  so the shimmer reads as prose rather than a flat
                  block. The last line is the shortest (~55%) to
                  mimic a paragraph's natural ragged-right edge. */}
              {[
                "100%",
                "96%",
                "92%",
                "88%",
                "55%",
              ].map((w, i) => (
                <div
                  key={i}
                  className={homeStyles.skeleton}
                  style={{
                    width: w,
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                  }}
                />
              ))}
            </section>
          </>
        ) : companyError !== null ? (
          <section className={styles.errorState} aria-live="polite">
            <p>{companyError}</p>
          </section>
        ) : company !== null ? (
          <>
            {/* ── Banner image — full width, rounded corners. When
                the API doesn't return a `banner_url`, fall back to
                the live YP CDN's company-banner placeholder PNG so
                the page never shows an empty hero strip. ── */}
            <div className={styles.banner} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.bannerUrl || DEFAULT_COMPANY_BANNER}
                alt=""
              />
            </div>

            {/* ── Hero card — logo + info column + 2 action buttons.
                Logo falls back to the live YP CDN's default-logo
                SVG when the API row has no `logo_url` (or when the
                remote image fails to load). ── */}
            <section className={styles.hero} aria-label="Company summary">
              <div className={styles.heroLogo} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logoUrl || DEFAULT_COMPANY_LOGO}
                  alt=""
                  onError={(e) => {
                    // Swap in the default SVG if the remote logo
                    // 404s — defensive in case the API returns a
                    // stale URL that no longer resolves.
                    if (e.currentTarget.src !== DEFAULT_COMPANY_LOGO) {
                      e.currentTarget.src = DEFAULT_COMPANY_LOGO;
                    }
                  }}
                />
              </div>

              <div className={styles.heroInfo}>
                <h2 className={styles.heroName}>{company.name}</h2>
                {company.location || company.industry ? (
                  <div className={styles.heroMetaRow}>
                    {/* Each meta block renders ONLY when its value
                        is non-empty — both label AND value are
                        suppressed together so nothing prints when
                        the API returns null/empty for that field
                        (no more "Location — / Industry —" rows). */}
                    {company.location ? (
                      <div className={styles.heroMetaBlock}>
                        <p className={styles.heroMetaLabel}>Location</p>
                        <p className={styles.heroMetaValue}>
                          {company.location}
                        </p>
                      </div>
                    ) : null}
                    {company.industry ? (
                      <div className={styles.heroMetaBlock}>
                        <p className={styles.heroMetaLabel}>Industry</p>
                        <p className={styles.heroMetaValue}>
                          {company.industry}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className={styles.heroActions}>
                {/* Website — outline pill linking to the company's
                    external site. Hidden when the API returns no
                    URL so we don't render a dead link. */}
                {company.websiteUrl ? (
                  <a
                    className={styles.btnWebsite}
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Website
                  </a>
                ) : null}

                {/* Follow / Following pill — gradient when not
                    following, cyan ring + soft tint when already
                    following (matching the listing-page style and
                    the jobs-page Applied pill). Clicking the
                    "Following" button opens the confirmation dialog
                    before actually unfollowing. While a request is
                    in flight, the label flips to a transitional
                    state and the button is disabled. */}
                {company.followStatus ? (
                  <button
                    type="button"
                    className={`${styles.btnGradient} ${styles.btnFollowing}`}
                    onClick={handleFollowClick}
                    disabled={followInFlight}
                    aria-pressed
                  >
                    {followInFlight ? "Unfollowing..." : "Following"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnGradient}
                    onClick={handleFollowClick}
                    disabled={followInFlight}
                    aria-pressed={false}
                  >
                    {followInFlight ? "Following..." : "Follow"}
                  </button>
                )}
              </div>
            </section>

            {/* ── About the Company — full-width card with HTML
                rich-text body (the API returns `<p>…</p>`). ── */}
            <section
              className={styles.aboutCompany}
              aria-label="About the company"
            >
              <h3 className={styles.aboutHeading}>About the Company</h3>
              {company.description ? (
                <div
                  className={styles.aboutBody}
                  dangerouslySetInnerHTML={{ __html: company.description }}
                />
              ) : (
                <p className={styles.aboutBody}>No description available.</p>
              )}
            </section>
          </>
        ) : null}
      </main>

      {/* ── Confirm-unfollow dialog — same chrome as the home / jobs
          "Remove saved job?" dialog, just relabelled. Only shown
          for the unfollow path; the follow path runs synchronously
          without confirmation. */}
      <ConfirmDialog
        open={confirmUnfollowOpen}
        title="Unfollow Company?"
        message={
          company
            ? `Are you sure you want to unfollow ${company.name}?`
            : "Are you sure you want to unfollow this company?"
        }
        confirmLabel="Yes, Unfollow"
        cancelLabel="Cancel"
        loadingLabel="Unfollowing..."
        loading={followInFlight}
        onConfirm={runUnfollow}
        onCancel={cancelUnfollow}
      />
    </div>
  );
}
