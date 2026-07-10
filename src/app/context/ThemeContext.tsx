"use client";

/**
 * ThemeContext — light/dark mode state for the app.
 *
 * The actual scoping to specific pages (only Career Talks for now) is
 * handled by the consuming pages: they read `theme` from this context
 * and conditionally set `data-theme="light"` on their root container.
 * Other pages simply don't set the attribute, so they always render
 * with the dark `:root` CSS-variable values defined in globals.css.
 *
 * State persists in localStorage so a hard refresh keeps the chosen
 * mode. Default is "dark" until a saved preference is read.
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

/** Light mode is only allowed to render visually on Career Talks
 *  routes per the project spec. Keeping the path check here as a
 *  single source of truth that both the pre-hydration script in
 *  layout.tsx and this provider's effect agree on. */
function isLightThemeAllowed(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/career-talks") ||
    pathname.startsWith("/resources")
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  // `hydrated` flips to true ONLY after we've read the saved
  // preference from localStorage on mount. The sync-attribute
  // effect below early-returns until then, which is critical:
  // the pre-hydration <script> in layout.tsx has already set
  // `<html data-theme="light">` for the correct first paint,
  // and on initial mount the React `theme` state is still
  // "dark" (the SSR/default value). If the sync effect ran with
  // theme="dark" before localStorage was read, it would strip
  // the attribute the inline script just set — collapsing the
  // page back to dark mode for one frame until the localStorage
  // useEffect re-set it. The flag avoids that flash entirely.
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  // Re-hydrate the saved preference on mount. SSR can't read
  // localStorage, so we start "dark" on the server and re-sync on
  // the client; the page transitions seamlessly because the only
  // thing that changes is the CSS-variable cascade.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    } catch {
      // localStorage unavailable — fall back to default
    }
    setHydrated(true);
  }, []);

  // Keep the `<html data-theme="...">` attribute in sync with the
  // current theme + pathname. The pre-hydration <script> in
  // layout.tsx is what sets this attribute on FIRST paint (so the
  // refresh-skeleton flash doesn't render in dark mode); this
  // effect just keeps the attribute up to date afterwards — when
  // the viewer toggles the dropdown, or when they client-side-
  // navigate between a /career-talks page and another route.
  //
  // Per project spec, light mode only renders on Career Talks
  // pages. On every other route we remove the attribute so the
  // root CSS-variable defaults (dark palette) take over.
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
