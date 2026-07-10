import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Resource detail proxy. Backs /resources/[id].
 *
 * Body: `{ id }`. Side effect on the backend: increments view_count.
 * Response:
 *   { status, data: {
 *       id, title, body, is_featured, view_count,
 *       category: {id, category_name},
 *       published_at,
 *       media: Array<{ id, media_type, url, sort_order }>
 *   }}
 *
 * `body` is rich HTML rendered into the article card via
 * dangerouslySetInnerHTML. `media` is sorted client-side by
 * `sort_order` asc and only items with `media_type: "image"` feed
 * the banner slider on the detail page.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/resources/detail", {
    attachBearerToken: true,
  });
}
