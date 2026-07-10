"use client";

/**
 * ⚠️  TEMPORARY PAGE — DELETE ON HANDOFF.
 *
 * /career-talks/upload — spreadsheet uploader that populates the
 * Career Talks listing with real data BEFORE the real backend API
 * exists. Functions as a stand-in "backend" for demos and
 * development. The senior deletes this entire `upload/` folder
 * (and the `parseSheet.ts` helper + the Upload nav link) once
 * the real API is wired in.
 *
 * Flow per the agreed design:
 *   1. User picks .xlsx / .csv file
 *   2. SheetJS parses → produces CareerTalk[]
 *   3. Preview table renders all parsed rows
 *   4. User clicks Save → write to localStorage
 *   5. Career Talks listing + details pages read from localStorage
 *      via `useCareerTalks()` hook
 *   6. User clicks Clear → wipe localStorage, page resets
 *
 * Nothing else in the app is touched — pages, navbar (except the
 * temporary Upload link), styles all stay independent.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/layout/Navbar/Navbar";
import {
  parseSheetFile,
  saveTalksToStorage,
  clearTalksFromStorage,
  readTalksFromStorage,
  type ParseResult,
} from "@/app/lib/career-talks/parseSheet";
import type { CareerTalk } from "@/app/lib/career-talks/types";
// Reuse the shared page chrome (background gradient, navbar offset,
// dark surface tokens) used by /home, /jobs, /company, /events,
// /career-talks so the upload page reads as part of the same app
// instead of a flat secondary screen.
// Career-talks-OWNED chrome CSS — self-contained copy of the shared
// `home.module.css`. Lets this page render pixel-identical without
// depending on the host project's `/home` module.
import chromeStyles from "../_chrome.module.css";
import styles from "./upload.module.css";

/** Cloud-upload glyph for the dashed drop area. */
function UploadCloudIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.dropIcon}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function UploadCareerTalksPage() {
  // Read whatever is already saved so the status row can show
  // "N talks currently saved" AND the re-openable preview modal
  // can render the saved rows.
  //
  // IMPORTANT — initial state is `[]` on BOTH server and client.
  // The localStorage read happens inside the `useEffect` below
  // (only client-side, after mount). If we read localStorage in
  // the useState initialiser, the server-rendered HTML would say
  // `disabled=""` on the toggle button (count is 0 on the server)
  // while the client's first render would say `disabled={false}`
  // (real count from localStorage), and React would fail
  // hydration with "Hydration failed because the server rendered
  // text didn't match the client".
  const [savedTalks, setSavedTalks] = useState<CareerTalk[]>([]);
  const savedCount = savedTalks.length;

  // After mount on the CLIENT, hydrate `savedTalks` from
  // localStorage. The brief flicker between "0 talks (disabled)"
  // and "N talks (enabled)" is acceptable — this runs in a single
  // microtask after first paint, so it's effectively invisible.
  useEffect(() => {
    setSavedTalks(readTalksFromStorage());
  }, []);

  // When the viewer clicks "Currently saved: N talks", we re-open
  // the Preview panel below with the SAVED talks instead of a
  // freshly-parsed file. This flag tells the renderer whether the
  // panel is in "fresh upload" mode (parseResult set) or "viewing
  // saved" mode (this flag true). The two are mutually exclusive.
  const [viewingSaved, setViewingSaved] = useState<boolean>(false);

  // Parsed-but-not-yet-saved talks live in this state. Save button
  // commits them to localStorage; Discard clears the preview only.
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Inline "saved!" confirmation. Cleared when the user picks a new
  // file or hits Clear.
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Inline "save failed" error — surfaces localStorage quota /
  // private-mode failures the user would otherwise never see.
  const [saveError, setSaveError] = useState<string | null>(null);

  /** File picker change handler. Parses the file immediately and
   *  shows the preview. The user can then Save or Discard. */
  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Close any "viewing saved" panel before showing the new
    // upload preview so the user only sees one panel at a time.
    setViewingSaved(false);
    setJustSaved(false);
    setSaveError(null);
    try {
      const result = await parseSheetFile(file);
      setParseResult(result);
    } catch (err) {
      setParseResult({
        talks: [],
        errors: [
          {
            rowNumber: 0,
            reason: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      });
    }
    // Reset the input so picking the SAME file again still fires
    // the change event (browsers debounce identical selections).
    e.target.value = "";
  }

  function handleSave() {
    if (!parseResult || parseResult.talks.length === 0) return;
    const result = saveTalksToStorage(parseResult.talks);
    if (!result.ok) {
      // Surface the localStorage quota / private-mode error to the
      // user — without this they'd just see the preview disappear
      // and assume the save worked.
      setSaveError(result.error);
      return;
    }
    setSavedTalks(parseResult.talks);
    setJustSaved(true);
    setSaveError(null);
    setParseResult(null);
  }

  function handleDiscard() {
    setParseResult(null);
  }

  function handleClear() {
    clearTalksFromStorage();
    setSavedTalks([]);
    setViewingSaved(false);
    setJustSaved(false);
    setSaveError(null);
    setParseResult(null);
  }

  /** Toggle the "view currently-saved talks" panel. Reuses the
   *  same Preview UI below — we don't render a second component,
   *  just flip the mode flag and the renderer picks the right
   *  source of talks. */
  function handleToggleSavedView() {
    if (savedCount === 0) return;
    setViewingSaved((v) => !v);
    // Clear any fresh-upload preview so the two panels don't
    // both try to render at once.
    if (parseResult) setParseResult(null);
  }

  return (
    <div className={chromeStyles.page}>
      <Navbar />
      {/* `.main` is the full-width scroll container (so the
          right-edge scrollbar sits at the viewport edge, not
          inside the centred content). `.mainInner` carries the
          max-width + padding that owns the visual layout. The
          navbar above stays fixed because `.page` is `overflow:
          hidden` and only `.main` scrolls inside it. */}
      <main className={styles.main}>
        <div className={styles.mainInner}>
        <div className={styles.header}>
          <h1 className={styles.title}>Upload Career Talks</h1>
          <p className={styles.subtitle}>
            Pick a spreadsheet (.xlsx or .csv) with your Career Talks data.
            The rows you upload will replace any previously-uploaded talks
            and immediately show up on the Career Talks page.
          </p>
        </div>

        <div className={styles.tempBanner}>
          <span>
            <strong>Temporary tooling.</strong>{" "}
            This page exists so you can populate the Career Talks listing
            with realistic data before the real backend API is wired up.
            The whole <code>/career-talks/upload</code> route, along with
            the Upload nav link and the SheetJS dependency, can be deleted
            once the real API is connected — see <code>HANDOFF.md</code>.
          </span>
        </div>

        {/* ── File picker card ── */}
        <div className={styles.uploadCard}>
          <label className={styles.dropArea}>
            <UploadCloudIcon />
            <p className={styles.dropText}>
              Drag &amp; drop is not enabled — click below to pick a file.
              Expected columns: <strong>Title</strong>,{" "}
              <strong>Short Description</strong>,{" "}
              <strong>Long Description</strong>, <strong>Company</strong>,{" "}
              <strong>Date of Podcast</strong>, <strong>Timings</strong>,{" "}
              <strong>Keywords</strong>, <strong>Image URL</strong>,{" "}
              <strong>Youtube URL</strong>.
            </p>
            <span className={styles.pickBtn}>Choose a spreadsheet</span>
            <input
              type="file"
              className={styles.fileInput}
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFilePick}
            />
          </label>

          {/* Current-state summary — always visible so the user knows
              what the listing page is rendering right now. When at
              least one talk is saved, the "N talks" text becomes a
              CLICKABLE TOGGLE that re-opens the Preview panel below
              with the saved talks (so the viewer can re-inspect what
              they uploaded). Clicking it again closes the panel. */}
          <div className={styles.statusRow}>
            <button
              type="button"
              className={styles.statusToggle}
              onClick={handleToggleSavedView}
              disabled={savedCount === 0}
              aria-expanded={viewingSaved}
              aria-label={
                savedCount === 0
                  ? "No saved talks"
                  : viewingSaved
                  ? "Hide saved talks preview"
                  : "Re-open saved talks preview"
              }
            >
              <span className={styles.statusText}>
                Currently saved:{" "}
                <span className={styles.statusCount}>{savedCount}</span>{" "}
                {savedCount === 1 ? "talk" : "talks"}
              </span>
            </button>
            <div className={styles.statusActions}>
              <Link href="/career-talks" className={styles.viewLink}>
                View Career Talks →
              </Link>
              {savedCount > 0 ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClear}
                >
                  Clear saved talks
                </button>
              ) : null}
            </div>
          </div>

          {/* Inline "save failed" message — only renders when
              `handleSave` got a quota / private-mode rejection from
              localStorage. Shaped like the existing errors block so
              it's visually consistent with row-level errors. */}
          {saveError ? (
            <div className={styles.errors}>
              <strong>Save failed:</strong> {saveError}
            </div>
          ) : null}

          {justSaved ? (
            <div className={styles.savedToast}>
              <strong>Saved.</strong> The Career Talks page will now show
              your uploaded talks. Visit{" "}
              <Link href="/career-talks">/career-talks</Link> to verify.
            </div>
          ) : null}
        </div>

        {/* ── Preview panel ──
            Reused for TWO modes:
              1. Fresh upload (`parseResult` set) → shows the
                 just-parsed rows with Discard + Save buttons.
              2. Viewing saved (`viewingSaved` true) → shows the
                 currently-saved talks with a single Close button,
                 letting the viewer re-inspect what's stored.
            The two modes are mutually exclusive — `handleFilePick`
            clears `viewingSaved` and `handleToggleSavedView` clears
            `parseResult`, so only one of `previewTalks` /
            `previewErrors` is ever populated at a time. */}
        {(() => {
          const inFreshMode = parseResult !== null;
          const inSavedMode = viewingSaved && savedCount > 0;
          if (!inFreshMode && !inSavedMode) return null;

          const previewTalks: CareerTalk[] = inFreshMode
            ? parseResult!.talks
            : savedTalks;
          const previewErrors = inFreshMode ? parseResult!.errors : [];
          const previewCount = previewTalks.length;

          return (
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>
                {inSavedMode
                  ? `Saved talks — ${previewCount} ${previewCount === 1 ? "row" : "rows"}`
                  : `Preview — ${previewCount} ${previewCount === 1 ? "row" : "rows"} parsed`}
              </h2>
              <div className={styles.previewActions}>
                {inFreshMode ? (
                  <>
                    <button
                      type="button"
                      className={styles.discardBtn}
                      onClick={handleDiscard}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleSave}
                      disabled={previewCount === 0}
                    >
                      Save {previewCount}{" "}
                      {previewCount === 1 ? "talk" : "talks"}
                    </button>
                  </>
                ) : (
                  // Viewing-saved mode: just a single Close button —
                  // no Save (already saved) or Discard (would imply
                  // throwing away the saved data, which it doesn't).
                  <button
                    type="button"
                    className={styles.discardBtn}
                    onClick={() => setViewingSaved(false)}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {previewErrors.length > 0 ? (
              <div className={styles.errors}>
                <strong>{previewErrors.length}</strong>{" "}
                {previewErrors.length === 1 ? "issue" : "issues"} found:
                <ul className={styles.errorsList}>
                  {previewErrors.map((err, i) => (
                    <li key={i}>
                      {/* File-level errors use rowNumber: 0 — the
                          parser convention for "this is about the
                          file itself, not a specific row". Render
                          those without the misleading "Row 0:" prefix. */}
                      {err.rowNumber === 0
                        ? err.reason
                        : `Row ${err.rowNumber}: ${err.reason}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Short Description</th>
                    <th>Long Description</th>
                    <th>Company</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Keywords</th>
                    <th>Image URL</th>
                    <th>Video URL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Iterate the IIFE's `previewTalks` (NOT
                      `parseResult.talks` directly) — in viewing-
                      saved mode `parseResult` is null, so accessing
                      it here would crash with "Cannot read
                      properties of null (reading 'talks')". The IIFE
                      already resolved the right source above. */}
                  {previewTalks.map((talk: CareerTalk) => (
                    <tr key={talk.id}>
                      <td>{talk.id}</td>
                      <td title={talk.title}>
                        <span className={styles.cellTruncate}>{talk.title}</span>
                      </td>
                      {/* Short + Long description columns — truncated
                          to one line each in the cell, with the full
                          text in the `title` tooltip so the viewer can
                          hover any row to read the entire description.
                          This is just the preview verification step;
                          the saved data carries the full text. */}
                      <td title={talk.shortDescription}>
                        <span className={styles.cellTruncate}>
                          {talk.shortDescription || "—"}
                        </span>
                      </td>
                      <td title={talk.longDescription}>
                        <span className={styles.cellTruncate}>
                          {talk.longDescription || "—"}
                        </span>
                      </td>
                      <td title={talk.company}>
                        <span className={styles.cellTruncate}>
                          {talk.company || "—"}
                        </span>
                      </td>
                      <td>{talk.date || "—"}</td>
                      <td>{talk.time || "—"}</td>
                      <td>
                        {talk.keywords.length === 0
                          ? "—"
                          : talk.keywords.map((kw) => (
                              <span key={kw} className={styles.keywordChip}>
                                {kw}
                              </span>
                            ))}
                      </td>
                      <td title={talk.imageUrl}>
                        <span className={styles.cellTruncate}>
                          {talk.imageUrl || "—"}
                        </span>
                      </td>
                      <td title={talk.videoUrl}>
                        <span className={styles.cellTruncate}>
                          {talk.videoUrl || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}
        </div>
      </main>
    </div>
  );
}
