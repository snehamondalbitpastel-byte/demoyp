/**
 * Proxy for profile image upload. Backend expects multipart/form-data with a
 * `profile_image` file field (NOT JSON with base64).
 */

import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/app/lib/config";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;
  if (!accessToken) {
    console.error("[upload-profile-img] No access_token cookie found");
    return NextResponse.json(
      { status: "ERROR", message: "Not authenticated", data: null },
      { status: 401 }
    );
  }

  // Read incoming form-data and rebuild for outgoing request.
  let incomingFd: FormData;
  try {
    incomingFd = await req.formData();
  } catch (err) {
    console.error("[upload-profile-img] Failed to read form data:", err);
    return NextResponse.json(
      { status: "ERROR", message: "Invalid form data", data: null },
      { status: 400 }
    );
  }

  const outgoingFd = new FormData();
  for (const [key, val] of incomingFd.entries()) {
    outgoingFd.append(key, val);
  }

  // Log entries for debugging.
  const entries: string[] = [];
  for (const [key, val] of incomingFd.entries()) {
    if (val instanceof File) {
      entries.push(`${key}=File(${val.name}, ${val.size} bytes, ${val.type})`);
    } else {
      entries.push(`${key}=${String(val).slice(0, 50)}`);
    }
  }
  console.log(`[upload-profile-img] FormData entries: ${entries.join(", ")}`);

  const backendUrl = getBackendUrl();
  const targetUrl = `${backendUrl}/api/mobile/V1/upload-profile-img`;

  let backendRes: Response;
  try {
    // Do NOT set Content-Type — fetch auto-sets it with multipart boundary.
    backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      body: outgoingFd,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[upload-profile-img] Upstream fetch failed:", err);
    return NextResponse.json(
      {
        status: "ERROR",
        message:
          err instanceof Error
            ? `Upstream request failed: ${err.message}`
            : "Upstream request failed",
        data: null,
      },
      { status: 502 }
    );
  }

  const responseText = await backendRes.text();
  console.log(
    `[upload-profile-img] Backend response status: ${backendRes.status}, body preview: ${responseText.slice(0, 300)}`
  );

  return new NextResponse(responseText || null, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });
}
