/**
 * Next.js 16 Proxy (formerly middleware).
 *
 * Runs before every matched route. Enforces:
 *   1. Logged-in users with incomplete profiles (profile_completed !== "200")
 *      are redirected to /auth/stepper until they finish.
 *   2. Unauthenticated users on protected pages are redirected to /auth.
 *
 * Reads cookies only — no database or API calls. Cookies are set by:
 *   - verify-otp proxy (setTokensFromBody)
 *   - social-complete route
 */

import { NextRequest, NextResponse } from "next/server";

/** Paths always allowed regardless of auth state (infra + APIs). */
const INFRA_PATHS = [
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/assets/",
];

/** Auth-related routes — only reachable when NOT fully authenticated. */
const AUTH_PATHS = [
  "/auth",
  "/otp",
];

function isInfraPath(pathname: string): boolean {
  return INFRA_PATHS.some((p) => pathname.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept infrastructure paths.
  if (isInfraPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const profileCompleted = request.cookies.get("profile_completed")?.value;
  const isProfileComplete = profileCompleted === "200" || profileCompleted === "1";

  console.log(`[proxy] path: ${pathname} | access_token: ${accessToken ? "yes" : "no"} | profile_completed: ${profileCompleted ?? "not set"}`);

  // No access token → must use auth routes. Redirect protected pages to /auth.
  if (!accessToken) {
    // /auth/stepper is a post-login step; it requires a valid token.
    // If the user landed here without one (e.g. they cleared cookies),
    // bounce them back to /auth so the login flow starts over.
    if (pathname === "/auth/stepper") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }
    if (isAuthPath(pathname)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Logged in but profile incomplete → force stepper. Allow /otp so OTP flow still works.
  if (!isProfileComplete) {
    if (pathname === "/auth/stepper" || pathname.startsWith("/otp")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/stepper";
    return NextResponse.redirect(url);
  }

  // Fully authenticated (token + profile complete) → block auth routes.
  if (isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
