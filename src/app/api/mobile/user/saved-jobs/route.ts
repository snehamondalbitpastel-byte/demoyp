import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Saved-jobs listing proxy.
 *
 * Body: `{ page, limit }`. Response shape mirrors the all-jobs API:
 *   { status, message, data: { count, total_count, result: [...] } }
 * — each `result` entry is a full job record, used to render the
 * "Saved Jobs" view of the right panel as well as to seed the
 * page's "which job ids are currently saved" set.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/saved-jobs", {
    attachBearerToken: true,
  });
}
