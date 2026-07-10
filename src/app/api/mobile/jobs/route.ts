import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Jobs listing proxy.
 *
 * The backend accepts JSON `{ page, limit, ...optional filter params }`
 * and returns `{ status, message, data: { count, total_count, result: [...] } }`.
 * Filter params (search_text, company_ids, employment_types, locations,
 * jobsector_ids) are forwarded verbatim from whatever the client sends —
 * the proxy doesn't shape the body.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/jobs", {
    attachBearerToken: true,
  });
}
