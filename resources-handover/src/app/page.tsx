/* ================================================================
 * HANDOVER — Resources Module
 * File:    src/app/page.tsx
 * Role:    Demo-only root page. Redirects `/` → `/resources` so
 *          `npm run dev` boots straight into the feature.
 * COPY?:   ❌ DO NOT copy — the target project already owns `/`.
 * See README.md §1 (Quick start).
 * ================================================================ */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/resources");
}
