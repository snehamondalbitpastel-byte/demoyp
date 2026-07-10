/* ================================================================
 * HANDOVER PACKAGE — Career Talks Module  ⭐ CORE FEATURE FILE
 * File:    src/app/lib/career-talks/videoSourceType.ts
 * Role:    Classify a talk's videoUrl as "youtube" / "mp4" / "none"
 *          and convert YouTube watch / share / shorts links into
 *          the canonical /embed/<id> URL the details page's
 *          <iframe> needs. Pure functions, no React.
 * COPY?:   ✅ Copy verbatim — PERMANENT file. Consumed only by
 *          src/app/career-talks/[id]/page.tsx.
 * ================================================================ */

/**
 * Video-source classifier.
 *
 * The sheet's "Youtube URL" column can carry either a direct MP4
 * link (like the existing `cdn.ypacademy.co.uk/videos/*.mp4` URLs)
 * OR an actual YouTube watch / share URL. Those two need different
 * players on the details page:
 *
 *   - MP4 / direct file → native HTML5 <video controls src=...>
 *   - YouTube           → <iframe src="https://www.youtube.com/embed/...">
 *
 * This module provides the detector + the YouTube-id extractor so
 * the details page can pick the right element without re-inventing
 * the URL parsing logic each time.
 */

export type VideoSourceType = "youtube" | "mp4" | "none";

/** Pull the YouTube video ID out of any common YouTube URL shape:
 *    - https://www.youtube.com/watch?v=ID
 *    - https://youtube.com/watch?v=ID&t=10
 *    - https://youtu.be/ID
 *    - https://www.youtube.com/embed/ID
 *    - https://www.youtube.com/shorts/ID
 *  Returns null when the URL isn't a YouTube link or can't be parsed. */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      // /watch?v=<id>
      const v = u.searchParams.get("v");
      if (v) return v;
      // /embed/<id> or /shorts/<id>
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/);
      if (m) return m[1];
    }
  } catch {
    // Invalid URL — fall through to null
  }
  return null;
}

/** Classify a video URL so the details page knows which player to
 *  render. The order of checks matters: YouTube detection runs
 *  FIRST so a YouTube URL never accidentally falls into the MP4
 *  branch via its `.com` extension. */
export function classifyVideoUrl(url: string | undefined | null): VideoSourceType {
  if (!url) return "none";
  if (extractYouTubeId(url)) return "youtube";
  // Anything else with a clear video file extension is treated as
  // MP4 (covers .mp4, .webm, .ogg, .mov — native <video> handles
  // these). If the extension is ambiguous, we still default to MP4
  // since the existing CDN URLs work fine in <video>.
  return "mp4";
}

/** Convert any YouTube URL into the canonical embed URL the
 *  details page's <iframe> needs. Returns the original URL
 *  unchanged when classification fails — callers should already
 *  have checked `classifyVideoUrl(...) === "youtube"` first. */
export function toYouTubeEmbedUrl(url: string): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  return `https://www.youtube.com/embed/${id}`;
}
