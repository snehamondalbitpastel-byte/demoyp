import { NextRequest } from "next/server";
import { proxyFormDataRequest } from "@/app/lib/api/proxy";

/**
 * Update-comment route — currently used for the `action: "delete"` flow.
 *
 * The backend expects multipart/form-data with `id` (comment_id) and
 * `action` ("delete"), so this hands the request straight to
 * `proxyFormDataRequest` which rebuilds the FormData server-side and
 * attaches the bearer token from the access_token cookie.
 */
export async function POST(req: NextRequest) {
  return proxyFormDataRequest(req, "/api/mobile/user/feed/update-comment");
}
