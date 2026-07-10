import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Companies-listing proxy. Backs the right-column companies list
 * on /company.
 *
 * Body: `{ page, limit, search_text?, job_sector_id? }`. Response:
 *   { status, data: {
 *       count, total_count,
 *       result: Array<{
 *         id, name, description, website, address,
 *         logo_url, industry_name,
 *         follow_status, follow_id,
 *         created_at, updated_at
 *       }>
 *   }}
 *
 * `description` may contain raw HTML entities (`&nbsp;`) — the
 * client renders it as plain text, so unescape on display if
 * needed (or render via dangerouslySetInnerHTML if rich text is
 * desired). `follow_status` is a real boolean, NOT the "1"/"0"
 * string the jobs API uses, so handle accordingly when wiring
 * Follow / Following toggles.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/companies", {
    attachBearerToken: true,
  });
}
