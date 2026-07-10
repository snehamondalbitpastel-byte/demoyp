import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Similar-jobs proxy. Used by the job-details page to render the
 * "More jobs" cards under the About-the-Company section.
 *
 * Body: `{ id, page, limit }` — `id` is the source job id; the
 * response is a paged list of jobs from the same company / sector:
 *   { status, message, data: { count, total_count, result: [...] } }
 * Each `result` entry is a full job record (same shape the all-jobs
 * and saved-jobs endpoints return).
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/company/similar-jobs", {
    attachBearerToken: true,
  });
}
