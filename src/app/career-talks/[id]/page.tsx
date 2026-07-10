"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset, scrollbar) is shared with
// /home, /jobs, /jobs/[id], /company, /company/[id], /events and
// /events/[id] via the home module. Career-talk-detail-specific
// styles (banner overlay, "Career Talks" corner badge, body cards)
// live in `careerTalkDetails.module.css`.
// Career-talks-OWNED chrome CSS — self-contained copy of the shared
// `home.module.css`. Lets this page render pixel-identical without
// depending on the host project's `/home` module.
import chromeStyles from "../_chrome.module.css";
import styles from "./careerTalkDetails.module.css";
import { useCareerTalks } from "@/app/lib/career-talks/useCareerTalks";
import {
  classifyVideoUrl,
  toYouTubeEmbedUrl,
} from "@/app/lib/career-talks/videoSourceType";

/** Left-arrow used inside the page-title's back button. EXACT same
 *  glyph (`<line>` + `<polyline>`) and stroke spec the /events/[id]
 *  and /jobs/[id] pages use — so every details page in the app
 *  shares one identical back-button affordance, per the user spec. */
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
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 14.2L11 13V7h1.5v5.25l4.5 2.67-.8 1.28z" />
    </svg>
  );
}

function VideoCameraIcon() {
  /* Font Awesome `fas fa-video` — exact same class the live YP /
     Apprenticeships site uses on the Event Video heading. Colour
     follows `currentColor` (set by the parent `.videoHeadingIcon`),
     so dark mode keeps it white and light mode flips it to black
     fill via the `[data-theme="light"]` rule in the CSS module. */
  return <i className="fas fa-video" aria-hidden="true" />;
}

export default function CareerTalkDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, setUser } = useAuth();
  /** Career Talks details page opts into the light/dark theme by
   *  stamping `data-theme="..."` on its root container — same pattern
   *  as the listing page so all descendants (navbar, body, video card,
   *  preview modal) pick up the matching palette via CSS variables. */
  const { theme } = useTheme();
  /** Pull the talks list from the data layer (today: localStorage
   *  populated by the upload page; tomorrow: real API). Per spec
   *  the static fallback inside the hook is OFF, so an empty
   *  `talks` array means "nothing uploaded yet" — the page falls
   *  through to the "Talk not found" state below. */
  const { talks, loading: talksLoading } = useCareerTalks();
  const talkId = params?.id ?? "";
  const talk = talks.find((t) => t.id === talkId) ?? null;

  // Re-hydrate the viewer's profile on hard refresh. `useAuth()` starts
  // at `null` on every reload (state isn't persisted; only the HttpOnly
  // auth cookie is), so without this fetch the page used to see `!user`
  // and bounce to `/auth` — which then redirected authenticated users
  // back to `/home`, breaking the deep link. We hit the same
  // `/api/mobile/profile` endpoint /home, /jobs, /career-talks (listing)
  // use; the backend reads the cookie and returns the AuthUser, which
  // we push back into AuthContext via `setUser`. If the fetch fails
  // (truly logged-out), `user` stays null and the skeleton stays on
  // screen — no forced redirect.
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
        // Silent fail — page falls through to the skeleton.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Image-preview modal state. The showcase image between the
  // description card and the Event Video section opens this modal
  // on click; hover reveals a dark wash + search-plus glyph as the
  // affordance hint (smooth fade transition, no layout shift). */
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  // Event-video playback state. Initially the video card renders the
  // thumbnail + centered play button (same look as the live YP SS).
  // Clicking the play button flips this flag → the JSX swaps the
  // thumbnail for a real <video> element with native controls + an
  // `autoPlay` so playback starts immediately, matching the
  // reference SS where clicking play instantly drops the viewer into
  // the playing recording with full transport controls. Only talks
  // that have `videoUrl` set will mount the player on click.
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Close the preview on Escape so keyboard users have parity with
  // clicking the backdrop or the close button.
  useEffect(() => {
    if (!imagePreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreviewOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [imagePreviewOpen]);

  // While the profile fetch is in flight, render a full-layout
  // skeleton that mirrors the real details-page structure (title
  // row + banner + chip + description card with meta + divider +
  // paragraph lines + mid image + Event Video section). Keeps the
  // layout from shifting when the real content arrives and gives
  // the user a coherent loading state across light AND dark modes.
  if (!user) {
    return (
      <div className={chromeStyles.page} data-theme={theme}>
        <Navbar />
        <main className={styles.main} aria-hidden="true">
          {/* Title row skeleton */}
          <div className={styles.titleRow}>
            <div
              className={`${styles.backBtn} ${chromeStyles.skeleton}`}
            />
            <div
              className={`${chromeStyles.skelLine} ${chromeStyles.skelName} ${chromeStyles.skeleton}`}
              style={{ width: 220, height: 24 }}
            />
          </div>

          {/* Banner skeleton */}
          <div className={styles.banner}>
            <div
              className={`${styles.bannerInner} ${chromeStyles.skeleton}`}
            />
            <div className={styles.bannerBadge}>
              <div
                className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                style={{ width: 90, height: 16 }}
              />
            </div>
          </div>

          {/* Body skeleton */}
          <div className={styles.body}>
            {/* Description card skeleton */}
            <section className={styles.card}>
              <div className={styles.metaRow}>
                <span className={styles.metaPill}>
                  <div
                    className={`${styles.metaIcon} ${chromeStyles.skeleton}`}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                  />
                  <div
                    className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                    style={{ width: 160, height: 14 }}
                  />
                </span>
                <span className={styles.metaPill}>
                  <div
                    className={`${styles.metaIcon} ${chromeStyles.skeleton}`}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                  />
                  <div
                    className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                    style={{ width: 90, height: 14 }}
                  />
                </span>
              </div>
              <div className={styles.metaDivider} />
              {/* Paragraph skeleton lines */}
              {[100, 95, 88, 70].map((w, i) => (
                <div
                  key={`lead-${i}`}
                  className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                  style={{ width: `${w}%`, height: 14, marginTop: i === 0 ? 4 : 0 }}
                />
              ))}
              <div
                className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                style={{ width: 180, height: 18, marginTop: 8 }}
              />
              {[98, 92, 85].map((w, i) => (
                <div
                  key={`para-${i}`}
                  className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                  style={{ width: `${w}%`, height: 14 }}
                />
              ))}
              {/* Bullet list skeleton */}
              <div
                className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                style={{ width: 200, height: 18, marginTop: 8 }}
              />
              {[80, 75, 70].map((w, i) => (
                <div
                  key={`bullet-${i}`}
                  className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                  style={{ width: `${w}%`, height: 14, marginLeft: 22 }}
                />
              ))}
            </section>

            {/* Mid image skeleton */}
            <div className={styles.midImageWrap}>
              <div
                className={`${styles.midImage} ${chromeStyles.skeleton}`}
                style={{ aspectRatio: "16 / 9", height: "auto" }}
              />
            </div>

            {/* Event Video section skeleton */}
            <section className={styles.videoSection}>
              <h2 className={styles.videoHeading}>
                <span
                  className={`${styles.videoHeadingIcon} ${chromeStyles.skeleton}`}
                  style={{ width: 32, height: 32, borderRadius: 6 }}
                />
                <div
                  className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                  style={{ width: 140, height: 22 }}
                />
                <span className={styles.videoHeadingLine} />
              </h2>
              <div
                className={`${styles.videoCard} ${chromeStyles.skeleton}`}
              />
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ── Talk loading / not-found guard ──
  // The data hook (`useCareerTalks`) reads localStorage on mount, so
  // on the very first client render `talksLoading` is true even when
  // there IS uploaded data. We keep the same full-page skeleton on
  // screen during that window so the page doesn't flash an empty
  // "Talk not found" state before the read completes.
  //
  // If the read completes and the talk genuinely isn't there (the
  // URL id matches no row in the uploaded data, OR nothing has been
  // uploaded at all), we render a minimal "not found" page with a
  // link back to the listing.
  if (talksLoading) {
    return (
      <div className={chromeStyles.page} data-theme={theme}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.titleRow}>
            <span
              className={`${styles.backBtn} ${chromeStyles.skeleton}`}
              aria-hidden="true"
            />
            <div
              className={`${chromeStyles.skelLine} ${chromeStyles.skelName} ${chromeStyles.skeleton}`}
            />
          </div>
          <div
            className={`${styles.bannerInner} ${chromeStyles.skeleton}`}
            aria-hidden="true"
          />
        </main>
      </div>
    );
  }

  if (!talk) {
    return (
      <div className={chromeStyles.page} data-theme={theme}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => router.push("/career-talks")}
              aria-label="Back to Career Talks"
            >
              <BackArrowIcon />
            </button>
            <h1 className={styles.title}>Talk not found</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={chromeStyles.page} data-theme={theme}>
      <Navbar />
      <main className={styles.main}>
        {/* ── Page-title row — back arrow + "Career Talks Details"
            heading. Same structure / styling as the title row on
            /events/[id], /jobs/[id], /company/[id] so every detail
            page in the app shares one top-of-page header. ── */}
        <div className={styles.titleRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <BackArrowIcon />
          </button>
          <h1 className={styles.title}>Career Talks Details</h1>
        </div>

        {/* ── Top banner — full-width photo with the talk title
            overlaid. The "Career Talks" chip is a SIBLING of the
            clipped `.bannerInner` (NOT a child) so the chip can
            extend BELOW the banner's bottom edge per the reference
            SS — the chip's top blue accent line sits flush with the
            banner's bottom edge and its body hangs underneath. The
            inner wrapper takes the rounded clip + image fill so the
            banner's corners stay rounded while the chip overflows. */}
        <div className={styles.banner}>
          <div className={styles.bannerInner}>
            <div
              className={styles.bannerImage}
              style={
                talk.imageUrl
                  ? { backgroundImage: `url(${talk.imageUrl})` }
                  : {
                      /* Fallback gradient when the talk has no image
                         URL — `url()` with an empty string is invalid
                         CSS and would fire a console error. Same
                         neutral navy gradient the listing-card empty
                         state uses, so the visual stays consistent. */
                      background:
                        "linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)",
                    }
              }
              aria-hidden="true"
            />
            <div className={styles.bannerOverlay} aria-hidden="true" />
            <h1 className={styles.bannerTitle}>{talk.title}</h1>
          </div>
          <div className={styles.bannerBadge}>Career Talks</div>
        </div>

        {/* ── Body — description card (which now also hosts the
            date/time row at the top, divided from the body copy by
            a thin separator), then "Event Video" thumbnail. Mirrors
            the live YP career-talk detail spec but in our dark
            theme. ── */}
        <div className={styles.body}>
          <section className={styles.card} aria-label="About the talk">
            {/* Date / time row — lives INSIDE the description card
                per the spec; SVGs are now bare (no blue gradient
                circle behind them) and larger. */}
            <div className={styles.metaRow} aria-label="Date and time">
              <span className={styles.metaPill}>
                <span className={styles.metaIcon} aria-hidden="true">
                  <CalendarIcon />
                </span>
                <span className={styles.metaText}>{talk.date}</span>
              </span>
              <span className={styles.metaPill}>
                <span className={styles.metaIcon} aria-hidden="true">
                  <ClockIcon />
                </span>
                <span className={styles.metaText}>{talk.time}</span>
              </span>
            </div>
            {/* Thin divider between the date/time row and the body
                copy beneath it, per the reference SS. */}
            <div className={styles.metaDivider} aria-hidden="true" />
            {/* ── Description body ──
                Driven entirely by the uploaded sheet data:
                  - `shortDescription` (sheet column "Short Description")
                    renders as the lead paragraph just under the meta row.
                  - `longDescription` (sheet column "Long Description")
                    is split into paragraphs on double-newlines so a
                    sheet author can include multiple paragraphs by
                    pressing Alt+Enter twice between blocks. Each
                    resulting paragraph is rendered as its own `<p>`
                    so spacing matches the live YP details page.
                If both fields are empty, the section just collapses
                — no placeholder text, no broken layout. */}
            {talk.shortDescription ? (
              <p className={styles.lead}>{talk.shortDescription}</p>
            ) : null}

            {talk.longDescription
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter((para) => para.length > 0)
              .map((para, i) => (
                <p
                  key={`desc-${i}`}
                  className={styles.paragraph}
                  style={{ whiteSpace: "pre-line" }}
                >
                  {para}
                </p>
              ))}
          </section>

          {/* Standalone showcase image between the description card
              and the Event Video section. Rendered as a <button>
              wrapping a real <img> so the whole thumbnail is a single
              clickable affordance: hovering reveals a dark wash +
              search-plus glyph (smoothly fading in, no jump);
              clicking opens the image in a full-screen modal preview.
              The wrapper caps the visible width so the strip stays
              compact.
              ENTIRE block is skipped when the talk has no image URL —
              previously rendered `<img src="">` which the browser
              interprets as "re-fetch the current page as an image",
              triggering a React warning and a wasted network call. */}
          {/* Mid showcase tile — renders for every talk. With an image:
              the tile is clickable, shows the hover overlay + magnifier
              glyph, and opens the preview modal on click. Without an
              image: the tile shows the dark-gradient fallback panel
              with the talk title centred, but click does NOTHING and
              the hover-magnifier overlay is NOT rendered (no preview
              affordance since there's no image to preview). */}
          <div className={styles.midImageWrap}>
            <button
              type="button"
              className={styles.midImageBtn}
              onClick={
                talk.imageUrl
                  ? () => setImagePreviewOpen(true)
                  : undefined
              }
              aria-label={
                talk.imageUrl ? "Open image preview" : undefined
              }
              style={!talk.imageUrl ? { cursor: "default" } : undefined}
            >
              {talk.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={talk.imageUrl}
                  alt=""
                  className={styles.midImage}
                />
              ) : (
                <div className={styles.midImageFallback}>
                  <span className={styles.midImageFallbackTitle}>
                    {talk.title}
                  </span>
                </div>
              )}
              {talk.imageUrl && (
                <span className={styles.midImageOverlay} aria-hidden="true">
                  <span className={styles.midImagePlus}>
                    {/* `las la-search-plus` — Line Awesome glyph, matches
                        the exact icon class the live YP / Apprenticeships
                        site uses on this affordance. CSS is wired up in
                        layout.tsx via the Line Awesome CDN link. */}
                    <i className="las la-search-plus" aria-hidden="true" />
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Event Video section — heading + a smaller video thumbnail
              card that mirrors the banner style. The divider sits
              INLINE next to the "Event Video" label (filling the
              remaining horizontal space) rather than as a full-width
              underline beneath the whole row, per the reference SS. */}
          <section className={styles.videoSection} aria-label="Event video">
            <h2 className={styles.videoHeading}>
              <span className={styles.videoHeadingIcon} aria-hidden="true">
                <VideoCameraIcon />
              </span>
              <span className={styles.videoHeadingText}>Event Video</span>
              <span className={styles.videoHeadingLine} aria-hidden="true" />
            </h2>
            {/* Video card has two modes:
                  1. IDLE (default) → renders the thumbnail + dark
                     overlay + centered play button, identical to the
                     live YP SS.
                  2. PLAYING → swaps the whole card for a real <video>
                     element with native browser controls and `autoPlay`
                     so playback starts instantly. Only mounts the
                     player if the talk has a `videoUrl` (Lloyds cards
                     do; Law / PwC don't yet — those keep the static
                     thumbnail look). */}
            <div className={styles.videoCard}>
              {(() => {
                // Pick the right player for the source URL:
                //   - YouTube URL → <iframe> (browsers can't <video src=youtube>)
                //   - MP4 / direct file → native <video controls>
                //   - missing / "none" → keep showing the static thumb +
                //     play button (clicking does nothing, since there is
                //     no video to play)
                const sourceType = classifyVideoUrl(talk.videoUrl);

                if (videoPlaying && sourceType === "youtube") {
                  return (
                    <iframe
                      className={styles.videoPlayer}
                      src={`${toYouTubeEmbedUrl(talk.videoUrl)}?autoplay=1`}
                      title="Event video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }

                if (videoPlaying && sourceType === "mp4") {
                  return (
                    <video
                      className={styles.videoPlayer}
                      src={talk.videoUrl}
                      poster={talk.imageUrl || undefined}
                      controls
                      autoPlay
                      playsInline
                    />
                  );
                }

                // Idle state — thumbnail + dark overlay + play button.
                return (
                  <>
                    <div
                      className={styles.videoThumb}
                      style={
                        talk.imageUrl
                          ? { backgroundImage: `url(${talk.imageUrl})` }
                          : undefined
                      }
                      aria-hidden="true"
                    />
                    <div className={styles.videoOverlay} aria-hidden="true" />
                    <button
                      type="button"
                      className={styles.videoPlayBtn}
                      aria-label="Play event video"
                      onClick={() => {
                        if (sourceType !== "none") setVideoPlaying(true);
                      }}
                    >
                      <i className="fas fa-play" aria-hidden="true" />
                    </button>
                  </>
                );
              })()}
            </div>
          </section>
        </div>
      </main>

      {/* ── Image preview modal ──
          Mounted only when `imagePreviewOpen` is true. The backdrop
          itself is the close affordance (click anywhere outside the
          image, or press Escape — see effect above — to dismiss);
          clicking the image's bounds is stopped from propagating so
          the modal doesn't close when the viewer is just inspecting
          the photo. Image is sized to fit within the viewport
          (`max-width: 90vw; max-height: 90vh`) without cropping. */}
      {imagePreviewOpen && talk.imageUrl && (
        <div
          className={styles.previewBackdrop}
          onClick={() => setImagePreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className={styles.previewClose}
            onClick={() => setImagePreviewOpen(false)}
            aria-label="Close preview"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
          {/* For the preview modal we serve the FULL-RESOLUTION image,
              not the `thumb_*` thumbnail used elsewhere on the page —
              upscaling a thumbnail to 90vw made it look hazy/soft. The
              YP CDN stores both versions side-by-side; stripping the
              `thumb_` prefix from the path yields the high-res JPEG
              (this is exactly what the live YP site does for its
              click-to-preview gesture). Falls back to the thumb URL
              if the path doesn't contain the prefix, so non-YP image
              sources still render. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={talk.imageUrl.replace("/thumb_", "/")}
            alt=""
            className={styles.previewImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
