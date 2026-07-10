import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Save-job proxy.
 *
 * Body: `{ id }` (job id). Response shape:
 *   { status: "OK", message: "Saved", data: { id } }
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/save-job", {
    attachBearerToken: true,
  });
}
