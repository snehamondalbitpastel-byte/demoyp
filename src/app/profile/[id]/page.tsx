"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import { useAuth } from "@/app/context/AuthContext";
import type { AuthUser } from "@/app/lib/api/types";
import { endpoints } from "@/app/lib/api/endpoints";
import { useApi } from "@/app/lib/api/useApi";
import EditEducationModal, {
  type EducationUpdatePayload,
} from "@/app/components/profile/EditEducationModal/EditEducationModal";
import EditSkillsModal, {
  type SkillsUpdatePayload,
} from "@/app/components/profile/EditSkillsModal/EditSkillsModal";
import EditProfileInfoModal, {
  type ProfileInfoUpdatePayload,
} from "@/app/components/profile/EditProfileInfoModal/EditProfileInfoModal";
import EditAboutModal, {
  type AboutUpdatePayload,
} from "@/app/components/profile/EditAboutModal/EditAboutModal";
import UploadPhotoModal from "@/app/components/profile/UploadPhotoModal/UploadPhotoModal";
import ConfirmDialog from "@/app/components/profile/ConfirmDialog/ConfirmDialog";
import ImagePreviewModal from "@/app/components/profile/ImagePreviewModal/ImagePreviewModal";
import styles from "./profile.module.css";

function BackArrow() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      alt="Back"
      loading="lazy"
      width={30}
      height={30}
      decoding="async"
      src="/profile/backbtn_icon.svg"
      style={{ color: "transparent" }}
    />
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 27 27" fill="none">
      <path d="M7.875 19.125V14.625L19.125 3.375L23.625 7.875L12.375 19.125H7.875Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.375 23.625H23.625" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.75 6.75L20.25 11.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


/** Extended profile shape returned by /api/mobile/profile — superset of AuthUser. */
type ProfileData = AuthUser & {
  location?: string | null;
  college?: string | null;
  study_field?: string | null;
  start_year?: string | null;
  end_year?: string | null;
  skills?: string[] | null;
  about?: string | null;
  gender?: string | null;
  dob?: string | null;
};

/** Format a DOB string like "11-12-2000" → "11 December, 2000" or keep raw if unparseable. */
function formatDob(dob: string | null | undefined): string {
  if (!dob) return "";
  // Try DD-MM-YYYY format
  const match = dob.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return dob;
  const [, dd, mm, yyyy] = match;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIdx = parseInt(mm, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return dob;
  return `${parseInt(dd, 10)} ${months[monthIdx]}, ${yyyy}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [profileInfoModalOpen, setProfileInfoModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Persisted skill count (for dynamic skeleton) ──
  // Can't read localStorage during render — SSR renders with null, client
  // hydrate render would get the saved count, and different child counts
  // between server/client is a hard hydration error (suppressHydrationWarning
  // does NOT cover child-count mismatches).
  //
  // Instead: keep the count in state, populate it in a post-mount effect,
  // and gate the pills behind a `mounted` flag so SSR and the first client
  // render both produce an empty pill row (matching HTML → clean hydrate).
  // Pills appear on the very next tick with the correct count — no flicker
  // between different counts, just an empty→filled transition in ~16ms.
  const [persistedSkillCount, setPersistedSkillCount] = useState<number | null>(
    null
  );
  const [skeletonMounted, setSkeletonMounted] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("profileSkeletonHints");
      if (raw) {
        const parsed = JSON.parse(raw) as { skillCount?: number };
        if (typeof parsed?.skillCount === "number") {
          setPersistedSkillCount(parsed.skillCount);
        }
      }
    } catch {
      // localStorage unavailable — skeleton falls back to the default.
    }
    setSkeletonMounted(true);
  }, []);

  // ── Client-side "deleted image" fallback ──
  // The backend currently ignores our photo-removal request (it keeps the
  // old URL on the record), so after a refresh the deleted image would
  // reappear. We remember which URL the user deleted in localStorage and
  // hide it on subsequent page loads. The flag is cleared the moment a new
  // image is uploaded (different URL → no match).
  const DELETED_IMG_KEY = "deletedProfileImageUrl";
  const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
    } catch {
      // localStorage unavailable — image will show whatever backend returns.
    }
  }, []);

  // Warm the dropdown caches (userLocations / institutions / skills) the moment
  // the profile page mounts. The useApi cache is module-level, so when an Edit
  // modal later opens it hits the cache and its dropdown populates instantly.
  useApi<unknown>({ key: ["userLocations"], url: endpoints.data.userLocations });
  useApi<unknown>({ key: ["institutions"], url: endpoints.data.institutions });
  useApi<unknown>({ key: ["skills"], url: endpoints.data.skills });

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleDeletePhoto() {
    setDeletingImage(true);
    // Capture the URL we're about to delete so we can recognise it on the
    // next page load and hide it (the backend's update endpoint currently
    // ignores removal requests).
    const urlBeingDeleted =
      profile?.profile_image_url || user?.profile_image_url || "";
    try {
      const res = await fetch(endpoints.profile.updateProfile, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // Send null (not ""). Many backends treat empty string as
        // "field missing / no change" and ignore the update; null is the
        // explicit "clear this field" signal that makes the removal
        // actually persist on the backend.
        body: JSON.stringify({ profile_image_url: null }),
      });
      const json = await res.json();
      if (!res.ok || !(json?.success || json?.status === "OK")) {
        throw new Error(json?.message || "Failed to remove photo");
      }
      // Persist the "deleted" URL so subsequent refreshes can hide the
      // image the backend keeps echoing back.
      if (urlBeingDeleted) {
        try {
          window.localStorage.setItem(DELETED_IMG_KEY, urlBeingDeleted);
          setDeletedImageUrl(urlBeingDeleted);
        } catch {
          // localStorage unavailable — best-effort only.
        }
      }
      // Always force-clear the image locally — the backend response sometimes
      // echoes the previous image URL, so don't rely on json.data for this.
      if (json.data) {
        const next = { ...(json.data as ProfileData), profile_image_url: "" };
        setProfile(next);
        setUser(next as AuthUser);
      } else {
        setProfile((prev) =>
          prev ? { ...prev, profile_image_url: "" } : prev
        );
        if (user) {
          setUser({ ...user, profile_image_url: "" });
        }
      }
      toast.success("Profile photo removed.");
      setDeleteConfirmOpen(false);

      // Re-fetch profile to confirm latest state (mirrors upload flow).
      // Force the image_url back to "" because some backend builds echo
      // the previous value even after a successful removal.
      try {
        const refreshRes = await fetch(endpoints.profile.profile, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson?.status === "OK" && refreshJson.data) {
            const next = {
              ...(refreshJson.data as ProfileData),
              profile_image_url: "",
            };
            setProfile(next);
            setUser(next as AuthUser);
          }
        }
      } catch {
        // Ignore — optimistic update already applied above.
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setDeletingImage(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropAndUpload(file: File) {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("profile_image", file);

      const res = await fetch(endpoints.profile.uploadProfileImg, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();

      if (!res.ok || !(json?.status === "OK" || json?.success)) {
        throw new Error(json?.message || "Failed to upload image");
      }

      // New photo uploaded → the previously-deleted URL is no longer
      // relevant. Clear the client-side suppression flag.
      try {
        window.localStorage.removeItem(DELETED_IMG_KEY);
        setDeletedImageUrl(null);
      } catch {
        // localStorage unavailable — safe to ignore.
      }

      // Optimistically update local state with new image.
      if (json.data) {
        setProfile(json.data as ProfileData);
        setUser(json.data as AuthUser);
      }

      toast.success(json.message || "Profile image updated successfully.");

      // Re-fetch full profile to get fresh data.
      try {
        const refreshRes = await fetch(endpoints.profile.profile, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson?.status === "OK" && refreshJson.data) {
            setProfile(refreshJson.data as ProfileData);
            setUser(refreshJson.data as AuthUser);
          }
        }
      } catch {
        // Ignore refresh errors; optimistic update already applied.
      }

      setRawImage(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/mobile/profile", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (json?.status === "OK" && json.data) {
          setProfile(json.data as ProfileData);
          // Keep AuthContext in sync so Navbar shows latest data.
          setUser(json.data as AuthUser);
        }
      } catch {
        // Ignore — fallback to AuthContext below.
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [setUser]);

  // Persist current skill count whenever `profile` loads/updates, so the
  // NEXT mount's skeleton can use it via the synchronous localStorage read
  // above. Only this hint is stored — nothing sensitive.
  useEffect(() => {
    if (!profile) return;
    if (typeof window === "undefined") return;
    try {
      const skillCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
      window.localStorage.setItem(
        "profileSkeletonHints",
        JSON.stringify({ skillCount })
      );
    } catch {
      // localStorage unavailable (private mode, disk full, etc.) — fine, just skip.
    }
  }, [profile]);


  // Fallback to AuthContext / session when API fetch fails or is pending.
  const p: Partial<ProfileData> = profile ?? (user as ProfileData) ?? {};

  const fullName = p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "";
  const college = p.college || "";
  const studyField = p.study_field || "";
  const startYear = p.start_year || "";
  const endYear = p.end_year || "";
  const yearRange =
    startYear && endYear ? `${startYear}-${endYear}` : startYear || endYear || "";
  const location = p.location || "";
  const email = p.email || "";
  const phone = p.phone || "";
  const dob = p.dob ? formatDob(p.dob) : "";
  const gender = p.gender || "";
  // If the backend kept returning a URL the user previously deleted,
  // treat it as empty on the client.
  const rawProfileImageUrl = p.profile_image_url || "";
  const isDeletedImage =
    Boolean(deletedImageUrl) && rawProfileImageUrl === deletedImageUrl;
  const profileImage = isDeletedImage ? "" : rawProfileImageUrl;
  const hasProfileImage = Boolean(profileImage);
  const avatarInitials = (() => {
    const f = p.first_name?.trim().charAt(0).toUpperCase() ?? "";
    const l = p.last_name?.trim().charAt(0).toUpperCase() ?? "";
    return (f + l) || "U";
  })();
  const skills = Array.isArray(p.skills) && p.skills.length > 0 ? p.skills : [];
  const about = p.about || "";

  // ── Skeleton counts: prefer LIVE data (from profile/user, when already
  // in context). Otherwise fall back to stable defaults. We no longer read
  // persisted hints for count sizing — reading them post-mount caused the
  // skeleton to re-render with different counts, producing a visible flicker. ──
  const liveSkillCount = Array.isArray(p.skills) ? p.skills.length : 0;
  const liveInfoFilled = [
    p.location,
    p.email,
    p.phone,
    p.dob,
    p.gender,
  ].filter((v) => v && String(v).trim() !== "").length;

  // Priority: live data (user/profile context) → persisted hint from the
  // last successful load → safe default of 3. The persisted hint is captured
  // synchronously on first render via useState(() => ...), so the skeleton
  // renders with the correct count immediately — no mid-flight jump.
  const skelSkillCount =
    liveSkillCount > 0
      ? liveSkillCount
      : persistedSkillCount && persistedSkillCount > 0
      ? persistedSkillCount
      : 3;
  // Cap at 4 so the info-field skeletons all fit on a single row (matches the
  // reference design — no wrap, no orphaned stacks in the bottom-left).
  const skelInfoCount = Math.min(liveInfoFilled > 0 ? liveInfoFilled : 4, 4);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.content}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          {loading && !profile ? (
            <div
              className={`${styles.skeleton} ${styles.skelLine}`}
              style={{ width: 150, height: 24 }}
            />
          ) : (
            <h1 className={styles.pageTitle}>My Profile</h1>
          )}
        </div>

        {/* ── Skeleton while initial fetch is in progress ── */}
        {loading && !profile ? (
          <div className={styles.gridBody}>
            {/* Photo card skeleton */}
            <div className={styles.photoCard}>
              <div className={styles.avatarSection}>
                <div className={`${styles.skeleton} ${styles.skelAvatar}`} />
                <div className={`${styles.skeleton} ${styles.skelButton}`} style={{ marginTop: "12px" }} />
              </div>
              <div className={styles.qrSection}>
                <div className={`${styles.skeleton} ${styles.skelQR}`} />
              </div>
            </div>

            {/* Right column skeletons */}
            <div className={styles.rightColumn}>
              <div className={styles.card}>
                <div className={`${styles.skeleton} ${styles.skelHeading}`} />
                <div className={styles.educationContent} style={{ marginTop: 12 }}>
                  <div className={`${styles.skeleton} ${styles.skelLogo}`} />
                  <div className={styles.eduInfo} style={{ width: "100%" }}>
                    <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineLong}`} />
                    <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineMed}`} />
                    <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineShort}`} />
                  </div>
                </div>
              </div>
              <div className={styles.card}>
                <div className={`${styles.skeleton} ${styles.skelHeading}`} />
                <div
                  style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {skeletonMounted &&
                    Array.from({ length: skelSkillCount }).map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.skeleton} ${styles.skelPill}`}
                      />
                    ))}
                </div>
              </div>
            </div>

            {/* Info card skeleton */}
            <div className={styles.infoCard}>
              <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineMed}`} style={{ height: 28, marginBottom: 24 }} />
              <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
                {Array.from({ length: skelInfoCount }).map((_, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    <div
                      className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineShort}`}
                      style={{ width: 80, height: 14 }}
                    />
                    <div
                      className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineShort}`}
                      style={{ width: 130, height: 16 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* About card skeleton */}
            <div className={styles.aboutCard}>
              <div className={`${styles.skeleton} ${styles.skelHeading}`} />
              <div style={{ marginTop: 12 }}>
                <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineFull}`} />
                <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineFull}`} />
                <div className={`${styles.skeleton} ${styles.skelLine} ${styles.skelLineLong}`} />
              </div>
            </div>
          </div>
        ) : (
        <div className={styles.gridBody}>
          {/* Photo card */}
          <div className={styles.photoCard}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {hasProfileImage ? (
                  <img
                    src={profileImage}
                    alt={fullName}
                    className={styles.avatarImage}
                    onClick={() => setImagePreviewOpen(true)}
                    style={{ cursor: "zoom-in" }}
                  />
                ) : (
                  <div
                    className={styles.avatarInitialsLarge}
                    onClick={() => setImagePreviewOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setImagePreviewOpen(true);
                    }}
                  >
                    {avatarInitials}
                  </div>
                )}
                {hasProfileImage && (
                  <button
                    type="button"
                    className={styles.avatarDeleteBtn}
                    onClick={() => setDeleteConfirmOpen(true)}
                    aria-label="Remove profile photo"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleUploadClick}
              >
                <img src="/assets/profile/upload-icon.svg" alt="" />
                <span>Upload new photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <p className={styles.photoHint}>
                At least 800X800 px recommended,
                <br />
                JPG or PNG allowed
              </p>
            </div>
            <div className={styles.qrSection}>
              <div className={styles.qrWrapper}>
                <div className={styles.qrBg} />
                <img
                  src="/assets/profile/qr-code.png"
                  alt="QR Code"
                  className={styles.qrImage}
                />
                <img
                  src="/assets/profile/qr-yp-logo.png"
                  alt="YP Logo"
                  className={styles.qrLogo}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className={styles.rightColumn}>
            {/* Education card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Education</h2>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setEducationModalOpen(true)}
                  >
                    <EditIcon />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
              {(college || studyField || yearRange) && (
                <div className={styles.educationContent}>
                  <img
                    src="/assets/profile/edu-logo.png"
                    alt={college}
                    className={styles.eduLogo}
                  />
                  <div className={styles.eduInfo}>
                    {college && <h3 className={styles.eduName}>{college}</h3>}
                    {studyField && (
                      <p className={styles.eduDegree}>{studyField}</p>
                    )}
                    {yearRange && <p className={styles.eduYear}>{yearRange}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Skills card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Skills</h2>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setSkillsModalOpen(true)}
                  >
                    <EditIcon />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
              <div className={styles.skillsList}>
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <span key={skill} className={styles.skillPill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className={styles.skillPill}>No skills added</span>
                )}
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <div className={styles.infoHeaderLeft}>
                <h2 className={styles.userName}>{fullName}</h2>
              </div>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setProfileInfoModalOpen(true)}
              >
                <EditIcon />
                <span>Edit</span>
              </button>
            </div>
            <div className={styles.infoFields}>
              {location && (
                <div className={styles.infoField}>
                  <div className={styles.infoFieldLabel}>
                    <img src="/assets/profile/location-icon.svg" alt="" />
                    <span>Location</span>
                  </div>
                  <p className={styles.infoFieldValue}>{location}</p>
                </div>
              )}
              {email && (
                <div className={styles.infoField}>
                  <div className={styles.infoFieldLabel}>
                    <img src="/assets/profile/email-icon.svg" alt="" />
                    <span>Email</span>
                  </div>
                  <p className={styles.infoFieldValue}>{email}</p>
                </div>
              )}
              {phone && (
                <div className={styles.infoField}>
                  <div className={styles.infoFieldLabel}>
                    <img src="/assets/profile/phone-icon.svg" alt="" />
                    <span>Phone</span>
                  </div>
                  <p className={styles.infoFieldValue}>{phone}</p>
                </div>
              )}
              {dob && (
                <div className={styles.infoField}>
                  <div className={styles.infoFieldLabel}>
                    <img src="/assets/profile/dob-icon.svg" alt="" />
                    <span>DOB</span>
                  </div>
                  <p className={styles.infoFieldValue}>{dob}</p>
                </div>
              )}
              {gender && (
                <div className={styles.infoField}>
                  <div className={styles.infoFieldLabel}>
                    <img src="/assets/profile/gender-icon.svg" alt="" />
                    <span>Gender</span>
                  </div>
                  <p className={styles.infoFieldValue}>{gender}</p>
                </div>
              )}
            </div>
          </div>

          {/* About card */}
          <div className={styles.aboutCard}>
            <div className={styles.aboutHeader}>
              <h2 className={styles.aboutTitle}>About</h2>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setAboutModalOpen(true)}
              >
                <EditIcon />
                <span>Edit</span>
              </button>
            </div>
            {about ? (
              about.split("\n\n").map((para, i) => (
                <p key={i} className={styles.aboutText}>
                  {para}
                </p>
              ))
            ) : (
              <p className={styles.aboutText}>
                No description added yet. Click Edit to add your bio.
              </p>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Edit Education modal */}
      <EditEducationModal
        open={educationModalOpen}
        onClose={() => setEducationModalOpen(false)}
        initial={{
          placeOfStudy: college,
          education: studyField,
          startYear: startYear,
          endYear: endYear,
        }}
        onSave={async (payload: EducationUpdatePayload) => {
          try {
            const res = await fetch(endpoints.profile.updateProfile, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !(json?.success || json?.status === "OK")) {
              throw new Error(json?.message || "Failed to update profile");
            }

            // Backend returns the full updated profile in `data`.
            if (json.data) {
              setProfile(json.data as ProfileData);
              setUser(json.data as AuthUser);
            }

            toast.success(json.message || "Profile updated successfully.");
            setEducationModalOpen(false);
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "Something went wrong.";
            toast.error(message);
          }
        }}
      />

      {/* Edit Skills modal */}
      <EditSkillsModal
        open={skillsModalOpen}
        onClose={() => setSkillsModalOpen(false)}
        initial={skills}
        onSave={async (payload: SkillsUpdatePayload) => {
          try {
            const res = await fetch(endpoints.profile.updateProfile, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !(json?.success || json?.status === "OK")) {
              throw new Error(json?.message || "Failed to update skills");
            }

            if (json.data) {
              setProfile(json.data as ProfileData);
              setUser(json.data as AuthUser);
            }

            toast.success(json.message || "Skills updated successfully.");
            setSkillsModalOpen(false);

            // Re-fetch profile so any backend-normalised skill names
            // (including newly added custom skills) show the latest stored
            // state on the UI.
            try {
              const refreshRes = await fetch(endpoints.profile.profile, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              });
              if (refreshRes.ok) {
                const refreshJson = await refreshRes.json();
                if (refreshJson?.status === "OK" && refreshJson.data) {
                  setProfile(refreshJson.data as ProfileData);
                  setUser(refreshJson.data as AuthUser);
                }
              }
            } catch {
              // Ignore — optimistic update from the save response already applied.
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Something went wrong.";
            toast.error(message);
          }
        }}
      />

      {/* Edit Profile Information modal */}
      <EditProfileInfoModal
        open={profileInfoModalOpen}
        onClose={() => setProfileInfoModalOpen(false)}
        initial={{
          firstName: p.first_name ?? "",
          lastName: p.last_name ?? "",
          location: p.location ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          dob: p.dob ? String(p.dob).replaceAll("-", "/") : "",
          gender: p.gender ?? "",
        }}
        onSave={async (payload: ProfileInfoUpdatePayload) => {
          try {
            const res = await fetch(endpoints.profile.updateProfile, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !(json?.success || json?.status === "OK")) {
              throw new Error(json?.message || "Failed to update profile");
            }

            if (json.data) {
              setProfile(json.data as ProfileData);
              setUser(json.data as AuthUser);
            }

            toast.success(json.message || "Profile updated successfully.");
            setProfileInfoModalOpen(false);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Something went wrong.";
            toast.error(message);
          }
        }}
      />

      {/* Edit About modal */}
      <EditAboutModal
        open={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        initial={about}
        onSave={async (payload: AboutUpdatePayload) => {
          try {
            const res = await fetch(endpoints.profile.updateProfile, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || !(json?.success || json?.status === "OK")) {
              throw new Error(json?.message || "Failed to update About");
            }

            if (json.data) {
              setProfile(json.data as ProfileData);
              setUser(json.data as AuthUser);
            }

            toast.success(json.message || "About updated successfully.");
            setAboutModalOpen(false);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Something went wrong.";
            toast.error(message);
          }
        }}
      />

      {/* Upload Photo modal (crop + upload) */}
      {rawImage && (
        <UploadPhotoModal
          rawImage={rawImage}
          uploading={uploadingImage}
          onCancel={() => setRawImage(null)}
          onUpload={handleCropAndUpload}
        />
      )}

      {/* Delete profile photo confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Remove Profile Photo?"
        message="Your profile photo will be permanently removed. You can always upload a new one later."
        confirmLabel="Yes, Remove"
        cancelLabel="Cancel"
        loading={deletingImage}
        onConfirm={handleDeletePhoto}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Full-size avatar preview — shows image or initials fallback */}
      <ImagePreviewModal
        open={imagePreviewOpen}
        src={hasProfileImage ? profileImage : undefined}
        alt={fullName}
        initials={avatarInitials}
        onClose={() => setImagePreviewOpen(false)}
      />
    </div>
  );
}
