/**
 * ⚠️  TEMPORARY FILE — DELETE ON HANDOFF.
 *
 * Spreadsheet → `CareerTalk[]` parser. Powers the temporary
 * /career-talks/upload page so the user can populate the listing
 * with real-looking data before the real backend API exists.
 *
 * When the API ships, this entire file goes away. The data layer
 * (`useCareerTalks.ts`) will fetch from the API instead of
 * localStorage, and nothing on the listing / details pages
 * changes — they keep reading `CareerTalk[]` exactly as defined
 * in `types.ts`.
 *
 * Uses SheetJS (`xlsx` npm package) which handles both `.xlsx` and
 * `.csv` files via the same `xlsx.read()` call.
 */

import * as XLSX from "xlsx";
import type { CareerTalk } from "./types";

// ────────────────────────────────────────────────────────────────
//  VALIDATION CONSTANTS — single source of truth for every limit
//  the upload page enforces. Tweak any value here and both the
//  parser and the UI messages stay in sync.
// ────────────────────────────────────────────────────────────────

/** Hard cap on the uploaded file's size. 5 MB is generous for a
 *  spreadsheet (a 12-row sheet is typically ~30 KB; even 1000 rows
 *  would only be ~2-3 MB). It also matches the rough localStorage
 *  budget per origin (~5 MB) so a file we accept will fit in
 *  storage too. */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Whitelisted file extensions. The `<input type=file accept=...>`
 *  attribute already filters most cases, but the user can drop in
 *  any file via "All files" or via drag-drop — so we double-check
 *  here in code. */
export const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/** Every column the parser knows how to read. If the uploaded
 *  sheet's header row is missing one of these, the user gets a
 *  warning telling them exactly which column to add — much friendlier
 *  than silently producing empty fields. `Title` is the only HARD
 *  requirement (a row with no title can't be displayed at all);
 *  the rest just become empty strings if absent. */
export const EXPECTED_HEADERS = [
  "Title",
  "Short Description",
  "Long Description",
  "Company",
  "Date of Podcast",
  "Timings",
  "Keywords",
  "Image URL",
  "Youtube URL",
] as const;

/** Convert a byte count into a human-readable string ("4.2 MB").
 *  Only used in error messages. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Months → 0-based index for the date parser. */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Weekday names — index matches `Date.getDay()` (0 = Sunday). */
const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

/** Pad a number to 2 digits for ISO date assembly. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format a Date into the long human-readable form the UI uses
 *  ("Tuesday, March 3, 2026"). Avoids needing `Intl` at render
 *  time and keeps the data shape itself display-ready. */
function formatLongDate(d: Date): string {
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Parse the sheet's "Date of Podcast" cell. Supports THREE input
 *  types because Excel + SheetJS produce different things depending
 *  on how the cell ended up storing its data:
 *
 *    1. **JS Date object** — what SheetJS hands us when the cell was
 *       auto-converted to Excel's internal date format (Excel does
 *       this silently the moment you type something it recognises
 *       as a date, e.g. `03-03-2026` or `5/5/2026`). The
 *       `{ cellDates: true }` flag we pass into `xlsx.read` turns
 *       these into real Date instances. THIS WAS THE MISSING CASE
 *       that left dates blank in the cards.
 *    2. **Number** — Excel date serial (e.g. 45719). Rare with
 *       `cellDates: true` but can still happen for some CSV imports.
 *    3. **String** — when the cell was kept as plain text (Excel
 *       gives up auto-formatting when the value can't be a date,
 *       like "18/02/2026" in a US-locale Excel where "18" is an
 *       invalid month). We split on `/`, `.`, or `-` and treat
 *       the parts as DD/MM/YYYY (UK format, per project spec).
 *
 *  Returns `{ date, dateISO }` where `date` is the long display
 *  string ("Tuesday, March 3, 2026") and `dateISO` is `YYYY-MM-DD`
 *  for sorting. Returns null when the cell is empty or unparseable. */
function parseSheetDate(
  cell: unknown
): { date: string; dateISO: string } | null {
  if (cell == null || cell === "") return null;

  // ── Case 1: JS Date object (most common with `cellDates: true`) ──
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return null;
    // SheetJS hands back a Date constructed at local midnight from
    // the workbook's Y/M/D, so the local-time getters are correct
    // here — no UTC shift needed.
    const y = cell.getFullYear();
    const m = cell.getMonth() + 1;
    const d = cell.getDate();
    return {
      date: formatLongDate(cell),
      dateISO: `${y}-${pad2(m)}-${pad2(d)}`,
    };
  }

  // ── Case 2: Excel serial number ──
  if (typeof cell === "number" && Number.isFinite(cell)) {
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (!parsed) return null;
    const d = new Date(parsed.y, parsed.m - 1, parsed.d);
    if (Number.isNaN(d.getTime())) return null;
    return {
      date: formatLongDate(d),
      dateISO: `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`,
    };
  }

  // ── Case 3: String — UK format DD/MM/YYYY (tolerant of separator) ──
  if (typeof cell === "string") {
    const parts = cell.trim().split(/[\/.\-]/);
    if (parts.length !== 3) return null;
    const dd = Number(parts[0]);
    const mm = Number(parts[1]);
    const yyyy = Number(parts[2]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) {
      return null;
    }
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
    const d = new Date(yyyy, mm - 1, dd);
    if (Number.isNaN(d.getTime())) return null;
    return {
      date: formatLongDate(d),
      dateISO: `${yyyy}-${pad2(mm)}-${pad2(dd)}`,
    };
  }

  return null;
}

/** Split a "Keywords" cell into a clean string[]. Tolerant of:
 *    - comma separators ("IT, Teamwork, Problem")
 *    - semicolon separators ("IT; Teamwork; Problem")
 *    - extra whitespace, empty entries, leading/trailing commas
 *  Returns [] when the cell is empty / not a string. */
function parseKeywords(cell: unknown): string[] {
  if (typeof cell !== "string") return [];
  return cell
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Coerce a sheet cell to a trimmed string, returning "" for
 *  null/undefined. Numbers and booleans are stringified so a
 *  sheet author who types "1" in a text cell still gets text. */
function cellToString(cell: unknown): string {
  if (cell == null) return "";
  if (typeof cell === "string") return cell.trim();
  return String(cell).trim();
}

/** Raw row shape coming out of `XLSX.utils.sheet_to_json` after
 *  the sheet is converted using its header row as the keys. The
 *  keys MUST match the user's spreadsheet column headers exactly
 *  (case + spacing). Any header rename in the sheet template
 *  needs a matching change here. */
type RawSheetRow = {
  "Title"?: unknown;
  "Short Description"?: unknown;
  "Long Description"?: unknown;
  "Company"?: unknown;
  "Date of Podcast"?: unknown;
  "Timings"?: unknown;
  "Keywords"?: unknown;
  "Image URL"?: unknown;
  "Youtube URL"?: unknown;
};

/** Result of parsing — `talks` are the rows that mapped cleanly;
 *  `errors` reports any row that had to be skipped (currently
 *  only "no title" qualifies as unrecoverable — everything else
 *  has a sensible fallback). */
export interface ParseResult {
  talks: CareerTalk[];
  errors: Array<{ rowNumber: number; reason: string }>;
}

/** MAIN ENTRY — accepts a `File` from a `<input type="file">`,
 *  parses it, and returns the talks + any per-row errors.
 *
 *  Runs through several VALIDATION STEPS in order:
 *    1. File size — reject anything over `MAX_FILE_SIZE_BYTES`
 *    2. File extension — must be one of `ALLOWED_EXTENSIONS`
 *    3. Sheet existence — workbook must contain at least one sheet
 *    4. Header presence — sheet must have at least the Title column;
 *       any other expected header missing produces a soft warning
 *       (the parser keeps going, the affected fields just become
 *       empty strings).
 *    5. Non-empty rows — sheet must have at least one data row
 *    6. Per-row validation — every row must have a Title
 *
 *  All validation failures are surfaced through the same `errors`
 *  array on the result, with `rowNumber: 0` reserved for file-level
 *  errors (the UI renders these without the "Row N:" prefix). */
export async function parseSheetFile(file: File): Promise<ParseResult> {
  // ── Validation 1: file size ──
  //  Catch oversized uploads BEFORE reading bytes into memory; a
  //  multi-GB file would otherwise lock up the browser tab.
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      talks: [],
      errors: [{
        rowNumber: 0,
        reason: `File is too large (${formatBytes(file.size)}). Maximum allowed: ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      }],
    };
  }

  // ── Validation 2: file extension ──
  //  The `<input accept=...>` attribute filters most attempts but
  //  doesn't enforce in every browser (e.g. drag-drop or "All
  //  files" picker bypasses it). This check is the real gate.
  const fileName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );
  if (!hasAllowedExt) {
    return {
      talks: [],
      errors: [{
        rowNumber: 0,
        reason: `Unsupported file type. Please upload one of: ${ALLOWED_EXTENSIONS.join(", ")}.`,
      }],
    };
  }

  // Step 1 — read the file bytes into memory.
  const buffer = await file.arrayBuffer();

  // Step 2 — let SheetJS parse the entire workbook in one call.
  //  `type: "array"` matches the `ArrayBuffer` we just produced.
  //
  //  We deliberately DO NOT pass `cellDates: true`. That flag asks
  //  SheetJS to convert Excel date cells into JS `Date` objects, but
  //  the conversion goes through `new Date(...)` which is sensitive
  //  to the running JS environment's timezone — viewers whose
  //  timezone interpretation drifts past midnight see every date
  //  one day off (e.g. sheet says "03/03/2026" but the card showed
  //  "Monday March 2, 2026").
  //
  //  Without `cellDates: true`, date cells come back as raw Excel
  //  serial NUMBERS instead. `parseSheetDate()` then uses
  //  `XLSX.SSF.parse_date_code()` which returns the underlying
  //  calendar `{ y, m, d }` directly with NO timezone math — the
  //  date that displays is always the date that's in the sheet.
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch (err) {
    // SheetJS throws on corrupt or password-protected files. Wrap
    // it so the user gets a clean message instead of a stack trace.
    return {
      talks: [],
      errors: [{
        rowNumber: 0,
        reason: `Could not read spreadsheet: ${err instanceof Error ? err.message : "unknown error"}.`,
      }],
    };
  }

  // ── Validation 3: workbook has a sheet ──
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      talks: [],
      errors: [{ rowNumber: 0, reason: "Workbook has no sheets." }],
    };
  }
  const sheet = workbook.Sheets[firstSheetName];

  // ── Validation 4: required headers present ──
  //  Grab the header row directly (range A1:Z1) so we can compare
  //  against `EXPECTED_HEADERS`. A missing column doesn't fail
  //  parsing — it just becomes empty strings — but we surface a
  //  warning so the user knows which header to add to their sheet
  //  template. Missing `Title` IS fatal though (no title means we
  //  can't render anything).
  const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    range: 0,
  })[0] as string[] | undefined;
  const presentHeaders = new Set(
    (headerRow ?? []).map((h) => String(h ?? "").trim())
  );
  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !presentHeaders.has(h)
  );
  if (missingHeaders.includes("Title")) {
    return {
      talks: [],
      errors: [{
        rowNumber: 0,
        reason: `Required column "Title" is missing from the sheet's header row. Found headers: ${[...presentHeaders].join(", ") || "(none)"}.`,
      }],
    };
  }

  // Step 4 — convert to array of row objects, keyed by header row.
  //  `defval: ""` makes missing cells empty strings instead of
  //  `undefined`, which simplifies our cellToString helper.
  const rawRows = XLSX.utils.sheet_to_json<RawSheetRow>(sheet, { defval: "" });

  // ── Validation 5: at least one data row exists ──
  if (rawRows.length === 0) {
    return {
      talks: [],
      errors: [{
        rowNumber: 0,
        reason: "Sheet contains a header row but no data rows. Add at least one talk and re-upload.",
      }],
    };
  }

  // Seed the errors array with the soft "missing optional header"
  // warnings collected during validation 4. These don't block the
  // save — they just tell the user which columns they forgot, so
  // those fields will be empty until they add the column.
  const errors: ParseResult["errors"] = missingHeaders
    .filter((h) => h !== "Title") // Title is fatal, already returned
    .map((h) => ({
      rowNumber: 0,
      reason: `Column "${h}" is missing from the sheet — that field will be empty on every talk.`,
    }));

  // Step 5 — map each raw row into our `CareerTalk` shape. Generate
  //  IDs from the row index (1-based for human-friendly URLs).
  const talks: CareerTalk[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // +2: header row is #1, data starts #2
    const title = cellToString(raw["Title"]);
    if (!title) {
      errors.push({ rowNumber, reason: "Missing Title — row skipped." });
      return;
    }

    const parsedDate = parseSheetDate(raw["Date of Podcast"]);
    talks.push({
      id: String(index + 1),
      title,
      shortDescription: cellToString(raw["Short Description"]),
      longDescription: cellToString(raw["Long Description"]),
      company: cellToString(raw["Company"]),
      date: parsedDate?.date ?? "",
      dateISO: parsedDate?.dateISO ?? "",
      time: cellToString(raw["Timings"]),
      keywords: parseKeywords(raw["Keywords"]),
      imageUrl: cellToString(raw["Image URL"]),
      videoUrl: cellToString(raw["Youtube URL"]),
    });
  });

  return { talks, errors };
}

/** localStorage key under which uploaded talks are persisted.
 *  Centralised here so `useCareerTalks.ts` (the read side) and
 *  the upload page (the write side) can't drift out of sync. */
export const CAREER_TALKS_STORAGE_KEY = "yp.career-talks.data";

/** Save the parsed talks to localStorage. Called when the user
 *  hits the "Save" button on the upload page. Overwrites any
 *  previously-saved upload completely. Returns `{ ok: true }` on
 *  success or `{ ok: false, error }` when the browser refused
 *  the write — the most common cause is exceeding the per-origin
 *  localStorage quota (~5 MB in most browsers), but it can also
 *  fail in private-browsing mode or when site data is disabled.
 *  The upload page surfaces the error to the user so they know
 *  the save didn't actually happen. */
export function saveTalksToStorage(
  talks: CareerTalk[]
): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(CAREER_TALKS_STORAGE_KEY, JSON.stringify(talks));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not save: ${err.message}. The browser may be out of storage space — try clearing previously-saved talks first.`
          : "Could not save talks to browser storage.",
    };
  }
}

/** Wipe any previously-uploaded talks from localStorage. Called
 *  by the "Clear" button on the upload page. */
export function clearTalksFromStorage(): void {
  try {
    localStorage.removeItem(CAREER_TALKS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Quick reader for the upload page itself so it can show the
 *  current count of saved talks ("N talks currently saved").
 *  The actual page-render hook lives in `useCareerTalks.ts`. */
export function readTalksFromStorage(): CareerTalk[] {
  try {
    const raw = localStorage.getItem(CAREER_TALKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CareerTalk[]) : [];
  } catch {
    return [];
  }
}
