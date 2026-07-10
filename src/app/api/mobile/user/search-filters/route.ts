import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Search-filters proxy.
 *
 * Returns the dropdown options used by the jobs listing page's
 * Location / Company / Employment Type filters. Backend response
 * shape:
 *   { data: {
 *       company: [{ id, name }, ...],
 *       jobsector: [{ id, name }, ...],
 *       employment_type: [{ name, label }, ...],
 *       job_location: ["Aberdeen, UK", ...],
 *       keywords: [...]
 *     }
 *   }
 *
 * The endpoint is GET on the upstream API but `proxyAuthRequest`
 * forwards the request method as-is, so we just expose GET here.
 */
export async function GET(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/search-filters", {
    attachBearerToken: true,
  });
}
