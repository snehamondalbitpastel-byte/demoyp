import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Remove-job proxy. Body: `{ id }` (job id). Response:
 *   { status: "OK", message: "Removed", data: { id } }
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/user/remove-job", {
    attachBearerToken: true,
  });
}
