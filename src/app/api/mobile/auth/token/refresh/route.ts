/**
 * Token refresh proxy.
 *
 * The backend expects `refresh_token` in the JSON body, but for security we
 * keep the token in an HttpOnly cookie (never exposed to client JS). So this
 * proxy:
 *   1. Reads the `refresh_token` cookie server-side.
 *   2. Injects it into the outgoing body before forwarding to the backend.
 *   3. Parses the response and sets new `access_token` / `refresh_token`
 *      HttpOnly cookies via `setTokensFromBody`.
 *
 * If there's no refresh cookie, we short-circuit with a 401 so the client
 * knows the session is gone and can redirect to /auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/lib/config";

const IS_PROD = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { status: "ERROR", message: "No refresh token", data: null },
      { status: 401 }
    );
  }

  const backendUrl = getBackendUrl();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${backendUrl}/api/mobile/auth/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
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

  // The backend may send Set-Cookie headers on its own domain which the
  // browser rejects from localhost. Extract token values and re-set below.
  const setCookies =
    typeof backendRes.headers.getSetCookie === "function"
      ? backendRes.headers.getSetCookie()
      : [];

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

  // Promote body tokens to HttpOnly cookies so subsequent requests pick
  // up the new tokens automatically.
  let bodyAccessToken: string | undefined;
  let bodyRefreshToken: string | undefined;
  if (responseText && backendRes.ok) {
    try {
      const parsed = JSON.parse(responseText) as {
        status?: string;
        data?: { access_token?: unknown; refresh_token?: unknown };
      };
      if (parsed?.status === "OK" && parsed.data) {
        const { access_token, refresh_token } = parsed.data;
        if (typeof access_token === "string" && access_token.length > 0) {
          bodyAccessToken = access_token;
        }
        if (typeof refresh_token === "string" && refresh_token.length > 0) {
          bodyRefreshToken = refresh_token;
        }
      }
    } catch {
      // body wasn't JSON — fall through to header tokens.
    }
  }

  const finalAccessToken = bodyAccessToken || headerAccessToken;
  const finalRefreshToken = bodyRefreshToken || headerRefreshToken;

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

  return response;
}
