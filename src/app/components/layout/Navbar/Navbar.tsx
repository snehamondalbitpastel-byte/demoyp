"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
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

/* Lucide `trash-2` glyph — EXACT same markup the live YP site uses
   on its Delete Account control. Stroke colour is hard-coded to
   #EF4444 so the icon stays red in both dark and light mode (per
   user spec — do not modify). */
function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#EF4444"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
  /** SVG used when the route is INACTIVE. Original asset cloned
   *  from the live YP site — left untouched. */
  icon: string;
  /** SVG used when the route is ACTIVE. Paired filled / outline
   *  counterpart of `icon`. The original `icon` already
   *  represents whichever variant the live YP nav ships for the
   *  rail's default state — `iconActive` adds the OPPOSITE
   *  variant so the icon visually flips between filled and
   *  outline as the route changes (matching the live nav). */
  iconActive: string;
  href: string;
  showBadge?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  // The original `ion_home.svg` clone is the FILLED house from the
  // live YP rail — used when /home is the active route. The new
  // `ion_home-outline.svg` companion is rendered when /home is
  // inactive so the home icon dims to an outline silhouette like
  // the rest of the rail.
  { key: "home", label: "Home", icon: "/assets/icons/nav/ion_home-outline.svg", iconActive: "/assets/icons/nav/ion_home.svg", href: "/home" },
  // { key: "connections", label: "Connections", icon: "/assets/icons/nav/ion_people-outline.svg", href: "/connections" },
  // For the remaining four pills, the original "-line" / "-unfill" /
  // outline assets are the inactive variant; new "-fill" / "-solid"
  // companions are rendered when the route is active.
  { key: "company", label: "Company", icon: "/assets/icons/nav/clarity_building-line.svg", iconActive: "/assets/icons/nav/clarity_building-solid.svg", href: "/company" },
  { key: "notifications", label: "Notifications", icon: "/assets/icons/nav/tabler_bell.svg", iconActive: "/assets/icons/nav/tabler_bell-fill.svg", href: "/notifications", showBadge: true },
  { key: "jobs", label: "Jobs", icon: "/assets/icons/nav/ion_briefcase.svg", iconActive: "/assets/icons/nav/ion_briefcase-fill.svg", href: "/jobs" },
  { key: "events", label: "Events", icon: "/assets/icons/nav/event-unfill.svg", iconActive: "/assets/icons/nav/event-fill.svg", href: "/events" },
  { key: "career-talks", label: "Career Talks", icon: "/assets/icons/nav/career-talks-outline.svg", iconActive: "/assets/icons/nav/career-talks-fill.svg", href: "/career-talks" },
  { key: "resources", label: "Resources", icon: "/assets/icons/nav/resources-outline.svg", iconActive: "/assets/icons/nav/resources-fill.svg", href: "/resources" },
  /* ⚠️  TEMPORARY — 7th nav item: "Upload".
     Routes to the spreadsheet uploader page that stands in for the
     real Career Talks API during development. Uses the same icon
     convention as the other nav items (130×130 SVG, white stroke
     outline / white fill solid) so it inherits ALL existing nav-
     item behaviour automatically: active underline, icon swap,
     hover, light/dark theme tinting, mobile drawer, etc.

     To remove on handoff:
       - Delete this single entry from NAV_ITEMS
       - Delete `/public/assets/icons/nav/upload-outline.svg`
       - Delete `/public/assets/icons/nav/upload-fill.svg`
     Nothing else needs to change. */
  { key: "upload", label: "Upload", icon: "/assets/icons/nav/upload-outline.svg", iconActive: "/assets/icons/nav/upload-fill.svg", href: "/career-talks/upload" },
  // { key: "messages", label: "Messages", icon: "/assets/icons/nav/message.svg", href: "/messages" },
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Scroll-triggered navbar background: transparent at the very top,
  // navy once the page is scrolled (real-world pattern). Drives the
  // `.scrolled` class consumed by Navbar.module.css (mobile/tablet only).
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerDropdownRef = useRef<HTMLDivElement>(null);

  /** Theme picker handler — flips light/dark via ThemeContext and
   *  fires a toast confirmation. The dropdown stays OPEN after the
   *  switch (per user spec) so the viewer can see the active row's
   *  check-mark move to the newly-selected option without losing
   *  context, and can immediately switch again or close manually.
   *  The active light/dark CSS only applies on pages that opt-in
   *  by setting `data-theme` on `<html>` (Career Talks pages; the
   *  ThemeContext sync effect manages this). Other pages stay dark
   *  regardless of the global theme state. */
  const handleThemeSelect = (next: "light" | "dark") => {
    if (next === theme) return;
    setTheme(next);
    /* `toast.success(...)` so the green check-icon variant fires
       per user spec. The bg colour is overridden in ThemedToaster
       (pure white in light mode, default dark shadow in dark mode),
       but the green tick + green text are preserved. */
    toast.success(
      next === "light" ? "Light mode enabled" : "Dark mode enabled"
    );
  };

  // Mirror the client-side "deleted image" suppression used on the profile
  // page. The backend currently keeps echoing the previously-deleted URL
  // after refresh, so we hide it here too whenever the user's cached
  // profile_image_url matches the value we stored at deletion time. When
  // a fresh upload happens on the profile page, that key is removed — the
  // navbar picks up the new URL automatically on next load.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);

  // Toggle `scrolled` on window scroll. On mobile/tablet the navbar is
  // sticky over full-page-scrolling content, so fading in a navy
  // background once scrolled keeps content from bleeding under it while
  // staying transparent at the top. Runs once on mount to catch a
  // non-zero initial scroll position. Passive listener so it never
  // blocks scrolling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — avatar shows whatever backend returns.
    }
  }, []);
  // Re-read on route change so navigation back from the profile page picks
  // up a delete/upload that just happened.
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {}
  }, [pathname]);

  const rawAvatarUrl = user?.profile_image_url ?? null;
  const avatarUrl =
    rawAvatarUrl && rawAvatarUrl === deletedImageUrl ? null : rawAvatarUrl;

  const initials = getInitials(user?.first_name, user?.last_name);

  const activeKey = (() => {
    if (!pathname) return null;
    // Exact-match only so detail / subroute pages don't keep their
    // parent nav item highlighted. Example: `/jobs` lights up the
    // "Jobs" pill, but `/jobs/static-1` (the job-details route) does
    // NOT — matching the spec for desktop, tablet, and mobile drawer.
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

  // Preload the avatar image so it's already in the browser cache before
  // the drawer is opened. Without this, in tablet/mobile mode the desktop
  // .avatarWrapper is `display: none`, which prevents browsers from fetching
  // its inner <img>, and the drawer avatar would load for the first time
  // only after the user taps the hamburger.
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

  async function handleLogout() {
    try {
      await fetch("/api/mobile/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Network failure shouldn't block client-side cleanup — continue.
    }
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    logout();
    window.location.replace("/auth");
  }

  function handleViewProfile() {
    if (user?.id) {
      router.push(`/profile/${encodeURIComponent(user.id)}`);
    }
    setDropdownOpen(false);
  }

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
                  onClick={() => router.push(item.href)}
                  aria-label={item.label}
                >
                  <span className={styles.navIconWrap}>
                    {/* Render BOTH the outline + filled icons at the
                        same position. Toggling visibility via CSS
                        (instead of swapping `<img src>`) means the
                        browser keeps both SVGs decoded in memory,
                        so flipping between routes is instant — no
                        fetch, no flash, no layout shift. The icon
                        whose state matches the active route is
                        opacity:1; the other is opacity:0. */}
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

              <div className={styles.dropdownDivider} />

              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              >
                <TrashIcon />
                <span>Delete Account</span>
              </button>

              <div className={styles.dropdownDivider} />

              <div className={styles.dropdownActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleViewProfile}
                >
                  View Profile
                </button>
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={() => {
                    setDropdownOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                >
                  Log Out
                </button>
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

                  <div className={styles.dropdownDivider} />

                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  >
                    <TrashIcon />
                    <span>Delete Account</span>
                  </button>

                  <div className={styles.dropdownDivider} />

                  <div className={styles.dropdownActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => {
                        setDropdownOpen(false);
                        setDrawerOpen(false);
                        handleViewProfile();
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtnPrimary}
                      onClick={() => {
                        setDropdownOpen(false);
                        setDrawerOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                    >
                      Log Out
                    </button>
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
                      router.push(item.href);
                    }}
                  >
                    <span className={styles.drawerIconWrap}>
                      {/* Same dual-render trick as the desktop rail —
                          both icon variants stay in the DOM, only
                          opacity flips so route changes don't trigger
                          a fresh fetch / loading flash. */}
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

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        reverseButtons
        size="large"
        hideClose
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </nav>
  );
}
