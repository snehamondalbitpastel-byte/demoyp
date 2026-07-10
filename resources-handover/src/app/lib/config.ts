/* HANDOVER — Resources Module · src/app/lib/config.ts · COPY? ✅ */

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

// DEMO DEFAULT — the live YoungPro backend. The Resources endpoints
// (list / categories / detail) are PUBLIC (no Bearer token required),
// so the standalone demo can fetch real data with ZERO config — no
// .env.local, no login. The senior can still override this by setting
// a `BACKEND_URL` env var (e.g. to point at staging) — env wins.
const DEMO_DEFAULT_BACKEND = "https://admin.youngprofessionals.global";

export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || DEMO_DEFAULT_BACKEND;
  return url.replace(/\/$/, "");
}
