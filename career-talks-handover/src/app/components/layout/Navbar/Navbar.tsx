"use client";

/* ================================================================
 * HANDOVER PACKAGE — Career Talks Module
 * File:    src/app/components/layout/Navbar/Navbar.tsx
 * Role:    Two-link demo navbar — only "Career Talks" and "Upload"
 *          (the only routes that exist in this bundle). Otherwise
 *          pixel-identical to the real YP navbar: same height,
 *          logo, avatar, dropdown, hamburger drawer, light-mode
 *          icon tint, ESC/outside-click handlers.
 * COPY?:   ❌ DO NOT copy into the target project. Target has its
 *          own full-featured navbar. Instead, add ONE link entry
 *          to that navbar's NAV_ITEMS array — see README.md §4
 *          Step 4 for the exact snippet.
 * See README.md §2 (Two-link nav explanation).
 * ================================================================ */

/**
 * STANDALONE DEMO — Pixel-identical copy of the real YP Navbar.
 *
 * Only difference from the real one:
 *   • `ConfirmDialog` import removed (replaced with window.confirm)
 *   • Logout API call removed (logout is a no-op since there's no backend)
 *
 * Everything else — height, padding, icon sizes, drawer, theme picker,
 * label font-weights, hover behaviour — is IDENTICAL to the real navbar
 * so the layout matches exactly when integrated.
 */

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

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

type NavItem = {
  key: string;
  label: string;
  icon: string;
  iconActive: string;
  href: string;
  showBadge?: boolean;
};

// Standalone-demo nav — only the Career Talks routes (`/career-talks`
// and `/career-talks/upload`) actually exist in this handover bundle.
// Home / Company / Notifications / Jobs / Events were stripped per
// user spec: those routes aren't part of the demo, so showing them in
// the nav would 404 the moment a viewer clicked them. The navbar's
// height, layout, logo and profile avatar remain UNCHANGED — only
// this NAV_ITEMS array shrunk.
const NAV_ITEMS: NavItem[] = [
  { key: "career-talks", label: "Career Talks", icon: "/assets/icons/nav/career-talks-outline.svg", iconActive: "/assets/icons/nav/career-talks-fill.svg", href: "/career-talks" },
  { key: "upload", label: "Upload", icon: "/assets/icons/nav/upload-outline.svg", iconActive: "/assets/icons/nav/upload-fill.svg", href: "/career-talks/upload" },
];

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return (f + l) || "U";
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerDropdownRef = useRef<HTMLDivElement>(null);

  const handleThemeSelect = (next: "light" | "dark") => {
    if (next === theme) return;
    setTheme(next);
    toast.success(next === "light" ? "Light mode enabled" : "Dark mode enabled");
  };

  const rawAvatarUrl = user?.profile_image_url ?? null;
  const avatarUrl = rawAvatarUrl;
  const initials = getInitials(user?.first_name, user?.last_name);

  const activeKey = (() => {
    if (!pathname) return null;
    const match = NAV_ITEMS.find((item) => pathname === item.href);
    return match?.key ?? null;
  })();

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

  // STANDALONE DEMO — Logout uses window.confirm + AuthContext stub.
  // In the real project, this calls /api/mobile/auth/logout and clears
  // cookies. Here, we just clear the in-memory user and toast.
  function handleLogout() {
    const ok = typeof window !== "undefined" && window.confirm("Log out?");
    if (!ok) return;
    logout();
    toast.success("Logged out (demo)");
  }

  function handleViewProfile() {
    if (user?.id) {
      router.push(`/profile/${encodeURIComponent(user.id)}`);
    }
    setDropdownOpen(false);
  }

  // Profile dropdown panel — extracted so it can render in BOTH the
  // desktop avatar wrapper AND the mobile drawer header. The desktop
  // wrapper is hidden by `.avatarWrapper { display: none }` on
  // ≤1024px, so without rendering this inside the drawer too, the
  // Light/Dark theme toggle is unreachable on tablet/mobile. The
  // `extraClass` parameter lets the drawer caller add `.drawerDropdown`
  // which overrides the default top-right anchor to a left-aligned
  // one (matches the main YP project's drawer layout exactly).
  const renderDropdown = (extraClass = "") => (
    <div className={`${styles.dropdown} ${extraClass}`.trim()}>
      <div className={styles.dropdownUser}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={user?.full_name || "Profile"} className={styles.dropdownAvatar} />
        ) : (
          <div className={styles.dropdownAvatarInitials}>{initials}</div>
        )}
        <span className={styles.dropdownName}>{user?.full_name || "User"}</span>
      </div>

      <div className={styles.dropdownDivider} />

      <div className={styles.dropdownSection}>
        <div className={styles.dropdownSectionTitle}>
          <MoonIcon />
          <span>Appearance</span>
        </div>
        <label className={styles.themeOption} onClick={() => handleThemeSelect("light")}>
          <SunIcon />
          <span className={theme === "light" ? styles.themeActive : ""}>Light</span>
          {theme === "light" && <span className={styles.checkMark}>&#10003;</span>}
        </label>
        <label className={styles.themeOption} onClick={() => handleThemeSelect("dark")}>
          <MoonIcon />
          <span className={theme === "dark" ? styles.themeActive : ""}>Dark</span>
          {theme === "dark" && <span className={styles.checkMark}>&#10003;</span>}
        </label>
        <label className={styles.themeOption}>
          <MonitorIcon />
          <span>System</span>
        </label>
      </div>

      <div className={styles.dropdownDivider} />

      <button type="button" className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}>
        <TrashIcon />
        <span>Delete Account</span>
      </button>

      <div className={styles.dropdownDivider} />

      <div className={styles.dropdownActions}>
        <button type="button" className={styles.actionBtn} onClick={handleViewProfile}>
          View Profile
        </button>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={() => {
            setDropdownOpen(false);
            handleLogout();
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <nav className={styles.navbar}>
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
                  onClick={() => router.push(item.href)}
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
                      className={`${styles.navIconImg} ${isActive ? styles.navIconImgHidden : styles.navIconImgVisible}`}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.iconActive}
                      alt=""
                      width={24}
                      height={24}
                      decoding="async"
                      aria-hidden="true"
                      className={`${styles.navIconImg} ${isActive ? styles.navIconImgVisible : styles.navIconImgHidden}`}
                    />
                    {item.showBadge && <span className={styles.navBadge} />}
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
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={user?.full_name || "Profile"} className={styles.avatarImg} />
            ) : !user ? (
              <div className={styles.avatarSkeleton} />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
          </button>

          {dropdownOpen && renderDropdown()}
        </div>
      </div>
      <div className={styles.divider} />

      {drawerOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
          <aside className={styles.drawer} role="dialog" aria-label="Navigation menu">
            <div className={styles.drawerHeader} ref={drawerDropdownRef}>
              <button
                type="button"
                className={styles.drawerAvatarBtn}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Open profile menu"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={user?.full_name || "Profile"} className={styles.drawerAvatar} />
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
              {dropdownOpen && renderDropdown(styles.drawerDropdown)}
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
                      router.push(item.href);
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
                        className={`${styles.drawerIconImg} ${isActive ? styles.drawerIconImgHidden : styles.drawerIconImgVisible}`}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.iconActive}
                        alt=""
                        width={22}
                        height={22}
                        decoding="async"
                        aria-hidden="true"
                        className={`${styles.drawerIconImg} ${isActive ? styles.drawerIconImgVisible : styles.drawerIconImgHidden}`}
                      />
                      {item.showBadge && <span className={styles.drawerBadge} />}
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
