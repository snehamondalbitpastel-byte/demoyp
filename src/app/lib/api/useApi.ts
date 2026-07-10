"use client";

/**
 * useApi — a small React hook for GET endpoints with module-level caching.
 *
 *   const { data, loading, error, refetch } = useApi<{ location: UserLocation[] }>({
 *     key: ["userLocations"],
 *     url: endpoints.data.userLocations,
 *     enabled: true,
 *   });
 *
 * Behavior:
 *  - First call for a given `key` fetches from `url` and caches the result.
 *  - Subsequent mounts with the same `key` read from cache (no network call).
 *  - Multiple components requesting the same `key` concurrently share a
 *    single in-flight promise (request de-duplication).
 *  - `refetch()` bypasses the cache and forces a new request.
 *
 * The cache is in-memory only (per page session). It clears on full reload.
 * For this app that's the right scope — dropdown lists are small and we
 * want them fresh-ish but not fetched every time a step re-mounts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type CacheEntry<T = unknown> =
  | { status: "loading"; promise: Promise<T> }
  | { status: "resolved"; data: T }
  | { status: "error"; error: string };

const cache = new Map<string, CacheEntry>();

function serializeKey(key: readonly (string | number)[]): string {
  return key.join("|");
}

/**
 * Singleton refresh lock. If multiple useApi calls get 401 at the same time,
 * they share a single refresh request instead of spamming the endpoint.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/mobile/auth/token/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

async function fetchJson<T>(url: string, isRetry = false): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  // Silent token refresh on 401 — single retry, then give up.
  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchJson<T>(url, true);
    }
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // leave null — handled below
    }
  }

  if (!res.ok) {
    const message =
      (json as { message?: string } | null)?.message ??
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  // Backend reference endpoints wrap payload under `data`.
  // Auth endpoints also use `data`, so this works for both.
  const envelope = json as { data?: T } | null;
  if (!envelope || envelope.data === undefined) {
    throw new Error("Unexpected response shape — missing `data` field");
  }
  return envelope.data;
}

interface UseApiOptions {
  /** Unique cache key for this request, e.g. `["userLocations"]`. */
  key: readonly (string | number)[];
  /** Path to fetch — must be a local Next.js proxy route. */
  url: string;
  /** If false, the request is skipped entirely (useful for auth-gated fetches). */
  enabled?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>({
  key,
  url,
  enabled = true,
}: UseApiOptions): UseApiReturn<T> {
  const cacheKey = serializeKey(key);

  // Seed initial state from cache so we don't flash a loading spinner for
  // already-resolved data when remounting (e.g. switching stepper tabs).
  const initialEntry = cache.get(cacheKey) as CacheEntry<T> | undefined;
  const [data, setData] = useState<T | null>(
    initialEntry?.status === "resolved" ? initialEntry.data : null
  );
  const [loading, setLoading] = useState<boolean>(
    enabled && (!initialEntry || initialEntry.status === "loading")
  );
  const [error, setError] = useState<string | null>(
    initialEntry?.status === "error" ? initialEntry.error : null
  );

  // Track the latest call so an in-flight response can't overwrite fresher state.
  const callIdRef = useRef(0);

  const runFetch = useCallback(
    async (bypassCache: boolean): Promise<void> => {
      if (!enabled) return;

      const myCallId = ++callIdRef.current;

      // Try cache first.
      if (!bypassCache) {
        const existing = cache.get(cacheKey) as CacheEntry<T> | undefined;
        if (existing) {
          if (existing.status === "resolved") {
            setData(existing.data);
            setLoading(false);
            setError(null);
            return;
          }
          if (existing.status === "error") {
            setError(existing.error);
            setLoading(false);
            return;
          }
          if (existing.status === "loading") {
            try {
              const result = await existing.promise;
              if (callIdRef.current !== myCallId) return;
              setData(result);
              setError(null);
            } catch (err) {
              if (callIdRef.current !== myCallId) return;
              setError(err instanceof Error ? err.message : "Request failed");
            } finally {
              if (callIdRef.current === myCallId) setLoading(false);
            }
            return;
          }
        }
      }

      setLoading(true);
      setError(null);

      const promise = fetchJson<T>(url);
      cache.set(cacheKey, { status: "loading", promise });

      try {
        const result = await promise;
        cache.set(cacheKey, { status: "resolved", data: result });
        if (callIdRef.current !== myCallId) return;
        setData(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        cache.set(cacheKey, { status: "error", error: message });
        if (callIdRef.current !== myCallId) return;
        setError(message);
      } finally {
        if (callIdRef.current === myCallId) setLoading(false);
      }
    },
    [cacheKey, url, enabled]
  );

  useEffect(() => {
    runFetch(false);
  }, [runFetch]);

  const refetch = useCallback(() => runFetch(true), [runFetch]);

  return { data, loading, error, refetch };
}
