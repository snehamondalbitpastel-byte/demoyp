import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

/**
 * Check-availability proxy. Used by the event-details page before
 * the viewer is sent to the external registration URL.
 *
 * Body: `{ event_id, num_seats }`. The upstream endpoint validates
 * that the requested seats are still available; on success the
 * response echoes back the request shape, on failure the response
 * carries `status: "ERROR"` and a human-readable `message`.
 */
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/event/check-availability", {
    attachBearerToken: true,
  });
}
