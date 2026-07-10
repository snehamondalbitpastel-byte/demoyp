"use client";

/* HANDOVER — Resources Module · src/app/resources/[id]/page.tsx · COPY? ✅ */

/**
 * Resource detail — wired to the real YP backend.
 *
 * 1:1 port of the HTML mockup (`event-details.html`).
 * Structure (banner card → info card → article body card) matches
 * verbatim. The global `<Navbar />` sits above for consistency with
 * the list page + every other tab.
 *
 * Data: `fetchResourceDetail(id)` → POST /api/mobile/resources/detail.
 * Three render states:
 *   detail === undefined → loading
 *   detail === null      → "no longer available" empty state
 *   detail (object)      → render banner + info + article
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useTheme } from "@/app/context/ThemeContext";
import chromeStyles from "../_chrome.module.css";
import styles from "./resourceDetail.module.css";
import { fetchResourceDetail } from "../lib/api";
import type { ResourceDetail } from "../lib/types";

/** Pre-computed pseudo-random heights for the 60-bar waveform
 *  visualization. Bumped 40 → 60 per user "audio bars need to
 *  be closer together" spec — more bars in the same waveform
 *  width naturally shrinks the gap between them (since
 *  `justify-content: space-between` distributes the remaining
 *  width across more elements). */
const WAVEFORM_HEIGHTS = [
  35, 55, 78, 92, 65, 80, 95, 60, 45, 70,
  85, 50, 95, 60, 35, 75, 90, 55, 65, 80,
  45, 95, 70, 55, 85, 60, 40, 75, 90, 50,
  65, 80, 55, 95, 70, 45, 85, 60, 75, 50,
  40, 88, 62, 78, 50, 92, 68, 45, 82, 58,
  72, 90, 55, 65, 85, 48, 95, 70, 60, 75,
];

/** Auto-linkify URL-like text inside a backend-shipped HTML string.
 *  The CMS hands us prose that says things like "visit
 *  Apprenticeships.co.uk for more" as PLAIN TEXT (no <a>), but the
 *  description card wants those domains rendered as clickable blue
 *  links. We walk the parsed HTML, find text nodes that contain URL
 *  patterns, and split them into a sequence of text + <a> nodes so
 *  the existing `.detailBody :global(a) { color: var(--blue) }`
 *  styling picks them up automatically.
 *
 *  Patterns matched (in order, longest first to avoid mid-URL
 *  splits):
 *    1. `https://…` / `http://…`         → wrapped verbatim
 *    2. `www.foo.bar`                    → wrapped, href prepends `https://`
 *    3. `Foo.com` / `Foo.co.uk` etc.     → wrapped, href prepends `https://`
 *
 *  Important: text inside existing <a>, <code>, <pre>, <script>,
 *  <style>, or any node whose parent is one of those, is SKIPPED so
 *  we don't double-wrap or pollute code blocks. SSR-safe — if the
 *  function runs during SSR (no `window`/`DOMParser`), it returns
 *  the original HTML unchanged and the client hydrates with the
 *  linkified version. */
function linkifyHtml(html: string): string {
  if (!html) return html;
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  // Common gTLDs + a curated set of ccTLDs and 2-part suffixes we
  // see in YP content (uk co.uk gov.uk ac.uk, etc.). Keeping this a
  // closed list avoids accidentally linkifying things like "v1.5"
  // or "vs.something" — only real domain endings match.
  const TLD = "(?:co\\.uk|ac\\.uk|gov\\.uk|org\\.uk|com|org|net|io|edu|gov|info|biz|app|ai|dev|tech|uk|us|ca|de|fr|jp|in|au|nz|eu|tv|me)";
  const URL_RE = new RegExp(
    // 1. http(s)://…
    "https?:\\/\\/[^\\s<>\"')]+"
    + "|"
    // 2. www.<host>(/path)?
    + "www\\.[A-Za-z0-9][\\w.-]*\\." + TLD + "(?:\\/[^\\s<>\"')]*)?"
    + "|"
    // 3. Bare domain like Apprenticeships.co.uk
    + "\\b[A-Za-z][A-Za-z0-9-]{1,}(?:\\." + TLD + ")\\b(?:\\/[^\\s<>\"')]*)?",
    "gi"
  );
  const SKIP_TAGS = new Set(["A", "CODE", "PRE", "SCRIPT", "STYLE", "TEXTAREA"]);

  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode;
      while (p && p !== doc.body) {
        if (p.nodeType === 1 && SKIP_TAGS.has((p as Element).tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return URL_RE.test(node.textContent ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const targets: Text[] = [];
  let n: Node | null = walker.nextNode();
  while (n) {
    targets.push(n as Text);
    n = walker.nextNode();
  }

  for (const text of targets) {
    const str = text.textContent ?? "";
    URL_RE.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_RE.exec(str)) !== null) {
      const matched = m[0];
      const start = m.index;
      // Strip trailing punctuation that's NOT really part of the
      // URL (".", ",", ")", etc. clinging to a sentence ending).
      const cleanMatch = matched.replace(/[.,;:!?)]+$/, "");
      const trailing = matched.slice(cleanMatch.length);

      if (start > lastIdx) frag.appendChild(doc.createTextNode(str.slice(lastIdx, start)));

      let href = cleanMatch;
      if (!/^https?:\/\//i.test(href)) href = "https://" + href.replace(/^www\./i, "");
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.textContent = cleanMatch;
      frag.appendChild(a);
      if (trailing) frag.appendChild(doc.createTextNode(trailing));

      lastIdx = start + matched.length;
    }
    if (lastIdx < str.length) frag.appendChild(doc.createTextNode(str.slice(lastIdx)));
    text.parentNode?.replaceChild(frag, text);
  }

  return doc.body.innerHTML;
}

/** Custom audio player widget — replaces the native `<audio
 *  controls>` strip on the detail-page banner. Mirrors the live
 *  YP reference SS: blue circular play/pause button on the left,
 *  "🎵 Audio" label + animated waveform + time row on the right,
 *  all inside a dark-glass rounded card. The played portion of
 *  the waveform brightens as the audio progresses. */
function AudioPlayer({ src, active = true }: { src: string; active?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Ref to the straight progress line — used by the drag-seek math so
  // it can read the bar's live rect during a `window` pointermove
  // (the move events fire even when the cursor leaves the bar).
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Reset state when the `src` changes (user navigates between
  // resources). Without this the duration/time from the previous
  // audio leaks into the new widget.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  // Pause the audio whenever its slide is NOT the active one — so
  // swiping to another media stops playback instead of leaving it
  // playing in the background.
  useEffect(() => {
    if (active) return;
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
  }, [active]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  /** Click-to-seek — user clicks anywhere on the waveform to
   *  jump to that timestamp. Works during playback AND while
   *  paused (setting `audio.currentTime` is independent of play
   *  state). Mirrors the YP reference SS behaviour. */
  function handleWaveformSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = ratio * duration;
  }

  // ── Drag-to-seek on the straight progress line ──
  // Pointer-based: press anywhere on the bar and slide the dot from
  // start to end. The move/up listeners live on `window` so the drag
  // keeps tracking even when the cursor leaves the thin bar. Works
  // whether the audio is playing or paused. `setCurrentTime` is set
  // alongside `audio.currentTime` for instant visual feedback.
  function seekToClientX(clientX: number) {
    const el = progressRef.current;
    const audio = audioRef.current;
    if (!el || !audio || !Number.isFinite(duration) || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  }

  function handleProgressPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    seekToClientX(e.clientX);
    const onMove = (ev: PointerEvent) => seekToClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className={styles.audioPlayer}>
      {/* Hidden native audio element — drives playback; the custom
          UI above is the user-facing surface. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />
      {/* TOP ROW — decorative music box (LEFT) + audio label /
          waveform stack (RIGHT). The music box stretches
          vertically to match the height of label + waveform
          combined per user spec. */}
      <div className={styles.audioTopRow}>
        <div className={styles.audioMusicBox} aria-hidden="true" />
        <div className={styles.audioLabelWaveform}>
          <div className={styles.audioLabel}>
            {/* Lucide "music-2" glyph before the "Audio" label — exact
                svg the user pasted. As the first child of `.audioLabel`
                (which starts at the column's left edge) its left edge
                lines up with the first waveform bar below. */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="18" r="4" />
              <path d="M12 18V2l7 4" />
            </svg>
            <span>Audio</span>
          </div>
          <div
            className={styles.audioWaveform}
            onClick={handleWaveformSeek}
            role="slider"
            aria-label="Seek audio position (waveform)"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            {WAVEFORM_HEIGHTS.map((h, i) => {
              const barProgress = i / WAVEFORM_HEIGHTS.length;
              const isPlayed = barProgress < progress;
              return (
                <span
                  key={i}
                  className={`${styles.waveformBar} ${isPlayed ? styles.waveformBarPlayed : ""}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          {/* Progress bar — sits below the waveform inside
              `.audioLabelWaveform` so it shares the SAME left X
              and right X as the waveform. */}
          <div
            ref={progressRef}
            className={styles.audioProgressBar}
            onPointerDown={handleProgressPointerDown}
            role="slider"
            aria-label="Seek audio position"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div
              className={styles.audioProgressFill}
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className={styles.audioProgressHandle}
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          {/* Bottom row — `0:00 [▶ play] 1:17` — also INSIDE
              `.audioLabelWaveform` so the time labels' left/right
              edges line up with the waveform's left/right edges
              (not the full player width). */}
          <div className={styles.audioBottomRow}>
            <span className={styles.audioBottomTime}>{formatTime(currentTime)}</span>
            <button
              type="button"
              className={styles.audioPlayBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4.5" width="4" height="15" rx="1" />
                  <rect x="14" y="4.5" width="4" height="15" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
                </svg>
              )}
            </button>
            <span className={styles.audioBottomTime}>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Custom video player widget — replaces the native `<video controls>`
 *  on the detail-page banner. Matches the user's reference SS: dark
 *  navy surface, large centered play / pause button flanked by
 *  skip-back-10 and skip-forward-10 buttons, and a bottom bar with
 *  current-time, progress bar, total duration, speed cycle (1× / 1.25× /
 *  1.5× / 2×), mute toggle, and fullscreen toggle. */
function VideoPlayer({ src, title, active = true }: { src: string; title?: string; active?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  // ── Bottom-bar width = VISIBLE video width ──
  // The video is `object-fit: contain`, so when its aspect ratio
  // doesn't match the banner box it's pillar-boxed (black bars on
  // the sides). `videoAspect` (w/h, captured on metadata load) +
  // `mediaWidth` (the live displayed pixel width, recomputed on
  // every container resize) let us shrink the control bar to sit
  // ONLY under the visible video, centred — per user spec. While
  // `mediaWidth` is null (pre-metadata) the bar falls back to the
  // CSS full-width default.
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [mediaWidth, setMediaWidth] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      setDuration(v.duration || 0);
      // Capture intrinsic aspect ratio (w/h) so the bottom bar can be
      // sized to the visible (contain-fitted) video width.
      if (v.videoWidth && v.videoHeight) {
        setVideoAspect(v.videoWidth / v.videoHeight);
      }
    };
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVol = () => setIsMuted(v.muted);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
    // Clear the measured aspect / width so the new video re-measures
    // from its own metadata (otherwise the previous clip's box leaks).
    setVideoAspect(null);
    setMediaWidth(null);
  }, [src]);

  // Pause the video whenever its slide is NOT the active one — so
  // swiping to the next / previous media stops playback instead of
  // leaving it running in the background. (Default `active = true`
  // means standalone usage is unaffected.)
  useEffect(() => {
    if (active) return;
    const v = videoRef.current;
    if (v && !v.paused) v.pause();
  }, [active]);

  // ── Recompute the visible video width whenever the aspect ratio is
  // known OR the container resizes (window resize, entering / leaving
  // fullscreen). `object-fit: contain` math:
  //   • video relatively WIDER than the box → width-constrained →
  //     fills full box width (black bars top/bottom).
  //   • video relatively TALLER → height-constrained → pillar-boxed →
  //     displayed width = boxHeight × videoAspect (narrower).
  // The bottom bar is then set to that exact width and centred. ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videoAspect) {
      setMediaWidth(null);
      return;
    }
    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const containerAspect = cw / ch;
      const displayed = videoAspect >= containerAspect ? cw : ch * videoAspect;
      setMediaWidth(Math.round(displayed));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [videoAspect]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }

  function skip(deltaSec: number) {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min((v.duration || 0), v.currentTime + deltaSec));
    v.currentTime = next;
  }

  function handleProgressSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || !Number.isFinite(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    v.currentTime = ratio * duration;
  }

  function cycleRate() {
    const rates = [1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    const v = videoRef.current;
    if (v) v.playbackRate = next;
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function nudgeShow() {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2500);
  }

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.videoPlayer} ${showControls ? styles.videoPlayerActive : ""}`}
      onMouseMove={nudgeShow}
      onMouseEnter={nudgeShow}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className={styles.videoEl}
        src={src}
        playsInline
        preload="metadata"
        title={title}
        onClick={togglePlay}
      />

      {/* Center controls — skip-back-10 / play / skip-forward-10 */}
      <div className={styles.videoCenterControls}>
        <button
          type="button"
          className={styles.videoSkipBtn}
          onClick={() => skip(-10)}
          aria-label="Skip back 10 seconds"
        >
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path
              d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M10 16l4-6 4 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="24" y="28" textAnchor="middle" fontFamily="inherit" fontWeight="700" fontSize="11" fill="currentColor">10</text>
          </svg>
        </button>

        <button
          type="button"
          className={styles.videoPlayBtn}
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4.5" width="4" height="15" rx="1" />
              <rect x="14" y="4.5" width="4" height="15" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={styles.videoSkipBtn}
          onClick={() => skip(10)}
          aria-label="Skip forward 10 seconds"
        >
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path
              d="M24 10c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M38 16l-4-6-4 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="24" y="28" textAnchor="middle" fontFamily="inherit" fontWeight="700" fontSize="11" fill="currentColor">10</text>
          </svg>
        </button>
      </div>

      {/* Bottom bar — width matches the VISIBLE (contain-fitted) video
          and is centred, so it stops where the black side-bars begin
          (per user spec). `mediaWidth` is null until metadata loads,
          in which case it falls back to the CSS full-width default
          (left:0 / right:0). */}
      <div
        className={styles.videoBottomBar}
        style={
          mediaWidth != null
            ? { left: "50%", right: "auto", width: `${mediaWidth}px`, transform: "translateX(-50%)" }
            : undefined
        }
      >
        <span className={styles.videoTime}>{formatTime(currentTime)}</span>
        <div
          className={styles.videoProgress}
          onClick={handleProgressSeek}
          role="slider"
          aria-label="Seek video position"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          <div
            className={styles.videoProgressFill}
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className={styles.videoProgressHandle}
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <span className={styles.videoTime}>{formatTime(duration)}</span>

        <button
          type="button"
          className={styles.videoSpeedBtn}
          onClick={cycleRate}
          aria-label={`Playback speed ${playbackRate}x`}
        >
          {playbackRate}x
        </button>

        <button
          type="button"
          className={styles.videoIconBtn}
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L19 9.41 17.59 8 15 10.59 12.41 8 11 9.41 13.59 12 11 14.59 12.41 16 15 13.41 17.59 16 19 14.59 16.59 12z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.49 4.49 0 0 0 16.5 12zM14 3.23v2.06a7.01 7.01 0 0 1 0 13.42v2.06A9.01 9.01 0 0 0 21 12 9.01 9.01 0 0 0 14 3.23z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={styles.videoIconBtn}
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Per-media-type glyph for the thumbnail strip below the banner.
 *  video → camera, audio → music notes, pdf → lined document,
 *  document → plain file. Stroke-only so it inherits the thumb
 *  button's `currentColor` (muted blue → cyan when active). */
function ThumbIcon({ kind }: { kind: "audio" | "video" | "pdf" | "document" }) {
  if (kind === "video") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m23 7-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  if (kind === "audio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  if (kind === "pdf") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    );
  }
  // document / fallback — plain file
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/** Media-type chip pinned top-left of each banner slide. The icon +
 *  label are derived from the slide's media type, so it shows
 *  "VIDEO" / "AUDIO" / "PDF" / "DOCUMENT" / "IMAGE" dynamically. */
function MediaTypeChip({ kind }: { kind: "image" | "audio" | "video" | "pdf" | "document" }) {
  const label =
    kind === "pdf"
      ? "PDF"
      : kind === "image"
      ? "IMAGE"
      : kind === "audio"
      ? "AUDIO"
      : kind === "video"
      ? "VIDEO"
      : "DOCUMENT";
  return (
    <span className={styles.mediaTypeChip} aria-hidden="true">
      {kind === "image" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      ) : (
        <ThumbIcon kind={kind} />
      )}
      <span>{label}</span>
    </span>
  );
}

/** PDF / document preview modal — replaces the old "open in a new
 *  tab" behaviour. Shows the file inside a centred dialog with a
 *  header (title + open-in-new-tab + close) and a full-bleed preview
 *  iframe. PDFs render directly; other document types go through the
 *  Google Docs embedded viewer. Closes on the X, the backdrop, or
 *  Escape. Renders nothing when `doc` is null. */
function DocModal({
  doc,
  onClose,
}: {
  doc: { url: string; kind: "pdf" | "document"; title: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  const previewSrc =
    doc.kind === "pdf"
      ? doc.url
      : `https://docs.google.com/gview?url=${encodeURIComponent(doc.url)}&embedded=true`;

  return (
    <div
      className={styles.docModalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${doc.kind === "pdf" ? "PDF" : "Document"} preview`}
    >
      <div className={styles.docModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.docModalHeader}>
          <span className={styles.docModalTitle}>{doc.title}</span>
          <div className={styles.docModalActions}>
            <a
              className={styles.docModalIconBtn}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <button
              type="button"
              className={styles.docModalIconBtn}
              onClick={onClose}
              aria-label="Close preview"
              title="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.docModalBody}>
          <iframe className={styles.docModalFrame} src={previewSrc} title={doc.title} />
        </div>
      </div>
    </div>
  );
}

/** Full-page detail skeleton — mirrors the real layout exactly
 *  (back link → banner card → info card → article card) so there's
 *  no layout shift when real data lands. Uses the same `.skeleton`
 *  shimmer classes from `_chrome.module.css` that career-talks +
 *  events + jobs + company already use, so light / dark theme is
 *  handled automatically. */
function ResourceDetailSkeleton() {
  // NOTE: the real "Back to Resources" button is rendered ABOVE the
  // conditional in the parent JSX — always visible so the user can
  // escape the loading screen. Don't render a skeleton back link
  // here or it'll duplicate.
  return (
    <>
      {/* Outer unified `.detailHead` card — mirrors the REAL detail
          layout (one bordered container holding: "Published by ..."
          line at the top, banner block, and the title + chips at
          the bottom). Was the OLD skeleton's two separate cards
          (bannerCard + detailHead). */}
      <section className={styles.detailHead} aria-hidden="true">
        {/* "Published by ..." line skeleton removed to match the real
            layout (the source line was removed per user spec). */}

        {/* Banner block skeleton — sits between the source line and
            the title+chips block. Uses the same `.bannerCard` height
            (380/280/220) via the existing CSS. */}
        <div
          className={`${styles.bannerCard} ${chromeStyles.skeleton}`}
        />

        {/* Title + chips block below the banner — same `.dhTop` flex
            row, but the `.dhLogo` is hidden (CSS `display: none`) so
            only the `.dhInfo` column shows: title (2 lines) + chips
            row (category chip + date chip side by side). */}
        <div className={styles.dhTop}>
          <div className={styles.dhInfo}>
            {/* Title — 2 shimmer lines */}
            <div
              className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
              style={{ width: "82%", height: 22, marginBottom: 6 }}
            />
            <div
              className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
              style={{ width: "62%", height: 22, marginBottom: 10 }}
            />
            {/* Chips row — category chip (wider) + date chip (narrower) */}
            <div className={styles.dhChipsRow}>
              <div
                className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                style={{ width: 130, height: 22, borderRadius: 14 }}
              />
              <div
                className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
                style={{ width: 110, height: 22, borderRadius: 20 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Article body skeleton — "Description" heading at the top
          (matches the real `.detailMainHeading`), then a lede
          paragraph + run of progressively-shorter body lines. */}
      <article className={styles.detailMain} aria-hidden="true">
        {/* "Description" heading shimmer — sits at the top of
            `.detailMain` outside `.detailBody`, just like the real
            <h2 className={styles.detailMainHeading}>Description</h2>
            does. */}
        <div
          className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
          style={{ width: 120, height: 18, marginBottom: 14, borderRadius: 4 }}
        />
        <div className={styles.detailBody}>
          {/* Lede block */}
          {[100, 95, 88, 70].map((w, i) => (
            <div
              key={`lede-${i}`}
              className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
              style={{ width: `${w}%`, height: 16, marginBottom: 10 }}
            />
          ))}
          {/* Spacer between paragraphs */}
          <div style={{ height: 14 }} />
          {/* Body block */}
          {[100, 98, 92, 86, 72].map((w, i) => (
            <div
              key={`para-${i}`}
              className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
              style={{ width: `${w}%`, height: 14, marginBottom: 8 }}
            />
          ))}
          <div style={{ height: 14 }} />
          {[100, 88, 80].map((w, i) => (
            <div
              key={`para2-${i}`}
              className={`${chromeStyles.skelLine} ${chromeStyles.skeleton}`}
              style={{ width: `${w}%`, height: 14, marginBottom: 8 }}
            />
          ))}
        </div>
      </article>
    </>
  );
}

export default function ResourceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { theme } = useTheme();
  const id = decodeURIComponent(params?.id ?? "");

  // ── Detail state ──
  // `null` = no resource OR backend says it's gone (renders empty
  // state). `undefined` = still loading (renders loading placeholder).
  // We track with two pieces so the JSX can tell those cases apart.
  const [detail, setDetail] = useState<ResourceDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setDetail(undefined);
    (async () => {
      try {
        const res = await fetchResourceDetail(id, ctrl.signal);
        if (!cancelled) setDetail(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDetail(null);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [id]);

  // Unified slide list the slider track renders. The slides follow
  // the EXACT order the backend ships `detail.media` in — NO
  // regrouping by type. Previously images were hoisted to the front
  // and non-image media pushed after, which reordered the sequence
  // (e.g. a video-first resource opened on its image instead). The
  // live YP site keeps the backend order, so we walk `detail.media`
  // straight through and map each item to its slide kind in place.
  //   • image                      → image slide
  //   • audio / video / pdf / doc  → that media slide
  //   • (zero media at all)        → single placeholder slide
  type Slide =
    | { kind: "image"; key: string; media: NonNullable<ResourceDetail["media"]>[number] }
    | { kind: "placeholder"; key: string }
    | { kind: "audio" | "video" | "pdf" | "document"; key: string; media: NonNullable<ResourceDetail["media"]>[number] };
  const allSlides = useMemo<Slide[]>(() => {
    if (!detail) return [];
    const out: Slide[] = [];
    for (const m of detail.media) {
      if (m.media_type === "image") {
        out.push({ kind: "image", key: `img-${m.id}`, media: m });
      } else {
        const k = (m.media_type ?? "document") as "audio" | "video" | "pdf" | "document";
        out.push({ kind: k, key: `media-${m.id}`, media: m });
      }
    }
    // Fallback only — keeps the banner box non-empty when the
    // resource has no playable / displayable media at all.
    if (out.length === 0) {
      out.push({ kind: "placeholder", key: "placeholder" });
    }
    return out;
  }, [detail]);

  const [slideIndex, setSlideIndex] = useState(0);

  // PDF / document preview modal — `null` when closed, otherwise the
  // doc to preview. Opened from a pdf/document slide's button; closed
  // via the modal's own close / Escape / backdrop click.
  const [docPreview, setDocPreview] = useState<
    { url: string; kind: "pdf" | "document"; title: string } | null
  >(null);

  useEffect(() => {
    setSlideIndex(0);
  }, [id]);

  function go(idx: number) {
    if (allSlides.length === 0) return;
    const n = allSlides.length;
    setSlideIndex(((idx % n) + n) % n);
  }

  // Source label — placeholder, real API doesn't ship `source`.
  const sourceLabel = "Young Professionals UK";
  const initials = "YP";

  // Linkified description HTML — runs the raw backend HTML through
  // `linkifyHtml` to wrap URL-like text (e.g. "Apprenticeships.co.uk")
  // in <a> tags so the existing blue-link styling picks them up.
  // Memoised so the walk only happens when the body actually
  // changes (typically once per detail load).
  const linkedBodyHtml = useMemo(
    () => (detail?.body_html ? linkifyHtml(detail.body_html) : ""),
    [detail?.body_html]
  );

  return (
    <div className={`${chromeStyles.page} ${styles.resourcesDetailPage}`} data-theme={theme}>
      <Navbar />
      <main className={styles.detail}>
        <div className={styles.wrap}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push("/resources")}
            aria-label="Back to Resources"
          >
            {/* MUI `ArrowBack` glyph — same path, navigation still
                routes to /resources. Text label changed to
                "Resource Details" per user reference SS (the live
                YP page uses this as a heading-style label with the
                arrow as a back affordance). */}
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/>
            </svg>
            Resource Details
          </button>

          {detail === undefined ? (
            /* Loading state — render the full skeleton layout so the
               page has its real footprint from the first frame. Avoids
               the "Loading…" / "real layout" jump. The skeleton lives
               inside the same `.wrap` so it sits at the same X/Y the
               real content would. */
            <ResourceDetailSkeleton />
          ) : detail === null ? (
            <div className={styles.detailEmpty}>
              This resource is no longer available.
            </div>
          ) : (
            <>
              {/* ── UNIFIED DETAIL HEAD — ONE outer container holding
                  the banner (top portion), then the YP-logo + title +
                  source + chips block (bottom portion). Replaces the
                  earlier "two separate cards with overlap" approach
                  per user spec ("banner should come INTO the same
                  container as title + source + chips — nothing else").
                  The `.bannerCard` div inside has no border of its
                  own — it's a media block at the top of the
                  detailHead card. */}
              <section className={styles.detailHead}>
                {/* "Published by Young Professionals UK" source line
                    removed per user spec. */}
                <div className={styles.bannerCard}>
                {/* All slides — rendered in the BACKEND'S order (no
                    type regrouping), with a placeholder only when the
                    resource has no media. The slider track translates
                    left by slideIndex × 100% so each slide fills the
                    full banner card. */}
                <div
                  className={styles.sliderTrack}
                  style={{ transform: `translateX(-${slideIndex * 100}%)` }}
                >
                  {allSlides.map((s, i) => {
                    if (s.kind === "image") {
                      return (
                        <div key={s.key} className={styles.sliderSlide}>
                          <div
                            className={styles.sliderBlur}
                            style={{ backgroundImage: `url(${s.media.url})` }}
                            aria-hidden="true"
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className={styles.sliderImage}
                            src={s.media.url}
                            alt={s.media.name ?? `${detail.title} – image ${i + 1}`}
                            loading={i === 0 ? undefined : "lazy"}
                          />
                        </div>
                      );
                    }
                    if (s.kind === "placeholder") {
                      return (
                        <div key={s.key} className={styles.sliderSlide}>
                          {/* Empty gradient slide — title text
                              removed per user spec ("in the banner
                              remove the title heading"). The
                              bannerPlaceholder div stays so the
                              gradient still fills the banner box
                              when the resource has no media. */}
                          <div className={styles.bannerPlaceholder} aria-hidden="true" />
                        </div>
                      );
                    }
                    if (s.kind === "video") {
                      return (
                        <div key={s.key} className={styles.sliderSlide}>
                          {/* Custom video player widget — replaces the
                              native <video controls> per user SS:
                              dark navy surface, large centered play /
                              pause flanked by skip-back-10 +
                              skip-forward-10, bottom bar with
                              timestamps, progress, speed, mute, and
                              fullscreen. */}
                          <VideoPlayer
                            src={s.media.url}
                            title={s.media.name ?? detail.title}
                            active={i === slideIndex}
                          />
                        </div>
                      );
                    }
                    if (s.kind === "audio") {
                      return (
                        <div key={s.key} className={styles.sliderSlide}>
                          <div className={styles.bannerMediaWrap}>
                            {/* Custom audio player widget — replaces
                                the old native <audio controls> +
                                decorative play badge combo per user
                                reference SS. Single widget with blue
                                play button, "🎵 Audio" label, animated
                                waveform that brightens as audio plays,
                                and a current-time / duration row. */}
                            <AudioPlayer src={s.media.url} active={i === slideIndex} />
                          </div>
                        </div>
                      );
                    }
                    // pdf / document — outer pill button. PDF + document
                    // share the SAME outer chip size (`.bannerDocLink`)
                    // so the two buttons render at identical
                    // dimensions; only the LEFT icon SVG and the
                    // label text differ.
                    return (
                      <div key={s.key} className={styles.sliderSlide}>
                        <div className={styles.bannerMediaWrap}>
                          <button
                            type="button"
                            className={styles.bannerDocLink}
                            onClick={() =>
                              setDocPreview({
                                url: s.media.url,
                                kind: s.kind as "pdf" | "document",
                                title: s.media.name ?? detail.title,
                              })
                            }
                          >
                            <span className={styles.bannerDocIcon} aria-hidden="true">
                              {s.kind === "pdf" ? (
                                /* PDF icon — user-pasted SVG with
                                   the page-fold + two text-line
                                   strokes inside the doc shape.
                                   stroke-width 1.8 per spec. */
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6" />
                                  <path d="M8 13h8M8 17h6" />
                                </svg>
                              ) : (
                                /* Generic document icon — kept for
                                   non-PDF document types. */
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              )}
                            </span>
                            <span className={styles.bannerDocLabel}>
                              {s.kind === "pdf" ? "Preview PDF" : "Preview document"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Navigation only shows when there are 2+ slides
                    (a resource with one image OR a single placeholder
                    doesn't need arrows / dots). */}
                {allSlides.length > 1 ? (
                  <div
                    className={`${styles.sliderNav}${
                      allSlides[slideIndex]?.kind === "video"
                        ? ` ${styles.sliderNavRaised}`
                        : ""
                    }`}
                  >
                    <div className={styles.sliderDots}>
                      {allSlides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`${styles.sliderDot} ${i === slideIndex ? styles.sliderDotActive : ""}`}
                          aria-label={`Go to slide ${i + 1}`}
                          onClick={() => go(i)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.sliderArrow}
                      aria-label="Previous slide"
                      onClick={() => go(slideIndex - 1)}
                      /* Edge-disabled state — the LEFT arrow goes dim
                         (`.sliderArrow:disabled { opacity: 0.5; cursor:
                         not-allowed }`) and stops responding once the
                         viewer is on the first slide. No wrap-around. */
                      disabled={slideIndex === 0}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 6l-6 6 6 6"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={styles.sliderArrow}
                      aria-label="Next slide"
                      onClick={() => go(slideIndex + 1)}
                      /* Edge-disabled state — RIGHT arrow goes dim once
                         the viewer is on the last slide. Mirrors the
                         left-arrow rule above. */
                      disabled={slideIndex === allSlides.length - 1}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 6l6 6-6 6"/>
                      </svg>
                    </button>
                  </div>
                ) : null}
                </div>
                {/* /.bannerCard — banner is now the top portion of the
                    SAME detailHead card. The dhTop block below renders
                    the YP logo, title, source, and chips immediately
                    underneath the banner inside the same card. */}

                {/* ── Thumbnail strip ── Sits directly BELOW the banner,
                    one thumbnail per slide IN BACKEND ORDER. Image slides
                    show their cover; audio / video / pdf / document slides
                    show a per-type glyph. The active slide's thumb is
                    highlighted (cyan border). Clicking a thumb jumps the
                    slider to it. Shown ONLY when there's more than one
                    media item (same `allSlides.length > 1` gate as the
                    dots/arrows), per user spec. */}
                {allSlides.length > 1 ? (
                  <div className={styles.thumbStrip} role="tablist" aria-label="Resource media">
                    {allSlides.map((s, i) => {
                      if (s.kind === "placeholder") return null;
                      const isActive = i === slideIndex;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-label={`Show ${s.kind} ${i + 1} of ${allSlides.length}`}
                          className={`${styles.thumbBtn} ${isActive ? styles.thumbBtnActive : ""}`}
                          onClick={() => go(i)}
                        >
                          {s.kind === "image" ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              className={styles.thumbImg}
                              src={s.media.url}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.thumbIcon} aria-hidden="true">
                              <ThumbIcon kind={s.kind} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className={styles.dhTop}>
                  <div className={styles.dhLogo}>{initials}</div>
                  <div className={styles.dhInfo}>
                    {/* Order per user spec:
                          1. Title (h1) — FIRST
                          2. Chips row  (category chip + date chip) */}
                    <h1>{detail.title}</h1>
                    <div className={styles.dhChipsRow}>
                      <span className={styles.catChip}>
                        {detail.category.category_name}
                      </span>
                      <span className={styles.metaChip}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="M12 7v5l3.5 2"/>
                        </svg>
                        {detail.date_label || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Article — heading + lede + rendered HTML body ── */}
              <article className={styles.detailMain} id="article">
                {/* "Description" heading sits INSIDE the article
                    card per user spec ("add description heading
                    in the description content"). Doesn't scroll
                    with the body because it lives outside
                    `.detailBody` — it stays fixed at the top of
                    the article card while only the HTML body
                    scrolls inside. */}
                <h2 className={styles.detailMainHeading}>Description</h2>
                <div
                  className={styles.detailBody}
                  dangerouslySetInnerHTML={{ __html: linkedBodyHtml }}
                />
              </article>
            </>
          )}
        </div>
      </main>

      {/* PDF / document preview modal — rendered at the page root so
          it overlays everything; null when no doc is selected. */}
      <DocModal doc={docPreview} onClose={() => setDocPreview(null)} />
    </div>
  );
}
