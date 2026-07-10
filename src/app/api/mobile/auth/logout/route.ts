/**
 * Logout — clears every auth-related cookie server-side (including HttpOnly).
 * Client cannot clear HttpOnly cookies from JS, so this endpoint is the only
 * reliable way to fully terminate a session.
 */

import { NextResponse } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";

/** Cookies to wipe: backend tokens + NextAuth session state. */
const AUTH_COOKIES = [
  "access_token",
  "refresh_token",
  "profile_completed",
  "authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.session-token",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.callback-url",
];

export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const name of AUTH_COOKIES) {
    // Expire the cookie by setting maxAge: 0 with matching path/sameSite.
    response.cookies.set(name, "", {
      httpOnly: name.startsWith("access_token") || name.startsWith("refresh_token") || name.includes("session-token"),
      secure: IS_PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
