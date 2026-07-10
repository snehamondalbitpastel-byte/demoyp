import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Single-event-details proxy. Backs /events/[id].
 *
 * Body: `{ id }`. Response shape covers the full event record
 * (title, slug, description HTML, banner_image_url, event_type
 * "0"/"1", event_type_display, location[], platform_name /
 * platform_link for virtual events, external_registration_url,
 * start_datetime, end_datetime, list_price, offer_price,
 * total_seats, min_seats_per_booking, max_seats_per_booking,
 * pricing_type "paid"/"free", is_registration_open,
 * seats_available, user_booking, available_coupons).
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event", {
    attachBearerToken: true,
  });
}
