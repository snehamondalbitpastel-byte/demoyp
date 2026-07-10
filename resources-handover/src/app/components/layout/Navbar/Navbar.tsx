"use client";

/* ================================================================
 * HANDOVER — Resources Module
 * File:    src/app/components/layout/Navbar/Navbar.tsx
 * Role:    SIMPLIFIED demo navbar — pixel-identical look to the real
 *          YP navbar, but trimmed for the standalone bundle:
 *            • 5 nav items (Home / Company / Jobs / Events / Resources).
 *              ONLY Resources is wired (router.push). The other 4 render
 *              normally but do nothing on click — their routes don't
 *              exist in this bundle.
 *            • The avatar dropdown (desktop + mobile drawer) holds ONLY
 *              the Light / Dark theme toggle. No logout, no view/edit
 *              profile, no delete-account, no ConfirmDialog.
 *            • `useAuth` is used only to READ the avatar / name.
 * COPY?:   ❌ (demo nav) DO NOT copy into the target project — it has
 *          its own full navbar. Just add one `resources` entry to that
 *          navbar's NAV_ITEMS array (see README.md §4 Step 4).
 * ================================================================ */

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import styles from "./Navbar.module.css";

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

type NavItem = {
  key: string;
  label: string;
  icon: string;
  iconActive: string;
  href: string;
};

// Demo nav — 5 items in the live YP order. Only Resources is wired in
// this bundle (see the click handlers below); the other 4 render with
// the exact same look but do nothing on click because their routes
// (/home, /company, /jobs, /events) don't exist here.
const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", icon: "/assets/icons/nav/ion_home-outline.svg", iconActive: "/assets/icons/nav/ion_home.svg", href: "/home" },
  { key: "company", label: "Company", icon: "/assets/icons/nav/clarity_building-line.svg", iconActive: "/assets/icons/nav/clarity_building-solid.svg", href: "/company" },
  { key: "jobs", label: "Jobs", icon: "/assets/icons/nav/ion_briefcase.svg", iconActive: "/assets/icons/nav/ion_briefcase-fill.svg", href: "/jobs" },
  { key: "events", label: "Events", icon: "/assets/icons/nav/event-unfill.svg", iconActive: "/assets/icons/nav/event-fill.svg", href: "/events" },
  { key: "resources", label: "Resources", icon: "/assets/icons/nav/resources-outline.svg", iconActive: "/assets/icons/nav/resources-fill.svg", href: "/resources" },
];

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return (f + l) || "U";
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Scroll-triggered navbar background: transparent at the very top,
  // navy once the page is scrolled (real-world pattern). Drives the
  // `.scrolled` class consumed by Navbar.module.css (mobile/tablet only).
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerDropdownRef = useRef<HTMLDivElement>(null);

  /** Theme picker handler — flips light/dark via ThemeContext and fires
   *  a toast confirmation. Dropdown stays open so the active row's
   *  check-mark visibly moves. Light CSS only applies on /resources
   *  pages (ThemeContext scopes it); other routes stay dark. */
  const handleThemeSelect = (next: "light" | "dark") => {
    if (next === theme) return;
    setTheme(next);
    toast.success(
      next === "light" ? "Light mode enabled" : "Dark mode enabled"
    );
  };

  const rawAvatarUrl = user?.profile_image_url ?? null;
  const avatarUrl = rawAvatarUrl;
  const initials = getInitials(user?.first_name, user?.last_name);

  const activeKey = (() => {
    if (!pathname) return null;
    const match = NAV_ITEMS.find((item) => pathname === item.href);
    return match?.key ?? null;
  })();

  // Demo nav: only Resources actually navigates. The other 4 items are
  // non-functional on purpose (their routes aren't in this bundle).
  function handleNavClick(item: NavItem) {
    if (item.key === "resources") {
      router.push(item.href);
    }
    // else: no-op in the demo.
  }

  // Toggle `scrolled` on window scroll. The resources LIST page on
  // mobile re-enables full-page (window) scroll, so the sticky navbar
  // pins while content scrolls underneath — this is what fades the
  // navy background in. Runs once on mount to catch a non-zero initial
  // scroll position (e.g. after a refresh mid-page). Passive listener
  // so it never blocks scrolling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inDesktop = dropdownRef.current?.contains(target) ?? false;
      const inDrawer = drawerDropdownRef.current?.contains(target) ?? false;
      if (!inDesktop && !inDrawer) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Preload the avatar image so it's already cached before the drawer
  // opens (the desktop .avatarWrapper is display:none on tablet/mobile,
  // which would otherwise defer the fetch to first drawer-open).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!avatarUrl) return;
    const img = new window.Image();
    img.src = avatarUrl;
  }, [avatarUrl]);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <nav className={`${styles.navbar}${scrolled ? ` ${styles.scrolled}` : ""}`}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <span className={styles.logoYoung}>YOUNG</span>
          <span className={styles.logoPro}>PRO</span>
        </div>

        <ul className={styles.navItems}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={`${styles.navBtn} ${isActive ? styles.navBtnActive : ""}`}
                  onClick={() => handleNavClick(item)}
                  aria-label={item.label}
                >
                  <span className={styles.navIconWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.icon}
                      alt={item.label}
                      width={24}
                      height={24}
                      decoding="async"
                      className={`${styles.navIconImg} ${
                        isActive ? styles.navIconImgHidden : styles.navIconImgVisible
                      }`}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.iconActive}
                      alt=""
                      width={24}
                      height={24}
                      decoding="async"
                      aria-hidden="true"
                      className={`${styles.navIconImg} ${
                        isActive ? styles.navIconImgVisible : styles.navIconImgHidden
                      }`}
                    />
                  </span>
                  <span className={styles.navLabel} data-label={item.label}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className={styles.hamburgerBtn}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.avatarWrapper} ref={dropdownRef}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="User menu"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.full_name || "Profile"}
                className={styles.avatarImg}
              />
            ) : !user ? (
              <div className={styles.avatarSkeleton} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.full_name || "Profile"}
                    className={styles.dropdownAvatar}
                  />
                ) : (
                  <div className={styles.dropdownAvatarInitials}>{initials}</div>
                )}
                <span className={styles.dropdownName}>
                  {user?.full_name || "User"}
                </span>
              </div>

              <div className={styles.dropdownDivider} />

              <div className={styles.dropdownSection}>
                <div className={styles.dropdownSectionTitle}>
                  <MoonIcon />
                  <span>Appearance</span>
                </div>
                <label
                  className={styles.themeOption}
                  onClick={() => handleThemeSelect("light")}
                >
                  <SunIcon />
                  <span className={theme === "light" ? styles.themeActive : ""}>
                    Light
                  </span>
                  {theme === "light" && (
                    <span className={styles.checkMark}>&#10003;</span>
                  )}
                </label>
                <label
                  className={styles.themeOption}
                  onClick={() => handleThemeSelect("dark")}
                >
                  <MoonIcon />
                  <span className={theme === "dark" ? styles.themeActive : ""}>
                    Dark
                  </span>
                  {theme === "dark" && (
                    <span className={styles.checkMark}>&#10003;</span>
                  )}
                </label>
                <label className={styles.themeOption}>
                  <MonitorIcon />
                  <span>System</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={styles.divider} />

      {drawerOpen && (
        <>
          <div
            className={styles.drawerOverlay}
            onClick={() => setDrawerOpen(false)}
          />
          <aside className={styles.drawer} role="dialog" aria-label="Navigation menu">
            <div className={styles.drawerHeader} ref={drawerDropdownRef}>
              <button
                type="button"
                className={styles.drawerAvatarBtn}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Open profile menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.full_name || "Profile"}
                    className={styles.drawerAvatar}
                  />
                ) : (
                  <div className={styles.drawerAvatarInitials}>{initials}</div>
                )}
              </button>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {dropdownOpen && (
                <div className={`${styles.dropdown} ${styles.drawerDropdown}`}>
                  <div className={styles.dropdownUser}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.full_name || "Profile"}
                        className={styles.dropdownAvatar}
                      />
                    ) : (
                      <div className={styles.dropdownAvatarInitials}>{initials}</div>
                    )}
                    <span className={styles.dropdownName}>
                      {user?.full_name || "User"}
                    </span>
                  </div>

                  <div className={styles.dropdownDivider} />

                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownSectionTitle}>
                      <MoonIcon />
                      <span>Appearance</span>
                    </div>
                    <label
                      className={styles.themeOption}
                      onClick={() => handleThemeSelect("light")}
                    >
                      <SunIcon />
                      <span className={theme === "light" ? styles.themeActive : ""}>
                        Light
                      </span>
                      {theme === "light" && (
                        <span className={styles.checkMark}>&#10003;</span>
                      )}
                    </label>
                    <label
                      className={styles.themeOption}
                      onClick={() => handleThemeSelect("dark")}
                    >
                      <MoonIcon />
                      <span className={theme === "dark" ? styles.themeActive : ""}>
                        Dark
                      </span>
                      {theme === "dark" && (
                        <span className={styles.checkMark}>&#10003;</span>
                      )}
                    </label>
                    <label className={styles.themeOption}>
                      <MonitorIcon />
                      <span>System</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <nav className={styles.drawerNav}>
              {NAV_ITEMS.map((item) => {
                const isActive = item.key === activeKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.drawerNavItem} ${isActive ? styles.drawerNavItemActive : ""}`}
                    onClick={() => {
                      setDrawerOpen(false);
                      handleNavClick(item);
                    }}
                  >
                    <span className={styles.drawerIconWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.icon}
                        alt=""
                        width={22}
                        height={22}
                        decoding="async"
                        className={`${styles.drawerIconImg} ${
                          isActive ? styles.drawerIconImgHidden : styles.drawerIconImgVisible
                        }`}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.iconActive}
                        alt=""
                        width={22}
                        height={22}
                        decoding="async"
                        aria-hidden="true"
                        className={`${styles.drawerIconImg} ${
                          isActive ? styles.drawerIconImgVisible : styles.drawerIconImgHidden
                        }`}
                      />
                    </span>
                    <span className={styles.drawerNavLabel}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </nav>
  );
}
