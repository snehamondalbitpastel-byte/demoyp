"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import ImageCarousel from "@/app/components/feed/ImageCarousel/ImageCarousel";
import PostImageModal from "@/app/components/feed/PostImageModal/PostImageModal";
import CommentSection from "@/app/components/feed/CommentSection/CommentSection";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
import {
  PREVIEW_MAX_CHARS,
  firstLineOfHtml,
  htmlToPlainText,
} from "@/app/lib/utils/post-text";
import styles from "./home.module.css";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  logoInitials: string;
  companyLogoUrl: string | null;
  /** External URL on the hiring company's careers site — Apply opens
   *  this in a new tab so the actual application happens off-platform. */
  jobLink: string | null;
};

// ── Raw API types for /api/mobile/user/recommended-jobs ──
type ApiRecommendedJob = {
  id: string;
  title?: string;
  company_name?: string;
  company_logo_url?: string | null;
  location?: string[];
  job_link?: string | null;
};

/** Shape of a post after we map the raw API response to our UI model. */
type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorLogoUrl: string | null;
  timeAgo: string;
  textHtml: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  /** True when the current viewer has reposted this post — drives the
   *  Repost button's filled-blue active state and the "You / You and X
   *  reposted this" indicator that renders above the author row. */
  isReposted: boolean;
  /** True when the viewer has at least one comment on this post.
   *  Drives the Comments action button's blue active state — stays
   *  blue until the viewer deletes ALL their comments here, then
   *  reverts to the default white. Independent of whether the
   *  comments dropdown is currently open. */
  isCommented: boolean;
  sharedByName: string | null;
  sharedByInitials: string | null;
  sharedByAvatarUrl: string | null;
};

// ── Raw API response types (matches /api/mobile/feeds payload) ───────────
type ApiAuthor = {
  type?: string;
  id?: string;
  name?: string;
  logo_url?: string | null;
  color_url?: string | null;
};
type ApiPostCounter = {
  likes_count?: string | number;
  comments_count?: string | number;
  shares_count?: string | number;
};
type ApiActivity = {
  is_liked?: boolean;
  is_shared?: boolean;
  is_comment?: boolean;
};
type ApiSharedUser = {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
};
type ApiFeedItem = {
  id: string;
  text_content?: string;
  media_urls?: string[];
  created_at?: string;
  post_counter?: ApiPostCounter;
  activity?: ApiActivity;
  author?: ApiAuthor;
  shared_list?: ApiSharedUser[];
};

/** Extra profile fields returned by /api/mobile/profile beyond AuthUser. */
type HomeProfile = AuthUser & {
  location?: string | null;
  study_field?: string | null;
  education?: string | null;
  college?: string | null;
};

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.trim().charAt(0).toUpperCase() ?? "";
  const l = lastName?.trim().charAt(0).toUpperCase() ?? "";
  return (f + l) || "U";
}

/** Two-letter initials from a full display name (e.g. "PA Consulting" → "PC"). */
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = words.map((w) => w.charAt(0).toUpperCase()).join("");
  return letters || "?";
}

/** Capitalize the first letter so raw "apprenticeship" → "Apprenticeship". */
function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Relative time string: "10h ago", "2d ago", etc. Falls back to empty string. */
function formatTimeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
  const diffYr = Math.floor(diffMo / 12);
  return `${diffYr}y ago`;
}

/** Stats-row likes label. When the viewer hasn't liked the post, render the
 *  raw count. When they have, switch to the "You and N other" wording shown
 *  in the spec — `You` alone if they're the only liker. */
function formatLikesDisplay(post: Post): string {
  if (!post.isLiked) return String(post.likes);
  if (post.likes <= 1) return "You";
  return `You and ${post.likes - 1} other`;
}

function mapApiFeedItem(item: ApiFeedItem): Post {
  const shared = item.shared_list?.[0];
  const sharedName = shared?.full_name?.trim() ?? "";
  return {
    id: item.id,
    authorName: item.author?.name?.trim() ?? "",
    authorInitials: initialsFromName(item.author?.name ?? ""),
    authorLogoUrl: item.author?.logo_url ?? null,
    timeAgo: item.created_at ? formatTimeAgo(item.created_at) : "",
    textHtml: item.text_content ?? "",
    images: Array.isArray(item.media_urls) ? item.media_urls : [],
    likes: Number(item.post_counter?.likes_count ?? 0) || 0,
    comments: Number(item.post_counter?.comments_count ?? 0) || 0,
    shares: Number(item.post_counter?.shares_count ?? 0) || 0,
    isLiked: Boolean(item.activity?.is_liked),
    isReposted: Boolean(item.activity?.is_shared),
    isCommented: Boolean(item.activity?.is_comment),
    sharedByName: sharedName || null,
    sharedByInitials: sharedName ? initialsFromName(sharedName) : null,
    sharedByAvatarUrl: shared?.profile_image_url ?? null,
  };
}

function mapApiRecommendedJob(item: ApiRecommendedJob): Job {
  const company = item.company_name?.trim() ?? "";
  const locationList = Array.isArray(item.location) ? item.location : [];
  return {
    id: item.id,
    title: item.title?.trim() ?? "",
    company,
    location: locationList.filter(Boolean).join(", "),
    logoInitials: initialsFromName(company),
    companyLogoUrl: item.company_logo_url ?? null,
    jobLink:
      typeof item.job_link === "string" && item.job_link ? item.job_link : null,
  };
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M8.34049 13.6818C6.84426 13.6818 5.57716 13.1629 4.53918 12.125C3.50134 11.0871 2.98242 9.81996 2.98242 8.32373C2.98242 6.82751 3.50134 5.5604 4.53918 4.52242C5.57716 3.48459 6.84426 2.96567 8.34049 2.96567C9.83671 2.96567 11.1038 3.48459 12.1418 4.52242C13.1796 5.5604 13.6986 6.82751 13.6986 8.32373C13.6986 8.94947 13.5936 9.5471 13.3836 10.1166C13.1734 10.6861 12.8931 11.1815 12.5426 11.6026L17.5842 16.6442C17.7055 16.7654 17.7676 16.9178 17.7704 17.1015C17.7732 17.2852 17.7111 17.4405 17.5842 17.5674C17.4573 17.6943 17.3034 17.7578 17.1224 17.7578C16.9417 17.7578 16.7878 17.6943 16.6609 17.5674L11.6194 12.5259C11.1813 12.8876 10.6775 13.1707 10.108 13.3751C9.53844 13.5796 8.94929 13.6818 8.34049 13.6818ZM8.34049 12.3677C9.46944 12.3677 10.4257 11.9759 11.2091 11.1923C11.9927 10.4089 12.3845 9.45269 12.3845 8.32373C12.3845 7.19477 11.9927 6.23857 11.2091 5.45512C10.4257 4.67152 9.46944 4.27972 8.34049 4.27972C7.21153 4.27972 6.25532 4.67152 5.47187 5.45512C4.68827 6.23857 4.29647 7.19477 4.29647 8.32373C4.29647 9.45269 4.68827 10.4089 5.47187 11.1923C6.25532 11.9759 7.21153 12.3677 8.34049 12.3677Z" fill="#E3E3E3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

/** Feed action-row thumbs-up — same exact SVG the PostImageModal uses
 *  for its action-row Like button (filled grey #E3E3E3, viewBox 25×25).
 *  Kept under the `ThumbsUpIcon` name so existing callers don't need
 *  to be updated. */
function ThumbsUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 25 25"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.311 9.37499H16.675L17.511 6.59061C17.6854 6.00737 17.7213 5.39145 17.6156 4.79192C17.51 4.19238 17.2658 3.62581 16.9025 3.13732C16.5392 2.64883 16.0669 2.25194 15.5231 1.97826C14.9793 1.70457 14.3791 1.56167 13.7703 1.56092C13.4786 1.55991 13.1924 1.6406 12.9441 1.79387C12.6959 1.94713 12.4955 2.16683 12.3656 2.42811L9.1094 8.94061C9.04445 9.07022 8.94473 9.17919 8.82138 9.25535C8.69803 9.33152 8.55593 9.37186 8.41096 9.37186H4.68909C2.96565 9.37186 1.56409 10.7734 1.56409 12.4969V20.3094C1.56409 22.0328 2.96565 23.4344 4.68909 23.4344H17.4422C19.886 23.4344 20.7547 21.5562 21.1953 20.1453L23.2938 13.4312C23.3896 13.125 23.4375 12.8125 23.4375 12.4937C23.4367 11.6652 23.1069 10.8709 22.5206 10.2855C21.9343 9.70007 21.1395 9.37145 20.311 9.37186V9.37499ZM3.12502 20.3125V12.5C3.12502 11.639 3.82659 10.9375 4.68752 10.9375H6.25002V21.875H4.68752C3.82659 21.875 3.12502 21.1734 3.12502 20.3125ZM21.8031 12.9656L19.7047 19.6812C19.136 21.5015 18.3891 21.8734 17.4422 21.8734H7.81409V10.9359H8.41096C9.30471 10.9359 10.1078 10.439 10.5078 9.64061L13.7641 3.12811L13.7703 3.12498C14.1358 3.12509 14.4961 3.21066 14.8226 3.37485C15.1491 3.53903 15.4327 3.77729 15.6507 4.0706C15.8687 4.3639 16.0151 4.70412 16.0782 5.06408C16.1413 5.42404 16.1193 5.79377 16.0141 6.14373L14.8766 9.9328C14.8415 10.0495 14.8342 10.1728 14.8552 10.2928C14.8763 10.4128 14.9251 10.5263 14.9979 10.6241C15.0706 10.7218 15.1652 10.8012 15.2741 10.8559C15.383 10.9106 15.5032 10.9391 15.625 10.939H20.311C20.5562 10.9389 20.7981 10.9964 21.017 11.1071C21.236 11.2178 21.4257 11.3784 21.571 11.576C21.7163 11.7737 21.813 12.0027 21.8534 12.2447C21.8937 12.4866 21.8765 12.7347 21.8031 12.9687V12.9656Z"
        fill="#E3E3E3"
      />
    </svg>
  );
}

/** Solid cyan thumbs-up (brand blue #20BDFF) — same SVG the image-modal
 *  uses for its stats-row like icon, used here so the feed card's stats
 *  row shows a matching blue thumb before the likes count.
 *
 *  Path is the canonical Facebook-style filled thumbs-up: the hand body
 *  and the wrist/cuff are intentionally rendered as two separate filled
 *  subpaths with a small visible gap between them. The gap is part of
 *  the design — it's what makes the thumb read as "sticking out" from
 *  a wrist below it, rather than as a single amorphous blob. */
function LikeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 25 25"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5625 13.2813V21.0938C1.5625 22.3859 2.61406 23.4375 3.90625 23.4375H6.25V10.9375H3.90625C2.61406 10.9375 1.5625 11.9891 1.5625 13.2813ZM22.7672 10.6484C22.4784 10.2516 22.0994 9.92919 21.6615 9.70777C21.2235 9.48634 20.7392 9.37228 20.2484 9.37501H14.8844L15.6094 5.75001C15.7111 5.24212 15.6989 4.71798 15.5735 4.21541C15.4481 3.71283 15.2127 3.24435 14.8844 2.84376C14.5569 2.44248 14.144 2.11926 13.6759 1.89762C13.2077 1.67598 12.6961 1.5615 12.1781 1.56251C11.4844 1.56251 10.8672 2.02813 10.6922 2.64532L9.96719 4.65469C9.40092 6.22058 8.67963 7.72597 7.81406 9.14844V23.4375H17.8094C18.476 23.4399 19.1258 23.228 19.6629 22.833C20.2 22.438 20.5959 21.8809 20.7922 21.2438L23.2328 13.4313C23.3814 12.9637 23.4167 12.4675 23.3357 11.9837C23.2547 11.4998 23.0599 11.0422 22.7672 10.6484Z"
        fill="#20BDFF"
      />
    </svg>
  );
}

/** Feed action-row comment icon — same outlined speech-bubble SVG the
 *  PostImageModal uses, so the two contexts stay visually consistent. */
function CommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** Chevron used by the tablet-only collapse toggle on the Recommended
 *  Jobs card header. Rotates 180° via inline transform when the jobs
 *  list is collapsed so the same glyph serves both states. */
function ChevronCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

/** Tracks whether the viewport is at mobile or tablet width (≤1024px).
 *  Used to switch a multi-image post from the desktop grid layout to a
 *  horizontal carousel. Starts at `false` on SSR so the first render
 *  matches the server, then updates on mount. */
function useIsMobileOrTablet(): boolean {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const update = () => setIsMobileOrTablet(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobileOrTablet;
}

function MiniProfileSkeleton() {
  return (
    <section className={styles.miniProfile} aria-hidden="true">
      <div className={`${styles.miniAvatar} ${styles.skeleton}`} />
      <div className={styles.miniInfo}>
        <div className={styles.skelName} />
        <div className={styles.skelRole} />
        <div className={styles.skelChip} />
      </div>
    </section>
  );
}

function JobSkeleton() {
  return (
    <article className={styles.jobItem} aria-hidden="true">
      <div className={styles.jobHead}>
        <div className={`${styles.jobLogo} ${styles.skeleton}`} />
        <div className={styles.jobInfo}>
          <div className={`${styles.skelLine} ${styles.skelLineLong}`} />
          <div className={`${styles.skelLine} ${styles.skelLineMed}`} />
          <div className={`${styles.skelLine} ${styles.skelLineShort}`} />
        </div>
      </div>
      <div className={styles.jobActions}>
        <div className={styles.skelBtn} />
        <div className={styles.skelBtn} />
      </div>
    </article>
  );
}

function PostSkeleton() {
  return (
    <article className={styles.post} aria-hidden="true">
      {/* Reposted-indicator skeleton — uses the real .postShared wrapper so
          the thin divider line (border-bottom on .postShared) renders below
          it just like in the real card. */}
      <div className={styles.postShared}>
        <div className={`${styles.postSharedAvatar} ${styles.skeleton}`} />
        <div className={`${styles.skelLine} ${styles.skelLineMed}`} />
      </div>

      {/* Author row: avatar circle + two stacked lines (name + timestamp) */}
      <header className={styles.postHeader}>
        <div className={`${styles.postAvatar} ${styles.skeleton}`} />
        <div className={styles.postAuthorBlock}>
          <div className={`${styles.skelLine} ${styles.skelLineMed}`} />
          <div className={`${styles.skelLine} ${styles.skelLineShort}`} />
        </div>
      </header>

      {/* Post-text placeholder lines */}
      <div className={`${styles.skelLine} ${styles.skelLineFull}`} />
      <div className={`${styles.skelLine} ${styles.skelLineLong}`} />
      <div className={`${styles.skelLine} ${styles.skelLineMed}`} />

      {/* Large image placeholder */}
      <div className={styles.skelImage} />

      {/* Footer row — small pills standing in for the stats + 3 action buttons */}
      <div className={styles.skelFooterRow}>
        <div className={styles.skelActionBtn} />
        <div className={styles.skelActionBtn} />
        <div className={styles.skelActionBtn} />
        <div className={styles.skelActionBtn} />
        <div className={styles.skelActionBtn} />
      </div>
    </article>
  );
}

type PostCardProps = {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** When true (viewport ≤ 1024px) and the post has 2+ images, swap the
   *  grid layout for a horizontal carousel with prev/next controls. */
  isMobileOrTablet: boolean;
  /** Fired when the user clicks a post image (grid tile OR the active
   *  carousel slide). The parent opens the PostImageModal at that index. */
  onImageClick: (index: number) => void;
  /** Fires when the viewer clicks the Like action button. The parent runs
   *  the optimistic update + POSTs to `/api/mobile/user/feed/reaction`. */
  onToggleLike: () => void;
  /** True while a like/unlike request for this post is in flight — used to
   *  disable the button so rapid double-clicks can't desync the count. */
  isLikeInFlight: boolean;
  /** Fires when the viewer clicks the Reposts action button. For an "add"
   *  the parent runs the optimistic update + POST immediately; for an
   *  active button it opens the "Remove Repost" confirmation dialog
   *  before doing anything. */
  onToggleRepost: () => void;
  /** True while a repost/un-repost request for this post is in flight. */
  isRepostInFlight: boolean;
  /** Viewer's avatar URL — rendered in the "You / You and X reposted this"
   *  indicator above the post header when the viewer has reposted. */
  viewerAvatarUrl: string | null;
  /** Two-letter fallback shown when `viewerAvatarUrl` is null. */
  viewerInitials: string;
  /** Viewer's full name. Used to filter out the viewer themselves from
   *  `post.sharedByName` — the upstream sometimes echoes the viewer's
   *  own name as the "shared by" entry on a post the viewer has just
   *  reposted, which would otherwise render as "You and <viewerName>
   *  reposted this" with the viewer's avatar shown twice. Comparing
   *  case-insensitively against `viewerName` lets us collapse that
   *  case down to "You reposted this" with a single avatar. */
  viewerName: string;
  /** True when the inline comments dropdown for this post is open.
   *  Toggling the Comments action button flips this. */
  isCommentsOpen: boolean;
  /** Fires when the viewer clicks the Comments action button — the
   *  parent owns the open/close state so only one post's comments can
   *  be open at a time, and so the count can be bumped from here. */
  onToggleComments: () => void;
  /** Fires after a new comment is successfully posted. The parent uses
   *  this to bump `post.comments` so the stats-row count updates
   *  without a full feed re-fetch. */
  onCommentAdded: () => void;
  /** Fires after a comment is successfully deleted — parent decrements
   *  `post.comments` so the stats-row count stays in sync. The boolean
   *  arg reports whether the viewer still has any other comments on
   *  this post; the parent uses it to keep / clear `post.isCommented`
   *  (which drives the Comments button's blue active state). */
  onCommentDeleted: (viewerStillHasComments: boolean) => void;
};

function PostCard({
  post,
  isExpanded,
  onToggleExpand,
  isMobileOrTablet,
  onImageClick,
  onToggleLike,
  isLikeInFlight,
  onToggleRepost,
  isRepostInFlight,
  viewerAvatarUrl,
  viewerInitials,
  viewerName,
  isCommentsOpen,
  onToggleComments,
  onCommentAdded,
  onCommentDeleted,
}: PostCardProps) {
  const imageGridClass =
    post.images.length === 1
      ? styles.postImages1
      : post.images.length === 2
      ? styles.postImages2
      : post.images.length === 3
      ? styles.postImages3
      : styles.postImages4;

  // Carousel is only used in mobile + tablet responsive modes AND only
  // when there is more than one image — single-image posts keep the
  // standard full-width tile so they don't gain arrow controls they
  // don't need.
  const useCarousel = isMobileOrTablet && post.images.length > 1;

  // Preview logic — only determines WHETHER the post needs a show-more
  // toggle. The collapsed RENDER itself uses the full API HTML + a CSS
  // line-clamp so formatting (bold, headings, links) is preserved.
  const firstLine = post.textHtml ? firstLineOfHtml(post.textHtml) : "";
  const plainText = post.textHtml ? htmlToPlainText(post.textHtml) : "";
  const isLongText =
    plainText.length > firstLine.length || firstLine.length > PREVIEW_MAX_CHARS;

  // The upstream sometimes echoes the viewer's own name back as
  // `sharedByName` on a post the viewer has just reposted (e.g.
  // because the API treats every repost — including the viewer's
  // — as a "shared by" entry on the post). That would render the
  // confusing "You and <viewerName> reposted this" line with the
  // viewer's avatar shown twice. Filter that out here: when
  // `sharedByName` matches the viewer's own name (case-insensitive),
  // treat the post as if only the viewer has reposted — single
  // avatar, "You reposted this" copy. Comparison is done on
  // trimmed lowercase strings so trailing whitespace / casing
  // drift from the API doesn't slip through.
  const viewerKey = viewerName.trim().toLowerCase();
  const sharedByKey = (post.sharedByName ?? "").trim().toLowerCase();
  const sharedByIsViewer =
    !!viewerKey && !!sharedByKey && viewerKey === sharedByKey;
  const effectiveSharedByName = sharedByIsViewer
    ? null
    : post.sharedByName;
  const effectiveSharedByAvatarUrl = sharedByIsViewer
    ? null
    : post.sharedByAvatarUrl;
  const effectiveSharedByInitials = sharedByIsViewer
    ? ""
    : post.sharedByInitials;

  return (
    <article className={styles.post}>
      {post.isReposted || effectiveSharedByName ? (
        <div className={styles.postShared}>
          {/* Avatar block: viewer's own avatar appears first when they've
              reposted. If another user (`effectiveSharedByName`) has also
              reposted, their avatar overlaps the viewer's via
              .postSharedAvatars. */}
          {post.isReposted && effectiveSharedByName ? (
            <div className={styles.postSharedAvatars}>
              <span className={styles.postSharedAvatar} aria-hidden="true">
                {viewerAvatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={viewerAvatarUrl} alt="" />
                ) : (
                  viewerInitials
                )}
              </span>
              <span className={styles.postSharedAvatar} aria-hidden="true">
                {effectiveSharedByAvatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={effectiveSharedByAvatarUrl} alt="" />
                ) : (
                  effectiveSharedByInitials
                )}
              </span>
            </div>
          ) : post.isReposted ? (
            <span className={styles.postSharedAvatar} aria-hidden="true">
              {viewerAvatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={viewerAvatarUrl} alt="" />
              ) : (
                viewerInitials
              )}
            </span>
          ) : (
            <span className={styles.postSharedAvatar} aria-hidden="true">
              {effectiveSharedByAvatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={effectiveSharedByAvatarUrl} alt="" />
              ) : (
                effectiveSharedByInitials
              )}
            </span>
          )}
          <span>
            {post.isReposted && effectiveSharedByName
              ? `You and ${effectiveSharedByName} reposted this`
              : post.isReposted
              ? "You reposted this"
              : `${effectiveSharedByName} reposted this`}
          </span>
        </div>
      ) : null}

      <header className={styles.postHeader}>
        <div className={styles.postAvatar} aria-hidden="true">
          {post.authorLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={post.authorLogoUrl} alt="" />
          ) : (
            post.authorInitials
          )}
        </div>
        <div className={styles.postAuthorBlock}>
          <p className={styles.postAuthor}>{post.authorName}</p>
          <p className={styles.postTime}>{post.timeAgo}</p>
        </div>
        <button type="button" className={styles.postMenuBtn} aria-label="Post options">
          <MenuIcon />
        </button>
      </header>

      {post.textHtml ? (
        isLongText && !isExpanded ? (
          // Collapsed: render the FULL API HTML and clamp visually via
          // CSS (.postTextClamped). This preserves every piece of
          // formatting the API returns — <strong>, <h*>, links, bold —
          // so formatting stays identical between collapsed & expanded.
          <>
            <div
              className={`${styles.postText} ${styles.postTextClamped}`}
              dangerouslySetInnerHTML={{ __html: post.textHtml }}
            />
            <button
              type="button"
              className={styles.postToggle}
              onClick={onToggleExpand}
            >
              ... show more
            </button>
          </>
        ) : (
          // Expanded (or short) state — render the full HTML verbatim.
          // The feed API returns admin-authored rich text (p / a / strong /
          // headings), which we trust and render via dangerouslySetInnerHTML.
          <>
            <div
              className={styles.postText}
              dangerouslySetInnerHTML={{ __html: post.textHtml }}
            />
            {isLongText ? (
              <button
                type="button"
                className={styles.postToggle}
                onClick={onToggleExpand}
              >
                show less
              </button>
            ) : null}
          </>
        )
      ) : null}

      {post.images.length > 0 ? (
        useCarousel ? (
          <ImageCarousel
            images={post.images}
            indicator="dots"
            onImageClick={onImageClick}
          />
        ) : (
          <div className={`${styles.postImages} ${imageGridClass}`}>
            {/* Cap the desktop grid at the first 4 tiles. When the post
                has more than 4 images, the 4th tile gets a "+N more"
                overlay (Facebook / Instagram pattern). Clicking it
                still opens the image modal at index 3, from which the
                viewer can swipe through every remaining image — so
                no images are lost, only the GRID renders are limited. */}
            {post.images.slice(0, 4).map((url, idx) => {
              const isLastTile = idx === 3;
              const remainingCount = post.images.length - 4;
              const showMoreOverlay = isLastTile && remainingCount > 0;
              return (
                <div
                  key={idx}
                  className={styles.postImage}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    showMoreOverlay
                      ? `Show ${remainingCount} more image${
                          remainingCount === 1 ? "" : "s"
                        }`
                      : `Post image ${idx + 1} — click to open`
                  }
                  onClick={() => onImageClick(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onImageClick(idx);
                    }
                  }}
                  style={{
                    backgroundImage: `url(${url})`,
                    cursor: "zoom-in",
                    position: "relative",
                  }}
                >
                  {showMoreOverlay ? (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontFamily:
                          "var(--font-plus-jakarta-sans), sans-serif",
                        fontWeight: 600,
                        fontSize: "clamp(22px, 4vw, 38px)",
                        letterSpacing: "0.5px",
                        pointerEvents: "none",
                        borderRadius: "inherit",
                      }}
                    >
                      +{remainingCount}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : null}

      <footer className={styles.postFooter}>
        <div className={styles.postStats}>
          {/* Blue thumbs-up before the likes count — matches the
              PostImageModal's stats-row like icon exactly. */}
          <LikeIcon />
          <span className={styles.postStat}>{formatLikesDisplay(post)}</span>
          <span className={styles.postStatDivider}>|</span>
          {/* The comments-count text is itself a click target for the
              same action the dedicated Comments button below fires —
              wired straight into `onToggleComments` so the inline
              comments dropdown opens / closes via the same code path
              and hits the same backend endpoint. Pointer cursor +
              role="button" + keyboard handler keep it accessible. */}
          <span
            className={`${styles.postStat} ${styles.postStatClickable}`}
            onClick={onToggleComments}
            role="button"
            tabIndex={0}
            aria-expanded={isCommentsOpen}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleComments();
              }
            }}
          >
            {post.comments} Comments
          </span>
          <span className={styles.postStatDivider}>|</span>
          <span className={styles.postStat}>{post.shares} Shares</span>
        </div>
        <div className={styles.postActions}>
          {/* Comments / Reposts still show the custom "Coming soon" tooltip
              on hover — styled via a CSS ::after pseudo-element on
              .postActionBtn (see home.module.css). The Like button opts
              OUT of that tooltip via .postActionBtnLive because it's
              now wired to the real reaction endpoint. */}
          <button
            type="button"
            className={`${styles.postActionBtn} ${styles.postActionBtnLive} ${post.isLiked ? styles.postActionBtnActive : ""}`}
            onClick={onToggleLike}
            disabled={isLikeInFlight}
            aria-pressed={post.isLiked}
          >
            {/* Swap to the solid-cyan LikeIcon when liked. The outlined
                ThumbsUpIcon's <path> hard-codes fill="#E3E3E3", which
                wins over the .postActionBtnActive CSS fill override —
                so a CSS-only highlight wouldn't actually paint the
                icon blue. Component swap forces the visible change. */}
            {post.isLiked ? <LikeIcon /> : <ThumbsUpIcon />}
            <span>Like</span>
          </button>
          <button
            type="button"
            className={`${styles.postActionBtn} ${styles.postActionBtnLive} ${post.isCommented ? styles.postActionBtnActive : ""}`}
            onClick={onToggleComments}
            aria-expanded={isCommentsOpen}
          >
            <CommentIcon />
            <span>Comments</span>
          </button>
          <button
            type="button"
            className={`${styles.postActionBtn} ${styles.postActionBtnLive} ${post.isReposted ? styles.postActionBtnActive : ""}`}
            onClick={onToggleRepost}
            disabled={isRepostInFlight}
            aria-pressed={post.isReposted}
          >
            <RepostIcon />
            <span>Reposts</span>
          </button>
        </div>
      </footer>

      {/* Inline comments dropdown — toggled by the Comments action button.
          Mounting only when open keeps the lazy-fetch behaviour and means
          collapsed posts pay no comment-API cost on initial feed render. */}
      {isCommentsOpen ? (
        <CommentSection
          postId={post.id}
          onCommentAdded={onCommentAdded}
          onCommentDeleted={onCommentDeleted}
        />
      ) : null}
    </article>
  );
}


export default function HomePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  /** Navigate to the job-details route for a given job id. The id
   *  is encoded so base64-style identifiers (which can contain
   *  `=` / `+` / `/`) survive the URL round-trip cleanly — same
   *  helper the /jobs page uses. */
  const openJobDetails = (jobId: string) => {
    router.push(`/jobs/${encodeURIComponent(jobId)}`);
  };
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // ── Recommended-jobs save / apply state ── mirrors the /jobs page.
  // The home feed's left-column recommended cards now react to the
  // same backend state, so saving / applying / removing in one place
  // is reflected on both routes once the user navigates between them.
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [confirmRemoveJobId, setConfirmRemoveJobId] = useState<string | null>(
    null
  );
  const [removingJob, setRemovingJob] = useState(false);
  // Live input value (updates on every keystroke).
  const [searchText, setSearchText] = useState("");
  // Debounced value that actually triggers fetches — lags 400ms behind
  // `searchText` so we don't hammer the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // IDs of posts the viewer has chosen to expand. Long-text posts default
  // to collapsed; tapping "show more" adds the id here, "show less" removes.
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  // IDs of posts whose like/unlike request is currently in flight. Used to
  // disable the Like button while the toggle is pending so a fast second
  // click can't fire a contradictory request and desync the count.
  const [likeInFlight, setLikeInFlight] = useState<Set<string>>(new Set());
  // Same idea for the repost/un-repost button.
  const [repostInFlight, setRepostInFlight] = useState<Set<string>>(new Set());
  // ID of the post for which the "Remove Repost" confirmation dialog is
  // open. `null` means no dialog. We track only the id (not the post) so
  // a stale closure can't keep us referencing a removed-from-feed post.
  const [confirmingUnrepost, setConfirmingUnrepost] = useState<string | null>(null);
  // ID of the post whose inline comments dropdown is currently open.
  // Only one post's comments can be open at a time — clicking another
  // post's Comments button switches focus to it. Null = all closed.
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  // Recommended-jobs collapse state — the expand/collapse toggle in the
  // jobs card header is only visible in TABLET responsive mode (via CSS).
  // On desktop the toggle is hidden and the jobs list stays open.
  const [jobsExpanded, setJobsExpanded] = useState(true);
  // Viewport flag — drives the mobile/tablet carousel swap for multi-image
  // posts. Desktop keeps the original grid layout.
  const isMobileOrTablet = useIsMobileOrTablet();
  // Which post's image-modal is open, and at which slide. `null` = closed.
  // Clicking any post image sets this; the modal reads `post` + `index`
  // and renders on top of the feed.
  const [imageModal, setImageModal] = useState<{
    post: Post;
    index: number;
  } | null>(null);

  // Mirror the navbar's "deleted image" suppression. After the user
  // removes their profile picture on the profile page, the backend
  // currently keeps echoing the previously-deleted URL on subsequent
  // /api/mobile/profile fetches. The profile page writes that URL to
  // `localStorage["deletedProfileImageUrl"]` at deletion time, and
  // every consumer (navbar + here) treats a matching URL as "no image"
  // so the initials fallback renders consistently across the whole app.
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — fall through to whatever the API returns.
    }
  }, []);

  const togglePostExpand = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Toggle the viewer's like on a post.
   *
   *  Optimistic update: flip `isLiked` and ±1 the count immediately so the
   *  UI feels instant. Then POST to `/api/mobile/user/feed/reaction` with
   *  action `add` / `remove`. The backend response is just an echo of the
   *  request body (no updated count), so on success we keep the optimistic
   *  state; on failure we revert both fields. A per-post in-flight flag
   *  blocks rapid double-clicks while a request is pending. */
  const toggleLike = async (postId: string) => {
    if (likeInFlight.has(postId)) return;

    const target = posts?.find((p) => p.id === postId);
    if (!target) return;
    const wasLiked = target.isLiked;
    const action: "add" | "remove" = wasLiked ? "remove" : "add";

    setLikeInFlight((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev
        ? prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  isLiked: !wasLiked,
                  likes: p.likes + (wasLiked ? -1 : 1),
                }
              : p
          )
        : prev
    );

    const revert = () => {
      setPosts((prev) =>
        prev
          ? prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    isLiked: wasLiked,
                    likes: p.likes + (wasLiked ? 1 : -1),
                  }
                : p
            )
          : prev
      );
    };

    try {
      const res = await fetch("/api/mobile/user/feed/reaction", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, type: "like", action }),
      });
      if (!res.ok) revert();
    } catch {
      revert();
    } finally {
      setLikeInFlight((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  /** Run the actual repost POST + optimistic update. Split out from the
   *  click handler so the click handler can route through the confirm
   *  dialog when un-reposting, but jump straight to this function when
   *  reposting (no confirmation needed for the additive action).
   *
   *  Optimistic ordering: when ADDING a repost, the post is moved to
   *  the TOP of the feed (matches the live YP behaviour where a fresh
   *  refresh would show the just-reposted post first because the
   *  upstream sorts by repost activity timestamp). Removing a repost
   *  doesn't reorder — the post stays where it is, just with the
   *  "You reposted" indicator gone. The original index is captured
   *  before the optimistic move so a failed POST can splice the post
   *  back into its original slot during `revert()`. */
  const performRepostToggle = async (postId: string, wasReposted: boolean) => {
    if (repostInFlight.has(postId)) return;
    const action: "add" | "remove" = wasReposted ? "remove" : "add";

    // Capture the post's current position BEFORE the optimistic move
    // so a revert can restore it to the same slot. Reading from the
    // closure copy of `posts` is safe because we only need the
    // pre-update index — any concurrent state changes between this
    // line and the setter below would land in the same React batch
    // and produce the same `findIndex` result.
    const originalIndex = posts?.findIndex((p) => p.id === postId) ?? -1;

    setRepostInFlight((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setPosts((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((p) => p.id === postId);
      if (idx === -1) return prev;
      const updatedPost = {
        ...prev[idx],
        isReposted: !wasReposted,
        shares: prev[idx].shares + (wasReposted ? -1 : 1),
      };
      // ADD repost → move the post to the top of the feed.
      // REMOVE repost → leave the post where it is.
      if (action === "add") {
        const without = prev.filter((p) => p.id !== postId);
        return [updatedPost, ...without];
      }
      return prev.map((p) => (p.id === postId ? updatedPost : p));
    });

    const revert = () => {
      setPosts((prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((p) => p.id === postId);
        if (idx === -1) return prev;
        const restoredPost = {
          ...prev[idx],
          isReposted: wasReposted,
          shares: prev[idx].shares + (wasReposted ? 1 : -1),
        };
        // If we moved the post to the top during the optimistic
        // update, splice it back into its original index. Falls
        // back to the current position (no move) if the original
        // index couldn't be captured (e.g. posts was null at
        // call time).
        if (action === "add" && originalIndex >= 0) {
          const without = prev.filter((p) => p.id !== postId);
          const restored = [...without];
          const insertAt = Math.min(originalIndex, restored.length);
          restored.splice(insertAt, 0, restoredPost);
          return restored;
        }
        return prev.map((p) => (p.id === postId ? restoredPost : p));
      });
    };

    try {
      const res = await fetch("/api/mobile/user/feed/share", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, type: "repost", action }),
      });
      if (res.ok) {
        // Toaster only fires AFTER a successful response — the optimistic
        // update has already updated the UI by this point.
        toast.success(action === "add" ? "Reposted successfully" : "Repost removed");
      } else {
        revert();
      }
    } catch {
      revert();
    } finally {
      setRepostInFlight((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  /** Click entry point for the Repost action button. Adding a repost is
   *  immediate; removing one routes through the "Remove Repost" confirm
   *  dialog because the screenshots specify it. */
  const toggleRepost = (postId: string) => {
    const target = posts?.find((p) => p.id === postId);
    if (!target) return;
    if (target.isReposted) {
      setConfirmingUnrepost(postId);
    } else {
      performRepostToggle(postId, false);
    }
  };

  const confirmUnrepost = () => {
    const id = confirmingUnrepost;
    setConfirmingUnrepost(null);
    if (id) performRepostToggle(id, true);
  };

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
        // Silent fail — navbar will show skeleton/fallback.
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Fetch the recommended jobs list on mount.
  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      try {
        const res = await fetch("/api/mobile/user/recommended-jobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 10 }),
        });
        if (!res.ok) {
          if (!cancelled) {
            setJobs([]);
            setJobsError("Couldn't load jobs right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiRecommendedJob[] };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setJobs(json.data.result.map(mapApiRecommendedJob));
          setJobsError(null);
        } else {
          setJobs([]);
          setJobsError(null);
        }
      } catch {
        if (!cancelled) {
          setJobs([]);
          setJobsError("Couldn't load jobs right now.");
        }
      }
    }
    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Seed `savedJobIds` from /saved-jobs on mount, so each
  // recommended-jobs card immediately renders the correct
  // Save / Remove state on first paint (instead of defaulting
  // to Save Job until the viewer interacts). Silent on failure. */
  useEffect(() => {
    let cancelled = false;
    async function seedSavedIds() {
      try {
        const res = await fetch("/api/mobile/user/saved-jobs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 100 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: Array<{ id?: string }> };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setSavedJobIds(
            new Set(
              json.data.result
                .map((r) => r?.id)
                .filter((id): id is string => typeof id === "string")
            )
          );
        }
      } catch {}
    }
    seedSavedIds();
    return () => {
      cancelled = true;
    };
  }, []);

  // Same idea for `appliedJobIds` — seed once on mount so cards open
  // with the correct Apply / Applied state.
  useEffect(() => {
    let cancelled = false;
    async function seedAppliedIds() {
      try {
        const res = await fetch("/api/mobile/user/applied-jobs-list", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 100 }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: Array<{ id?: string }> };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setAppliedJobIds(
            new Set(
              json.data.result
                .map((r) => r?.id)
                .filter((id): id is string => typeof id === "string")
            )
          );
        }
      } catch {}
    }
    seedAppliedIds();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Save Job click — POST /save-job; on success the id lands in
   *  `savedJobIds` so the button flips to Remove. Identical pattern
   *  to the /jobs page so save state stays in sync between the two
   *  routes once the page is reloaded / re-mounted. */
  const handleSaveJob = async (jobId: string) => {
    if (savingJobId) return;
    setSavingJobId(jobId);
    try {
      const res = await fetch("/api/mobile/user/save-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Save failed");
      }
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      toast.success("Job saved successfully");
    } catch {
      toast.error("Couldn't save this job. Please try again.");
    } finally {
      setSavingJobId(null);
    }
  };

  /** Apply click — open the company's external careers page in a new
   *  tab AND mark the job as applied on YP. Apply is one-way: once
   *  applied, the button stays in the disabled "Applied" state. */
  const handleApplyJob = async (jobId: string, jobLink: string | null) => {
    if (applyingJobId) return;
    if (appliedJobIds.has(jobId)) return;
    if (jobLink) {
      window.open(jobLink, "_blank", "noopener,noreferrer");
    }
    setApplyingJobId(jobId);
    try {
      const res = await fetch("/api/mobile/user/applied-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !(json && (json.status === "OK" || json.id))) {
        throw new Error(json?.message || "Apply failed");
      }
      setAppliedJobIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      toast.success("Job applied successfully");
    } catch {
      toast.error("Couldn't apply for this job. Please try again.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const requestRemoveJob = (jobId: string) => {
    if (savingJobId) return;
    setConfirmRemoveJobId(jobId);
  };

  const cancelRemoveJob = () => {
    if (removingJob) return;
    setConfirmRemoveJobId(null);
  };

  const confirmRemoveJob = async () => {
    const jobId = confirmRemoveJobId;
    if (!jobId || removingJob) return;
    setRemovingJob(true);
    try {
      const res = await fetch("/api/mobile/user/remove-job", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.status !== "OK") {
        throw new Error(json?.message || "Remove failed");
      }
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      toast.success("Job removed successfully");
    } catch {
      toast.error("Couldn't remove this job. Please try again.");
    } finally {
      setRemovingJob(false);
      setConfirmRemoveJobId(null);
    }
  };

  // Debounce the live search input into `debouncedSearch`. 400ms is
  // tight enough to feel responsive, long enough to skip multi-key bursts.
  //
  // Minimum-length rule: we only hit the feed API when the trimmed input
  // is either empty (a cleared search — reloads the default feed) OR
  // has at least 2 characters. Single-character queries are ignored so
  // we don't slam the backend with near-useless 1-letter lookups.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length === 1) {
      // Skip 1-character queries entirely — do NOT update
      // `debouncedSearch`, so no API call is triggered.
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // Fetch the feed on mount AND whenever the debounced search term changes.
  // Initial load passes search_text: "" — same as before the search feature.
  // Clearing the search (X button) resets debouncedSearch to "" and this
  // effect re-fetches the unfiltered feed automatically.
  useEffect(() => {
    let cancelled = false;
    // Show skeletons while fetching (including during search refreshes).
    setPosts(null);
    setFeedError(null);
    async function fetchFeeds() {
      try {
        const res = await fetch("/api/mobile/feeds", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: 1,
            limit: 10,
            search_text: debouncedSearch,
          }),
        });
        if (!res.ok) {
          if (!cancelled) {
            setPosts([]);
            setFeedError("Couldn't load feed right now.");
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiFeedItem[] };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          const mapped = json.data.result.map(mapApiFeedItem);
          setPosts(mapped);
          if (mapped.length === 0 && debouncedSearch) {
            setFeedError(`No posts found for "${debouncedSearch}".`);
          } else {
            setFeedError(null);
          }
        } else {
          setPosts([]);
          setFeedError(
            debouncedSearch
              ? `No posts found for "${debouncedSearch}".`
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setFeedError("Couldn't load feed right now.");
        }
      }
    }
    fetchFeeds();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Derive display values from the profile loaded into AuthContext.
  const profile = user as HomeProfile | null;
  const rawAvatarUrl = profile?.profile_image_url || null;
  // Suppress URLs the user has just deleted (see DELETED_IMG_KEY block
  // above). When the cached URL matches the value the profile page
  // stored at deletion time, treat it as no image so the initials
  // fallback renders — matching navbar + profile page behaviour.
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
    <div className={styles.page}>
      <Navbar />
      <main
        className={`${styles.content}${
          !jobsExpanded ? ` ${styles.contentJobsCollapsed}` : ""
        }`}
      >
        <aside className={styles.leftCol} aria-label="Profile and recommended jobs">
          {profile === null ? (
            <MiniProfileSkeleton />
          ) : (
            <section className={styles.miniProfile} aria-label="Your profile">
              <div className={styles.miniAvatar} aria-hidden="true">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initials
                )}
              </div>
              <div className={styles.miniInfo}>
                {fullName ? (
                  <p className={styles.miniName}>{fullName}</p>
                ) : null}
                {miniRole ? (
                  <p className={styles.miniRole}>{miniRole}</p>
                ) : null}
                {miniLocation ? (
                  <span className={styles.miniLocation}>
                    <LocationIcon />
                    {miniLocation}
                  </span>
                ) : null}
              </div>
            </section>
          )}

          <section
            className={`${styles.jobsCard}${
              !jobsExpanded ? ` ${styles.jobsCardCollapsed}` : ""
            }`}
            aria-label="Recommended jobs"
          >
            <div className={styles.jobsHeader}>
              <h2 className={styles.jobsTitle}>Recommended Jobs</h2>
              {/* Toggle is hidden via CSS on desktop (always-expanded
                  there) and only appears at tablet widths. The state
                  still persists across viewport changes, but the
                  .jobsScrollCollapsed class only has an effect inside
                  the tablet media query — so switching back to desktop
                  shows the list regardless of toggle state. */}
              <button
                type="button"
                className={styles.jobsToggle}
                onClick={() => setJobsExpanded((v) => !v)}
                aria-expanded={jobsExpanded}
                aria-label={
                  jobsExpanded
                    ? "Collapse recommended jobs"
                    : "Expand recommended jobs"
                }
              >
                <ChevronCollapseIcon collapsed={!jobsExpanded} />
              </button>
            </div>
            <div
              className={`${styles.jobsScroll}${
                !jobsExpanded ? ` ${styles.jobsScrollCollapsed}` : ""
              }`}
            >
              {jobs === null ? (
                <>
                  <JobSkeleton />
                  <JobSkeleton />
                  <JobSkeleton />
                </>
              ) : jobs.length === 0 ? (
                <p className={styles.feedState}>
                  {jobsError ?? "No jobs to show yet."}
                </p>
              ) : (
                jobs.map((job) => (
                  <article
                    key={job.id}
                    className={styles.jobItem}
                    role="link"
                    tabIndex={0}
                    onClick={() => openJobDetails(job.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openJobDetails(job.id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.jobHead}>
                      <div className={styles.jobLogo} aria-hidden="true">
                        {/* Always render an <img>: the API's logo URL if
                            present, otherwise the shared Young Pro default
                            job-image SVG. Initials fallback removed —
                            every job card now shows an image. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            job.companyLogoUrl ??
                            "https://youngprofessionals.global/_next/static/media/DefaultJobImage.f982d9f9.svg"
                          }
                          alt=""
                        />
                      </div>
                      <div className={styles.jobInfo}>
                        <p className={styles.jobTitle}>{job.title}</p>
                        <p className={styles.jobCompany}>{job.company}</p>
                        {/* Location chip ALWAYS renders — when the API
                            returns no location for a job, the chip
                            keeps its full styling (border + pin icon +
                            bg) and shows "Not Specified" as the
                            fallback label instead of collapsing. */}
                        <p className={styles.jobLocation}>
                          <LocationIcon />
                          <span
                            className={styles.jobLocationText}
                            title={job.location || "Not Specified"}
                          >
                            {job.location || "Not Specified"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className={styles.jobActions}>
                      {/* Apply / Applied — apply is one-way; once
                          applied the button stays disabled with the
                          cyan "Applied" appearance. Click bubbling
                          stopped on every action so they don't also
                          trigger the card-level navigation to
                          /jobs/[id]. */}
                      {appliedJobIds.has(job.id) ? (
                        <button
                          type="button"
                          className={`${styles.btnApply} ${styles.btnApplied}`}
                          disabled
                          aria-label="Already applied"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Applied
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnApply}
                          disabled={applyingJobId === job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyJob(job.id, job.jobLink);
                          }}
                        >
                          {applyingJobId === job.id ? "Applying..." : "Apply"}
                        </button>
                      )}
                      {/* Save Job ↔ Remove — Remove pops a confirm
                          dialog and posts to /remove-job on confirm. */}
                      {savedJobIds.has(job.id) ? (
                        <button
                          type="button"
                          className={styles.btnSave}
                          disabled={
                            savingJobId === job.id ||
                            (removingJob && confirmRemoveJobId === job.id)
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            requestRemoveJob(job.id);
                          }}
                        >
                          {removingJob && confirmRemoveJobId === job.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnSave}
                          disabled={savingJobId === job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveJob(job.id);
                          }}
                        >
                          {savingJobId === job.id ? "Saving..." : "Save Job"}
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className={styles.rightOuter} aria-label="Search and feed">
          <div className={styles.searchBar}>
            <span className={styles.searchIconWrap} aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search"
              aria-label="Search posts"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText ? (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchText("")}
                aria-label="Clear search"
              >
                <ClearIcon />
              </button>
            ) : null}
          </div>
          <div className={styles.feedScroll}>
            {posts === null ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <p className={styles.feedState}>
                {feedError ?? "No posts to show yet."}
              </p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isExpanded={expandedPosts.has(post.id)}
                  onToggleExpand={() => togglePostExpand(post.id)}
                  isMobileOrTablet={isMobileOrTablet}
                  onImageClick={(index) => setImageModal({ post, index })}
                  onToggleLike={() => toggleLike(post.id)}
                  isLikeInFlight={likeInFlight.has(post.id)}
                  onToggleRepost={() => toggleRepost(post.id)}
                  isRepostInFlight={repostInFlight.has(post.id)}
                  viewerAvatarUrl={avatarUrl}
                  viewerInitials={initials}
                  viewerName={fullName}
                  isCommentsOpen={openCommentsPostId === post.id}
                  onToggleComments={() =>
                    setOpenCommentsPostId((prev) =>
                      prev === post.id ? null : post.id
                    )
                  }
                  onCommentAdded={() =>
                    setPosts((prev) =>
                      prev
                        ? prev.map((p) =>
                            p.id === post.id
                              ? {
                                  ...p,
                                  comments: p.comments + 1,
                                  isCommented: true,
                                }
                              : p
                          )
                        : prev
                    )
                  }
                  onCommentDeleted={(viewerStillHas) =>
                    setPosts((prev) =>
                      prev
                        ? prev.map((p) =>
                            p.id === post.id
                              ? {
                                  ...p,
                                  comments: Math.max(0, p.comments - 1),
                                  isCommented: viewerStillHas,
                                }
                              : p
                          )
                        : prev
                    )
                  }
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Resolve the modal's post from the live `posts` state when
          possible so updates (comment count, like count, etc.) flow
          through the modal automatically. Falls back to the captured
          snapshot if the post has scrolled off the feed. */}
      <PostImageModal
        post={
          imageModal
            ? posts?.find((p) => p.id === imageModal.post.id) ??
              imageModal.post
            : null
        }
        initialIndex={imageModal?.index ?? 0}
        onClose={() => setImageModal(null)}
        onCommentAdded={() => {
          if (!imageModal) return;
          const targetId = imageModal.post.id;
          setPosts((prev) =>
            prev
              ? prev.map((p) =>
                  p.id === targetId
                    ? {
                        ...p,
                        comments: p.comments + 1,
                        isCommented: true,
                      }
                    : p
                )
              : prev
          );
        }}
        onCommentDeleted={(viewerStillHas) => {
          if (!imageModal) return;
          const targetId = imageModal.post.id;
          setPosts((prev) =>
            prev
              ? prev.map((p) =>
                  p.id === targetId
                    ? {
                        ...p,
                        comments: Math.max(0, p.comments - 1),
                        isCommented: viewerStillHas,
                      }
                    : p
                )
              : prev
          );
        }}
      />

      {/* "Remove Repost" confirmation. Shown only when the viewer clicks the
          active Reposts button and we need to gate the destructive action.
          Adding a repost skips this dialog entirely — the screenshots only
          require it for un-repost. */}
      <ConfirmDialog
        open={confirmingUnrepost !== null}
        title="Remove Repost"
        message="Are you sure you want to remove this repost from your profile?"
        confirmLabel="Remove Repost"
        cancelLabel="Cancel"
        onConfirm={confirmUnrepost}
        onCancel={() => setConfirmingUnrepost(null)}
      />

      {/* "Remove saved job" confirmation — same dialog chrome as the
          /jobs page, fired from the recommended-jobs left column when
          the viewer clicks Remove on an already-saved card. */}
      <ConfirmDialog
        open={confirmRemoveJobId !== null}
        title="Remove saved job?"
        message="Are you sure you want to remove this job from your saved list?"
        confirmLabel="Yes, Remove"
        cancelLabel="No"
        loadingLabel="Removing..."
        loading={removingJob}
        onConfirm={confirmRemoveJob}
        onCancel={cancelRemoveJob}
      />
    </div>
  );
}
