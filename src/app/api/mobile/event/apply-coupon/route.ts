import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Apply-coupon proxy. Backs the "Apply" button next to the coupon
 * input on /events/[id].
 *
 * Body: `{ event_id, coupon_code, num_seats }`. Response on
 * failure carries `status: "ERROR"` + `message: "Invalid coupon
 * code"` (or similar) which the client surfaces as a toast. On
 * success the response includes discount metadata which can be
 * applied to the booking summary.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/apply-coupon", {
    attachBearerToken: true,
  });
}
