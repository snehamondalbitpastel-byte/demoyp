"use client";

/**
 * AuthContext — global auth state for the logged-in user.
 *
 * Tokens themselves live in HttpOnly cookies (backend manages them).
 * We only keep user profile data in React state so the UI can greet the user,
 * redirect guests, and clear state on logout.
 *
 * Usage:
 *   const { user, setUser, isAuthenticated, logout } = useAuth();
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/app/lib/api/types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    // Caller (or a logout button) should also call POST /auth/logout so the
    // backend clears the HttpOnly cookies. Keeping this lean — no endpoint yet.
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      setUser,
      logout,
    }),
    [user, logout]
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
