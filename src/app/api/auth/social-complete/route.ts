/**
 * Social-complete bridge.
 *
 * After NextAuth's Google OAuth callback succeeds, the redirect callback
 * sends the user here. This route:
 *   1. Reads the NextAuth session (which includes backend tokens from the
 *      signIn callback).
 *   2. If tokens are missing (e.g. existing user), calls the backend
 *      signup endpoint server-side. If that also fails, tries the login
 *      endpoint as a fallback.
 *   3. Sets `access_token` + `refresh_token` as HttpOnly cookies on the
 *      user's browser (same pattern as our verify-otp proxy).
 *   4. Redirects to /auth/stepper (or / if profile is already complete).
 *
 * This bridges NextAuth's session-based auth with our HttpOnly cookie auth
 * so the rest of the app works identically regardless of whether the user
 * signed up with email/password or Google.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Extract access_token and refresh_token from any backend response shape.
 * The backend may return tokens at different levels depending on the endpoint.
 */
function extractTokens(json: Record<string, unknown>): {
  accessToken?: string;
  refreshToken?: string;
  backendUser?: { profile_completion_status?: string };
} {
  // Try envelope: { status: "OK", data: { access_token, refresh_token, user } }
  const data = json.data as Record<string, unknown> | undefined;
  const root = data || json; // fallback: tokens at top level

  const accessToken =
    typeof root.access_token === "string" && root.access_token.length > 0
      ? root.access_token
      : undefined;
  const refreshToken =
    typeof root.refresh_token === "string" && root.refresh_token.length > 0
      ? root.refresh_token
      : undefined;
  const backendUser = (root.user ?? data?.user) as
    | { profile_completion_status?: string }
    | undefined;

  return { accessToken, refreshToken, backendUser };
}

export async function GET() {
  const session = (await auth()) as Record<string, unknown> | null;

  if (!session?.user) {
    console.error("[social-complete] No NextAuth session found — redirecting to /auth");
    return NextResponse.redirect(new URL("/auth", BASE_URL));
  }

  const user = session.user as {
    name?: string;
    email?: string;
  };

  let accessToken = session.backendAccessToken as string | undefined;
  let refreshToken = session.backendRefreshToken as string | undefined;
  let backendUser = session.backendUser as
    | { profile_completion_status?: string }
    | undefined;

  const backendUrl = process.env.BACKEND_URL!;
  const [firstName, ...rest] = (user.name || "User").split(" ");
  const lastName = rest.join(" ") || firstName;

  // ── Attempt 1: signup endpoint (handles both new + existing social users) ──
  if (!accessToken && user.email) {
    try {
      const signupBody = {
        signup_type: "social",
        auth_provider: "google",
        first_name: firstName,
        last_name: lastName,
        email: user.email,
      };

      console.log("[social-complete] Calling backend signup with:", signupBody);

      const res = await fetch(`${backendUrl}/api/mobile/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupBody),
      });

      const json = await res.json();
      console.log("[social-complete] Backend signup response status:", res.status);
      console.log("[social-complete] Backend signup response body:", JSON.stringify(json));

      const extracted = extractTokens(json);
      if (extracted.accessToken) {
        accessToken = extracted.accessToken;
        refreshToken = extracted.refreshToken;
        backendUser = extracted.backendUser || backendUser;
      }
    } catch (err) {
      console.error("[social-complete] Signup call failed:", err);
    }
  }

  // ── Attempt 2: login endpoint as fallback for existing users ──
  if (!accessToken && user.email) {
    try {
      const loginBody = {
        login_type: "social",
        auth_provider: "google",
        identifier: "email",
        value: user.email,
      };

      console.log("[social-complete] Signup had no tokens, trying login with:", loginBody);

      const res = await fetch(`${backendUrl}/api/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginBody),
      });

      const json = await res.json();
      console.log("[social-complete] Backend login response status:", res.status);
      console.log("[social-complete] Backend login response body:", JSON.stringify(json));

      const extracted = extractTokens(json);
      if (extracted.accessToken) {
        accessToken = extracted.accessToken;
        refreshToken = extracted.refreshToken;
        backendUser = extracted.backendUser || backendUser;
      }
    } catch (err) {
      console.error("[social-complete] Login call failed:", err);
    }
  }

  if (!accessToken) {
    console.error(
      "[social-complete] Could not obtain backend tokens for",
      user.email,
      "— redirecting to stepper without auth cookies"
    );
  }

  // Determine redirect: stepper if profile incomplete, otherwise home.
  const profileDone =
    backendUser?.profile_completion_status &&
    backendUser.profile_completion_status !== "0";
  const redirectTo = profileDone ? "/home" : "/auth/stepper";

  const response = NextResponse.redirect(new URL(redirectTo, BASE_URL));

  // Set backend tokens as HttpOnly cookies — same settings as verify-otp proxy.
  if (accessToken) {
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    });
  }
  if (refreshToken) {
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
    });
  }

  // Set profile_completed cookie so middleware can redirect incomplete users.
  const status = backendUser?.profile_completion_status ?? "0";
  response.cookies.set("profile_completed", status, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
