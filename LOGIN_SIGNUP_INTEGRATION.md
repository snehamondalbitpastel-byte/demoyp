# Login + Signup APIs — copy/paste ready

Just the API plumbing. No BroadcastChannel, no AuthContext, no stepper. Drop these files into your Next.js (App Router) project, set `BACKEND_URL`, and call from anywhere.

---

## Setup

`.env.local`:
```bash
BACKEND_URL=https://your-backend.example.com
```

File structure to create:
```
src/app/
├── api/auth/
│   ├── signup/route.ts
│   ├── verify-otp/route.ts
│   ├── login/route.ts
│   ├── token/refresh/route.ts
│   ├── resend-otp/route.ts
│   └── logout/route.ts
└── lib/
    ├── config.ts
    └── auth/
        ├── types.ts
        ├── endpoints.ts
        ├── proxy.ts
        ├── client.ts
        └── api.ts
```

---

## 1. `lib/config.ts`

```ts
export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error("Missing BACKEND_URL env var.");
  return url.replace(/\/$/, "");
}
```

---

## 2. `lib/auth/types.ts`

```ts
export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  profile_image_url: string | null;
  is_2fa_enabled: boolean;
  status: string;
}

export type OtpPurpose = "SIGNUP" | "TWO_FACTOR" | "FORGOT_PASSWORD";

export interface SignupRequest {
  signup_type: "system" | "social";
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}
export interface SignupResponse { verification_status: boolean; user: AuthUser; }

export interface VerifyOtpRequest { purpose: OtpPurpose; user_id: string; otp: string; }
export interface VerifyOtpResponse {
  verification_status: boolean;
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface LoginRequest {
  login_type: "system" | "social";
  identifier: "email" | "phone" | "username";
  value: string;
  password: string;
}
export interface LoginResponse {
  verification_status: boolean;
  user: Pick<AuthUser, "id"> & Partial<AuthUser>;
}

export interface ResendOtpRequest {
  purpose: OtpPurpose;
  identifier: "email" | "phone";
  value: string;
  user_id: string;
}

export interface ApiEnvelope<T> { status: "OK" | "ERROR"; message: string; data: T; }

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}
```

---

## 3. `lib/auth/endpoints.ts`

```ts
// Local Next.js proxy routes (what your client calls)
export const authEndpoints = {
  signup:        "/api/auth/signup",
  verifyOtp:     "/api/auth/verify-otp",
  login:         "/api/auth/login",
  logout:        "/api/auth/logout",
  refreshToken:  "/api/auth/token/refresh",
  resendOtp:     "/api/auth/resend-otp",
} as const;

// Real backend paths (adjust if your backend differs)
export const backendPaths = {
  signup:        "/api/mobile/auth/signup",
  verifyOtp:     "/api/mobile/auth/verify-otp",
  login:         "/api/mobile/auth/login",
  logout:        "/api/mobile/auth/logout",
  refreshToken:  "/api/mobile/auth/token/refresh",
  resendOtp:     "/api/mobile/auth/resend-otp",
} as const;
```

---

## 4. `lib/auth/proxy.ts` (server-side helper)

```ts
import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../config";

const IS_PROD = process.env.NODE_ENV === "production";

interface ProxyOptions {
  /** Extract access_token / refresh_token from response body → set as HttpOnly cookies. */
  setTokensFromBody?: boolean;
}

export async function proxyAuthRequest(
  req: NextRequest,
  backendPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const targetUrl = `${getBackendUrl()}${backendPath}`;
  const bodyText = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) headers.Cookie = cookieHeader;

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyText || undefined,
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json(
      { status: "ERROR", message: `Upstream failed: ${(err as Error).message}`, data: null },
      { status: 502 }
    );
  }

  const responseText = await backendRes.text();
  const response = new NextResponse(responseText || null, {
    status: backendRes.status,
    headers: { "Content-Type": backendRes.headers.get("content-type") ?? "application/json" },
  });

  if (options.setTokensFromBody && responseText && backendRes.ok) {
    try {
      const parsed = JSON.parse(responseText) as {
        status?: string;
        data?: { access_token?: string; refresh_token?: string };
      };
      if (parsed?.status === "OK" && parsed.data) {
        if (typeof parsed.data.access_token === "string") {
          response.cookies.set("access_token", parsed.data.access_token, {
            httpOnly: true, secure: IS_PROD, sameSite: "lax", path: "/",
          });
        }
        if (typeof parsed.data.refresh_token === "string") {
          response.cookies.set("refresh_token", parsed.data.refresh_token, {
            httpOnly: true, secure: IS_PROD, sameSite: "lax", path: "/",
          });
        }
      }
    } catch { /* not JSON */ }
  }

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
  return response;
}
```

---

## 5. Proxy routes — `app/api/auth/*/route.ts`

```ts
// app/api/auth/signup/route.ts
import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, backendPaths.signup);
}
```

```ts
// app/api/auth/verify-otp/route.ts
import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, backendPaths.verifyOtp, { setTokensFromBody: true });
}
```

```ts
// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, backendPaths.login, { setTokensFromBody: true });
}
```

```ts
// app/api/auth/token/refresh/route.ts
import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, backendPaths.refreshToken, { setTokensFromBody: true });
}
```

```ts
// app/api/auth/resend-otp/route.ts
import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, backendPaths.resendOtp);
}
```

```ts
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { proxyAuthRequest, clearAuthCookies } from "@/app/lib/auth/proxy";
import { backendPaths } from "@/app/lib/auth/endpoints";
export async function POST(req: NextRequest) {
  try { await proxyAuthRequest(req, backendPaths.logout); } catch { /* ignore */ }
  return clearAuthCookies(NextResponse.json({ status: "OK", message: "Logged out", data: null }));
}
```

---

## 6. `lib/auth/client.ts` (browser fetch wrapper)

```ts
import { authEndpoints } from "./endpoints";
import { ApiEnvelope, ApiError } from "./types";

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(authEndpoints.refreshToken, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch { return false; }
    finally { setTimeout(() => { refreshInFlight = null; }, 0); }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit & { skipAuthRefresh?: boolean } = {}): Promise<T> {
  const { skipAuthRefresh, ...rest } = init;
  const fetchInit: RequestInit = {
    credentials: "include",
    headers: { Accept: "application/json", ...rest.headers },
    ...rest,
  };

  let res: Response;
  try { res = await fetch(path, fetchInit); }
  catch (err) { throw new ApiError((err as Error).message || "Network error", 0); }

  if (res.status === 401 && !skipAuthRefresh) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, { ...init, skipAuthRefresh: true });
  }

  const text = await res.text();
  let json: ApiEnvelope<T> | null = null;
  if (text) { try { json = JSON.parse(text); } catch { /* */ } }

  if (!res.ok) throw new ApiError(json?.message || `HTTP ${res.status}`, res.status, json?.data);
  if (!json) throw new ApiError("Empty response", res.status);
  if (json.status !== "OK") throw new ApiError(json.message || "Request failed", res.status, json.data);
  return json.data;
}

export const apiClient = {
  post: <T>(path: string, body?: unknown, opts?: RequestInit & { skipAuthRefresh?: boolean }) =>
    request<T>(path, {
      ...opts,
      method: "POST",
      headers: { "Content-Type": "application/json", ...opts?.headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  get: <T>(path: string, opts?: RequestInit & { skipAuthRefresh?: boolean }) =>
    request<T>(path, { ...opts, method: "GET" }),
};
```

---

## 7. `lib/auth/api.ts` (the API you actually call)

```ts
import { apiClient } from "./client";
import { authEndpoints } from "./endpoints";
import type {
  SignupRequest, SignupResponse,
  VerifyOtpRequest, VerifyOtpResponse,
  LoginRequest, LoginResponse,
  ResendOtpRequest,
} from "./types";

export const authApi = {
  signup: (body: SignupRequest) =>
    apiClient.post<SignupResponse>(authEndpoints.signup, body, { skipAuthRefresh: true }),

  verifyOtp: (body: VerifyOtpRequest) =>
    apiClient.post<VerifyOtpResponse>(authEndpoints.verifyOtp, body, { skipAuthRefresh: true }),

  login: (body: LoginRequest) =>
    apiClient.post<LoginResponse>(authEndpoints.login, body, { skipAuthRefresh: true }),

  resendOtp: (body: ResendOtpRequest) =>
    apiClient.post<{ verification_status: boolean }>(authEndpoints.resendOtp, body, { skipAuthRefresh: true }),

  logout: () =>
    apiClient.post<null>(authEndpoints.logout, {}, { skipAuthRefresh: true }),
};
```

---

## Usage

```ts
import { authApi } from "@/app/lib/auth/api";

// Signup
const { user } = await authApi.signup({
  signup_type: "system",
  first_name: "Sneha", last_name: "Mondal",
  email: "sneha@example.com", password: "secret123",
});

// Verify OTP (sets HttpOnly cookies via the proxy)
await authApi.verifyOtp({ purpose: "SIGNUP", user_id: user.id, otp: "123456" });

// Login
await authApi.login({
  login_type: "system", identifier: "email",
  value: "sneha@example.com", password: "secret123",
});

// Logout
await authApi.logout();
```

Tokens stay in HttpOnly cookies (JS can't read them) — they auto-attach on every request because `credentials: "include"` is wired in the client.

---

# Cross-tab logout sync (BroadcastChannel)

Add this on top of the APIs above and you get: **log out in one tab → all other tabs auto-redirect to `/auth/login`**. The tabs stay open (browsers don't let JS close user-opened tabs); only the session is cleared everywhere.

**Stack:** native `BroadcastChannel` Web API + React `useEffect` + Next.js App Router. No library, no server, ~30 lines of new code.

Add 2 more files:

```
src/app/
├── lib/auth/broadcast.ts            ← NEW: walkie-talkie singleton
└── context/AuthContext.tsx          ← NEW: holds user + subscribes to channel
```

---

## 8. `lib/auth/broadcast.ts`

```ts
"use client";

// Same-origin tab-to-tab messaging. Every tab on this origin that
// subscribes to "yp-auth" receives every message posted on it (except
// the sender — that's the built-in behaviour of BroadcastChannel).

const CHANNEL_NAME = "yp-auth";

export type AuthBroadcast =
  | { type: "LOGIN"; userId: string }
  | { type: "LOGOUT" };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;          // SSR guard
  if (typeof BroadcastChannel === "undefined") return null; // very old browsers
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastAuth(msg: AuthBroadcast): void {
  getChannel()?.postMessage(msg);
}

export function subscribeAuth(handler: (msg: AuthBroadcast) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (event: MessageEvent<AuthBroadcast>) => handler(event.data);
  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}
```

---

## 9. `context/AuthContext.tsx`

```tsx
"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/app/lib/auth/api";
import { broadcastAuth, subscribeAuth } from "@/app/lib/auth/broadcast";
import type { AuthUser, LoginRequest } from "@/app/lib/auth/types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (creds: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  // ── login: call the YP API, set state, broadcast to other tabs ──
  const login = useCallback(async (creds: LoginRequest) => {
    const data = await authApi.login(creds);
    if (data.user && "email" in data.user) {
      setUser(data.user as AuthUser);
      broadcastAuth({ type: "LOGIN", userId: data.user.id! });
    }
  }, []);

  // ── logout: API call + clear state + broadcast + redirect ──
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* still clear locally */ }
    setUser(null);
    broadcastAuth({ type: "LOGOUT" });
    router.push("/auth/login");
  }, [router]);

  // ── subscribe to messages from OTHER tabs ──
  // When another tab logs out, this tab clears its state and redirects.
  useEffect(() => {
    const unsubscribe = subscribeAuth((msg) => {
      if (msg.type === "LOGOUT") {
        setUser(null);
        router.push("/auth/login");
      }
      // (LOGIN events: optional — you can refetch profile here if you
      // want this tab to immediately reflect the new user.)
    });
    return unsubscribe;
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, setUser }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

---

## 10. Wire `AuthProvider` into `app/layout.tsx`

```tsx
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## 11. Updated usage — login button, logout button

```tsx
"use client";
import { useAuth } from "@/app/context/AuthContext";

export function LoginButton() {
  const { login } = useAuth();
  return (
    <button onClick={() => login({
      login_type: "system", identifier: "email",
      value: "sneha@example.com", password: "secret123",
    })}>
      Log in
    </button>
  );
}

export function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={logout}>Log out</button>;
}
```

Your existing buttons stay almost identical — just call `useAuth().login(...)` and `useAuth().logout()`. The context handles the API call, the React state, the broadcast, and the redirect — all in one place.

---

## How to test it

1. Run `npm run dev`.
2. Open `http://localhost:3000/auth/login` in **Tab 1** and **Tab 2** (same browser, same hostname).
3. Log in via Tab 1. Both tabs now hold the same HttpOnly cookies (cookies are per-origin, shared across tabs).
4. Click **Log out** in Tab 1.
   - ✅ Tab 1 redirects to `/auth/login`.
   - ✅ Tab 2 receives the `LOGOUT` broadcast within ~10ms, clears state, redirects to `/auth/login`.
   - ✅ Both tabs stay **open**, both on the login page.

**To debug:** open Chrome DevTools → Application tab → Background services → Broadcast Channel. You'll see live messages on the `yp-auth` channel.

---

## Why this is the latest Next.js + React approach

| Piece | Doc reference | Status |
|---|---|---|
| `"use client"` | Next.js App Router | ✅ Current |
| `useRouter from "next/navigation"` | Next.js App Router | ✅ Current (NOT old `next/router`) |
| Route Handlers (`app/api/.../route.ts`) | Next.js docs | ✅ Current (NOT `pages/api/`) |
| HttpOnly cookies via `response.cookies.set` | Next.js docs | ✅ Current (NOT localStorage tokens) |
| React Context + `useEffect` | React docs | ✅ Stable |
| `BroadcastChannel` API | MDN (Web Platform) | ✅ Universal browser support |

No deprecated APIs, no experimental hooks, no third-party libs.

---

## Quick checklist

- [ ] `BACKEND_URL` in `.env.local`
- [ ] 6 route files under `app/api/auth/`
- [ ] 5 lib files under `app/lib/`
- [ ] `lib/auth/broadcast.ts` added
- [ ] `context/AuthContext.tsx` added
- [ ] `<AuthProvider>` wraps `{children}` in `app/layout.tsx`
- [ ] Login + logout buttons call `useAuth().login(...)` / `useAuth().logout()`
- [ ] Restart `npm run dev` after adding `BACKEND_URL`
- [ ] Test: open 2 tabs → log in → log out in one → other auto-redirects ✅
