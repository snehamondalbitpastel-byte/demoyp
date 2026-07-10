import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * My-bookings proxy. Backs the "My Bookings" tab on /events.
 *
 * Body: empty (`{}` or none — the upstream endpoint reads the
 * viewer from the bearer token). Response:
 *   { status, message, data: {
 *       count, total_count,
 *       bookings: Array<{
 *         booking_id, booking_number,
 *         event: { id, title, start_datetime, banner_image_url,
 *                  event_type, event_type_display,
 *                  pricing_type, company_id, company_name },
 *         num_seats, total_amount,
 *         booking_status, payment_status, created_at
 *       }>
 *   }}
 *
 * Note the field is `bookings` (NOT `result` like the listing
 * endpoint). Each row carries the full event sub-object so the
 * UI can render a card without a follow-up details fetch.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/my-bookings", {
    attachBearerToken: true,
  });
}
