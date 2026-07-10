/**
 * Core API client.
 *
 * Responsibilities:
 *  - Call same-origin Next.js proxy routes (no CORS)
 *  - Send HttpOnly cookies automatically (`credentials: "include"`)
 *  - Serialize JSON bodies
 *  - Unwrap the backend envelope `{ status, message, data }`
 *  - Throw typed `ApiError` for non-OK responses
 *  - Auto-refresh access token on 401 and retry the original request once
 *
 * Usage:
 *   const res = await apiClient.post<SignupResponse>("/auth/signup", body);
 *   // res is the `data` field of the envelope, already typed.
 */

import { endpoints } from "./endpoints";
import { ApiEnvelope, ApiError } from "./types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the auto-refresh-on-401 behavior (used internally by the refresh call itself). */
  skipAuthRefresh?: boolean;
  /** Abort signal */
  signal?: AbortSignal;
}

/** Module-level promise so concurrent 401s trigger only one refresh call. */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token using the refresh token cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(
        endpoints.auth.refreshToken,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          // Backend may read refresh_token from HttpOnly cookie.
          // If it requires a body, backend should respond with a clear error
          // and we'd need to surface the token differently.
          body: JSON.stringify({}),
        }
      );
      return res.ok;
    } catch {
      return false;
    } finally {
      // Release the lock after the promise settles.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuthRefresh = false,
    signal,
  } = options;

  // All local paths hit Next.js proxy routes on the same origin.
  // No base URL needed — browser fills it in with current origin.
  const url = path;

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error",
      0
    );
  }

  // 401 → try refresh once, then retry the original request.
  if (res.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, skipAuthRefresh: true });
    }
    // Refresh failed — let the 401 bubble up so callers / AuthContext can sign out.
  }

  // Try to parse JSON (may fail on 204 or HTML error pages).
  let json: ApiEnvelope<T> | null = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      // Fall through — we'll throw a generic error below.
    }
  }

  if (!res.ok) {
    const message =
      json?.message ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json?.data);
  }

  if (!json) {
    throw new ApiError("Empty response from server", res.status);
  }

  if (json.status !== "OK") {
    throw new ApiError(json.message || "Request failed", res.status, json.data);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

export { ApiError };
