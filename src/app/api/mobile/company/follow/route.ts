import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Follow / Unfollow toggle proxy.
 *
 * Body: `{ company_id }`. The endpoint is a SINGLE toggle — the
 * server flips the viewer's follow state for that company and the
 * response says which way it went:
 *   { status: "OK", action: "FOLLOWED" | "UNFOLLOWED", message }
 *
 * Callers should read `action` to decide which optimistic update
 * to apply, and surface `message` in a toast (matches the live
 * /company SS).
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/company/follow", {
    attachBearerToken: true,
  });
}
