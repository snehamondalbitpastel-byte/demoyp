import { NextRequest } from "next/server";
import { proxyFormDataRequest } from "@/app/lib/api/proxy";

export async function POST(req: NextRequest) {
  return proxyFormDataRequest(req, "/api/mobile/V1/create-profile");
}
