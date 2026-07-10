import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Resources list proxy. Backs the right-column card grid on /resources.
 *
 * Body: `{ page, limit, search?, category?, sort_by? }`. Response:
 *   { status, data: {
 *       count, total_count,
 *       result: Array<{
 *         id, title, excerpt, category: {id, category_name},
 *         thumbnail_url, media_count, is_featured,
 *         published_at, created_at
 *       }>
 *   }}
 *
 * `thumbnail_url` is the URL of the first media item — may be an
 * image (.webp / .jpg / .png) OR a video (.mp4) OR audio (.mp3).
 * The client derives media type from the URL path segment
 * (`/audio/`, `/videos/`, `/images/`) and falls back to a gradient
 * placeholder when the URL isn't an image.
 *
 * `sort_by` accepts: "recently_added" (default — omit) | "a_to_z" | "z_to_a".
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/resources/list", {
    attachBearerToken: true,
  });
}
