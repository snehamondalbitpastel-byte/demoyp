# Resources Module — Handover Bundle

A **standalone, runnable** copy of the **Resources** feature (list page + detail page + navbar) from the Young Pro app.
It runs on its own with **real backend data** — no `.env` setup and no login required.

---

## 1. Quick start (run it)

```bash
cd resources-handover
npm install
npm run dev
```

Open **http://localhost:3000** → it redirects to **/resources** and loads **real data** from the live backend.

> Production build instead: `npm run build` then `npm run start`.

**Requirements:** Node 18+ and npm.

---

## 2. What you get

| Page | Route | Status |
|------|-------|--------|
| Resources list | `/resources` | ✅ real API data |
| Resource detail | `/resources/[id]` | ✅ real API data (video / audio / PDF / image) |

- **Navbar:** Home · Company · Jobs · Events · Resources — **only Resources is clickable** in this demo. The profile circle (top-right) has **only Light / Dark** theme toggle.
- **Mini-profile (left card):** a **static stub** ("Sneha Mondal") — see §5.
- **Light / Dark mode:** toggle from the profile circle; the whole page switches theme.

---

## 3. How the data works (important)

- All Resources data is fetched from **real API endpoints** — no mock data.
- Flow: **page → `resources/lib/api.ts` (fetch) → local proxy routes `/api/mobile/resources/*` → live backend**.
- The Resources endpoints are **public (no login / no token needed)**, so it just works.
- The backend URL is already built in (`src/app/lib/config.ts` → `https://admin.youngprofessionals.global`).
  To point at a different backend, set `BACKEND_URL` in a `.env.local` file (env wins over the default).

> Note: `/api/mobile/profile` does need login, so it returns 500 in the console — **this is harmless**; the mini-profile stays as the static stub by design.

---

## 4. Folder structure

```
resources-handover/
├─ package.json, next.config.ts, tsconfig.json …   ← config (demo only)
├─ .env.example                                     ← optional BACKEND_URL override
├─ src/app/
│  ├─ layout.tsx                                    ← providers + fonts (demo only)
│  ├─ page.tsx                                      ← redirects / → /resources (demo only)
│  ├─ globals.css
│  ├─ context/
│  │  ├─ AuthContext.tsx    ← STUB (static profile)   COPY? ❌
│  │  └─ ThemeContext.tsx   ← light/dark state         COPY? ✅
│  ├─ components/
│  │  ├─ layout/Navbar/Navbar.tsx + .module.css        COPY? ❌ (demo nav)
│  │  └─ providers/ThemedToaster.tsx
│  ├─ lib/
│  │  ├─ api/types.ts       ← AuthUser type            COPY? ✅
│  │  ├─ api/proxy.ts       ← backend proxy helper      COPY? ✅
│  │  └─ config.ts          ← getBackendUrl()           COPY? ✅
│  ├─ api/mobile/
│  │  ├─ resources/{list,categories,detail}/route.ts   COPY? ✅
│  │  └─ profile/route.ts                              COPY? ✅
│  └─ resources/            ←★ THE FEATURE ★            COPY? ✅
│     ├─ page.tsx                  (list page)
│     ├─ resources.module.css
│     ├─ _chrome.module.css        (page shell styles)
│     ├─ lib/api.ts  lib/types.ts  (fetchers + types)
│     └─ [id]/page.tsx + resourceDetail.module.css   (detail page)
└─ public/assets/icons/nav/        (navbar icons)
```

---

## 5. Integrate into your real project (no confusion)

The whole feature lives in **`src/app/resources/`** plus its API routes + helpers.
Copy the **`COPY? ✅`** items into your project; skip the **`COPY? ❌`** demo-only files (your app already owns those).

### Copy these (the feature):
1. **`src/app/resources/`** — the entire folder (list + detail pages, CSS, `lib/`).
2. **`src/app/api/mobile/resources/`** and **`src/app/api/mobile/profile/`** — the proxy routes.
3. **`src/app/lib/api/proxy.ts`**, **`src/app/lib/config.ts`**, **`src/app/lib/api/types.ts`** — only if your project doesn't already have equivalents.
4. Add **one nav link** to your navbar → `Resources` → `/resources`.

### Do NOT copy (your app already has its own):
- `layout.tsx`, `page.tsx`, `globals.css`
- `context/AuthContext.tsx` → **use your real AuthContext.** The pages only read `useAuth().user` for the mini-profile and call `setUser`.
- `components/layout/Navbar/Navbar.tsx` → use your real navbar.
- `ThemeContext.tsx` / `ThemedToaster.tsx` → use yours if you have them.

### Mini-profile (the "Sneha Mondal" card)
It's a **static stub** in `context/AuthContext.tsx` so the layout renders without a login system.
- In your real project it auto-fills from **your AuthContext** — just keep the same `useAuth()` shape (`{ user, setUser }`) with fields: `first_name, last_name, full_name, role, education, study_field, location, profile_image_url`.
- To preview the **empty / skeleton** state in the demo, set the mock `user` to `null` inside `AuthContext.tsx`.

### Config check
- `src/app/lib/config.ts` has a demo default backend URL. In your real project, set `BACKEND_URL` via env instead (and remove the default if you want strict config).

---

## 6. Troubleshooting

| You see… | Why / fix |
|---|---|
| `multiple lockfiles` warning | Harmless. Only appears if you opened the folder *inside another project*. Ignore it. |
| `POST /api/mobile/profile 500` | Expected — profile needs login. Mini-profile stays static. Harmless. |
| `Failed to find font override … Alumni Sans SC` | Cosmetic Next.js font warning. Ignore. |
| White screen / stuck | Stop the server, delete the `.next` cache, restart: `rm -rf .next && npm run dev` (PowerShell: `Remove-Item -Recurse -Force .next; npm run dev`). |
| Cards don't load | Check internet (it calls the live backend). Or set `BACKEND_URL` in `.env.local`. |

---

**TL;DR:** `npm install` → `npm run dev` → real Resources UI at `/resources`.
To integrate: copy the `src/app/resources/` folder + the `api/mobile/resources` routes + `lib/` helpers into your project, and wire the mini-profile to your own AuthContext.
