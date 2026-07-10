"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import styles from "./CommentSection.module.css";

/** Subset of the API author object that the comment row needs. */
type ApiAuthor = {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
};

/** Raw comment as returned by `/api/mobile/user/feed/comments`. The
 *  media field is widened to `unknown` because backends sometimes hand
 *  it back as a comma-separated string instead of a JSON array — we
 *  normalize both shapes via `parseMediaUrls` below. */
type ApiComment = {
  id: string;
  comment_text?: string | null;
  comment_media_urls?: unknown;
  created_at?: string;
  author?: ApiAuthor;
};

/** Accepts either an array of URL strings or a comma-separated string
 *  (some API variants return the latter), and returns a clean string[]. */
function parseMediaUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (u): u is string => typeof u === "string" && u.length > 0
    );
  }
  if (typeof raw === "string" && raw.length > 0) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Mapped UI shape — flattens the bits we render so the JSX stays simple. */
type Comment = {
  id: string;
  /** Author's user ID — compared against the viewer's id from
   *  AuthContext to decide whether to render the three-dot menu (the
   *  Delete action is only available on the viewer's own comments). */
  userId: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl: string | null;
  timeAgo: string;
  text: string;
  mediaUrls: string[];
};

type Props = {
  postId: string;
  /** Called after a comment is successfully added so the parent can
   *  bump the post's stats-row "N Comments" count without a re-fetch. */
  onCommentAdded?: () => void;
  /** Called after a comment is successfully deleted so the parent can
   *  decrement the post's stats-row "N Comments" count. The boolean
   *  argument tells the parent whether the viewer still has any
   *  remaining comments on this post — drives the Comments action
   *  button's blue active state (true → stays blue, false → reverts
   *  to white because the viewer has no comments left here). */
  onCommentDeleted?: (viewerStillHasComments: boolean) => void;
};

/** Two-letter initials from a display name (e.g. "Sneha Mondal" → "SM"). */
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}

/** Compact relative time for comments — "2w", "1mo", "3d", "now".
 *  Distinct from the feed card's "5h ago" / "2 months ago" formatter:
 *  comments use the abbreviated form per the design (matches SS). */
function formatCommentTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 4) return `${diffWk}w`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo`;
  const diffYr = Math.floor(diffDay / 365);
  return `${diffYr}y`;
}

function mapComment(c: ApiComment): Comment {
  const name = c.author?.full_name?.trim() || "";
  return {
    id: c.id,
    userId: c.author?.id ?? "",
    authorName: name,
    authorInitials: initialsFromName(name),
    authorAvatarUrl: c.author?.profile_image_url ?? null,
    timeAgo: c.created_at ? formatCommentTime(c.created_at) : "",
    text: c.comment_text ?? "",
    mediaUrls: parseMediaUrls(c.comment_media_urls),
  };
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT_TYPES = "image/jpeg,image/jpg,image/png,image/gif,image/webp";

export default function CommentSection({
  postId,
  onCommentAdded,
  onCommentDeleted,
}: Props) {
  const { user: viewer } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Object URL for the selected file — generated on file change, revoked
  // on cleanup so we don't leak browser memory across multiple selections.
  // Null whenever no file is attached (collapsed input state).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // ID of the comment whose three-dot menu is currently open (showing the
  // Delete chip). Only one menu can be open at a time. Null = all closed.
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  // ID of the comment for which the "Delete Comment" confirmation dialog
  // is open. Null = no dialog. Cleared on confirm or cancel.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close the open Delete chip when the viewer clicks anywhere outside
  // it. Bound only while the menu is open so we don't hold a global
  // listener for every comment section on the page.
  useEffect(() => {
    if (openMenuCommentId === null) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-comment-menu]")) {
        setOpenMenuCommentId(null);
      }
    };
    // setTimeout(0) so the click that just opened the menu doesn't
    // immediately close it.
    const t = window.setTimeout(() => {
      document.addEventListener("click", handleDocClick);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", handleDocClick);
    };
  }, [openMenuCommentId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Lazy-load: this component is only rendered when the parent toggles
  // comments OPEN, so this fetch fires the first time the user expands
  // the section. Re-opening (via toggle) remounts and re-fetches —
  // simple and consistent with how the SS shows counts updating on
  // open/close.
  useEffect(() => {
    let cancelled = false;
    async function fetchComments() {
      try {
        const res = await fetch("/api/mobile/user/feed/comments", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: postId }),
        });
        if (!res.ok) {
          if (!cancelled) setComments([]);
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          data?: { result?: ApiComment[] };
        };
        if (cancelled) return;
        if (json?.status === "OK" && Array.isArray(json.data?.result)) {
          setComments(json.data.result.map(mapComment));
        } else {
          setComments([]);
        }
      } catch {
        if (!cancelled) setComments([]);
      }
    }
    fetchComments();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const clearAttachment = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = text.trim();
    if (!trimmed && !file) return;

    setSubmitting(true);
    try {
      // Branch on payload shape per the API rules:
      //  - file present (with or without text) → multipart/form-data
      //  - text only                            → application/json
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("id", postId);
        if (trimmed) fd.append("body", trimmed);
        fd.append("attachments", file);
        res = await fetch("/api/mobile/user/feed/add-comment", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else {
        res = await fetch("/api/mobile/user/feed/add-comment", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: postId, body: trimmed }),
        });
      }
      if (!res.ok) return;
      const json = (await res.json()) as {
        status?: string;
        data?: { result?: ApiComment[] };
      };
      if (json?.status !== "OK") return;
      // Backend returns the freshly-created comment in data.result[0].
      // Prepend it locally so the new comment appears at the top of the
      // list immediately, no second fetch needed.
      const created = json.data?.result?.[0];
      if (created) {
        const mapped = mapComment(created);
        setComments((prev) => (prev ? [mapped, ...prev] : [mapped]));
      }
      setText("");
      clearAttachment();
      onCommentAdded?.();
      // Toaster fires only after the API confirms success, matching the
      // pattern used by the repost flow.
      toast.success("Comment added successfully");
    } catch {
      // Silent fail — leave the input populated so the viewer can retry.
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (text.trim().length > 0 || file !== null) && !submitting;

  /** Run the actual delete POST after the viewer has confirmed via the
   *  dialog. Optimistically removes the comment from the local list and
   *  reverts on API failure, mirroring the like/repost flow. Toast only
   *  fires after the backend confirms `status: "OK"`. */
  const performDelete = async (commentId: string) => {
    const previous = comments;
    // Optimistic remove — the comment vanishes from the list immediately.
    setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
    // Compute up-front (off `previous`, which still has the deleted row)
    // whether the viewer has ANY OTHER comments on this post besides the
    // one being deleted. Drives the parent's blue-Comments-button state.
    const viewerStillHasComments =
      !!viewer &&
      (previous?.some((c) => c.id !== commentId && c.userId === viewer.id) ??
        false);
    try {
      const fd = new FormData();
      fd.append("id", commentId);
      fd.append("action", "delete");
      const res = await fetch("/api/mobile/user/feed/update-comment", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        setComments(previous);
        return;
      }
      const json = (await res.json()) as { status?: string };
      if (json?.status !== "OK") {
        setComments(previous);
        return;
      }
      toast.success("Comment deleted successfully");
      onCommentDeleted?.(viewerStillHasComments);
    } catch {
      setComments(previous);
    }
  };

  const confirmDelete = () => {
    const id = confirmingDeleteId;
    setConfirmingDeleteId(null);
    if (id) performDelete(id);
  };

  return (
    <div className={styles.container}>
      {/* Form switches between two layouts via the .inputWithFile modifier:
          - default: pill-shaped, single row, text + icons inline
          - with file: rounded rectangle, text on top, image preview in
            middle, action buttons aligned bottom-right (matches SS) */}
      <form
        className={`${styles.input} ${file ? styles.inputWithFile : ""}`}
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          className={styles.field}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          maxLength={1000}
        />

        {file && previewUrl ? (
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className={styles.previewImg} />
            <button
              type="button"
              className={styles.previewRemove}
              aria-label="Remove attachment"
              onClick={clearAttachment}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : null}

        <div className={styles.actions}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              // Reject files >10 MB per the backend's documented limit.
              if (f && f.size > MAX_FILE_BYTES) {
                clearAttachment();
                return;
              }
              setFile(f);
            }}
          />
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Attach image"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
          >
            {/* External asset hosted on the live site — used as-is to
                match the production icon exactly (same source the
                PostImageModal's input bar uses). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://youngprofessionals.global/_next/static/media/media_upload.ee44f9af.svg"
              alt=""
              width={20}
              height={20}
            />
          </button>
          <button
            type="submit"
            className={styles.sendBtn}
            aria-label="Send comment"
            disabled={!canSubmit}
          >
            <SendIcon />
          </button>
        </div>
      </form>

      <h3 className={styles.title}>
        Most relevant comments ({comments?.length ?? 0})
      </h3>

      {comments === null ? (
        <p className={styles.empty}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>No comments yet.</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((c) => (
            <li key={c.id} className={styles.item}>
              <div className={styles.avatar} aria-hidden="true">
                {c.authorAvatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.authorAvatarUrl} alt="" />
                ) : (
                  c.authorInitials
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.header}>
                  <span className={styles.name}>{c.authorName}</span>
                  <span className={styles.time}>{c.timeAgo}</span>
                  {/* Three-dot menu renders on EVERY comment. The chip
                      that opens is conditional: viewer's own comments
                      get a hover-able Delete chip wired to the
                      confirm-and-delete flow; other users' comments
                      get a static Report chip (UI placeholder, no
                      action wired yet). The menu container shares the
                      same data-attribute so the document click handler
                      closes either kind on outside-click. */}
                  <div className={styles.menuWrap} data-comment-menu>
                    <button
                      type="button"
                      className={styles.menuBtn}
                      aria-label="Comment options"
                      aria-expanded={openMenuCommentId === c.id}
                      onClick={() =>
                        setOpenMenuCommentId((prev) =>
                          prev === c.id ? null : c.id
                        )
                      }
                    >
                      <MenuIcon />
                    </button>
                    {openMenuCommentId === c.id ? (
                      viewer && c.userId === viewer.id ? (
                        <button
                          type="button"
                          className={styles.deleteChip}
                          onClick={() => {
                            setOpenMenuCommentId(null);
                            setConfirmingDeleteId(c.id);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.reportChip}
                          onClick={() => setOpenMenuCommentId(null)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" y1="22" x2="4" y2="15" />
                          </svg>
                          <span>Report</span>
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
                {/* Image before text per the SS — when a comment has both,
                    the picture sits above the caption-style text below. */}
                {c.mediaUrls.length > 0 ? (
                  <div className={styles.mediaWrap}>
                    {c.mediaUrls.map((url, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className={styles.mediaImg}
                      />
                    ))}
                  </div>
                ) : null}
                {c.text ? <p className={styles.text}>{c.text}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* "Delete Comment" confirmation. Reuses the same ConfirmDialog
          component (and therefore the exact same modal CSS — gradient
          border, dark-blue surface, gradient buttons) as the
          "Remove Repost" dialog, so the two confirmations look
          visually identical apart from the title and message. */}
      <ConfirmDialog
        open={confirmingDeleteId !== null}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </div>
  );
}
