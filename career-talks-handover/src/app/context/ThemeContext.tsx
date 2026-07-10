"use client";

/* ================================================================
 * HANDOVER PACKAGE — Career Talks Module
 * File:    src/app/context/ThemeContext.tsx
 * Role:    Light/dark theme provider. Stores choice in
 *          localStorage("yp.theme") and stamps `data-theme="light"`
 *          on <html> ONLY when the user is on a /career-talks route
 *          — every other page stays dark by design.
 * COPY?:   ⚠ The target project should already have this exact
 *          context (same shape). Verify `useTheme()` returns
 *          `{ theme, setTheme, toggleTheme }` before integrating —
 *          career-talks pages depend on that shape.
 * See README.md §2 (Light mode behaviour).
 * ================================================================ */

/**
 * ThemeContext — light/dark mode state for the demo.
 *
 * Same implementation as the parent project: stores theme in
 * localStorage("yp.theme") and applies `data-theme="light"` to
 * `<html>` only on /career-talks pages.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "yp.theme";

function isLightThemeAllowed(pathname: string | null): boolean {
  return !!pathname && pathname.startsWith("/career-talks");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "light" && isLightThemeAllowed(pathname)) {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme, pathname, hydrated]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
