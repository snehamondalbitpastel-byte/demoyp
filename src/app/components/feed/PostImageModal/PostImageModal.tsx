"use client";

import { useEffect, useState } from "react";
import ImageCarousel from "../ImageCarousel/ImageCarousel";
import CommentSection from "../CommentSection/CommentSection";
import {
  PREVIEW_MAX_CHARS,
  firstLineOfHtml,
  htmlToPlainText,
} from "@/app/lib/utils/post-text";
import styles from "./PostImageModal.module.css";

/** The subset of post fields the modal needs. Mirrors the shape of a
 *  feed post so this component is decoupled from any specific page/API
 *  type — the caller simply passes a matching object. */
export type PostImageModalPost = {
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
};

type Props = {
  /** When null the modal is closed. Setting it to a post opens the
   *  modal; `initialIndex` decides which slide shows first. */
  post: PostImageModalPost | null;
  initialIndex?: number;
  onClose: () => void;
  /** Fires after a comment is successfully added inside the modal so
   *  the parent feed can bump the underlying post's `comments` count
   *  in sync — the modal's own count display picks up the change via
   *  the live `post` prop the parent re-passes on next render. */
  onCommentAdded?: () => void;
  /** Fires after a comment is successfully deleted inside the modal —
   *  parent decrements `post.comments` so the count stays in sync.
   *  The boolean arg tells the parent whether the viewer still has
   *  any other comments on this post (drives `isCommented` reset). */
  onCommentDeleted?: (viewerStillHasComments: boolean) => void;
};

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Solid cyan thumbs-up (brand blue #20BDFF) — used for both the stats
 *  "N likes" icon and the actions-row Like button so the visual treatment
 *  stays consistent. Rendered as-is at its natural 16×16 size; containing
 *  buttons don't need to tint it since the fill is baked into the SVG. */
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

/** Actions-row Like icon — exact SVG supplied by design. Filled in
 *  light grey (#E3E3E3), NOT blue — the stats-row LikeIcon above is the
 *  blue-filled variant, so the two rows stay visually distinct. */
function LikeActionIcon() {
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

/** Comment icon — simple outlined speech bubble in light grey
 *  (#E3E3E3) to match the Like icon's grey fill. Renders reliably
 *  inline (no base64 / pattern / mask dependencies that some browsers
 *  fail to resolve inside masked `<image>` definitions). */
function CommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E3E3E3"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** Paper-plane Send icon — exact SVG supplied by design (brand blue). */
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#20BDFF"
        d="M20.04 2.323c1.016-.355 1.992.621 1.637 1.637l-5.925 16.93c-.385 1.098-1.915 1.16-2.387.097l-2.859-6.432l4.024-4.025a.75.75 0 0 0-1.06-1.06l-4.025 4.024l-6.432-2.859c-1.063-.473-1-2.002.097-2.387z"
      />
    </svg>
  );
}

export default function PostImageModal({
  post,
  initialIndex = 0,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: Props) {
  // Show more / show less state for the post description. Reset to
  // collapsed whenever the modal opens on a different post.
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    setIsExpanded(false);
  }, [post?.id]);

  // Lock body scroll + support Escape-to-close while the modal is open.
  // Runs when `post` becomes non-null; the cleanup restores the previous
  // body overflow and removes the keydown listener.
  useEffect(() => {
    if (!post) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [post, onClose]);

  if (!post) return null;

  // Preview computation — identical rules to the feed PostCard so the
  // "show more" threshold feels consistent to the user. Only
  // `isLongText` is needed for rendering (we render the full HTML in
  // BOTH states now and clamp visually via CSS so formatting — <strong>,
  // <h*>, links — from the API is preserved in the collapsed view).
  const firstLine = post.textHtml ? firstLineOfHtml(post.textHtml) : "";
  const plainText = post.textHtml ? htmlToPlainText(post.textHtml) : "";
  const isLongText =
    plainText.length > firstLine.length ||
    firstLine.length > PREVIEW_MAX_CHARS;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Post details"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Left — large image carousel (reuses shared ImageCarousel) */}
        <div className={styles.leftPane}>
          <ImageCarousel
            images={post.images}
            initialIndex={initialIndex}
            indicator="counter"
            imageFit="contain"
            className={styles.carousel}
          />
        </div>

        {/* Right — dynamic post details + comment entry + placeholder list */}
        <aside className={styles.rightPane}>
          {/* Header stays fixed at the top of the right pane — the
              scrollbar lives inside the body below, NOT on the header
              area, so it starts at the description (matches SS). */}
          <header className={styles.header}>
            <div className={styles.author}>
              <div className={styles.authorAvatar} aria-hidden="true">
                {post.authorLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={post.authorLogoUrl} alt="" />
                ) : (
                  post.authorInitials
                )}
              </div>
              <div className={styles.authorMeta}>
                <p className={styles.authorName}>{post.authorName}</p>
                <p className={styles.authorTime}>Posted {post.timeAgo}</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </header>

          <div className={styles.rightBody}>

          {post.textHtml ? (
            isLongText && !isExpanded ? (
              // Collapsed: render the FULL API HTML and clamp visually
              // via CSS (`.postTextClamped`). This preserves every piece
              // of formatting the API returns — <strong>, <h*>, links,
              // emphasis — so "Artificial Intelligence" stays bold /
              // sized exactly as it is in the expanded view.
              <>
                <div
                  className={`${styles.postText} ${styles.postTextClamped}`}
                  dangerouslySetInnerHTML={{ __html: post.textHtml }}
                />
                <button
                  type="button"
                  className={styles.postToggle}
                  onClick={() => setIsExpanded(true)}
                >
                  ... show more
                </button>
              </>
            ) : (
              // Expanded (or short): render full HTML verbatim, and
              // append a "show less" toggle when the post is long enough
              // to have been collapsed in the first place.
              <>
                <div
                  className={styles.postText}
                  dangerouslySetInnerHTML={{ __html: post.textHtml }}
                />
                {isLongText ? (
                  <button
                    type="button"
                    className={styles.postToggle}
                    onClick={() => setIsExpanded(false)}
                  >
                    show less
                  </button>
                ) : null}
              </>
            )
          ) : null}

          <div className={styles.stats}>
            <span className={styles.likeCount}>
              <span className={styles.likeIcon}>
                <LikeIcon />
              </span>
              {post.likes}
            </span>
            <span className={styles.statRight}>
              {post.comments} Comments | {post.shares} Shares
            </span>
          </div>

          <div className={styles.actions}>
            {/* Like button uses the OUTLINED icon variant so it isn't
                blue-filled like the stats-row thumbs-up above. */}
            <button
              type="button"
              className={styles.actionBtn}
              aria-label="Like"
            >
              <LikeActionIcon />
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              aria-label="Comment"
            >
              <CommentIcon />
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              aria-label="Repost"
            >
              <RepostIcon />
            </button>
          </div>

          {/* Real comment input + list, shared with the home feed's inline
              comments dropdown. Replaces the previous local placeholder
              form + "Coming soon" stub — both fed by the same backend
              endpoints (`/api/mobile/user/feed/comments` and `/add-comment`)
              so adding a comment in either context shows the same data. */}
          <CommentSection
            postId={post.id}
            onCommentAdded={onCommentAdded}
            onCommentDeleted={onCommentDeleted}
          />

          </div>
        </aside>
      </div>
    </div>
  );
}
