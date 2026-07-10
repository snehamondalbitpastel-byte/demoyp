# Career Talks — Official Handover Package

> **Audience:** any teammate who needs to drop the Career Talks feature into the real Young Professionals (YP) Next.js project.
> **Goal:** read this file → run the demo locally → copy 11 files into the target project → wire 1 nav link → done.

This bundle is a **self-contained, runnable Next.js app** that ships the full Career Talks listing + details + (temporary) upload UI, plus a minimal pixel-identical copy of the YP navbar, auth context, theme context, and shared "chrome" (background, mini-profile card, search bar). Everything compiles and runs on its own so you can see the feature working *before* you integrate it.

---

## 1. Quick start — run the demo in under a minute

```bash
# 1. Install dependencies (one-time, ~30s on a warm cache)
npm install

# 2. Start the Next.js dev server
npm run dev

# 3. Open in your browser
#    http://localhost:3000   →  auto-redirects to /career-talks
```

Requirements: **Node.js 20 or newer**. Check with `node --version`. Nothing else needs to be installed globally.

Routes you can visit in the demo:

| Route | What it shows |
|---|---|
| `/` | Auto-redirects to `/career-talks` |
| `/career-talks` | Listing page — cards, filter modal, sort dropdown, search |
| `/career-talks/[id]` | Details page — banner, description, video player |
| `/career-talks/upload` | Temporary admin uploader (spreadsheet → localStorage) |

The mock user **"Sneha Mondal"** is hard-coded in `AuthContext.tsx`, so the mini-profile renders straight away.

---

## 2. Light mode + the two-link navbar (read this!)

The demo navbar (`src/app/components/layout/Navbar/Navbar.tsx`) is a **pixel-identical copy** of the real YP navbar with one intentional difference: it ships with **only two nav links** because those are the only routes that exist in this bundle.

```
[ YOUNG PRO ]      [ Career Talks ]   [ Upload ]                [ Avatar ]
```

| Link | Route | Notes |
|---|---|---|
| **Career Talks** | `/career-talks` | the listing page — the actual feature |
| **Upload** | `/career-talks/upload` | the temporary admin uploader (delete on handoff) |

Why only two? Because rendering Home / Company / Jobs / Events / Notifications in the demo nav would 404 the moment anyone clicked them — those routes aren't in this bundle. **In the real project you will use the existing YP navbar, not this one** (see Section 4, Step 4 below for the 1-line change you make to it).

### Light mode

Light / dark theme is fully wired:

- Click the avatar (top right) → dropdown opens → **Appearance → Light**
- The toggle stores the choice in `localStorage("yp.theme")`
- Pre-hydration script in `layout.tsx` stamps `data-theme="light"` on `<html>` **before first paint**, so refreshing in light mode never flashes dark
- The theme **only applies on `/career-talks` routes** by design — every other page in the real YP project stays dark (this matches the live spec)
- Light-mode overrides exist for: navbar icons (tinted brand-blue `#3960fb`), dropdown menu, hamburger drawer, search pill, filter chips, filter modal, sort dropdown, sort + filter pills, cards, banner, video card, image preview modal, divider line

If you want to see every light-mode rule in one place, search the codebase for `[data-theme="light"]`.

---

## 3. What's in this bundle

```
career-talks-handover/
│
├── package.json              Dependencies for the standalone demo
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── README.md                 ← you are here
│
└── src/app/
    │
    ├── layout.tsx            Root layout + pre-hydration theme script
    ├── globals.css           CSS-variable theme tokens (light + dark)
    ├── page.tsx              `/` → redirects to /career-talks
    │
    ├── career-talks/         ⭐ COPY THIS WHOLE FOLDER INTO TARGET PROJECT
    │   ├── page.tsx                            Listing page
    │   ├── careerTalks.module.css              Listing styles (filter modal, sort pill, cards, grid)
    │   ├── _chrome.module.css                  Self-contained copy of shared YP chrome
    │   ├── [id]/
    │   │   ├── page.tsx                        Details page
    │   │   └── careerTalkDetails.module.css    Details styles (banner, body card, video, preview modal)
    │   └── upload/
    │       ├── page.tsx                        ⚠ TEMPORARY admin uploader — delete on handoff
    │       └── upload.module.css               ⚠ TEMPORARY styles — delete on handoff
    │
    ├── lib/career-talks/     ⭐ COPY THIS WHOLE FOLDER INTO TARGET PROJECT
    │   ├── types.ts                            CareerTalk interface — single source of truth
    │   ├── useCareerTalks.ts                   Data hook (currently localStorage; swap to API later)
    │   ├── videoSourceType.ts                  YouTube vs MP4 classifier for the video player
    │   └── parseSheet.ts                       ⚠ TEMPORARY xlsx parser — delete on handoff
    │
    ├── lib/api/types.ts      Minimal AuthUser type (demo only — target project already has its own)
    │
    ├── context/              Demo only — target project already has both
    │   ├── AuthContext.tsx                     Stubbed with mock user "Sneha Mondal"
    │   └── ThemeContext.tsx                    Full implementation (same as real project)
    │
    └── components/layout/Navbar/   Demo only — target project already has its own navbar
        ├── Navbar.tsx                          Two-link navbar (Career Talks + Upload)
        └── Navbar.module.css                   Full navbar styles incl. light-mode + drawer
```

**⭐ starred folders** = what gets dropped into the real target project.
**Everything else** = demo wrapper. The target project already has its own version.

---

## 4. Integrating into the real YP project

After verifying the demo runs on your machine, do this:

### Step 1 — Copy these 11 files (and only these) into the target project

| Source (this bundle) | Destination (target project) |
|---|---|
| `src/app/career-talks/page.tsx` | `src/app/career-talks/page.tsx` |
| `src/app/career-talks/careerTalks.module.css` | `src/app/career-talks/careerTalks.module.css` |
| `src/app/career-talks/_chrome.module.css` | `src/app/career-talks/_chrome.module.css` |
| `src/app/career-talks/[id]/page.tsx` | `src/app/career-talks/[id]/page.tsx` |
| `src/app/career-talks/[id]/careerTalkDetails.module.css` | `src/app/career-talks/[id]/careerTalkDetails.module.css` |
| `src/app/career-talks/upload/page.tsx` *(temp)* | `src/app/career-talks/upload/page.tsx` |
| `src/app/career-talks/upload/upload.module.css` *(temp)* | `src/app/career-talks/upload/upload.module.css` |
| `src/app/lib/career-talks/types.ts` | `src/app/lib/career-talks/types.ts` |
| `src/app/lib/career-talks/useCareerTalks.ts` | `src/app/lib/career-talks/useCareerTalks.ts` |
| `src/app/lib/career-talks/videoSourceType.ts` | `src/app/lib/career-talks/videoSourceType.ts` |
| `src/app/lib/career-talks/parseSheet.ts` *(temp)* | `src/app/lib/career-talks/parseSheet.ts` |

The **temp** files (the upload page + parser) can be deleted once the real backend API is wired in. They exist so you can seed realistic data before the API ships.

### Step 2 — Verify the imports resolve in the target project

The career-talks files import:

| Import path | What it needs to be |
|---|---|
| `@/app/components/layout/Navbar/Navbar` | The target project's existing Navbar |
| `@/app/context/AuthContext` | Must export `useAuth()` returning `{ user, setUser }` |
| `@/app/context/ThemeContext` | Must export `useTheme()` returning `{ theme }` |
| `@/app/lib/api/types` | Must export the `AuthUser` interface |

If `/events`, `/jobs`, or `/home` are already working in the target project, **all four already exist** — you're good.

### Step 3 — Install the runtime packages (if not already in target)

```bash
npm install sonner xlsx @fortawesome/fontawesome-free bootstrap
```

| Package | Used for |
|---|---|
| `sonner` | Toast notifications (theme-change confirmation, save toast) |
| `xlsx` *(temp)* | Spreadsheet parsing on the temporary upload page — remove when the upload page is deleted |
| `@fortawesome/fontawesome-free` | `fas fa-play`, `fas fa-video`, `fas fa-times` glyphs on the cards and details page |
| `bootstrap` | Only the **grid** is used (`bootstrap-grid.min.css`) — for responsive columns on the details page |

The target project likely already has `sonner` and `@fortawesome/fontawesome-free` from `/events` and `/jobs`. Check `package.json` before running `npm install`.

Also, `layout.tsx` references the **Line Awesome** icon set via CDN (for the `las la-search-plus` magnifier glyph on the details-page image preview affordance). The target project's `layout.tsx` already loads this CDN link in its `<head>` — verify before publishing.

### Step 4 — Add one entry to the target's Navbar links array

Open the target project's real Navbar (`src/app/components/layout/Navbar/Navbar.tsx`) and add one entry to its `NAV_ITEMS` array:

```tsx
{
  key: "career-talks",
  label: "Career Talks",
  icon: "/assets/icons/nav/career-talks-outline.svg",
  iconActive: "/assets/icons/nav/career-talks-fill.svg",
  href: "/career-talks",
}
```

The icon assets (`career-talks-outline.svg`, `career-talks-fill.svg`) should already exist in the target's `public/assets/icons/nav/` folder — if not, ask the design team or use any matching pair from the existing nav set.

> ⚠️ **Do NOT copy this bundle's Navbar.tsx or Navbar.module.css into the target project.** The bundle's Navbar is the *stripped-down two-link demo version*. The target project has its own full navbar with all 6+ links — only add the one new link entry shown above.

### Step 5 — Restart the dev server and verify

- [ ] `/events`, `/jobs`, `/home`, `/company` — all still work, untouched
- [ ] `/career-talks` — listing page loads (empty until you upload, or until the API is wired)
- [ ] Click a card → details page loads
- [ ] Avatar dropdown → Appearance → Light → entire `/career-talks` flips to light mode with no flash, navbar icons tint to brand blue
- [ ] Refresh while in light mode → no dark-mode flash on first paint
- [ ] Avatar dropdown → Appearance → Dark → flips back

### Step 6 — (Optional) Avoid a double navbar

The career-talks page files each render `<Navbar />` themselves. If the target project's `layout.tsx` already renders `<Navbar />` globally, you'll see two stacked navbars. Fix by removing the `<Navbar />` line from:

- `src/app/career-talks/page.tsx`
- `src/app/career-talks/[id]/page.tsx`
- `src/app/career-talks/upload/page.tsx`

---

## 5. Where the data comes from (and how to swap to the real API)

The data layer is intentionally tiny — **one hook, one storage helper**.

- Right now `useCareerTalks()` reads from `localStorage` (key `careerTalks.v1`), populated by the temporary `/career-talks/upload` page.
- When the real backend ships, replace the body of `useCareerTalks.ts` with a `fetch()` (or SWR) call:

```ts
// useCareerTalks.ts — production version
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useCareerTalks(): { talks: CareerTalk[]; loading: boolean } {
  const { data } = useSWR<CareerTalk[]>("/api/career-talks", fetcher);
  return { talks: data ?? [], loading: !data };
}
```

**Pages do not change.** Both `/career-talks/page.tsx` and `/career-talks/[id]/page.tsx` consume `CareerTalk[]` exactly as defined in `src/app/lib/career-talks/types.ts`. As long as the API returns objects matching that interface, the swap is one file.

Once the API is live, delete:
- `src/app/career-talks/upload/` (whole folder)
- `src/app/lib/career-talks/parseSheet.ts`
- The `xlsx` dependency from `package.json`
- The "Upload" link in the navbar (if you added it)

---

## 6. Chrome (mini-profile + search bar + background)

`_chrome.module.css` is a **self-contained snapshot** of the developer's local `home.module.css`. It owns the page background gradient, mini-profile card, search bar pill, and skeleton shimmer classes. The career-talks pages import it via:

```tsx
import chromeStyles from "./_chrome.module.css";
```

**If your site's chrome doesn't match (different page bg, different surface colours), you have two options:**

**Option A — Edit `_chrome.module.css`** *(keeps career-talks self-contained)*
Open the file, find the `.page` rule near the top, change the background gradient to match your site.

**Option B — Point at your existing `home.module.css`** *(breaks self-containment, but auto-syncs with your site)*
In each career-talks page file, change:
```tsx
import chromeStyles from "./_chrome.module.css";   // BEFORE
import chromeStyles from "@/app/home/home.module.css";  // AFTER
```
Requires the target's `home.module.css` to define every class the career-talks pages use: `.page`, `.content`, `.leftCol`, `.miniProfile`, `.miniAvatar`, `.miniInfo`, `.miniName`, `.miniRole`, `.miniLocation`, `.searchBar`, `.searchInput`, `.searchIconWrap`, `.searchClear`, `.skeleton`, `.skelChip`, `.skelLine`, `.skelName`, `.skelRole`.

---

## 7. File-by-file reference

Every file in this bundle has a **HANDOVER banner** at the top identifying its purpose, target-project destination, and whether to copy or skip. Open any file and the first ~15 lines tell you everything you need.

| File | Role | Copy to target? |
|---|---|---|
| `src/app/layout.tsx` | Demo root layout + pre-hydration theme script | ❌ Demo wrapper |
| `src/app/page.tsx` | Demo `/` → redirects to `/career-talks` | ❌ Demo wrapper |
| `src/app/globals.css` | CSS-variable theme tokens (light + dark) | ⚠ Tokens already exist in target — only copy if missing |
| `src/app/context/AuthContext.tsx` | Stubbed mock user | ❌ Target has the real one |
| `src/app/context/ThemeContext.tsx` | Light/dark theme provider | ⚠ Target should already have this — match the API |
| `src/app/components/layout/Navbar/Navbar.tsx` | Two-link demo navbar | ❌ Target has the real one — just add a link entry |
| `src/app/components/layout/Navbar/Navbar.module.css` | Demo navbar styles | ❌ Target has the real one |
| `src/app/lib/api/types.ts` | Minimal `AuthUser` type | ❌ Target has the full one |
| `src/app/career-talks/page.tsx` | Listing page | ✅ Copy |
| `src/app/career-talks/careerTalks.module.css` | Listing styles | ✅ Copy |
| `src/app/career-talks/_chrome.module.css` | Self-contained chrome | ✅ Copy (or swap to `home.module.css` — see §6) |
| `src/app/career-talks/[id]/page.tsx` | Details page | ✅ Copy |
| `src/app/career-talks/[id]/careerTalkDetails.module.css` | Details styles | ✅ Copy |
| `src/app/career-talks/upload/page.tsx` | Temp uploader | ⚠ Copy now, delete when API ships |
| `src/app/career-talks/upload/upload.module.css` | Temp uploader styles | ⚠ Copy now, delete when API ships |
| `src/app/lib/career-talks/types.ts` | `CareerTalk` data contract | ✅ Copy (permanent) |
| `src/app/lib/career-talks/useCareerTalks.ts` | Data hook | ✅ Copy (swap body to API call when live) |
| `src/app/lib/career-talks/videoSourceType.ts` | YouTube/MP4 detector | ✅ Copy (permanent) |
| `src/app/lib/career-talks/parseSheet.ts` | Temp xlsx parser | ⚠ Copy now, delete when API ships |

---

## 8. FAQ / troubleshooting

**Q: `npm run dev` fails on first run.**
A: Almost always a Node version issue. This needs Node 20+. Check with `node --version`.

**Q: The mini-profile shows "SM" initials instead of an avatar — is that broken?**
A: No, that's the fallback when `profile_image_url` is null. The mock user in `AuthContext.tsx` has no image, so initials render. In the real project, the live `AuthContext` will supply a real URL.

**Q: I see "Career Talks (0)" in the stats box and no cards.**
A: That's the empty state — the data layer is reading from localStorage, which is empty until you upload a sheet. Visit `/career-talks/upload`, pick a `.xlsx` or `.csv` file with the expected columns, hit Save, then go back to `/career-talks` and the cards appear.

**Q: Where does the upload sheet get its column names from?**
A: `Title`, `Short Description`, `Long Description`, `Company`, `Date of Podcast`, `Timings`, `Keywords`, `Image URL`, `Youtube URL`. These are defined in `src/app/lib/career-talks/parseSheet.ts`.

**Q: Light mode toggle does nothing on `/events` or `/jobs` — bug?**
A: Not a bug. By design (`ThemeContext.tsx → isLightThemeAllowed`), light mode only applies on `/career-talks` routes. Every other page stays dark.

**Q: I refreshed in light mode and saw a 1-frame dark flash.**
A: That shouldn't happen — there's a synchronous pre-hydration script in `layout.tsx` that stamps `data-theme="light"` on `<html>` before first paint. If you see a flash, check that script is still present and that the user is actually on `/career-talks` (it only runs for those routes).

**Q: I integrated into the target project and got two navbars.**
A: See Step 6 above — remove the `<Navbar />` line from each career-talks page if the target's layout already renders one globally.

**Q: Does this bundle affect the target project at all when I run the demo?**
A: No. It's a completely isolated Next.js app in its own folder with its own `node_modules`, its own port (3000), and its own dev server. Running it doesn't touch the target project's files.

---

## 9. Dependencies — what `npm install` actually installs

Production dependencies (`package.json → dependencies`):

| Package | Version | Why |
|---|---|---|
| `next` | 16.2.2 | The framework |
| `react`, `react-dom` | 19.2.4 | React 19 |
| `sonner` | ^2.0.7 | Toast notifications (theme change, save confirmations) |
| `xlsx` | ^0.18.5 | Spreadsheet parser for the temporary upload page — delete with the upload page |
| `@fortawesome/fontawesome-free` | ^7.2.0 | Font Awesome icons used in card play buttons, video heading, modal close, etc. |
| `bootstrap` | ^5.3.8 | Only `bootstrap-grid.min.css` is imported in `globals.css` for responsive grid utilities |

Dev dependencies are the standard Next.js + TypeScript + Tailwind 4 + ESLint set — nothing custom.

---

## 10. Questions / handover contact

If anything in the listing, details, or data layer behaves unexpectedly during integration, ping the author of this handover. Navbar / Auth / Theme integration is the senior's existing code path — no changes needed there beyond the 1-line nav-link entry in Step 4.
