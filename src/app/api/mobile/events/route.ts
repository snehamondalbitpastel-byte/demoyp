import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Events-listing proxy. Backs the right-column "All Events" tab on
 * /events.
 *
 * Body: `{ page, limit }`. Response:
 *   { status, message, data: {
 *       count, total_count,
 *       result: Array<{
 *         id, title, slug, description, banner_image_url,
 *         event_type ("0" physical / "1" virtual),
 *         event_type_display ("Physical Event" / "Virtual Event"),
 *         location: string[] | null,
 *         start_datetime, end_datetime,
 *         list_price, offer_price, total_seats,
 *         pricing_type ("paid" | "free"),
 *         is_registration_open, event_status,
 *         booking_status, payment_status, …
 *       }>
 *   }}
 *
 * `description` is HTML rich-text (`<p>…</p>`); `start_datetime` /
 * `end_datetime` are ISO strings; `list_price` is a stringified
 * decimal (use `Number(p)` to compare and format with
 * `formatGBP`).
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/events", {
    attachBearerToken: true,
  });
}
