import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/auth/resend-otp");
}
