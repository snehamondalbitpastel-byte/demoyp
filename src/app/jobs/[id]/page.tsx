"use client";

/**
 * Job details — dynamic route at /jobs/[id].
 *
 * Fetches the job record from /api/mobile/job and the similar-jobs
 * list from /api/mobile/company/similar-jobs. Save / Apply / Remove
 * reuse the same proxy endpoints as the listings page so saved /
 * applied state stays in sync across routes once a fresh fetch lands.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Compose home-page chrome (page background + outer flex column) so this
// page sits identically to the home and jobs listing pages on every
// viewport. Anything page-specific lives in jobDetails.module.css.
import homeStyles from "@/app/home/home.module.css";
import styles from "./jobDetails.module.css";

// ── Backend types ────────────────────────────────────────────────────────

/** Full /api/mobile/job response payload. Only the fields this page
 *  actually renders are typed; the rest are ignored. */
type ApiJob = {
  id: string;
  title?: string;
  company_id?: string;
  company_name?: string;
  company_logo_url?: string | null;
  company_color_url?: string | null;
  company_description?: string | null;
  company_address?: string | null;
  jobsector_id?: string;
  job_sector?: string | null;
  description?: string | null;
  requirements?: string | null;
  work_type?: string | null;
  salary_range?: string | null;
  employment_type?: string | null;
  created_at?: string;
  updated_at?: string;
  keywords?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  /** External URL on the company's careers site — Apply opens this. */
  job_link?: string | null;
  /** Banner image (note backend's field name typo: "jopost" not "jobpost"). */
  jopost_image_url?: string | null;
  /** Locations the job is offered in. */
  location?: string[] | null;
  /** Stringified booleans from the backend: "1" = yes, "0" = no.
   *  Tells us whether the current viewer has already saved / applied. */
  saved_jobs?: string | null;
  applied_jobs?: string | null;
};

/** Similar-jobs response uses the same job-record shape inside
 *  `data.result[]`, plus the wrapping count fields. */
type ApiSimilarJob = ApiJob;

// Default fallback logo when a job has no `company_logo_url` (the
// production YP default-job SVG, hosted on the live site).
const DEFAULT_JOB_IMG =
  "https://youngprofessionals.global/_next/static/media/DefaultJobImage.f982d9f9.svg";

/** Default banner image used when the job-details API returns no
 *  `jopost_image_url`. Hosted on the live YP site (same origin as
 *  `DEFAULT_JOB_IMG`) so every job — including those without a
 *  custom banner — gets a proper banner area at the top, matching
 *  the live-website behaviour. */
const DEFAULT_BANNER_IMG =
  "https://youngprofessionals.global/_next/static/media/companyplaceholder.92093aa2.png";

// ── Inline icons ─────────────────────────────────────────────────────────

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

/** Small banknote glyph used next to the salary range chip
 *  in the hero card, matching the live YP /jobs/[id] reference
 *  where the salary line carries an inline cash icon. */
function SalaryIcon() {
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
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
    </svg>
  );
}

// Exact path copied from Figma asset 1969:251 (42×42, viewBox 0 0 42 42,
// fill white). Used as the back-button glyph next to the "Job Details"
// heading so the arrow shape matches the Figma source 1:1.
function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12.1128 21.8748L21.6297 31.3922C21.8004 31.5625 21.8896 31.7634 21.8975 31.9947C21.9054 32.2257 21.8128 32.4377 21.6197 32.6308C21.4269 32.8169 21.2205 32.9117 21.0006 32.9152C20.7807 32.9184 20.5743 32.8236 20.3816 32.6308L9.74024 21.9895C9.58741 21.8366 9.48022 21.6806 9.41868 21.5213C9.35684 21.3621 9.32593 21.1883 9.32593 20.9998C9.32593 20.8114 9.35684 20.6376 9.41868 20.4783C9.48022 20.3191 9.58741 20.163 9.74024 20.0102L20.3816 9.3689C20.5452 9.20528 20.7442 9.11778 20.9787 9.1064C21.2132 9.09532 21.4269 9.18282 21.6197 9.3689C21.8128 9.56199 21.9093 9.77009 21.9093 9.99321C21.9093 10.2166 21.8128 10.4247 21.6197 10.6175L12.1128 20.1248H32.3756C32.6247 20.1248 32.8328 20.2084 32.9999 20.3755C33.1671 20.5427 33.2506 20.7508 33.2506 20.9998C33.2506 21.2489 33.1671 21.457 32.9999 21.6242C32.8328 21.7913 32.6247 21.8748 32.3756 21.8748H12.1128Z"
        fill="white"
      />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Compact relative-time string for "Posted N days ago", matching the
 *  jobs-listing card. Returns an empty string for unparseable input. */
function formatPostedAgo(iso: string | undefined | null): string {
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

// ── Page ─────────────────────────────────────────────────────────────────

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>();
  // The listing page navigates here via
  //   `router.push(`/jobs/${encodeURIComponent(jobId)}`)`
  // so the URL segment is URL-encoded (e.g. a job id ending in `=`
  // arrives as `…%3D`). Next.js's `useParams()` does NOT decode this
  // for us in every release, so without an explicit `decodeURIComponent`
  // here we'd POST `{ "id": "...%3D" }` to the backend — which can't
  // find a job with that literal id, hence the "Couldn't load this
  // job." error for every base64-padded id (anything ending in `=`).
  // The try/catch is purely defensive: if the value is somehow
  // already decoded AND contains a stray `%`, decodeURIComponent
  // throws and we fall back to the raw value rather than crashing
  // the page.
  const rawId = typeof params?.id === "string" ? params.id : "";
  const jobId = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const router = useRouter();
  const { setUser } = useAuth();

  // ── Seed the AuthContext on mount so the navbar avatar resolves
  //    out of its skeleton state when this page is loaded directly
  //    (hard refresh, paste-link, etc.). The home / jobs-listing /
  //    company / events pages do this; the detail route was missing
  //    the same fetch, which is why the navbar's avatar circle stayed
  //    in shimmer state forever after the job data itself loaded —
  //    `useAuth().user` had never been hydrated for this route.
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

  const [job, setJob] = useState<ApiJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [similarJobs, setSimilarJobs] = useState<ApiSimilarJob[] | null>(null);

  // Derived state for the Save / Apply pills. Seeded from the API
  // response's stringified flags (`"1"` = yes); kept up-to-date with
  // optimistic-then-confirmed updates on save / apply / remove.
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Per-similar-card in-flight flags. Map of job-id → action so we
  // can disable just the one card the viewer interacted with.
  const [similarSaving, setSimilarSaving] = useState<string | null>(null);
  const [similarApplying, setSimilarApplying] = useState<string | null>(null);
  const [similarSavedIds, setSimilarSavedIds] = useState<Set<string>>(
    new Set()
  );
  const [similarAppliedIds, setSimilarAppliedIds] = useState<Set<string>>(
    new Set()
  );
  const [confirmRemoveSimilarId, setConfirmRemoveSimilarId] = useState<
    string | null
  >(null);
  const [removingSimilar, setRemovingSimilar] = useState(false);

  // ── Fetch the job record ──
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    async function fetchJob() {
      try {
        const res = await fetch("/api/mobile/job", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: jobId }),
        });
        if (!res.ok) {
          if (!cancelled) setJobError("Couldn't load this job.");
          return;
        }
        const json = (await res.json()) as { status?: string; data?: ApiJob };
        if (cancelled) return;
        if (json?.status === "OK" && json.data) {
          setJob(json.data);
          setSaved(json.data.saved_jobs === "1");
          setApplied(json.data.applied_jobs === "1");
          setJobError(null);
        } else {
          setJobError("Couldn't load this job.");
        }
      } catch {
        if (!cancelled) setJobError("Couldn't load this job.");
      }
    }
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // ── Fetch similar jobs (right-column "More jobs by this company") ──
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    async function fetchSimilar() {
      try {
        const res = await fetch("/api/mobile/company/similar-jobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: jobId, page: 1, limit: 6 }),
        });
        if (!res.ok) {
          if (!cancelled) setSimilarJobs([]);
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiSimilarJob[] };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          const list = json.data.result;
          setSimilarJobs(list);
          // Seed each card's saved / applied state from the response's
          // own per-row flags so each mini-card opens with the right
          // pill instead of always defaulting to Save Job / Apply.
          setSimilarSavedIds(
            new Set(list.filter((j) => j.saved_jobs === "1").map((j) => j.id))
          );
          setSimilarAppliedIds(
            new Set(list.filter((j) => j.applied_jobs === "1").map((j) => j.id))
          );
        } else {
          setSimilarJobs([]);
        }
      } catch {
        if (!cancelled) setSimilarJobs([]);
      }
    }
    fetchSimilar();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // ── Hero card actions ──

  const handleSave = async () => {
    if (saving || !jobId) return;
    setSaving(true);
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
      setSaved(true);
      toast.success("Job saved successfully");
    } catch {
      toast.error("Couldn't save this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (applying || applied || !jobId) return;
    if (job?.job_link) {
      // Open synchronously inside the user-gesture click frame so the
      // browser doesn't blackhole it as a programmatic pop-up.
      window.open(job.job_link, "_blank", "noopener,noreferrer");
    }
    setApplying(true);
    try {
      const res = await fetch("/api/mobile/user/applied-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !(json && (json.status === "OK" || json.id))) {
        throw new Error(json?.message || "Apply failed");
      }
      setApplied(true);
      toast.success("Job applied successfully");
    } catch {
      toast.error("Couldn't apply for this job. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const requestRemove = () => {
    if (saving) return;
    setConfirmingRemove(true);
  };

  const cancelRemove = () => {
    if (removing) return;
    setConfirmingRemove(false);
  };

  const confirmRemove = async () => {
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
      setSaved(false);
      toast.success("Job removed successfully");
    } catch {
      toast.error("Couldn't remove this job. Please try again.");
    } finally {
      setRemoving(false);
      setConfirmingRemove(false);
    }
  };

  // ── Similar-card actions (mirror the hero, scoped per-id) ──

  const handleSimilarSave = async (id: string) => {
    if (similarSaving) return;
    setSimilarSaving(id);
    try {
      const res = await fetch("/api/mobile/user/save-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Save failed");
      }
      setSimilarSavedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      toast.success("Job saved successfully");
    } catch {
      toast.error("Couldn't save this job. Please try again.");
    } finally {
      setSimilarSaving(null);
    }
  };

  const handleSimilarApply = async (id: string, link: string | null) => {
    if (similarApplying || similarAppliedIds.has(id)) return;
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
    setSimilarApplying(id);
    try {
      const res = await fetch("/api/mobile/user/applied-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !(json && (json.status === "OK" || json.id))) {
        throw new Error(json?.message || "Apply failed");
      }
      setSimilarAppliedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      toast.success("Job applied successfully");
    } catch {
      toast.error("Couldn't apply for this job. Please try again.");
    } finally {
      setSimilarApplying(null);
    }
  };

  const requestRemoveSimilar = (id: string) => {
    if (similarSaving) return;
    setConfirmRemoveSimilarId(id);
  };

  const cancelRemoveSimilar = () => {
    if (removingSimilar) return;
    setConfirmRemoveSimilarId(null);
  };

  const confirmRemoveSimilar = async () => {
    const id = confirmRemoveSimilarId;
    if (!id || removingSimilar) return;
    setRemovingSimilar(true);
    try {
      const res = await fetch("/api/mobile/user/remove-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Remove failed");
      }
      setSimilarSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Job removed successfully");
    } catch {
      toast.error("Couldn't remove this job. Please try again.");
    } finally {
      setRemovingSimilar(false);
      setConfirmRemoveSimilarId(null);
    }
  };

  // ── Derived display values ──

  const bannerUrl =
    typeof job?.jopost_image_url === "string" && job.jopost_image_url
      ? job.jopost_image_url
      : null;
  const heroLogoUrl = job?.company_logo_url || DEFAULT_JOB_IMG;
  const locations = Array.isArray(job?.location)
    ? job?.location.filter((l): l is string => typeof l === "string" && !!l)
    : [];
  const tagChips = [job?.work_type, job?.employment_type].filter(
    (t): t is string => typeof t === "string" && !!t && t !== "Unknown"
  );
  // Salary range chip — rendered in its own row beneath the
  // employment-type chip per the live YP reference. The upstream
  // ships the literal string "None" when no range is set; the
  // live site shows that verbatim so we match that behaviour
  // exactly. Only an actually empty / null value hides the chip.
  const salaryRangeRaw =
    typeof job?.salary_range === "string" ? job.salary_range.trim() : "";
  const salaryRange = salaryRangeRaw || null;
  const postedAgo = formatPostedAgo(job?.created_at);

  return (
    <div className={homeStyles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.pageTitleRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <BackArrowIcon />
          </button>
          <h1 className={styles.pageTitle}>Job Details</h1>
        </div>

        {/* ── Hero banner image ──
              Loading: full-size shimmer block.
              Loaded with a `jopost_image_url`: render the real image.
              Loaded WITHOUT a `jopost_image_url`: render the brand
                default gradient banner so EVERY job gets a banner
                (matches the live website behaviour — no job ever
                shows up without a top banner area).
              Error: hide the section entirely. */}
        {job === null && jobError === null ? (
          <section
            className={`${styles.banner} ${styles.bannerSkeleton} ${homeStyles.skeleton}`}
            aria-hidden="true"
          />
        ) : !jobError ? (
          <section className={styles.banner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl || DEFAULT_BANNER_IMG}
              alt={`${job?.company_name ?? "Job"} banner`}
              className={styles.bannerImg}
            />
          </section>
        ) : null}

        {/* ── Hero card ── */}
        {job === null && jobError === null ? (
          <section className={`${styles.hero} ${styles.heroSkeleton}`}>
            <div
              className={`${styles.heroLogo} ${homeStyles.skeleton}`}
              aria-hidden="true"
            />
            <div className={styles.heroInfo} aria-hidden="true">
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
            {/* Actions column placeholder — two pill skeletons matching
                the real Save + Apply buttons (`.btnSaveOutline` /
                `.btnApplyFill`) so when the live data lands, the
                three-column hero grid doesn't shift. Without this, the
                skeleton's right edge looks unbalanced / "cut" because
                the third grid column is empty while the rest of the
                row carries content. */}
            <div className={styles.heroActions} aria-hidden="true">
              <div
                className={`${styles.btnSkeletonPill} ${homeStyles.skeleton}`}
              />
              <div
                className={`${styles.btnSkeletonPill} ${homeStyles.skeleton}`}
              />
            </div>
          </section>
        ) : jobError !== null ? (
          <section className={styles.errorState}>
            <p>{jobError}</p>
          </section>
        ) : (
          <section className={styles.hero}>
            <div className={styles.heroLogo} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroLogoUrl}
                alt=""
                className={styles.heroLogoImg}
              />
            </div>

            <div className={styles.heroInfo}>
              {job?.company_name ? (
                <p className={styles.heroCompany}>{job.company_name}</p>
              ) : null}
              {job?.title ? (
                <h2 className={styles.heroRole}>{job.title}</h2>
              ) : null}
              {locations.length > 0 ? (
                <div className={styles.heroLocations}>
                  {locations.map((loc) => (
                    <span key={loc} className={styles.locationChip}>
                      <LocationIcon />
                      {loc}
                    </span>
                  ))}
                </div>
              ) : null}
              {tagChips.length > 0 ? (
                <div className={styles.heroChips}>
                  {tagChips.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {salaryRange ? (
                <span className={styles.heroSalary}>
                  <SalaryIcon />
                  {salaryRange}
                </span>
              ) : null}
              {postedAgo ? (
                <p className={styles.heroPosted}>{postedAgo}</p>
              ) : null}
            </div>

            <div className={styles.heroActions}>
              {/* Save ↔ Remove — outline pill on both states; clicking
                  Remove pops the confirm dialog. */}
              {saved ? (
                <button
                  type="button"
                  className={styles.btnSaveOutline}
                  disabled={removing}
                  onClick={requestRemove}
                >
                  {removing ? "Removing..." : "Remove"}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnSaveOutline}
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              )}
              {/* Apply ↔ Applied — once applied, button stays disabled
                  with the cyan ring/tint look (one-way action). */}
              {applied ? (
                <button
                  type="button"
                  className={`${styles.btnApplyFill} ${styles.btnApplied}`}
                  disabled
                  aria-label="Already applied"
                >
                  Applied
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnApplyFill}
                  disabled={applying}
                  onClick={handleApply}
                >
                  {applying ? "Applying..." : "Apply"}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Two-column body ──
            Hidden entirely when the job-details fetch errored — without
            this gate, About-the-Job / About-the-Company / Similar-Jobs
            would render with `job` still null and show their fallback
            "No description / Not specified / No similar jobs" copy,
            which reads as broken next to the "Couldn't load this job"
            error in the hero. With the gate, the error message stands
            alone cleanly. */}
        {jobError === null ? (
        <div className={styles.body}>
          {/* LEFT — About the Job, split into three explicit subsections
              per the SS:
                1. Job Description — HTML `description` from API
                2. Required Skills — `requirements` (HTML/text) with
                   a fallback to the `keywords[]` rendered as chips
                3. Job Sector     — plain `job_sector` string
              All three subheadings reuse the existing `.subTitle`
              typography so they read consistently with the rest of
              the dark-glass surfaces on the page. */}
          <section className={styles.aboutJob}>
            <h2 className={styles.sectionTitle}>About the Job</h2>

            <div className={styles.aboutJobScroller}>
              {job === null && jobError === null ? (
                <div className={styles.richText}>
                  <div
                    className={`${homeStyles.skelLine} ${homeStyles.skelLineFull} ${homeStyles.skeleton}`}
                  />
                  <div
                    className={`${homeStyles.skelLine} ${homeStyles.skelLineLong} ${homeStyles.skeleton}`}
                  />
                  <div
                    className={`${homeStyles.skelLine} ${homeStyles.skelLineFull} ${homeStyles.skeleton}`}
                  />
                  <div
                    className={`${homeStyles.skelLine} ${homeStyles.skelLineMed} ${homeStyles.skeleton}`}
                  />
                </div>
              ) : (
                <>
                  {/* ── Job Description ── */}
                  <h3 className={styles.subTitle}>Job Description</h3>
                  {job?.description ? (
                    <div
                      className={styles.richText}
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  ) : (
                    <p className={styles.bodyText}>
                      No description available.
                    </p>
                  )}

                  {/* ── Required Skills ── render `requirements` HTML
                       when the backend has it; otherwise fall back to
                       chips for each `keywords[]` entry; if neither is
                       set, show "Not specified". */}
                  <h3 className={styles.subTitle}>Required Skills</h3>
                  {job?.requirements ? (
                    <div
                      className={styles.richText}
                      dangerouslySetInnerHTML={{ __html: job.requirements }}
                    />
                  ) : Array.isArray(job?.keywords) &&
                    job.keywords.filter((k) => typeof k === "string" && k)
                      .length > 0 ? (
                    <div className={styles.skillChips}>
                      {job.keywords
                        .filter((k): k is string => typeof k === "string" && !!k)
                        .map((kw) => (
                          <span key={kw} className={styles.skillChip}>
                            {kw}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className={styles.bodyText}>Not specified.</p>
                  )}

                  {/* ── Job Sector ── */}
                  <h3 className={styles.subTitle}>Job Sector</h3>
                  <p className={styles.bodyText}>
                    {job?.job_sector?.trim() || "Not specified."}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* RIGHT — gradient About the Company panel + standard More jobs */}
          <aside className={styles.rightCol}>
            <section className={styles.aboutCompany}>
              {/* Heading + company card both stay PINNED at the top of
                  the panel — they are NOT inside `.aboutCompanyScroller`
                  so they don't scroll with the description text. */}
              <h2 className={styles.sectionTitle}>About the Company</h2>

              {job === null && jobError === null ? (
                /* Skeleton state — replaces the partial briefcase
                   placeholder with proper shimmer blocks so the panel
                   reads as "loading" instead of "empty card on a
                   bright gradient panel". */
                <>
                  <div className={styles.aboutCompanyCardSkeleton}>
                    <div
                      className={`${styles.companyLogo} ${homeStyles.skeleton}`}
                      aria-hidden="true"
                    />
                    <div
                      className={styles.companyInfo}
                      aria-hidden="true"
                    >
                      <div
                        className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
                      />
                      <div
                        className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
                      />
                    </div>
                  </div>
                  <div
                    className={styles.aboutCompanyDescSkeleton}
                    aria-hidden="true"
                  >
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skelLineFull} ${homeStyles.skeleton}`}
                    />
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skelLineLong} ${homeStyles.skeleton}`}
                    />
                    <div
                      className={`${homeStyles.skelLine} ${homeStyles.skelLineMed} ${homeStyles.skeleton}`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.companyCard}>
                    <div className={styles.companyLogo} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job?.company_logo_url || DEFAULT_JOB_IMG}
                        alt=""
                        className={styles.companyLogoImg}
                      />
                    </div>
                    <div className={styles.companyInfo}>
                      {job?.company_name ? (
                        <p className={styles.companyName}>
                          {job.company_name}
                        </p>
                      ) : null}
                      {/* Location row removed per spec — only company
                          name + industry/sector are shown in this card. */}
                      {job?.job_sector ? (
                        <p className={styles.companyIndustry}>
                          {job.job_sector}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Only the description (HTML rich text) scrolls. */}
                  {job?.company_description ? (
                    <div className={styles.aboutCompanyScroller}>
                      <div
                        className={`${styles.richText} ${styles.companyAboutText}`}
                        dangerouslySetInnerHTML={{
                          __html: job.company_description,
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className={styles.moreJobs}>
              <h2 className={styles.sectionTitle}>Similar Jobs</h2>
              <div className={styles.moreJobsList}>
                {similarJobs === null ? (
                  <>
                    <article
                      className={`${styles.miniJobCard} ${styles.miniJobCardSkeleton}`}
                      aria-hidden="true"
                    >
                      <div
                        className={`${styles.miniJobLogo} ${homeStyles.skeleton}`}
                      />
                      <div className={styles.miniJobInfo}>
                        <div
                          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
                        />
                        <div
                          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
                        />
                      </div>
                    </article>
                    <article
                      className={`${styles.miniJobCard} ${styles.miniJobCardSkeleton}`}
                      aria-hidden="true"
                    >
                      <div
                        className={`${styles.miniJobLogo} ${homeStyles.skeleton}`}
                      />
                      <div className={styles.miniJobInfo}>
                        <div
                          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
                        />
                        <div
                          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
                        />
                      </div>
                    </article>
                  </>
                ) : similarJobs.length === 0 ? (
                  <p className={styles.bodyText}>No similar jobs found.</p>
                ) : (
                  similarJobs.map((sj) => {
                    const sjId = sj.id;
                    const sjSaved = similarSavedIds.has(sjId);
                    const sjApplied = similarAppliedIds.has(sjId);
                    const sjSavingNow = similarSaving === sjId;
                    const sjApplyingNow = similarApplying === sjId;
                    const sjRemovingNow =
                      removingSimilar && confirmRemoveSimilarId === sjId;
                    const sjLocations = Array.isArray(sj.location)
                      ? sj.location.filter(
                          (l): l is string => typeof l === "string" && !!l
                        )
                      : [];
                    return (
                      <article
                        key={sjId}
                        className={styles.miniJobCard}
                        onClick={() =>
                          router.push(`/jobs/${encodeURIComponent(sjId)}`)
                        }
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/jobs/${encodeURIComponent(sjId)}`);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div className={styles.miniJobLogo} aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sj.company_logo_url || DEFAULT_JOB_IMG}
                            alt=""
                            className={styles.miniJobLogoImg}
                          />
                        </div>
                        <div className={styles.miniJobInfo}>
                          {sj.title ? (
                            <p className={styles.miniJobTitle}>{sj.title}</p>
                          ) : null}
                          {sj.company_name ? (
                            <p className={styles.miniJobCompany}>
                              {sj.company_name}
                            </p>
                          ) : null}
                          {sjLocations.length > 0 ? (
                            <div className={styles.miniJobChips}>
                              {sjLocations.map((loc) => (
                                <span
                                  key={loc}
                                  className={styles.locationChip}
                                >
                                  <LocationIcon />
                                  {loc}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className={styles.miniJobActions}>
                          {sjApplied ? (
                            <button
                              type="button"
                              className={`${styles.miniBtnApplyFill} ${styles.btnApplied}`}
                              disabled
                              aria-label="Already applied"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Applied
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.miniBtnApplyFill}
                              disabled={sjApplyingNow}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSimilarApply(
                                  sjId,
                                  typeof sj.job_link === "string"
                                    ? sj.job_link
                                    : null
                                );
                              }}
                            >
                              {sjApplyingNow ? "Applying..." : "Apply"}
                            </button>
                          )}
                          {sjSaved ? (
                            <button
                              type="button"
                              className={styles.miniBtnSaveOutline}
                              disabled={sjSavingNow || sjRemovingNow}
                              onClick={(e) => {
                                e.stopPropagation();
                                requestRemoveSimilar(sjId);
                              }}
                            >
                              {sjRemovingNow ? "Removing..." : "Remove"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.miniBtnSaveOutline}
                              disabled={sjSavingNow}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSimilarSave(sjId);
                              }}
                            >
                              {sjSavingNow ? "Saving..." : "Save Job"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
        ) : null}
      </main>

      {/* Hero card "Remove" confirmation. */}
      <ConfirmDialog
        open={confirmingRemove}
        title="Remove saved job?"
        message="Are you sure you want to remove this job from your saved list?"
        confirmLabel="Yes, Remove"
        cancelLabel="No"
        loadingLabel="Removing..."
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />

      {/* Similar-cards "Remove" confirmation — same dialog chrome. */}
      <ConfirmDialog
        open={confirmRemoveSimilarId !== null}
        title="Remove saved job?"
        message="Are you sure you want to remove this job from your saved list?"
        confirmLabel="Yes, Remove"
        cancelLabel="No"
        loadingLabel="Removing..."
        loading={removingSimilar}
        onConfirm={confirmRemoveSimilar}
        onCancel={cancelRemoveSimilar}
      />
    </div>
  );
}
