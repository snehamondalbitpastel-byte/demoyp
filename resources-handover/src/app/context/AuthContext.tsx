"use client";

/* ================================================================
 * HANDOVER — Resources Module
 * File:    src/app/context/AuthContext.tsx
 * Role:    Stubbed AuthContext (mock user "Sneha Mondal") so the
 *          mini-profile + navbar avatar render in the demo without
 *          a real auth backend.
 * COPY?:   ❌ DO NOT copy — the target YP project owns the real
 *          AuthContext that talks to the auth API. The resources
 *          pages just need `useAuth()` to return `{ user, setUser,
 *          logout }` with the AuthUser fields the mini-profile reads.
 * See README.md §4 Step 2 (Required imports).
 * ================================================================ */

/**
 * STANDALONE DEMO — Stubbed AuthContext with a hard-coded mock user.
 *
 * In the real project, this is replaced by the senior's existing
 * AuthContext that talks to their backend auth API. For the standalone
 * demo we just need `useAuth()` to return a `{ user, setUser, logout }`
 * shape with reasonable display values so the resources mini-profile
 * (and the navbar avatar) render nicely (avatar initials, name, role,
 * location chip).
 *
 * The /resources LIST page also calls `setUser(...)` after a
 * `/api/mobile/profile` fetch to re-hydrate the viewer from the real
 * backend. In the standalone demo that fetch only succeeds when you
 * have a logged-in backend session; if it fails (the usual case when
 * just kicking the tyres) the mock user below stays in place, so the
 * mini-profile still renders.
 *
 * ▸ TIP: set the `useState` initial value to `null` (instead of
 *   MOCK_USER) to test the BLANK / skeleton mini-profile state — the
 *   page renders `<MiniProfileSkeleton />` while `user === null`.
 * ▸ Or replace this whole file with your real AuthContext — as long as
 *   `useAuth()` returns `{ user, setUser, logout }` with these fields,
 *   the resources pages don't change.
 */

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";

// Extended profile shape — includes the fields the mini-profile reads
// beyond the core AuthUser type. In the senior's project these come
// from /api/mobile/profile; here they're inlined.
export interface DemoUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  education?: string;
  study_field?: string;
  location?: string;
}

interface AuthContextValue {
  user: DemoUser | null;
  setUser: (u: DemoUser | null) => void;
  /** No-op in standalone demo. Real project calls /api/.../logout. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mock user — these are the values the mini-profile will display.
// Edit these to test different states. Set the whole object to `null`
// (in the useState init below) to test the skeleton/loading state.
const MOCK_USER: DemoUser = {
  id: "demo-user-001",
  first_name: "Sneha",
  last_name: "Mondal",
  full_name: "Sneha Mondal",
  email: "sneha@demo.com",
  role: "Apprenticeship",
  profile_image_url: null, // null → mini-profile shows initials "SM"
  education: "Apprenticeship",
  study_field: "Apprenticeship",
  location: "North East",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // ▸ Swap MOCK_USER → null here to test the blank/skeleton state.
  const [user, setUser] = useState<DemoUser | null>(MOCK_USER);

  // Standalone demo logout — just clears the in-memory user. In the real
  // project this calls the auth API, clears cookies, redirects to /auth.
  const logout = () => setUser(null);

  const value = useMemo<AuthContextValue>(
    () => ({ user, setUser, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
