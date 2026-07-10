import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Booking-details proxy. Backs /booking/[id].
 *
 * Body: `{ booking_id }`. Response covers the full booking record:
 * booking_number, num_seats, unit_price, subtotal, discount_amount,
 * total_amount, coupon_code, booking_status ("paid" / "cancelled"
 * / "pending"), nested `event` object (id, title, start_datetime,
 * banner_image_url, event_status), nested `payment` object
 * (payment_status, amount, currency, stripe_receipt_url, paid_at,
 * refunded_at, failure_reason), and `created_at`.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/booking-detail", {
    attachBearerToken: true,
  });
}
