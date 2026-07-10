import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Cancel-booking proxy. Initiates the upstream refund + flips the
 * booking row to "cancelled". Called from the booked-state UI on
 * /events/[id] (and /booking/[id]) when the viewer chooses to
 * cancel a paid booking.
 *
 * Body: `{ booking_id }`. Response shape:
 *   { status: "OK", message, data: {
 *       booking_id, booking_status: "cancelled"
 *     }
 *   }
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/cancel-booking", {
    attachBearerToken: true,
  });
}
