import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Followed-companies proxy. Backs the right-column listings under
 * the "Following" tab on /company.
 *
 * Body: `{}` (an empty object — the upstream endpoint reads the
 * viewer from the bearer token and returns every company they
 * currently follow, regardless of pagination).
 *
 * Response shape:
 *   { status, data: { count, total_count,
 *       result: Array<<same row shape as POST /companies>>
 *   }}
 *
 * Each row has `follow_status: true` and a non-null `follow_id`,
 * since by definition the viewer is following each entry.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/followings", {
    attachBearerToken: true,
  });
}
