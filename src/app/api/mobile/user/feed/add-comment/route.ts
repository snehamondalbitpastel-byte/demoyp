import { NextRequest } from "next/server";
import { proxyAuthRequest, proxyFormDataRequest } from "@/app/lib/api/proxy";

/**
 * Add-comment route — branches on Content-Type.
 *
 * The backend accepts two payload shapes:
 *  - JSON  `{ id, body }` for text-only comments
 *  - multipart/form-data with `id`, optional `body`, and `attachments`
 *    (image file) when the comment includes an image.
 *
 * The browser already sends the correct Content-Type based on which
 * body it built (JSON.stringify vs FormData), so we only need to pick
 * the matching proxy helper here. `proxyFormDataRequest` rebuilds the
 * FormData server-side and forwards as multipart; `proxyAuthRequest`
 * forwards the JSON body verbatim.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return proxyFormDataRequest(req, "/api/mobile/user/feed/add-comment");
  }
  return proxyAuthRequest(req, "/api/mobile/user/feed/add-comment", {
    attachBearerToken: true,
  });
}
