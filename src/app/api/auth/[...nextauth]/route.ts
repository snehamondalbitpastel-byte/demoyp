/**
 * NextAuth catch-all route handler.
 * Handles /api/auth/signin, /api/auth/callback/google, /api/auth/session, etc.
 */

import { handlers } from "@/auth";

// Auth.js v5 handlers are already properly typed route handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GET = handlers.GET as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POST = handlers.POST as any;
