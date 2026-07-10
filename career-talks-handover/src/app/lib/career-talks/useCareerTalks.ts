"use client";

/* ================================================================
 * HANDOVER PACKAGE — Career Talks Module  ⭐ CORE FEATURE FILE
 * File:    src/app/lib/career-talks/useCareerTalks.ts
 * Role:    The ONE hook both pages call to read the talks list.
 *          Today's body: reads localStorage (populated by the
 *          temporary upload page). Tomorrow's body: a fetch / SWR
 *          call to the real backend API. Pages don't change.
 * COPY?:   ✅ Copy verbatim. When the API ships, swap only the
 *          body of this hook (~5 lines) — see README.md §5 for
 *          the exact replacement snippet.
 * ================================================================ */

/**
 * useCareerTalks — the SINGLE data hook for the Career Talks pages.
 *
 * Listing page and details page both call this hook. They don't
 * know (and don't need to know) where the data comes from. Today
 * the source is `localStorage`, populated by the temporary
 * `/career-talks/upload` page. When the real backend ships, the
 * senior swaps the body of this hook (≈ 5 lines) to call the API
 * instead — the listing + details pages don't change at all.
 *
 * Storage key + helpers are centralised in `parseSheet.ts` so the
 * write-side (upload page) and read-side (this hook) can't drift
 * out of sync.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Per spec: the static fallback is COMMENTED OUT.            │
 * │  If localStorage is empty, this hook returns `[]` — the     │
 * │  listing page then shows its "No career talks yet" empty    │
 * │  state. The senior can uncomment the marked line below to   │
 * │  switch on the 9-talk static fallback (useful during local  │
 * │  dev before the API is live).                               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ─── How the senior swaps to the real API ───
 * Replace the body of `useCareerTalks` with something like:
 *
 *   const { data } = useSWR<CareerTalk[]>("/api/career-talks", fetcher);
 *   return { talks: data ?? [], loading: !data };
 *
 * That's it. The pages don't care.
 */

import { useEffect, useState } from "react";
import type { CareerTalk } from "./types";
import { CAREER_TALKS_STORAGE_KEY } from "./parseSheet";
// ⚠️  Static-fallback import — INTENTIONALLY commented out per spec.
// Uncomment this line AND the marked block in the effect below to
// fall back to the 9 hardcoded demo talks when localStorage is empty.
// import { STATIC_TALKS } from "./staticTalks";

interface UseCareerTalksResult {
  /** The current list of talks. Empty array when localStorage is
   *  empty AND the static fallback is disabled (which is the
   *  current spec). */
  talks: CareerTalk[];
  /** True until the first read of localStorage completes on the
   *  client. The pages use this to keep showing skeletons during
   *  the brief hydration window instead of flashing the empty
   *  state. SSR initial render also gets `loading: true` so the
   *  server-rendered HTML matches the client's first paint. */
  loading: boolean;
}

export function useCareerTalks(): UseCareerTalksResult {
  const [talks, setTalks] = useState<CareerTalk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Read once on mount. localStorage updates from other tabs are
    // out of scope for this demo — if the user uploads from one tab
    // and views in another, they can just refresh.
    try {
      const raw = window.localStorage.getItem(CAREER_TALKS_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTalks(parsed as CareerTalk[]);
        }
      }
      // ⚠️  STATIC FALLBACK — INTENTIONALLY DISABLED per spec.
      // To enable: uncomment the import at the top of this file
      // AND the `else` branch below. The 9 hardcoded talks will
      // render when localStorage is empty.
      // else {
      //   setTalks(STATIC_TALKS);
      // }
    } catch {
      // Corrupt JSON or storage unavailable — leave talks at [].
    }
    setLoading(false);
  }, []);

  return { talks, loading };
}
