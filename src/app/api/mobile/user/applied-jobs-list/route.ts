import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Applied-jobs listing proxy.
 *
 * Body: `{ page, limit }`. Response shape mirrors the all-jobs API:
 *   { status, message, data: { count, total_count, result: [...] } }
 * — used to render the "Applied Jobs" view of the right panel and to
 * seed the page's "which job ids the viewer has applied to" set so
 * the Apply / Applied button on every card shows the correct state
 * on first load.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/applied-jobs-list", {
    attachBearerToken: true,
  });
}
