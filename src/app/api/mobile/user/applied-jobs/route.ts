import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Apply-job proxy.
 *
 * POST body: `{ id }` (job id). Marks the viewer as having applied to
 * this job. Apply is a one-way action — the viewer cannot un-apply,
 * so there is no companion "remove-applied" endpoint.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/applied-jobs", {
    attachBearerToken: true,
  });
}
