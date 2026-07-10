import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Create-booking proxy. Backs the Register Now button on
 * /events/[id] for free events, and (when paid events finish
 * adding their Stripe checkout flow) the Book Now button as well.
 *
 * Body: `{ event_id, num_seats, coupon_code? }`. Response shape:
 *   { status: "OK", message, data: {
 *       booking_id, booking_number, booking_status, ...
 *     }
 *   }
 *
 * For events that aren't 100% off the upstream returns a Stripe
 * PaymentIntent inside `data` — the caller is expected to drive
 * the Stripe PaymentSheet UX and then POST `/event/confirm-payment`
 * with the resulting `booking_id`. For 100%-off / free events the
 * booking is created in a final state (booking_status set to a
 * confirmed-equivalent value) and no PaymentSheet is required.
 *
 * Failure path: `status: "ERROR"` + a human-readable `message`
 * (e.g. "No seats available", "Already booked").
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/create-booking", {
    attachBearerToken: true,
  });
}
