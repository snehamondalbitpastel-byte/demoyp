"use client";

/**
 * Wraps the NextAuth SessionProvider so it can be imported into the
 * server-side layout.tsx. Only used for social OAuth — the rest of the
 * app's auth uses our own HttpOnly cookie system.
 */

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SessionWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
