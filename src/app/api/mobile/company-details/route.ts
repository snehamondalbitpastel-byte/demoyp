import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Company-details proxy. Backs the /company/[id] page.
 *
 * Body: `{ id }` (the company id from the listing). Response:
 *   { status, message, data: {
 *       id, name, description, website, address,
 *       logo_url, banner_url, industry_name,
 *       follow_status, follow_id,
 *       created_at, updated_at, status
 *   }}
 *
 * `description` is HTML rich-text and should be rendered with
 * `dangerouslySetInnerHTML` (same approach the jobs-detail page
 * uses). `follow_status` is a real boolean.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/company-details", {
    attachBearerToken: true,
  });
}
