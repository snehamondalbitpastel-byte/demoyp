"use client";

import { useEffect, useState } from "react";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
// Page chrome (background, navbar offset, two-column grid, mini-
// profile card) is shared with /home, /jobs, /company and /events
// via the home module. Notifications-specific styles (right panel
// header, notification cards, action pills) live in
// `notifications.module.css`.
import homeStyles from "@/app/home/home.module.css";
import styles from "./notifications.module.css";

/** Extra profile fields returned by /api/mobile/profile beyond
 *  AuthUser — same subset every other page consumes for the
 *  mini-profile card. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
};

/** Static shape for a single notification row. The dynamic step
 *  will replace this with a real API map; for now the list renders
 *  from a constant so the UI matches the live YP /notifications SS
 *  exactly (two "Booking Confirmed" rows). */
type Notification = {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
};

/** Static seed mirroring the live YP /notifications SS the user
 *  pasted. The avatar is intentionally a "YP" caps tile — same
 *  treatment the live website uses for system-generated booking
 *  confirmations. */
const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Booking Confirmed",
    message: "Your booking for sdf is confirmed",
    timeAgo: "1 day ago",
  },
  {
    id: "2",
    title: "Booking Confirmed",
    message:
      "Your booking for University of Law Computer Science and Tech- Hack-a-thon Virtual Event is confirmed",
    timeAgo: "1 day ago",
  },
];

// ── Icons (kept inline so this page is self-contained) ──────────────────

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CrossSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function NotificationsEmptyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return f + l || "U";
}

function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Skeleton mirroring the home / jobs / company / events mini-profile. ─

function MiniProfileSkeleton() {
  return (
    <section className={homeStyles.miniProfile} aria-hidden="true">
      <div className={`${homeStyles.miniAvatar} ${homeStyles.skeleton}`} />
      <div className={homeStyles.miniInfo}>
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelName} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelRole} ${homeStyles.skeleton}`}
        />
        <div
          className={`${homeStyles.skelLine} ${homeStyles.skelChip} ${homeStyles.skeleton}`}
        />
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  const { user, setUser } = useAuth();

  // Right-column search input (debouncing isn't needed here — the
  // list is static and filters are applied client-side, so the
  // input drives the visible list directly).
  const [searchText, setSearchText] = useState("");

  // Notification list state — seeded from STATIC_NOTIFICATIONS and
  // mutated by the per-row Clear button + the Clear All button.
  // Switching to dynamic later just means swapping this state for
  // an API-fetched array.
  const [notifications, setNotifications] = useState<Notification[]>(
    STATIC_NOTIFICATIONS
  );

  // Mirror the home / jobs / company / events "deleted image"
  // suppression so the mini-profile avatar renders consistently
  // across pages after photo deletion.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  // Refresh the viewer's profile so the mini-profile renders even
  // on a hard refresh of /notifications. Same pattern every other
  // page in the app uses.
  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const res = await fetch("/api/mobile/profile", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.status === "OK" && json.data) {
          setUser(json.data as AuthUser);
        }
      } catch {
        // Silent fail — navbar / mini-profile shows fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Client-side search across the static list. Matches against
  // title + message substrings (case-insensitive).
  const searchQuery = searchText.trim().toLowerCase();
  const visibleNotifications = searchQuery
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery) ||
          n.message.toLowerCase().includes(searchQuery)
      )
    : notifications;

  /** Per-row Clear — drops a single notification from the list. */
  const clearOne = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  /** Bulk Clear All — wipes the entire notifications list. Renders
   *  the empty state until new notifications arrive. */
  const clearAll = () => {
    setNotifications([]);
    setSearchText("");
  };

  // Avatar / name / role / location — same derivation every other
  // page uses so the mini-profile renders identically across pages.
  const profile = user as HomeProfile | null;
  const rawAvatarUrl = profile?.profile_image_url || null;
  const avatarUrl =
    rawAvatarUrl && rawAvatarUrl === deletedImageUrl ? null : rawAvatarUrl;
  const fullName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const initials = getInitials(profile?.first_name, profile?.last_name);
  const miniRole =
    titleCase(profile?.education?.trim() || "") ||
    profile?.study_field?.trim() ||
    "";
  const miniLocation = profile?.location?.trim() || "";

  return (
    <div className={`${homeStyles.page} ${styles.pageNotifications}`}>
      <Navbar />
      <main
        className={`${homeStyles.content} ${styles.contentNotificationsPage}`}
      >
        {/* ── LEFT COLUMN — mini-profile card only. The notifications
            page has just one card on the left (no stats box, no
            recommended-jobs panel) per the live SS. ── */}
        <aside className={homeStyles.leftCol} aria-label="Profile">
          {profile === null ? (
            <MiniProfileSkeleton />
          ) : (
            <section
              className={homeStyles.miniProfile}
              aria-label="Your profile"
            >
              <div className={homeStyles.miniAvatar} aria-hidden="true">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </div>
              <div className={homeStyles.miniInfo}>
                {fullName ? (
                  <p className={homeStyles.miniName}>{fullName}</p>
                ) : null}
                {miniRole ? (
                  <p className={homeStyles.miniRole}>{miniRole}</p>
                ) : null}
                {miniLocation ? (
                  <span className={homeStyles.miniLocation}>
                    <LocationIcon />
                    {miniLocation}
                  </span>
                ) : null}
              </div>
            </section>
          )}
        </aside>

        {/* ── RIGHT COLUMN — single rounded card holding the heading,
            search bar, Clear All button, and the notifications
            list (inner-scrolled on desktop). ── */}
        <section className={styles.rightOuter} aria-label="Notifications">
          <div className={styles.rightHeader}>
            <h1 className={styles.rightTitle}>All Notifications</h1>
            <div className={styles.searchClearWrap}>
              <div className={styles.searchWrap}>
                <div className={homeStyles.searchBar}>
                  <span
                    className={homeStyles.searchIconWrap}
                    aria-hidden="true"
                  >
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    className={homeStyles.searchInput}
                    placeholder="Search notifications..."
                    aria-label="Search notifications"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText ? (
                    <button
                      type="button"
                      className={homeStyles.searchClear}
                      aria-label="Clear search"
                      onClick={() => setSearchText("")}
                    >
                      <CrossSmallIcon />
                    </button>
                  ) : null}
                </div>
              </div>
              {notifications.length > 0 ? (
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={clearAll}
                >
                  Clear All
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.list}>
            {visibleNotifications.length === 0 ? (
              <div className={styles.listEmpty}>
                <NotificationsEmptyIcon />
                <p className={styles.listEmptyText}>
                  {searchQuery
                    ? "No notifications match your search."
                    : "You're all caught up — no notifications yet."}
                </p>
              </div>
            ) : (
              visibleNotifications.map((n) => (
                <article key={n.id} className={styles.notifCard}>
                  <div className={styles.notifAvatar} aria-hidden="true">
                    YP
                  </div>
                  <div className={styles.notifInfo}>
                    <h2 className={styles.notifTitle}>{n.title}</h2>
                    <p className={styles.notifMessage} title={n.message}>
                      {n.message}
                    </p>
                    <p className={styles.notifTimeAgo}>{n.timeAgo}</p>
                  </div>
                  <div className={styles.notifActions}>
                    <button type="button" className={styles.btnView}>
                      View
                    </button>
                    <button
                      type="button"
                      className={styles.btnClear}
                      onClick={() => clearOne(n.id)}
                    >
                      Clear
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
