/**
 * Server-side proxy helper for all Next.js API routes that forward to the
 * remote YoungPro backend.
 *
 * Why this exists:
 *   The backend (admin.youngprofessionals.global) does not send
 *   `Access-Control-Allow-Credentials: true` for the frontend origin, so
 *   browsers block cross-origin fetches that include cookies.
 *
 * Fix: the browser calls a Next.js route on the same origin
 *   (e.g. POST /api/mobile/auth/signup). That route runs on the server,
 *   forwards the call to the real backend, and pipes the response + any
 *   `Set-Cookie` headers back to the browser. Same-origin → no CORS.
 *
 * The helper is used by both auth routes and authenticated data routes
 * (locations / institutions / skills / …) via different `ProxyOptions`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../config";

interface ProxyOptions {
  /**
   * For endpoints that return tokens inside the JSON body (e.g. verify-otp,
   * token/refresh), extract `data.access_token` / `data.refresh_token` and
   * set them as HttpOnly cookies on the response. This normalizes the auth
   * model so every authenticated request to our proxy automatically sends
   * the tokens without client-side JS having to touch them.
   */
  setTokensFromBody?: boolean;
  /**
   * For authenticated reference endpoints (user-locations, institutions,
   * skills, …) that require `Authorization: Bearer <access_token>`.
   * The proxy reads the `access_token` cookie server-side and injects it
   * as an Authorization header when forwarding. The token stays HttpOnly
   * and never touches client JS.
   */
  attachBearerToken?: boolean;
}

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Forwards a request to the real backend and streams the response + cookies
 * back to the browser.
 *
 * The `backendPath` should match what the API docs list
 * (e.g. "/api/mobile/auth/signup"). We don't hard-code the backend URL here
 * so changing `BACKEND_URL` env is a one-line update.
 */
export async function proxyAuthRequest(
  req: NextRequest,
  backendPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}${backendPath}`;

  // Capture the original JSON body (if any). We read as text so we can
  // forward it verbatim without reserializing / mutating it.
  let bodyText = "";
  if (req.method !== "GET" && req.method !== "HEAD") {
    bodyText = await req.text();
  }

  // Build outgoing headers.
  const outgoingHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Forward cookies from browser → backend (so endpoints that read
  // refresh_token / csrftoken / access_token cookies still work).
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    outgoingHeaders.Cookie = cookieHeader;
  }

  // For Bearer-token endpoints, read the access_token from HttpOnly cookie
  // (server-only — never exposed to client JS) and attach as Authorization.
  if (options.attachBearerToken) {
    const accessToken = req.cookies.get("access_token")?.value;
    if (accessToken) {
      outgoingHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: outgoingHeaders,
      body: bodyText || undefined,
      // Don't cache auth responses.
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "ERROR",
        message:
          err instanceof Error
            ? `Upstream request failed: ${err.message}`
            : "Upstream request failed",
        data: null,
      },
      { status: 502 }
    );
  }

  // ── Auto-refresh on 401 for Bearer-token endpoints ──
  // If the access token expired, call the backend's refresh endpoint with
  // the refresh_token (HttpOnly cookie, server-only) and retry the original
  // request with the new token. This mirrors what we do client-side in useApi.
  let refreshedTokens: { access: string; refresh: string } | null = null;
  if (options.attachBearerToken && backendRes.status === 401) {
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${backendUrl}/api/mobile/auth/token/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          cache: "no-store",
        });
        if (refreshRes.ok) {
          const refreshJson = (await refreshRes.json()) as {
            status?: string;
            data?: { access_token?: string; refresh_token?: string };
          };
          if (
            refreshJson?.status === "OK" &&
            typeof refreshJson.data?.access_token === "string" &&
            typeof refreshJson.data?.refresh_token === "string"
          ) {
            refreshedTokens = {
              access: refreshJson.data.access_token,
              refresh: refreshJson.data.refresh_token,
            };
            // Retry the original request with the new access token.
            outgoingHeaders.Authorization = `Bearer ${refreshedTokens.access}`;
            try {
              backendRes = await fetch(targetUrl, {
                method: req.method,
                headers: outgoingHeaders,
                body: bodyText || undefined,
                cache: "no-store",
              });
            } catch {
              // fall through with the new 401 backendRes
            }
          }
        }
      } catch {
        // Refresh failed — leave the original 401 response.
      }
    }
  }

  // Read backend response body as text so we can forward it unmodified.
  const responseText = await backendRes.text();

  const response = new NextResponse(responseText || null, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });

  // The backend may send Set-Cookie headers for its own domain (e.g.
  // admin.youngprofessionals.global). Browsers reject those when the
  // response comes from localhost, so we extract token values from them
  // and re-set as our own cookies below. We do NOT blindly forward them.
  const setCookies =
    typeof backendRes.headers.getSetCookie === "function"
      ? backendRes.headers.getSetCookie()
      : [];

  // Extract token values from backend Set-Cookie headers (if any).
  // These are the raw cookie strings like "access_token=abc; HttpOnly; ...".
  let headerAccessToken: string | undefined;
  let headerRefreshToken: string | undefined;
  for (const cookie of setCookies) {
    const match = cookie.match(/^(access_token|refresh_token)=([^;]+)/);
    if (match) {
      const [, name, value] = match;
      if (name === "access_token") headerAccessToken = value;
      if (name === "refresh_token") headerRefreshToken = value;
    }
  }

  // Optional: promote body tokens to HttpOnly cookies.
  // Used by /verify-otp and /token/refresh which return tokens in JSON body.
  let bodyAccessToken: string | undefined;
  let bodyRefreshToken: string | undefined;
  let profileCompletionStatus: string | undefined;
  if (options.setTokensFromBody && responseText && backendRes.ok) {
    try {
      const parsed = JSON.parse(responseText) as {
        status?: string;
        data?: {
          access_token?: unknown;
          refresh_token?: unknown;
          user?: { profile_completion_status?: string };
        };
      };
      if (parsed?.status === "OK" && parsed.data) {
        if (
          typeof parsed.data.access_token === "string" &&
          parsed.data.access_token.length > 0
        ) {
          bodyAccessToken = parsed.data.access_token;
        }
        if (
          typeof parsed.data.refresh_token === "string" &&
          parsed.data.refresh_token.length > 0
        ) {
          bodyRefreshToken = parsed.data.refresh_token;
        }
        // Track profile completion for middleware redirects.
        if (parsed.data.user?.profile_completion_status !== undefined) {
          profileCompletionStatus = parsed.data.user.profile_completion_status;
        }
      }
    } catch {
      // Body wasn't JSON or didn't match shape — fall through to header tokens.
    }
  }

  // Set cookies on OUR domain (localhost / production). Priority:
  // refreshed tokens (from the auto-refresh on 401) > body tokens > header tokens.
  const finalAccessToken =
    refreshedTokens?.access || bodyAccessToken || headerAccessToken;
  const finalRefreshToken =
    refreshedTokens?.refresh || bodyRefreshToken || headerRefreshToken;

  if (finalAccessToken) {
    response.cookies.set("access_token", finalAccessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    });
  }
  if (finalRefreshToken) {
    response.cookies.set("refresh_token", finalRefreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    });
  }

  // Set profile_completed cookie so middleware can redirect incomplete users.
  if (profileCompletionStatus !== undefined) {
    response.cookies.set("profile_completed", profileCompletionStatus, {
      httpOnly: false,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

/**
 * Proxy for multipart/form-data requests (e.g. create-profile with file upload).
 * Does NOT set Content-Type — lets fetch auto-generate the multipart boundary.
 */
export async function proxyFormDataRequest(
  req: NextRequest,
  backendPath: string
): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}${backendPath}`;

  // Read incoming form-data and rebuild for the outgoing request.
  const incomingFd = await req.formData();
  const outgoingFd = new FormData();
  for (const [key, val] of incomingFd.entries()) {
    outgoingFd.append(key, val);
  }

  // Attach Bearer token from HttpOnly cookie.
  const outgoingHeaders: Record<string, string> = {};
  const accessToken = req.cookies.get("access_token")?.value;
  if (accessToken) {
    outgoingHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: outgoingHeaders,
      body: outgoingFd,
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "ERROR",
        message:
          err instanceof Error
            ? `Upstream request failed: ${err.message}`
            : "Upstream request failed",
        data: null,
      },
      { status: 502 }
    );
  }

  const responseText = await backendRes.text();

  const response = new NextResponse(responseText || null, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });

  // On success, set profile_completed cookie.
  if (responseText && backendRes.ok) {
    try {
      const parsed = JSON.parse(responseText) as {
        status?: string;
        data?: { profile_completion_status?: string };
      };
      if (parsed?.status === "OK") {
        const status = parsed.data?.profile_completion_status ?? "1";
        response.cookies.set("profile_completed", status, {
          httpOnly: false,
          secure: IS_PROD,
          sameSite: "lax",
          path: "/",
        });
      }
    } catch {
      // not JSON — leave as-is
    }
  }

  return response;
}
