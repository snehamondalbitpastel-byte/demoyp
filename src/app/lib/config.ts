/**
 * Server-side configuration.
 *
 * IMPORTANT: `BACKEND_URL` is a server-only env var (no NEXT_PUBLIC_ prefix).
 * It is only read inside API route handlers (server context). The browser
 * never sees this URL — all client requests go through local Next.js proxy
 * routes at /api/mobile/auth/*.
 *
 * Accessing `serverConfig.backendUrl` from a client component will throw.
 */

export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error(
      "Missing BACKEND_URL environment variable. " +
        "Add it to your .env.local file."
    );
  }
  return url.replace(/\/$/, "");
}
