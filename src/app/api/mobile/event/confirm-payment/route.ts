import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Confirm-payment proxy. Called after the Stripe PaymentSheet
 * `confirmCardPayment` resolves successfully on /events/[id], so
 * the upstream can flip the booking row from "pending" to "paid"
 * (or surface the in-flight `requires_payment_method` /
 * `processing` states for retries).
 *
 * Body: `{ booking_id }`. Response shape:
 *   { status: "OK", message, data: {
 *       booking_id, booking_status, payment_status
 *     }
 *   }
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/confirm-payment", {
    attachBearerToken: true,
  });
}
