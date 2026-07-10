/* HANDOVER — Resources Module · api/mobile/resources/categories/route.ts · COPY? ✅ */

import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Resource categories proxy. Backs the left-column category list on
 * /resources.
 *
 * Body: `{}` (no params). Response:
 *   { status, data: Array<{
 *       id, category_name, banner_text, banner_image_url
 *   }> }
 *
 * Client prepends `{ id: "all", category_name: "All" }` synthetically —
 * backend does NOT return it. IDs are URL-safe base64 strings (with
 * `_` and `=` chars) — always type as `string`.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/resources/categories", {
    attachBearerToken: true,
  });
}
