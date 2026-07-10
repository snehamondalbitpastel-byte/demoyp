import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/api/proxy";

export async function GET(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/skills", {
    attachBearerToken: true,
  });
}
