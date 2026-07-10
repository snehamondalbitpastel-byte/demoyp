/** Helpers shared between the feed post card and the post-image modal
 *  for rendering post body text with a "show more / show less" control.
 *
 *  Keeping these in one place prevents the feed and modal from drifting
 *  apart (e.g., one truncating at 140 chars while the other uses 120).
 *  Behaviour here matches the original inline versions that lived in
 *  `home/page.tsx` — preserved verbatim so the feed's render is
 *  unchanged. */

/** Max chars of the first-line preview before we also truncate it at a
 *  word boundary (protects against a single very long run-on line). */
export const PREVIEW_MAX_CHARS = 140;

/** Flatten HTML to plain text (tags stripped, entities collapsed to spaces,
 *  everything onto one line). SSR-safe — no DOM usage. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the FIRST meaningful line of plain text from an HTML fragment.
 *  <br>, </p>, </h*> act as line breaks so multi-paragraph posts preserve
 *  their natural first-line break instead of being flattened. Used to
 *  build the collapsed preview — what you see before "... show more". */
export function firstLineOfHtml(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/h[1-6]\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z0-9#]+;/gi, " ");
  const firstNonEmpty = withBreaks
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstNonEmpty ?? "";
}

/** Truncate plain text at the nearest word boundary before `maxChars`. */
export function truncatePlain(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut;
}
