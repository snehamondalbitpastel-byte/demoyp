# demoYP - Complete Codebase Analysis & Documentation

**Generated:** 2026-05-06
**Project:** Young Professionals Platform
**Framework:** Next.js 16.2.2 (App Router) + React 19 + TypeScript 5

---

## Table of Contents
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Folder Structure](#folder-structure)
- [Authentication Flow](#authentication-flow)
- [API Architecture](#api-architecture)
- [Pages & Routing](#pages--routing)
- [Components Breakdown](#components-breakdown)
- [State Management](#state-management)
- [Key Integrations](#key-integrations)
- [Complete Data Flows](#complete-data-flows)
  - [Jobs Page](#complete-data-flow-jobs-page)
  - [Company Page](#complete-data-flow-company-page)
  - [Profile Page](#complete-data-flow-profile-page)
  - [User Authentication](#example-1-user-logs-in-emailpassword)
  - [Event Booking](#example-2-user-books-an-event)
  - [Post Interaction](#example-3-user-likes-a-post-optimistic-update)
- [Important Configurations](#important-configurations)

---

# PROJECT OVERVIEW

**demoYP** is a comprehensive Next.js 16 web application for the "Young Professionals" platform - a professional networking and career development platform that combines features of LinkedIn (profiles, feeds, social interactions), job boards (job search, applications), and event management (event browsing and ticket booking with Stripe payments). The platform enables young professionals to build profiles, search for jobs, attend career events, interact with company content via a social feed, and manage their professional presence.

---

# TECHNOLOGY STACK

### **Core Framework & Runtime**
- **Next.js 16.2.2** (React 19.2.4) - App Router architecture
- **TypeScript 5** - Strict mode enabled
- **Node.js** - ES2017 target

### **Authentication & Authorization**
- **NextAuth.js v5** (Auth.js beta) - Google OAuth only
- Custom JWT-based auth system - HttpOnly cookies for email/password flows
- OTP verification system via backend

### **Payment Processing**
- **Stripe** (@stripe/react-stripe-js, @stripe/stripe-js) - Event ticket purchases

### **UI & Styling**
- **Tailwind CSS 4** - Utility-first styling
- **Bootstrap 5.3.8** - Component library
- **CSS Modules** - Component-scoped styles
- **Google Fonts** - Multiple font families (Geist, Alumni Sans, DM Sans, Plus Jakarta Sans)

### **Form Handling & Validation**
- **Zod 4.3.6** - Runtime schema validation
- **react-phone-number-input** - International phone number handling
- **react-easy-crop** - Profile image cropping

### **Additional Libraries**
- **sonner** - Toast notifications
- **react-compiler** (Babel plugin) - React 19 optimizations

---

# FOLDER STRUCTURE

```
C:\Users\Tanushri Mondal\bitpastelprojects\demoyp\
│
├── src/
│   ├── auth.ts                      # NextAuth v5 configuration (Google OAuth)
│   ├── proxy.ts                     # Next.js 16 middleware (route protection)
│   │
│   └── app/
│       ├── layout.tsx               # Root layout with providers & fonts
│       ├── page.tsx                 # Landing page (redirects to /auth)
│       ├── globals.css              # Global styles & Tailwind imports
│       │
│       ├── api/                     # Next.js API routes (proxy layer)
│       │   ├── auth/
│       │   │   └── social-complete/route.ts  # OAuth → HttpOnly cookie bridge
│       │   └── mobile/              # Backend proxy routes
│       │       ├── auth/            # Authentication endpoints (10 routes)
│       │       ├── V1/              # Profile creation & image upload (2 routes)
│       │       ├── user/            # User-specific endpoints (12 routes)
│       │       ├── feeds/           # Social feed (1 route)
│       │       ├── jobs/            # Job listings (2 routes)
│       │       ├── companies/       # Company listings (2 routes)
│       │       ├── events/          # Event listings (1 route)
│       │       └── event/           # Event booking operations (9 routes)
│       │
│       ├── auth/                    # Authentication pages
│       │   ├── page.tsx             # Login/Signup toggle page
│       │   ├── forgot-password/     # Password reset
│       │   ├── reset-password/      # New password entry
│       │   └── stepper/             # 3-step profile completion wizard
│       │
│       ├── otp/page.tsx             # OTP verification
│       ├── home/page.tsx            # Social feed (main authenticated view)
│       ├── profile/[id]/page.tsx    # User profile page
│       ├── jobs/                    # Job search & management
│       │   ├── page.tsx             # Job listings (4 tabs: All/Applied/Saved/Recommended)
│       │   └── [id]/page.tsx        # Job details
│       ├── company/                 # Company pages
│       │   ├── page.tsx             # Company listings
│       │   └── [id]/page.tsx        # Company details
│       ├── events/                  # Event pages
│       │   ├── page.tsx             # Event listings (2 tabs: All/My Bookings)
│       │   └── [id]/page.tsx        # Event details
│       ├── booking/[id]/page.tsx    # Booking details & tickets
│       ├── notifications/page.tsx   # Notifications center
│       ├── privacy-policy/page.tsx  # Privacy policy
│       │
│       ├── components/
│       │   ├── auth/                # Authentication-specific components (11 components)
│       │   ├── profile/             # Profile editing modals (7 components)
│       │   ├── feed/                # Social feed components (3 components)
│       │   ├── event/               # Event/booking components (2 components)
│       │   ├── layout/              # Navbar & layout components (1 component)
│       │   ├── ui/                  # Reusable UI primitives (7 components)
│       │   └── providers/           # React context providers (1 component)
│       │
│       ├── context/
│       │   └── AuthContext.tsx      # Global authentication state
│       │
│       └── lib/
│           ├── config.ts            # Server-side environment config
│           ├── api/
│           │   ├── client.ts        # API client with auto-refresh
│           │   ├── proxy.ts         # Server-side proxy helper
│           │   ├── endpoints.ts     # API endpoint registry
│           │   ├── types.ts         # API response types
│           │   ├── auth.ts          # Auth API wrappers
│           │   └── useApi.ts        # React hook for GET requests
│           ├── validations/
│           │   └── auth.ts          # Zod schemas for auth forms
│           └── utils/
│               └── post-text.ts     # Text preview utilities
│
├── public/
│   ├── assets/                      # Icons, images, static files
│   └── profile/                     # Default profile images
│
├── docs/                            # Documentation files
│   └── PROJECT_CODEBASE_ANALYSIS.md # This file
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── .mcp.json                        # MCP server config (Figma integration)
├── .claude/                         # Claude Code settings
├── CLAUDE.md                        # Project instructions
└── AGENTS.md                        # Agent-specific rules
```

---

# AUTHENTICATION FLOW

### **Two Parallel Auth Systems:**

#### **1. Email/Password Flow (Custom HttpOnly Cookie System)**

**Signup:**
1. User fills form on `/auth` (SignupForm component)
2. POST `/api/mobile/auth/signup` → proxies to backend
3. Backend returns user data (NO tokens yet)
4. User redirected to `/otp` with `userId` in URL params
5. User enters OTP code
6. POST `/api/mobile/auth/verify-otp` with `{user_id, otp, purpose: "SIGNUP"}`
7. **Proxy sets HttpOnly cookies**: `access_token`, `refresh_token`, `profile_completed`
8. Middleware (`src/proxy.ts`) reads `profile_completed` cookie:
   - If incomplete → redirect to `/auth/stepper`
   - If complete → allow access to `/home`

**Login:**
1. User fills form on `/auth` (LoginForm component)
2. POST `/api/mobile/auth/login` → backend validates credentials
3. If 2FA disabled: tokens returned immediately → cookies set → redirect `/home`
4. If 2FA enabled: redirect to `/otp` for verification (same as signup)

**Token Refresh (Automatic):**
- **Client-side** (`apiClient.ts`): 401 → auto-refresh → retry request once
- **Server-side proxy** (`proxy.ts`): Bearer token endpoints get 401 → refresh using HttpOnly `refresh_token` → retry original request

---

#### **2. Google OAuth Flow (NextAuth.js)**

**File:** [src/auth.ts](../src/auth.ts) (lines 1-124)

1. User clicks "Sign in with Google" (SocialLoginSection component)
2. NextAuth redirects to Google OAuth consent screen
3. Google redirects back to `/api/auth/callback/google`
4. **signIn callback** (line 27-82):
   - Calls backend `/api/mobile/auth/signup` with `signup_type: "social"`
   - Backend returns `{access_token, refresh_token, user}`
   - Tokens attached to NextAuth JWT token
5. **redirect callback** (line 107-121):
   - Redirects to `/api/auth/social-complete`
6. **Social-complete bridge** ([src/app/api/auth/social-complete/route.ts](../src/app/api/auth/social-complete/route.ts)):
   - Reads NextAuth session (server-side)
   - Extracts backend tokens from JWT
   - **Sets same HttpOnly cookies** as email/password flow
   - Redirects to `/auth/stepper` (incomplete profile) or `/home` (complete)

**Result:** Both flows end with identical HttpOnly cookie structure, so the rest of the app works the same way regardless of login method.

---

### **Protected Routes (Middleware)**

**File:** [src/proxy.ts](../src/proxy.ts) (lines 1-96)

**Rules:**
- **No `access_token` cookie** → redirect to `/auth` (except infra paths)
- **Has token + `profile_completed !== "200"`** → force `/auth/stepper`
- **Has token + profile complete** → block `/auth` routes (redirect to `/home`)

**Profile Completion Wizard** (`/auth/stepper`):
- **Step 1 (About)**: Name, email, phone, location, DOB, gender
- **Step 2 (Education)**: Institution, degree, start/end dates, skills
- **Step 3 (Photo)**: Optional profile image upload with cropping
- Final POST `/api/mobile/V1/create-profile` → sets `profile_completed: "200"`

---

# API ARCHITECTURE

### **Proxy Pattern (CORS Bypass)**

**Problem:** Backend (`admin.youngprofessionals.global`) doesn't send `Access-Control-Allow-Credentials: true`, so browsers block cross-origin cookie-based requests.

**Solution:** All client requests go to **same-origin Next.js API routes** at `/api/mobile/*`, which proxy to the real backend server-side:

**File:** [src/app/lib/api/proxy.ts](../src/app/lib/api/proxy.ts) (lines 1-351)

```typescript
export async function proxyAuthRequest(
  req: NextRequest,
  backendPath: string,
  options?: {
    setTokensFromBody?: boolean,       // Extract tokens from JSON response
    attachBearerToken?: boolean        // Add Authorization header from cookie
  }
): Promise<NextResponse>
```

**Two proxy modes:**
1. **`setTokensFromBody: true`** - For endpoints returning tokens in body (verify-otp, token/refresh):
   - Extracts `access_token`/`refresh_token` from response JSON
   - Sets them as HttpOnly cookies on NextResponse

2. **`attachBearerToken: true`** - For authenticated data endpoints:
   - Reads `access_token` from HttpOnly cookie (server-side only)
   - Injects `Authorization: Bearer <token>` header
   - Auto-refreshes on 401 (lines 116-161)

---

### **API Client (Browser)**

**File:** [src/app/lib/api/client.ts](../src/app/lib/api/client.ts) (lines 1-165)

```typescript
export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  // ... PUT, PATCH, DELETE
}
```

**Features:**
- Sends `credentials: "include"` (HttpOnly cookies auto-attached)
- Unwraps backend envelope `{ status, message, data }` → returns `data`
- Throws typed `ApiError` on non-OK responses
- **Auto-refresh on 401**: Calls `/api/mobile/auth/token/refresh` → retries original request once

---

### **API Endpoint Registry**

**File:** [src/app/lib/api/endpoints.ts](../src/app/lib/api/endpoints.ts) (lines 1-34)

Centralized path constants:
```typescript
export const endpoints = {
  auth: {
    signup: "/api/mobile/auth/signup",
    verifyOtp: "/api/mobile/auth/verify-otp",
    login: "/api/mobile/auth/login",
    refreshToken: "/api/mobile/auth/token/refresh",
    // ...
  },
  profile: { /*...*/ },
  data: { /*...*/ },
}
```

---

### **All API Routes** (48 total)

#### **Authentication Routes (10)**

| Route | Proxy Options | Purpose |
|-------|---------------|---------|
| `/api/auth/[...nextauth]/route.ts` | - | NextAuth handlers (Google OAuth) |
| `/api/auth/social-complete/route.ts` | - | OAuth → HttpOnly cookie bridge |
| `/api/mobile/auth/signup/route.ts` | - | Email/password signup (no tokens) |
| `/api/mobile/auth/login/route.ts` | - | Email/password login |
| `/api/mobile/auth/verify-otp/route.ts` | `setTokensFromBody: true` | OTP verification → tokens |
| `/api/mobile/auth/resend-otp/route.ts` | - | Resend OTP code |
| `/api/mobile/auth/token/refresh/route.ts` | `setTokensFromBody: true` | Refresh access token |
| `/api/mobile/auth/forgot-password/route.ts` | - | Send password reset OTP |
| `/api/mobile/auth/change-password/route.ts` | - | Reset password with OTP |
| `/api/mobile/auth/logout/route.ts` | `attachBearerToken: true` | Clear session |

#### **Profile Routes (6)**

| Route | Proxy Type | Purpose |
|-------|------------|---------|
| `/api/mobile/V1/create-profile/route.ts` | `proxyFormDataRequest` | Complete profile (multipart/form-data) |
| `/api/mobile/V1/upload-profile-img/route.ts` | `proxyFormDataRequest` | Update profile photo |
| `/api/mobile/profile/route.ts` | `attachBearerToken: true` | GET profile data |
| `/api/mobile/update-profile/route.ts` | `attachBearerToken: true` | Update profile fields |
| `/api/mobile/user-locations/route.ts` | `attachBearerToken: true` | GET location dropdown options |
| `/api/mobile/institutions/route.ts` | `attachBearerToken: true` | GET education dropdown options |
| `/api/mobile/skills/route.ts` | `attachBearerToken: true` | GET skills dropdown options |

#### **Social Feed Routes (6)**

| Route | Purpose |
|-------|---------|
| `/api/mobile/feeds/route.ts` | GET feed posts (with search) |
| `/api/mobile/user/feed/reaction/route.ts` | Like/unlike post |
| `/api/mobile/user/feed/share/route.ts` | Repost/unrepost post |
| `/api/mobile/user/feed/comments/route.ts` | GET post comments |
| `/api/mobile/user/feed/add-comment/route.ts` | Add comment |
| `/api/mobile/user/feed/update-comment/route.ts` | Edit/delete comment |

#### **Jobs Routes (10)**

| Route | Purpose |
|-------|---------|
| `/api/mobile/jobs/route.ts` | GET all jobs (with filters) |
| `/api/mobile/job/route.ts` | GET job details by ID |
| `/api/mobile/user/recommended-jobs/route.ts` | GET personalized job recommendations |
| `/api/mobile/user/save-job/route.ts` | Save job to list |
| `/api/mobile/user/saved-jobs/route.ts` | GET saved jobs |
| `/api/mobile/user/remove-job/route.ts` | Remove saved job |
| `/api/mobile/user/applied-jobs/route.ts` | Mark job as applied |
| `/api/mobile/user/applied-jobs-list/route.ts` | GET applied jobs history |
| `/api/mobile/user/search-filters/route.ts` | GET filter dropdown options (companies, types, locations) |
| `/api/mobile/company/similar-jobs/route.ts` | GET related jobs from same company |

#### **Company Routes (4)**

| Route | Purpose |
|-------|---------|
| `/api/mobile/companies/route.ts` | GET company listings |
| `/api/mobile/company-details/route.ts` | GET company details by ID |
| `/api/mobile/company/follow/route.ts` | Follow/unfollow company |
| `/api/mobile/user/followings/route.ts` | GET followed companies |

#### **Events & Bookings Routes (12)**

| Route | Purpose |
|-------|---------|
| `/api/mobile/events/route.ts` | GET event listings (with filters) |
| `/api/mobile/event/route.ts` | GET event details by ID |
| `/api/mobile/event/my-bookings/route.ts` | GET user's bookings |
| `/api/mobile/event/check-availability/route.ts` | Check seat availability |
| `/api/mobile/event/apply-coupon/route.ts` | Validate coupon code |
| `/api/mobile/event/create-booking/route.ts` | Create booking (free or Stripe PaymentIntent) |
| `/api/mobile/event/confirm-payment/route.ts` | Confirm Stripe payment |
| `/api/mobile/event/booking-detail/route.ts` | GET booking details (tickets) |
| `/api/mobile/event/cancel-booking/route.ts` | Cancel booking |

---

# PAGES & ROUTING

### **Public Routes**
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | [src/app/page.tsx](../src/app/page.tsx) | Landing page (redirects to `/auth`) |
| `/auth` | [src/app/auth/page.tsx](../src/app/auth/page.tsx) | Login/Signup toggle page |
| `/auth/forgot-password` | [src/app/auth/forgot-password/page.tsx](../src/app/auth/forgot-password/page.tsx) | Password reset (email entry) |
| `/auth/reset-password` | [src/app/auth/reset-password/page.tsx](../src/app/auth/reset-password/page.tsx) | New password entry (after OTP) |
| `/otp` | [src/app/otp/page.tsx](../src/app/otp/page.tsx) | OTP verification (signup/login/2FA) |
| `/privacy-policy` | [src/app/privacy-policy/page.tsx](../src/app/privacy-policy/page.tsx) | Privacy policy |

### **Protected Routes** (require `access_token`)

**Post-Login Onboarding:**
| Route | Component | Purpose |
|-------|-----------|---------|
| `/auth/stepper` | [src/app/auth/stepper/page.tsx](../src/app/auth/stepper/page.tsx) | 3-step profile wizard (forced until `profile_completed: "200"`) |

**Main App:**
| Route | Component | Purpose | Key Features |
|-------|-----------|---------|--------------|
| `/home` | [src/app/home/page.tsx](../src/app/home/page.tsx) | Social feed | • Feed posts with images/carousel<br>• Like/comment/repost actions<br>• Search posts (debounced)<br>• Recommended jobs sidebar<br>• Mini profile card |
| `/profile/[id]` | [src/app/profile/[id]/page.tsx](../src/app/profile/[id]/page.tsx) | User profile | • View/edit profile<br>• Education timeline<br>• Skills chips<br>• Profile photo cropping |
| `/jobs` | [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) | Job listings | • 4 tabs: All/Applied/Saved/Recommended<br>• Multi-select filters (location/company/type)<br>• Debounced search<br>• Apply (opens external link)<br>• Save/remove jobs |
| `/jobs/[id]` | [src/app/jobs/[id]/page.tsx](../src/app/jobs/[id]/page.tsx) | Job details | • Full description<br>• Company info<br>• Similar jobs<br>• Apply button |
| `/company` | [src/app/company/page.tsx](../src/app/company/page.tsx) | Company listings | • Search companies<br>• Filter by location/industry |
| `/company/[id]` | [src/app/company/[id]/page.tsx](../src/app/company/[id]/page.tsx) | Company profile | • Company jobs<br>• Follow/unfollow<br>• Company feed posts |
| `/events` | [src/app/events/page.tsx](../src/app/events/page.tsx) | Event listings | • 2 tabs: All Events / My Bookings<br>• Filters: company/type/price<br>• Free vs paid events<br>• Booking status chips |
| `/events/[id]` | [src/app/events/[id]/page.tsx](../src/app/events/[id]/page.tsx) | Event details | • Event info/gallery<br>• Seat selection<br>• Coupon codes<br>• Stripe checkout for paid events |
| `/booking/[id]` | [src/app/booking/[id]/page.tsx](../src/app/booking/[id]/page.tsx) | Booking details | • QR code tickets<br>• Booking status<br>• Cancel booking |
| `/notifications` | [src/app/notifications/page.tsx](../src/app/notifications/page.tsx) | Notifications | • Notification feed |

---

# COMPONENTS BREAKDOWN

### **Reusable UI Components** (`src/app/components/ui/`)
| Component | File | Purpose |
|-----------|------|---------|
| `Button` | [Button.tsx](../src/app/components/ui/Button/Button.tsx) | Primary/secondary button variants |
| `SocialButton` | [SocialButton.tsx](../src/app/components/ui/SocialButton/SocialButton.tsx) | Google/Facebook OAuth buttons |
| `InputField` | [InputField.tsx](../src/app/components/ui/InputField/InputField.tsx) | Text input with label & error state |
| `SelectField` | [SelectField.tsx](../src/app/components/ui/SelectField/SelectField.tsx) | Dropdown select with label |
| `PhoneInputField` | [PhoneInputField.tsx](../src/app/components/ui/PhoneInputField/PhoneInputField.tsx) | International phone input (`react-phone-number-input`) |
| `DatePicker` | [DatePicker.tsx](../src/app/components/ui/DatePicker/DatePicker.tsx) | Date selection (DD/MM/YYYY) |
| `BgGlow` | [BgGlow.tsx](../src/app/components/ui/BgGlow.tsx) | Animated background gradient (auth pages) |

---

### **Auth-Specific Components** (`src/app/components/auth/`)
| Component | File | Purpose | Used In |
|-----------|------|---------|---------|
| `AuthCard` | [AuthCard.tsx](../src/app/components/auth/AuthCard/AuthCard.tsx) | Centered card container | All `/auth` pages |
| `LoginForm` | [LoginForm.tsx](../src/app/components/auth/LoginForm/LoginForm.tsx) | Email/password login form | `/auth` page |
| `SignupForm` | [SignupForm.tsx](../src/app/components/auth/SignupForm/SignupForm.tsx) | Email/password signup form | `/auth` page |
| `OtpForm` | [OtpForm.tsx](../src/app/components/auth/OtpForm/OtpForm.tsx) | 6-digit OTP input | `/otp` page |
| `ForgotPasswordForm` | [ForgotPasswordForm.tsx](../src/app/components/auth/ForgotPasswordForm/ForgotPasswordForm.tsx) | Email entry for password reset | `/auth/forgot-password` |
| `ResetPasswordForm` | [ResetPasswordForm.tsx](../src/app/components/auth/ResetPasswordForm/ResetPasswordForm.tsx) | New password entry | `/auth/reset-password` |
| `SocialLoginSection` | [SocialLoginSection.tsx](../src/app/components/auth/SocialLoginSection/SocialLoginSection.tsx) | Google/Facebook OAuth buttons | Login/Signup forms |
| `CompleteProfilePopup` | [CompleteProfilePopup.tsx](../src/app/components/auth/CompleteProfilePopup/CompleteProfilePopup.tsx) | Post-OAuth profile completion prompt | Social login success |
| `StepperHeader` | [StepperHeader.tsx](../src/app/components/auth/StepperHeader/StepperHeader.tsx) | 3-step progress indicator | `/auth/stepper` |
| `AboutForm` | [AboutForm.tsx](../src/app/components/auth/AboutForm/AboutForm.tsx) | Step 1: Personal info | `/auth/stepper` |
| `EducationForm` | [EducationForm.tsx](../src/app/components/auth/EducationForm/EducationForm.tsx) | Step 2: Education & skills | `/auth/stepper` |
| `ProfileImageForm` | [ProfileImageForm.tsx](../src/app/components/auth/ProfileImageForm/ProfileImageForm.tsx) | Step 3: Photo upload with cropping | `/auth/stepper` |

---

### **Profile Components** (`src/app/components/profile/`)
| Component | File | Purpose |
|-----------|------|---------|
| `EditAboutModal` | [EditAboutModal.tsx](../src/app/components/profile/EditAboutModal/EditAboutModal.tsx) | Edit name, location, DOB, gender |
| `EditEducationModal` | [EditEducationModal.tsx](../src/app/components/profile/EditEducationModal/EditEducationModal.tsx) | Edit education timeline |
| `EditSkillsModal` | [EditSkillsModal.tsx](../src/app/components/profile/EditSkillsModal/EditSkillsModal.tsx) | Manage skills chips |
| `EditProfileInfoModal` | [EditProfileInfoModal.tsx](../src/app/components/profile/EditProfileInfoModal/EditProfileInfoModal.tsx) | Edit bio/headline |
| `UploadPhotoModal` | [UploadPhotoModal.tsx](../src/app/components/profile/UploadPhotoModal/UploadPhotoModal.tsx) | Upload & crop profile photo (`react-easy-crop`) |
| `ImagePreviewModal` | [ImagePreviewModal.tsx](../src/app/components/profile/ImagePreviewModal/ImagePreviewModal.tsx) | View full-size profile photo |
| `ConfirmDialog` | [ConfirmDialog.tsx](../src/app/components/profile/ConfirmDialog/ConfirmDialog.tsx) | Generic confirmation modal (delete/remove actions) |

---

### **Feed Components** (`src/app/components/feed/`)
| Component | File | Purpose |
|-----------|------|---------|
| `ImageCarousel` | [ImageCarousel.tsx](../src/app/components/feed/ImageCarousel/ImageCarousel.tsx) | Multi-image post carousel (mobile/tablet) |
| `PostImageModal` | [PostImageModal.tsx](../src/app/components/feed/PostImageModal/PostImageModal.tsx) | Full-screen image viewer with like/comment |
| `CommentSection` | [CommentSection.tsx](../src/app/components/feed/CommentSection/CommentSection.tsx) | Inline comment thread (lazy-loaded) |

---

### **Event Components** (`src/app/components/event/`)
| Component | File | Purpose |
|-----------|------|---------|
| `BookingConfirmDialog` | [BookingConfirmDialog.tsx](../src/app/components/event/BookingConfirmDialog/BookingConfirmDialog.tsx) | Confirm seat selection |
| `PaymentModal` | [PaymentModal.tsx](../src/app/components/event/PaymentModal/PaymentModal.tsx) | Stripe PaymentElement wrapper |

---

### **Layout Components** (`src/app/components/layout/`)
| Component | File | Purpose |
|-----------|------|---------|
| `Navbar` | [Navbar.tsx](../src/app/components/layout/Navbar/Navbar.tsx) | Top navigation bar (profile dropdown, notifications, logout) |

---

### **Providers** (`src/app/components/providers/`)
| Component | File | Purpose |
|-----------|------|---------|
| `SessionWrapper` | [SessionWrapper.tsx](../src/app/components/providers/SessionWrapper.tsx) | NextAuth SessionProvider wrapper (for OAuth) |

---

### **Component Reusability Patterns**

**Example: Mini Profile Card**
- **Used in:** `/home`, `/jobs`, `/company`, `/events`
- **Data source:** `AuthContext.user` (shared across all pages)
- **Deleted image handling:** All pages read `localStorage["deletedProfileImageUrl"]` to suppress recently-deleted avatars

**Example: Job Cards**
- **Shared logic:**
  - Save/Remove job → `savedJobIds` Set
  - Apply job → `appliedJobIds` Set (one-way, no undo)
  - Opening external job link (`window.open(jobLink, "_blank")`)
- **Used in:**
  - Left sidebar recommended jobs (home/jobs pages)
  - Right panel listings (jobs page)
  - Company detail similar jobs

**Example: Skeletons**
- All pages use shimmer skeletons during initial fetch
- Reuse home module's `.skeleton`, `.skelLine`, `.skelName` classes for consistent animation

---

# STATE MANAGEMENT

### **Global State (React Context)**

**File:** [src/app/context/AuthContext.tsx](../src/app/context/AuthContext.tsx) (lines 1-62)

```typescript
interface AuthContextValue {
  user: AuthUser | null;           // Profile data from /api/mobile/profile
  isAuthenticated: boolean;        // Derived: user !== null
  setUser: (user: AuthUser | null) => void;
  logout: () => void;              // Clears user state (cookies cleared by /api/mobile/auth/logout)
}
```

**Provider:** Wraps entire app in `layout.tsx`
**Consumer:** `useAuth()` hook used in all protected pages

---

### **Session State (NextAuth)**

**File:** [src/app/components/providers/SessionWrapper.tsx](../src/app/components/providers/SessionWrapper.tsx) (lines 1-15)

- Only active during OAuth flows
- Session stores backend tokens temporarily until social-complete extracts them
- Not used for email/password auth

---

### **Local Component State Patterns**

**1. Optimistic Updates:**
```typescript
// Home page - Like post
const toggleLike = (postId) => {
  const wasLiked = post.isLiked;
  setPosts(prev => prev.map(p => p.id === postId
    ? { ...p, isLiked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) }
    : p
  ));
  // Then POST /api/mobile/user/feed/reaction
  // On failure: revert (setPosts with old values)
}
```

**2. Debounced Search (400ms, ≥2 chars):**
```typescript
const [searchText, setSearchText] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const trimmed = searchText.trim();
  if (trimmed.length === 1) return; // Skip 1-char queries
  const t = setTimeout(() => setDebouncedSearch(trimmed), 400);
  return () => clearTimeout(t);
}, [searchText]);

// API fetch effect depends on debouncedSearch, not searchText
```

**3. Multi-Select Filters (Jobs/Events):**
```typescript
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
const toggleLocation = (loc: string) => {
  setSelectedLocations(prev =>
    prev.includes(loc) ? prev.filter(v => v !== loc) : [...prev, loc]
  );
};
// API body: { job_location: selectedLocations.join(",") }
```

**4. Lazy Loading (Comments):**
```typescript
const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
// CommentSection only mounts when postId === openCommentsPostId
// Prevents fetching comments for ALL posts on page load
```

---

# KEY INTEGRATIONS

### **1. NextAuth.js (Google OAuth)**

**Setup:** [src/auth.ts](../src/auth.ts)

**Providers:**
- Google (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

**Callbacks:**
- **signIn:** Registers social user on backend, attaches tokens to JWT
- **jwt:** Copies backend tokens from user → token
- **session:** Exposes tokens in session for social-complete route
- **redirect:** Always routes OAuth callbacks through `/api/auth/social-complete`

**Key Environment Variables:**
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...  # Random string for JWT signing
BACKEND_URL=https://admin.youngprofessionals.global
```

---

### **2. Stripe Payment Integration**

**Packages:**
- `@stripe/stripe-js` - Client-side Stripe.js loader
- `@stripe/react-stripe-js` - React components (Elements, PaymentElement)

**Flow (Event Bookings):**
1. User selects seats on `/events/[id]`
2. POST `/api/mobile/event/create-booking` with `{event_id, num_seats, coupon_code?}`
3. Backend response:
   - **Free event:** `booking_status: "confirmed"` → Done
   - **Paid event:** Returns `{client_secret, booking_id, amount}`
4. Open PaymentModal with Stripe Elements
5. User enters card details → Stripe PaymentElement
6. On submit: `stripe.confirmPayment({clientSecret})`
7. POST `/api/mobile/event/confirm-payment` with `{booking_id, payment_intent_id}`
8. Backend confirms → `booking_status: "paid"`

**Component:** [src/app/components/event/PaymentModal/PaymentModal.tsx](../src/app/components/event/PaymentModal/PaymentModal.tsx)

---

### **3. Social Login (Google)**

**Component:** [SocialLoginSection.tsx](../src/app/components/auth/SocialLoginSection/SocialLoginSection.tsx)

**Button Click:**
```typescript
import { signIn } from "next-auth/react";

<button onClick={() => signIn("google")}>
  Sign in with Google
</button>
```

**Post-Login Bridge:**
- NextAuth redirects to `/api/auth/social-complete` (GET handler)
- Reads `access_token`/`refresh_token` from NextAuth session
- Sets HttpOnly cookies
- Redirects to `/auth/stepper` or `/home`

---

### **4. OTP Verification**

**Flow:**
1. User signup → backend sends SMS/Email OTP
2. Redirect to `/otp?userId=...&purpose=SIGNUP`
3. OtpForm displays 6-digit input
4. POST `/api/mobile/auth/verify-otp` with `{user_id, otp, purpose}`
5. Proxy sets `access_token`, `refresh_token`, `profile_completed` cookies
6. Redirect to stepper or home

**Component:** [src/app/components/auth/OtpForm/OtpForm.tsx](../src/app/components/auth/OtpForm/OtpForm.tsx)

---

### **5. Image Upload & Cropping**

**Library:** `react-easy-crop`

**Components:**
- [ProfileImageForm.tsx](../src/app/components/auth/ProfileImageForm/ProfileImageForm.tsx) - Initial upload during stepper
- [UploadPhotoModal.tsx](../src/app/components/profile/UploadPhotoModal/UploadPhotoModal.tsx) - Update existing photo from profile page

**Flow:**
1. User selects file → FileReader preview
2. Drag to position, pinch/scroll to zoom
3. Get cropped area pixels: `getCroppedImg(imageSrc, croppedAreaPixels)`
4. Convert canvas → Blob → File
5. Append to FormData
6. POST `/api/mobile/V1/upload-profile-img` (multipart/form-data)

---

# COMPLETE DATA FLOWS

## COMPLETE DATA FLOW: JOBS PAGE

### Page Structure

**File:** [src/app/jobs/page.tsx](../src/app/jobs/page.tsx)

#### Layout Components
- **Left Column:**
  - Mini-profile card (avatar, name, role, location)
  - Stats box with 4 clickable rows: All Jobs (N), Applied Jobs (N), Saved Jobs (N), Recommended (N)
  - Recommended Jobs collapsible card (left-column compact cards)

- **Right Column:**
  - Page title (changes based on view mode)
  - Search bar with debounce (400ms, ≥2 characters)
  - Filter sliders icon (toggles filter row)
  - Filter chips row (Location, Company, Employment Type - all multi-select)
  - "Clear All" button (appears when filters active)
  - Job listings (scrollable area)

#### Tabs/View Modes
Four view modes controlled by `ViewMode` type (lines 274-275):
- `"all"` - All jobs with search/filters
- `"saved"` - User's saved jobs
- `"applied"` - User's applied jobs
- `"recommended"` - Algorithm-recommended jobs

### State Management

#### Core State Variables (lines 434-533)

```typescript
// Jobs data
const [jobs, setJobs] = useState<Job[] | null>(null); // Left column recommended jobs
const [jobsError, setJobsError] = useState<string | null>(null);

// Search & filters
const [searchText, setSearchText] = useState(""); // Live input
const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounced query
const [filtersOpen, setFiltersOpen] = useState(false); // Filter row visibility
const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null); // Dropdown options

// Multi-select filter selections (arrays of values)
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
const [selectedCompanyNames, setSelectedCompanyNames] = useState<string[]>([]);
const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([]);

// Per-dropdown search text
const [locationFilterText, setLocationFilterText] = useState("");
const [companyFilterText, setCompanyFilterText] = useState("");
const [employmentFilterText, setEmploymentFilterText] = useState("");
const [openFilterDropdown, setOpenFilterDropdown] = useState<"location" | "company" | "employment" | null>(null);

// Right panel listings
const [listings, setListings] = useState<Listing[] | null>(null);
const [listingsError, setListingsError] = useState<string | null>(null);
const [viewMode, setViewMode] = useState<ViewMode>("all");

// Save/Apply tracking sets
const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

// In-flight request tracking
const [savingJobId, setSavingJobId] = useState<string | null>(null);
const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

// Totals for stats counters
const [recommendedTotal, setRecommendedTotal] = useState<number>(0);
const [allJobsTotal, setAllJobsTotal] = useState<number>(0);

// Remove confirmation dialog
const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
const [removing, setRemoving] = useState(false);
```

#### Derived State (lines 1182-1250)

```typescript
// Client-side filtering for saved/applied/recommended tabs
const visibleListings = (() => {
  if (listings === null) return null;
  if (viewMode === "all") return listings; // Server-filtered

  let filtered = listings;
  // Search filter (debounced, ≥2 chars)
  if (listingsSearchQuery) {
    filtered = filtered.filter(l =>
      l.title.toLowerCase().includes(listingsSearchQuery) ||
      l.company.toLowerCase().includes(listingsSearchQuery) ||
      l.locations.some(loc => loc.toLowerCase().includes(listingsSearchQuery))
    );
  }
  // Location multi-select
  if (selectedLocations.length > 0) {
    const wanted = new Set(selectedLocations);
    filtered = filtered.filter(l => l.locations.some(loc => wanted.has(loc)));
  }
  // Company multi-select
  if (selectedCompanyNames.length > 0) {
    const wanted = new Set(selectedCompanyNames);
    filtered = filtered.filter(l => wanted.has(l.company));
  }
  // Employment Type multi-select
  if (selectedEmploymentTypes.length > 0) {
    const wanted = new Set(selectedEmploymentTypes.map(t => t.toLowerCase()));
    filtered = filtered.filter(l =>
      l.employmentTypes.some(t => wanted.has(t.toLowerCase()))
    );
  }
  return filtered;
})();
```

### API Integration

#### Endpoints & Triggers

1. **Profile Seed** (lines 548-570)
   - **Endpoint:** `POST /api/mobile/profile`
   - **When:** On mount
   - **Purpose:** Populate `user` state for mini-profile
   - **Response:** `{ status: "OK", data: AuthUser }`

2. **Left Column Recommended Jobs** (lines 574-614)
   - **Endpoint:** `POST /api/mobile/user/recommended-jobs`
   - **When:** On mount
   - **Body:** `{ page: 1, limit: 10 }`
   - **Response:** `{ status: "OK", data: { result: ApiRecommendedJob[] } }`
   - **Updates:** `jobs` state

3. **Filter Options** (lines 618-659)
   - **Endpoint:** `GET /api/mobile/user/search-filters`
   - **When:** On mount
   - **Response:** `{ data: { company: [], employment_type: [], job_location: [] } }`
   - **Updates:** `filterOptions` state

4. **Right Panel Listings** (lines 678-781)
   - **Triggers:** Mount, `debouncedSearch`, `selectedLocations`, `selectedCompanyNames`, `selectedEmploymentTypes`, `viewMode` changes
   - **Endpoints by view mode:**
     - `"all"` → `POST /api/mobile/jobs`
     - `"saved"` → `POST /api/mobile/user/saved-jobs`
     - `"applied"` → `POST /api/mobile/user/applied-jobs-list`
     - `"recommended"` → `POST /api/mobile/user/recommended-jobs`
   - **Body (All view only):**
     ```json
     {
       "page": 1,
       "limit": 20,
       "search_text": "...",
       "job_location": "Berlin,London",
       "company_name": "Google,Apple",
       "employment_type": "Full-time,Part-time"
     }
     ```
   - **Response:** `{ status: "OK", data: { result: ApiJob[], total_count: number } }`
   - **Updates:** `listings`, `savedJobIds` (if saved view), `appliedJobIds` (if applied view), totals

5. **Saved Jobs Seed** (lines 788-826)
   - **Endpoint:** `POST /api/mobile/user/saved-jobs`
   - **When:** On mount (if `viewMode === "all"`)
   - **Body:** `{ page: 1, limit: 100 }`
   - **Purpose:** Populate `savedJobIds` set for button states
   - **Updates:** `savedJobIds`

6. **Applied Jobs Seed** (lines 832-868)
   - **Endpoint:** `POST /api/mobile/user/applied-jobs-list`
   - **When:** On mount (if `viewMode === "all"`)
   - **Body:** `{ page: 1, limit: 100 }`
   - **Updates:** `appliedJobIds`

7. **Recommended Total Seed** (lines 873-903)
   - **Endpoint:** `POST /api/mobile/user/recommended-jobs`
   - **When:** On mount
   - **Body:** `{ page: 1, limit: 1 }`
   - **Purpose:** Get `total_count` for stats row
   - **Updates:** `recommendedTotal`

8. **All Jobs Total Seed** (lines 912-942)
   - **Endpoint:** `POST /api/mobile/jobs`
   - **When:** On mount
   - **Body:** `{ page: 1, limit: 1, search_text: "", job_sector_id: "" }`
   - **Updates:** `allJobsTotal`

9. **Save Job** (lines 1047-1072)
   - **Endpoint:** `POST /api/mobile/user/save-job`
   - **Body:** `{ id: jobId }`
   - **Optimistic Update:** Add to `savedJobIds` on success
   - **Toast:** "Job saved successfully"

10. **Apply Job** (lines 1080-1115)
    - **Endpoint:** `POST /api/mobile/user/applied-jobs`
    - **Body:** `{ id: jobId }`
    - **Side Effect:** Opens `job.job_link` in new tab BEFORE API call (synchronous in click handler)
    - **Optimistic Update:** Add to `appliedJobIds` on success
    - **Toast:** "Job applied successfully"

11. **Remove Job** (lines 1132-1167)
    - **Endpoint:** `POST /api/mobile/user/remove-job`
    - **Body:** `{ id: jobId }`
    - **Confirmation:** Requires `ConfirmDialog` approval
    - **Optimistic Update:** Remove from `savedJobIds`, filter from `listings` if in saved view
    - **Toast:** "Job removed successfully"

### User Flows

#### Flow 1: Browse and Filter Jobs

**Step-by-step:**

1. **Page Load** (lines 548-942)
   - Parallel fetches: profile, left-column jobs, filter options, all-jobs listings, saved IDs, applied IDs, totals
   - Skeletons render while `listings === null`
   - Listings resolve → map to `Listing[]` → render cards

2. **Search Input** (lines 444-449, 664-671)
   - User types in search bar → updates `searchText`
   - Debounce effect waits 400ms after typing stops
   - If trimmed length is 1, skip (no API call)
   - If length ≥2 or empty, update `debouncedSearch`
   - `debouncedSearch` change triggers listings fetch effect (line 678)

3. **Open Filters** (lines 453, 1579-1586)
   - User clicks slider icon → toggles `filtersOpen`
   - Filter row (location/company/employment dropdowns) appears

4. **Select Filters** (lines 967-981, 1614-1887)
   - User clicks dropdown → `setOpenFilterDropdown("location")`
   - Dropdown renders with `filteredLocations` (narrowed by `locationFilterText`)
   - User checks/unchecks options → `toggleLocation(loc)` adds/removes from `selectedLocations`
   - `selectedLocations` change → triggers listings fetch (line 775)
   - **Multi-select:** Each chip maintains its own array; API receives comma-separated values

5. **All View Server-Side Filtering** (lines 697-710)
   ```typescript
   if (viewMode === "all") {
     if (debouncedSearch) body.search_text = debouncedSearch;
     if (selectedLocations.length > 0) body.job_location = selectedLocations.join(",");
     if (selectedCompanyNames.length > 0) body.company_name = selectedCompanyNames.join(",");
     if (selectedEmploymentTypes.length > 0) body.employment_type = selectedEmploymentTypes.join(",");
   }
   ```

6. **Saved/Applied/Recommended Client-Side Filtering** (lines 1216-1250)
   - These endpoints don't accept filters → fetch full list
   - `visibleListings` derives filtered subset from `listings`
   - Search matches title/company/locations
   - Location/Company/Employment Type filters intersect with listing data

#### Flow 2: Save a Job

**Complete flow (lines 1047-1072):**

```typescript
// 1. User clicks "Save Job" on a card → handleSaveJob(jobId)
const handleSaveJob = async (jobId: string) => {
  if (savingJobId) return; // Prevent double-click
  setSavingJobId(jobId); // Disable button, show "Saving..."

  // 2. POST to save-job endpoint
  try {
    const res = await fetch("/api/mobile/user/save-job", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId }),
    });
    const json = await res.json();

    // 3. Validate response
    if (!res.ok || json?.status !== "OK") {
      throw new Error(json?.message || "Save failed");
    }

    // 4. Optimistic update: add to savedJobIds set
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    // 5. Success toast
    toast.success("Job saved successfully");
  } catch {
    // 6. Error toast (no state rollback - set stays unchanged on error)
    toast.error("Couldn't save this job. Please try again.");
  } finally {
    // 7. Re-enable button
    setSavingJobId(null);
  }
};
```

**Button State Logic (lines 1987-1997, 1969-1984):**
```tsx
{savedJobIds.has(job.id) ? (
  <button disabled={savingJobId === job.id} onClick={() => requestRemoveJob(job.id)}>
    {removing && confirmRemoveId === job.id ? "Removing..." : "Remove"}
  </button>
) : (
  <button disabled={savingJobId === job.id} onClick={() => handleSaveJob(job.id)}>
    {savingJobId === job.id ? "Saving..." : "Save Job"}
  </button>
)}
```

#### Flow 3: Apply to Job

**Complete flow (lines 1080-1115):**

```typescript
const handleApplyJob = async (jobId: string, jobLink: string | null) => {
  if (applyingJobId) return;
  if (appliedJobIds.has(jobId)) return; // Already applied

  // 1. Open external job link SYNCHRONOUSLY (before await)
  //    Must be in click handler to avoid popup blocker
  if (jobLink) {
    window.open(jobLink, "_blank", "noopener,noreferrer");
  }

  setApplyingJobId(jobId); // Show "Applying..."

  // 2. POST to applied-jobs endpoint
  try {
    const res = await fetch("/api/mobile/user/applied-jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId }),
    });
    const json = await res.json();

    // Response check: accepts { status: "OK" } OR { id: "..." }
    if (!res.ok || !(json && (json.status === "OK" || json.id))) {
      throw new Error(json?.message || "Apply failed");
    }

    // 3. Add to appliedJobIds (one-way action - no un-apply)
    setAppliedJobIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    toast.success("Job applied successfully");
  } catch {
    toast.error("Couldn't apply for this job. Please try again.");
  } finally {
    setApplyingJobId(null);
  }
};
```

**Button State (lines 2004-2025):**
```tsx
{appliedJobIds.has(job.id) ? (
  <button className="btnApplied" disabled aria-label="Already applied">
    Applied
  </button>
) : (
  <button disabled={applyingJobId === job.id} onClick={() => handleApplyJob(job.id, job.jobLink)}>
    {applyingJobId === job.id ? "Applying..." : "Apply"}
  </button>
)}
```

#### Flow 4: View Job Details

**Navigation (lines 440-442):**

```typescript
const openJobDetails = (jobId: string) => {
  router.push(`/jobs/${encodeURIComponent(jobId)}`);
};
```

**Detail Page** ([src/app/jobs/[id]/page.tsx](../src/app/jobs/[id]/page.tsx)):

1. **Route Params** (lines 165-185)
   - `useParams<{ id: string }>()` extracts encoded ID
   - `decodeURIComponent(rawId)` handles base64 IDs with `=` padding

2. **Data Fetch** (lines 250-283)
   - `POST /api/mobile/job` with `{ id: jobId }`
   - Response includes full job details + `saved_jobs: "1"/"0"` + `applied_jobs: "1"/"0"`
   - Seeds `saved` and `applied` boolean states (lines 269-270)

3. **Similar Jobs Fetch** (lines 286-329)
   - `POST /api/mobile/company/similar-jobs` with `{ id: jobId, page: 1, limit: 6 }`
   - Renders right-column "More jobs by this company"
   - Each similar job card has own save/apply states (lines 312-317)

4. **Page Layout**
   - Banner image (`jopost_image_url` or default)
   - Hero card: logo, title, company, locations, employment type, salary, posted time
   - Save/Remove + Apply/Applied buttons (hero actions)
   - Left column: About the Job (description, requirements, sector)
   - Right column: About the Company + Similar Jobs list

### Code Examples

#### Debounced Search Implementation

**File:** [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) (lines 664-671)

```typescript
useEffect(() => {
  const trimmed = searchText.trim();
  if (trimmed.length === 1) return; // Skip single-char queries
  const t = setTimeout(() => {
    setDebouncedSearch(trimmed);
  }, 400);
  return () => clearTimeout(t);
}, [searchText]);
```

#### Multi-Select Filter Toggle

**File:** [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) (lines 967-981)

```typescript
const toggleLocation = (loc: string) => {
  setSelectedLocations((prev) =>
    prev.includes(loc) ? prev.filter((v) => v !== loc) : [...prev, loc]
  );
};

const toggleCompany = (name: string) => {
  setSelectedCompanyNames((prev) =>
    prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
  );
};

const toggleEmployment = (label: string) => {
  setSelectedEmploymentTypes((prev) =>
    prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label]
  );
};
```

#### View Mode Switching

**File:** [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) (lines 1037-1041)

```typescript
const switchView = (mode: ViewMode) => {
  setViewMode(mode);
  setSearchText("");        // Clear search when switching tabs
  setDebouncedSearch("");   // Clear debounced value too
  // Note: filter chips NOT cleared - they belong to All view only
};
```

#### Employment Type Normalization

**File:** [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) (lines 314-338)

```typescript
// Backend returns inconsistent shapes:
// - "Full-time" (string)
// - ["Full-time", "Part-time"] (array)
// - [{ name: "full_time", label: "Full-time" }] (objects)
function extractEmploymentTypes(raw: ApiJob["employment_type"]): string[] {
  if (raw == null) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (v: string | null | undefined) => {
    const s = (v ?? "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  if (typeof raw === "string") {
    push(raw);
    return out;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        push(item);
      } else if (item && typeof item === "object") {
        push(item.label ?? item.name ?? ""); // Prefer label over name
      }
    }
  }
  return out;
}
```

---

## COMPLETE DATA FLOW: COMPANY PAGE

### Page Structure

**File:** [src/app/company/page.tsx](../src/app/company/page.tsx)

#### Layout Components
- **Left Column:**
  - Mini-profile card (avatar, name, role, location)
  - Stats box with 2 clickable rows: All (N), Following (N)

- **Right Column:**
  - "Companies" heading
  - Search bar (debounced 400ms, ≥2 chars)
  - Filter sliders icon
  - Job Sector filter chip (multi-select)
  - "Clear All" button
  - Company listing cards (scrollable)

#### View Modes
Two modes (lines 352):
- `"all"` - All companies (search + sector filter active)
- `"following"` - User's followed companies

### State Management

#### Core State Variables (lines 358-408)

```typescript
// Search & filters
const [searchText, setSearchText] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [filtersOpen, setFiltersOpen] = useState(false);
const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]); // Multi-select by ID
const [sectorFilterText, setSectorFilterText] = useState("");
const [openFilterDropdown, setOpenFilterDropdown] = useState<"sector" | null>(null);

// View mode
const [viewMode, setViewMode] = useState<ViewMode>("all");

// Listings
const [companies, setCompanies] = useState<CompanyCard[] | null>(null);
const [companiesError, setCompaniesError] = useState<string | null>(null);

// Filter dropdown options
const [sectorOptions, setSectorOptions] = useState<Array<{ id: string; name: string }>>([]);

// Counters
const [allTotal, setAllTotal] = useState<number>(0);
const [followingTotal, setFollowingTotal] = useState<number>(0);

// Follow action tracking
const [followInFlightId, setFollowInFlightId] = useState<string | null>(null);
```

#### Derived State (lines 733-774)

```typescript
// Client-side filtering for "following" view
const visibleCompanies = useMemo(() => {
  if (companies === null) return null;
  if (viewMode !== "following") return companies; // "all" is server-filtered

  let filtered = companies;
  const query = debouncedSearch.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query) ||
      c.industryName.toLowerCase().includes(query)
    );
  }

  if (selectedSectorIds.length > 0) {
    const selectedSectorNames = new Set(
      selectedSectorIds
        .map(id => sectorOptions.find(s => s.id === id)?.name)
        .filter((name): name is string => typeof name === "string")
    );
    if (selectedSectorNames.size > 0) {
      filtered = filtered.filter(c =>
        c.industryName && selectedSectorNames.has(c.industryName)
      );
    }
  }

  return filtered;
}, [companies, viewMode, debouncedSearch, selectedSectorIds, sectorOptions]);
```

### API Integration

#### Endpoints & Triggers

1. **Profile Seed** (lines 424-446)
   - **Endpoint:** `POST /api/mobile/profile`
   - **When:** On mount
   - **Purpose:** Populate mini-profile
   - **Updates:** `setUser(json.data as AuthUser)`

2. **Filter Options** (lines 483-510)
   - **Endpoint:** `GET /api/mobile/user/search-filters`
   - **When:** On mount
   - **Response:** `{ data: { jobsector: Array<{ id, name }> } }`
   - **Updates:** `sectorOptions`

3. **Companies Listings** (lines 526-601)
   - **Triggers:** `viewMode`, `debouncedSearch`, `selectedSectorIds`
   - **Endpoints:**
     - `"all"` → `POST /api/mobile/companies`
     - `"following"` → `POST /api/mobile/user/followings`
   - **Body (All view):**
     ```json
     {
       "page": 1,
       "limit": 100,
       "search_text": "...",
       "job_sector_id": "id1,id2,id3"
     }
     ```
   - **Body (Following view):** `{}`
   - **Response:** `{ status: "OK", data: { result: ApiCompany[], total_count: number } }`
   - **Updates:** `companies`, `allTotal` (if all), `followingTotal` (if following)

4. **Following Count Seed** (lines 612-637)
   - **Endpoint:** `POST /api/mobile/user/followings`
   - **When:** On mount
   - **Body:** `{}`
   - **Updates:** `followingTotal`

5. **All Count Seed** (lines 638-672)
   - **Endpoint:** `POST /api/mobile/companies`
   - **When:** On mount
   - **Body:** `{ page: 1, limit: 1, search_text: "", job_sector_id: "" }`
   - **Updates:** `allTotal`

6. **Follow Company** (lines 682-719)
   - **Endpoint:** `POST /api/mobile/company/follow`
   - **Body:** `{ company_id: companyId }`
   - **Response:** `{ status: "OK", action: "FOLLOWED" | "UNFOLLOWED", message: "..." }`
   - **Optimistic Update:** Set `followStatus: true` in `companies` array
   - **Toast:** Response message
   - **Note:** Listing page is FOLLOW-ONLY (no unfollow path)

### User Flows

#### Flow 1: Browse and Filter Companies

1. **Page Load** (lines 424-672)
   - Parallel: profile, filter options, companies (all view), following count, all count
   - Skeletons render while `companies === null`

2. **Search** (lines 470-477)
   - User types → `searchText` updates
   - Debounce 400ms, skip if length === 1
   - Update `debouncedSearch` → triggers listings fetch

3. **Filter by Sector** (lines 1002-1087)
   - User clicks "Job Sector" chip → opens dropdown
   - Multi-select checkboxes (keyed by `id`)
   - `selectedSectorIds` change → triggers fetch
   - **All view:** Server-side filter via `job_sector_id: "id1,id2"`
   - **Following view:** Client-side filter via `useMemo` (lines 754-764)

4. **Switch View Mode** (lines 904-936)
   - Click "All (N)" or "Following (N)" stat row
   - Updates `viewMode`
   - Triggers listings fetch with different endpoint

#### Flow 2: Follow a Company

**Complete flow (lines 682-719):**

```typescript
const handleFollow = async (companyId: string) => {
  if (followInFlightId) return;
  const current = companies?.find(c => c.id === companyId);
  if (!current || current.followStatus) return; // Already following

  setFollowInFlightId(companyId); // Show "Following..."

  try {
    const res = await fetch("/api/mobile/company/follow", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    const json = await res.json();

    if (!res.ok || json?.status !== "OK") {
      throw new Error(json?.message || "Follow failed");
    }

    // Respect server response (defensive against race conditions)
    const nowFollowing = json.action !== "UNFOLLOWED";

    // Update local state
    setCompanies(prev =>
      prev === null ? prev : prev.map(c =>
        c.id === companyId ? { ...c, followStatus: nowFollowing } : c
      )
    );

    if (nowFollowing) {
      setFollowingTotal(prev => prev + 1);
    }

    toast.success(json.message || "Company followed successfully");
  } catch {
    toast.error("Couldn't follow this company. Please try again.");
  } finally {
    setFollowInFlightId(null);
  }
};
```

**Button State (lines 1165-1190):**
```tsx
{c.followStatus ? (
  <button className="btnFollowing" disabled aria-pressed>
    Following
  </button>
) : (
  <button disabled={followInFlightId === c.id} onClick={() => handleFollow(c.id)}>
    {followInFlightId === c.id ? "Following..." : "Follow"}
  </button>
)}
```

#### Flow 3: View Company Details

**Navigation (lines 1124):**
```typescript
onClick={() => router.push(`/company/${c.id}`)}
```

**Detail Page** ([src/app/company/[id]/page.tsx](../src/app/company/[id]/page.tsx)):

1. **Data Fetch** (lines 175-211)
   - `POST /api/mobile/company-details` with `{ id: companyId }`
   - Response: full company record + `follow_status: boolean`

2. **Page Layout**
   - Banner image (`banner_url` or default)
   - Hero card: logo, name, location, industry
   - Website button (external link)
   - Follow/Following button with unfollow confirmation
   - About the Company card (HTML rich text)

3. **Unfollow Flow** (lines 220-276)
   - User clicks "Following" → opens `ConfirmDialog` (lines 223-224)
   - Confirm → `runUnfollow()` POSTs to same `/company/follow` endpoint
   - Toggle response updates `followStatus: false`

### Code Examples

#### Multi-Select Sector Filter

**File:** [src/app/company/page.tsx](../src/app/company/page.tsx) (lines 820-828)

```typescript
const toggleInArray = (
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  value: string
) => {
  setter(prev =>
    prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
  );
};

// Usage: onChange={() => toggleInArray(setSelectedSectorIds, s.id)}
```

#### Company Logo with Load Tracking

**File:** [src/app/company/page.tsx](../src/app/company/page.tsx) (lines 287-314)

```typescript
function CompanyLogo({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const useFallback = !url || errored;
  const finalSrc = useFallback ? DEFAULT_COMPANY_LOGO : url;
  const isLoadedSurface = loaded || useFallback;

  return (
    <div className={`companyLogo ${isLoadedSurface ? "companyLogoLoaded" : ""} ${!isLoadedSurface ? "skeleton" : ""}`}>
      <img
        src={finalSrc}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={{ opacity: isLoadedSurface ? 1 : 0, transition: "opacity 0.2s ease" }}
      />
    </div>
  );
}
```

---

## COMPLETE DATA FLOW: PROFILE PAGE

### Page Structure

**File:** [src/app/profile/[id]/page.tsx](../src/app/profile/[id]/page.tsx)

#### Layout (CSS Grid)
- **Photo Card (Left):**
  - Avatar (image or initials fallback)
  - Delete button (trash icon, only if image exists)
  - "Upload new photo" button
  - QR code section

- **Right Column:**
  - Education card (institution logo, name, degree, year range)
  - Skills card (pill list, max 5)

- **Info Card (Full Width):**
  - Name + Edit button
  - Fields: Location, Email, Phone, DOB, Gender

- **About Card (Full Width):**
  - Multi-paragraph bio text
  - Edit button

### State Management

#### Core State (lines 86-97)

```typescript
const [profile, setProfile] = useState<ProfileData | null>(null);
const [loading, setLoading] = useState(true);

// Modal visibility
const [educationModalOpen, setEducationModalOpen] = useState(false);
const [skillsModalOpen, setSkillsModalOpen] = useState(false);
const [profileInfoModalOpen, setProfileInfoModalOpen] = useState(false);
const [aboutModalOpen, setAboutModalOpen] = useState(false);

// Photo upload flow
const [rawImage, setRawImage] = useState<string | null>(null); // Data URL from file picker
const [uploadingImage, setUploadingImage] = useState(false);

// Photo deletion
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [deletingImage, setDeletingImage] = useState(false);

// Full-size preview
const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
```

#### LocalStorage Integration

**Deleted Image Suppression** (lines 135-143, 179-186):
```typescript
const DELETED_IMG_KEY = "deletedProfileImageUrl";
const [deletedImageUrl, setDeletedImageUrl] = useState<string | null>(null);

useEffect(() => {
  try {
    setDeletedImageUrl(window.localStorage.getItem(DELETED_IMG_KEY));
  } catch {
    // localStorage unavailable
  }
}, []);

// On delete:
if (urlBeingDeleted) {
  window.localStorage.setItem(DELETED_IMG_KEY, urlBeingDeleted);
  setDeletedImageUrl(urlBeingDeleted);
}

// Render logic:
const isDeletedImage = Boolean(deletedImageUrl) && rawProfileImageUrl === deletedImageUrl;
const profileImage = isDeletedImage ? "" : rawProfileImageUrl;
```

**Skeleton Hints** (lines 109-127):
```typescript
const [persistedSkillCount, setPersistedSkillCount] = useState<number | null>(null);
const [skeletonMounted, setSkeletonMounted] = useState(false);

useEffect(() => {
  try {
    const raw = window.localStorage.getItem("profileSkeletonHints");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.skillCount === "number") {
        setPersistedSkillCount(parsed.skillCount);
      }
    }
  } catch {}
  setSkeletonMounted(true);
}, []);

// Save current count after profile loads (lines 354-366):
useEffect(() => {
  if (!profile) return;
  try {
    const skillCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
    window.localStorage.setItem("profileSkeletonHints", JSON.stringify({ skillCount }));
  } catch {}
}, [profile]);
```

#### Cache Warming (lines 148-150)

```typescript
// Warm dropdown caches on mount - useApi has module-level cache
useApi<unknown>({ key: ["userLocations"], url: endpoints.data.userLocations });
useApi<unknown>({ key: ["institutions"], url: endpoints.data.institutions });
useApi<unknown>({ key: ["skills"], url: endpoints.data.skills });
```

### API Integration

#### Profile Data Fetch (lines 324-349)

```typescript
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
        setUser(json.data as AuthUser); // Keep AuthContext in sync
      }
    } catch {
      // Fallback to AuthContext
    } finally {
      setLoading(false);
    }
  }
  fetchProfile();
}, [setUser]);
```

#### Update Profile (All Edit Modals)

**Endpoint:** `POST /api/mobile/update-profile`
**Body Examples:**

```typescript
// Education (lines 786-813):
{
  place_of_study: "Harvard University", // Name, not ID
  education: "Master's Degree",          // Label, not value
  start_year: "2020",
  end_year: "2024"
}

// Skills (lines 821-867):
{
  skills: "Python, JavaScript, React, Node.js, Docker" // Comma-separated names
}

// Profile Info (lines 883-909):
{
  first_name: "John",
  last_name: "Doe",
  location: "New York, USA",     // Name, not ID
  email: "john@example.com",
  phone_number: "+1234567890",
  dob: "15-03-1995",             // DD-MM-YYYY
  gender: "Male"                 // Capitalized label
}

// About (lines 917-943):
{
  about: "Multi-line bio text..."
}
```

**Response:** `{ status: "OK", data: ProfileData, message: "..." }`
**Side Effects:**
- `setProfile(json.data)`
- `setUser(json.data as AuthUser)`
- `toast.success(json.message)`
- Close modal

#### Photo Upload (lines 262-322)

```typescript
async function handleCropAndUpload(file: File) {
  setUploadingImage(true);
  try {
    const fd = new FormData();
    fd.append("profile_image", file); // Cropped JPEG blob

    const res = await fetch(endpoints.profile.uploadProfileImg, {
      method: "POST",
      credentials: "include",
      body: fd, // multipart/form-data
    });
    const json = await res.json();

    if (!res.ok || !(json?.status === "OK" || json?.success)) {
      throw new Error(json?.message || "Failed to upload image");
    }

    // Clear deleted-image flag (new photo uploaded)
    window.localStorage.removeItem(DELETED_IMG_KEY);
    setDeletedImageUrl(null);

    // Optimistic update
    if (json.data) {
      setProfile(json.data as ProfileData);
      setUser(json.data as AuthUser);
    }

    toast.success(json.message || "Profile image updated successfully.");

    // Re-fetch to confirm latest state
    const refreshRes = await fetch(endpoints.profile.profile, { ... });
    if (refreshRes.ok) {
      const refreshJson = await refreshRes.json();
      if (refreshJson?.status === "OK" && refreshJson.data) {
        setProfile(refreshJson.data);
        setUser(refreshJson.data as AuthUser);
      }
    }

    setRawImage(null); // Close crop modal
  } catch (err) {
    toast.error(err.message);
  } finally {
    setUploadingImage(false);
  }
}
```

#### Photo Deletion (lines 156-235)

```typescript
async function handleDeletePhoto() {
  setDeletingImage(true);
  const urlBeingDeleted = profile?.profile_image_url || user?.profile_image_url || "";

  try {
    const res = await fetch(endpoints.profile.updateProfile, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_image_url: null }), // null = clear field
    });
    const json = await res.json();

    if (!res.ok || !(json?.success || json?.status === "OK")) {
      throw new Error(json?.message || "Failed to remove photo");
    }

    // Persist deleted URL for future suppression
    if (urlBeingDeleted) {
      window.localStorage.setItem(DELETED_IMG_KEY, urlBeingDeleted);
      setDeletedImageUrl(urlBeingDeleted);
    }

    // Force-clear image locally (backend may echo old URL)
    if (json.data) {
      const next = { ...json.data, profile_image_url: "" };
      setProfile(next);
      setUser(next as AuthUser);
    } else {
      setProfile(prev => prev ? { ...prev, profile_image_url: "" } : prev);
      if (user) setUser({ ...user, profile_image_url: "" });
    }

    toast.success("Profile photo removed.");
    setDeleteConfirmOpen(false);

    // Re-fetch and force empty image
    const refreshRes = await fetch(endpoints.profile.profile, { ... });
    if (refreshRes.ok) {
      const refreshJson = await refreshRes.json();
      if (refreshJson?.status === "OK" && refreshJson.data) {
        const next = { ...refreshJson.data, profile_image_url: "" };
        setProfile(next);
        setUser(next as AuthUser);
      }
    }
  } catch (err) {
    toast.error(err.message);
  } finally {
    setDeletingImage(false);
  }
}
```

### Modal Edit Flows

#### Edit Education Modal

**File:** [src/app/components/profile/EditEducationModal/EditEducationModal.tsx](../src/app/components/profile/EditEducationModal/EditEducationModal.tsx)

**Form Fields:**
- `placeOfStudy` - SelectField (searchable, fetches from `/api/mobile/data/institutions`)
- `education` - SelectField (static options: Bachelor's, Master's, PhD, etc.)
- `startYear` - SelectField (2026 down to 1970)
- `endYear` - SelectField (filtered to years > startYear)

**Validation:** All 4 fields required (line 107-111)

**Data Flow:**
1. Open → map initial names to IDs (lines 71-97)
2. User selects → stores IDs in form state
3. Save → resolve IDs back to names for API (lines 131-143):
   ```typescript
   const placeLabel = PLACE_OPTIONS.find(o => o.value === formData.placeOfStudy)?.label || formData.placeOfStudy;
   const educationLabel = EDUCATION_OPTIONS.find(o => o.value === formData.education)?.label || formData.education;

   await onSave({
     place_of_study: placeLabel,
     education: educationLabel,
     start_year: formData.startYear,
     end_year: formData.endYear,
   });
   ```

#### Edit Skills Modal

**File:** [src/app/components/profile/EditSkillsModal/EditSkillsModal.tsx](../src/app/components/profile/EditSkillsModal/EditSkillsModal.tsx)

**Form:**
- Multi-select dropdown (max 5 skills)
- Fetches from `/api/mobile/data/skills`
- Custom skill entry via `onAddCustom` (lines 84-99)

**Custom Skill Flow:**
```typescript
function handleAddCustomSkill(name: string) {
  const current = selectedIds.split(",").filter(Boolean);
  if (current.length >= MAX_SKILLS) return;
  const normalized = name.trim();
  if (!normalized) return;

  // Check for duplicates (case-insensitive)
  const lower = normalized.toLowerCase();
  const dupe = current.some(id => {
    const opt = SKILL_OPTIONS.find(o => o.value === id);
    const label = opt?.label ?? id;
    return label.toLowerCase() === lower;
  });
  if (dupe) return;

  // Append raw name as selected value
  setSelectedIds([...current, normalized].join(","));
}
```

**Save Flow (lines 101-111):**
```typescript
const ids = selectedIds.split(",").filter(Boolean);
const names = ids.map(id => {
  const match = SKILL_OPTIONS.find(o => o.value === id);
  return match?.label ?? id; // Custom skills have no match - use raw name
});

await onSave({
  skills: names.join(", ") // Comma-separated
});
```

**Re-fetch After Save (lines 846-861):**
```typescript
// Backend may normalize custom skill names
const refreshRes = await fetch(endpoints.profile.profile, { ... });
if (refreshRes.ok) {
  const refreshJson = await refreshRes.json();
  if (refreshJson?.status === "OK" && refreshJson.data) {
    setProfile(refreshJson.data);
    setUser(refreshJson.data as AuthUser);
  }
}
```

#### Edit Profile Info Modal

**File:** [src/app/components/profile/EditProfileInfoModal/EditProfileInfoModal.tsx](../src/app/components/profile/EditProfileInfoModal/EditProfileInfoModal.tsx)

**Form Fields:**
- `firstName`, `lastName` - InputField (letters only, validated on change)
- `location` - SelectField (searchable, fetches `/api/mobile/data/user-locations`)
- `email` - InputField (disabled - read-only)
- `phone` - PhoneInputField (custom component)
- `dob` - DatePicker (DD/MM/YYYY format)
- `gender` - SelectField (Male/Female/Other/Prefer not to say)

**Name Validation (lines 114-131):**
```typescript
if (name === "firstName" || name === "lastName") {
  const cleaned = value.replace(/[^A-Za-z\s]/g, "");
  const hadInvalid = cleaned !== value;
  setFormData(prev => ({ ...prev, [name]: cleaned }));
  const label = name === "firstName" ? "First name" : "Last name";
  setNameErrors(prev => ({
    ...prev,
    [name]: hadInvalid ? `${label} can only contain letters` : undefined,
  }));
  return;
}
```

**DOB Format Conversion (lines 134-137, 160):**
```typescript
// DatePicker uses "DD/MM/YYYY"
// Backend expects "DD-MM-YYYY"
function normalizeDob(dob: string): string {
  return dob.replaceAll("/", "-");
}
```

**Save Payload (lines 145-163):**
```typescript
const locationLabel = LOCATION_OPTIONS.find(o => o.value === formData.location)?.label || formData.location;
const genderLabel = GENDER_OPTIONS.find(o => o.value === formData.gender)?.label || capitalize(formData.gender);

await onSave({
  first_name: formData.firstName.trim(),
  last_name: formData.lastName.trim(),
  location: locationLabel,
  email: formData.email.trim(),
  phone_number: formData.phone,
  dob: normalizeDob(formData.dob),
  gender: genderLabel,
});
```

#### Edit About Modal

**File:** [src/app/components/profile/EditAboutModal/EditAboutModal.tsx](../src/app/components/profile/EditAboutModal/EditAboutModal.tsx)

**Form:**
- Textarea (max 400 words)
- Word counter: "N / 400 words (M remaining)"
- Red error state if over limit

**Word Counting (lines 19-23):**
```typescript
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
```

**Validation (lines 37-40):**
```typescript
const wordCount = countWords(about);
const wordsLeft = MAX_WORDS - wordCount;
const overLimit = wordCount > MAX_WORDS;
const canSave = about.trim().length > 0 && !overLimit;
```

#### Upload Photo Modal (react-easy-crop)

**File:** [src/app/components/profile/UploadPhotoModal/UploadPhotoModal.tsx](../src/app/components/profile/UploadPhotoModal/UploadPhotoModal.tsx)

**Flow:**
1. User selects file → `handleFileChange` validates type (lines 237-260)
2. File reader converts to data URL → `setRawImage(reader.result)` (lines 254-258)
3. Modal opens with `<Cropper>` component
4. User adjusts crop area + zoom (1-3x range, 0.05 step)
5. Click "Crop & Upload" → `getCroppedFile` extracts pixels (lines 20-47):
   ```typescript
   async function getCroppedFile(imageSrc: string, crop: Area): Promise<File> {
     const MAX_SIZE = 800;
     const image = await createImage(imageSrc);
     const canvas = document.createElement("canvas");
     const ctx = canvas.getContext("2d")!;

     // Downscale to max 800px
     const scale = Math.min(1, MAX_SIZE / Math.max(crop.width, crop.height));
     canvas.width = Math.round(crop.width * scale);
     canvas.height = Math.round(crop.height * scale);

     ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);

     const blob = await new Promise<Blob>(resolve =>
       canvas.toBlob(b => resolve(b!), "image/jpeg", 0.9)
     );
     return new File([blob], "profile.jpg", { type: "image/jpeg" });
   }
   ```
6. Cropped file → `handleCropAndUpload` (parent) → FormData → API

#### Image Preview Modal

**File:** [src/app/components/profile/ImagePreviewModal/ImagePreviewModal.tsx](../src/app/components/profile/ImagePreviewModal/ImagePreviewModal.tsx)

**Features:**
- Full-screen overlay (click-to-close)
- Shows image OR initials fallback
- Escape key closes modal (lines 23-30)

#### Confirm Dialog

**File:** [src/app/components/profile/ConfirmDialog/ConfirmDialog.tsx](../src/app/components/profile/ConfirmDialog/ConfirmDialog.tsx)

**Props:**
- `title`, `message` - Text content
- `confirmLabel`, `cancelLabel` - Button labels
- `loadingLabel` - In-flight text (e.g., "Removing...")
- `loading` - Disables buttons during action
- `reverseButtons` - Swap button order
- `size` - "default" | "large"
- `hideClose` - Hide X button
- `onConfirm`, `onCancel` - Callbacks

**Usage in Profile:**
- Delete photo confirmation (lines 957-966)
- Reused across app (jobs remove, company unfollow)

---

## Example 1: User Logs In (Email/Password)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User visits localhost:3000                                       │
│    → Middleware reads cookies: no access_token                      │
│    → Redirect to /auth                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. /auth page (LoginForm component)                                 │
│    → User enters email + password                                   │
│    → apiClient.post("/api/mobile/auth/login", {                     │
│         login_type: "system",                                       │
│         identifier: "email",                                        │
│         value: "user@example.com",                                  │
│         password: "********"                                        │
│      })                                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. /api/mobile/auth/login proxy route                               │
│    → Forwards to backend: POST https://backend/api/mobile/auth/login│
│    → Backend returns: { status: "OK", data: {                       │
│         verification_status: true,                                  │
│         user: { id: "...", is_2fa_enabled: false }                  │
│       }}                                                            │
│    → (No tokens if 2FA enabled - would redirect to OTP)             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Client receives response                                         │
│    → If 2FA disabled: Backend included tokens in response           │
│    → Proxy (or client) sets cookies:                                │
│       • access_token (HttpOnly, Secure, SameSite=lax)               │
│       • refresh_token (HttpOnly, Secure, SameSite=lax)              │
│       • profile_completed (NOT HttpOnly - middleware reads it)      │
│    → Redirect to /home                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Navigate to /home                                                │
│    → Middleware reads profile_completed cookie:                     │
│      • "200" → Allow                                                │
│      • "0" or missing → Redirect to /auth/stepper                   │
│    → HomePage mounts                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. HomePage fetches data (parallel)                                 │
│    → fetch("/api/mobile/profile") → AuthContext.setUser(data)       │
│    → fetch("/api/mobile/feeds") → setPosts(mapped)                  │
│    → fetch("/api/mobile/user/recommended-jobs") → setJobs(mapped)   │
│    → Each fetch auto-includes cookies (credentials: "include")      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Backend receives requests with Bearer token                      │
│    → Proxy reads access_token cookie (server-side)                  │
│    → Injects Authorization: Bearer <token>                          │
│    → Backend validates token → returns user data                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Render home page                                                 │
│    → Mini profile card (from AuthContext.user)                      │
│    → Feed posts with images/carousel                                │
│    → Recommended jobs sidebar                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Example 2: User Books an Event

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User navigates to /events                                        │
│    → EventsPage mounts                                              │
│    → fetch("/api/mobile/events", {                                  │
│         page: 1, limit: 100,                                        │
│         search_text: "", company_ids: "", event_type: "", pricing_type: ""│
│      })                                                             │
│    → Renders event cards (image, title, date, price)                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. User clicks event card → /events/[id]                            │
│    → fetch("/api/mobile/event", { id })                             │
│    → Response: { banner_image_url, title, description,              │
│                  start_datetime, end_datetime, list_price,          │
│                  pricing_type: "paid", available_seats: 50 }        │
│    → Render event details page                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. User clicks "Register Now"                                       │
│    → Opens seat picker modal                                        │
│    → User selects 2 seats                                           │
│    → (Optional) Enters coupon code                                  │
│    → POST "/api/mobile/event/apply-coupon" { event_id, coupon_code }│
│      → Backend returns discount: { discount_percent: 10 }           │
│    → User confirms booking                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. POST "/api/mobile/event/create-booking"                          │
│    → Body: { event_id: "...", num_seats: 2, coupon_code: "SAVE10" } │
│    → Proxy attaches Bearer token                                    │
│    → Backend creates booking record                                 │
│    → Response (PAID event):                                         │
│       { status: "OK", data: {                                       │
│           booking_id: "...",                                        │
│           client_secret: "pi_...",  ← Stripe PaymentIntent          │
│           amount: "4140.00"  (£2300 × 2 seats × 0.9 discount)       │
│         }}                                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Open PaymentModal (Stripe Elements)                              │
│    → <Elements stripe={stripePromise} options={{ clientSecret }}>  │
│        <PaymentElement />                                           │
│      </Elements>                                                    │
│    → User enters card details (Stripe iframe - never touches server)│
│    → Click "Pay £4140.00"                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. stripe.confirmPayment({ elements, confirmParams })               │
│    → Stripe SDK → Stripe servers                                    │
│    → 3D Secure challenge if required                                │
│    → Returns { paymentIntent: { id, status: "succeeded" }}          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. POST "/api/mobile/event/confirm-payment"                         │
│    → Body: { booking_id: "...", payment_intent_id: "pi_..." }       │
│    → Backend verifies payment with Stripe                           │
│    → Updates booking_status: "paid"                                 │
│    → Generates QR code tickets                                      │
│    → Response: { status: "OK", data: { booking_status: "paid" }}    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Redirect to /booking/[booking_id]                                │
│    → fetch("/api/mobile/event/booking-detail", { booking_id })      │
│    → Response: { booking_number, qr_code_url, tickets: [...] }      │
│    → Render tickets page with QR codes                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Example 3: User Likes a Post (Optimistic Update)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User on /home, sees post with Like button (currentColor icon)    │
│    → Post state: { id: "post123", isLiked: false, likes: 42 }       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. User clicks Like button                                          │
│    → toggleLike("post123") fires                                    │
│    → Capture current state: wasLiked = false                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Optimistic update (immediate UI change)                          │
│    → setPosts(prev => prev.map(p => p.id === "post123"             │
│         ? { ...p, isLiked: true, likes: 43 }  ← UI feels instant    │
│         : p                                                         │
│      ))                                                             │
│    → Icon switches from outlined → solid cyan                       │
│    → Count changes 42 → 43                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. POST "/api/mobile/user/feed/reaction" (background)               │
│    → Body: { id: "post123", type: "like", action: "add" }           │
│    → Proxy attaches Bearer token                                    │
│    → Backend increments like count                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐
          │  SUCCESS (200)   │  │   FAILURE (4xx)  │
          └─────────────────┘  └─────────────────┘
                    │                   │
                    │                   ▼
                    │          ┌─────────────────────────────────────┐
                    │          │ Revert optimistic update            │
                    │          │ → setPosts(prev => prev.map(p =>   │
                    │          │     p.id === "post123"             │
                    │          │     ? { ...p, isLiked: false,       │
                    │          │         likes: 42 }  ← Back to old  │
                    │          │     : p                             │
                    │          │   ))                                │
                    │          │ → Icon back to outlined             │
                    │          └─────────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────────────────────────┐
          │ Keep optimistic state               │
          │ → No further update needed          │
          │ → Next /feeds fetch will have the   │
          │   updated count from backend        │
          └─────────────────────────────────────┘
```

---

# IMPORTANT CONFIGURATIONS

### **CORS & Proxy Setup**

**Problem:** Backend doesn't send `Access-Control-Allow-Credentials: true` for the frontend origin.

**Solution:** Next.js API routes act as a same-origin proxy layer:

**Client-side:**
```typescript
// All fetches go to local routes (same origin = no CORS)
fetch("/api/mobile/auth/login", {
  method: "POST",
  credentials: "include",  // Auto-includes HttpOnly cookies
  body: JSON.stringify({...})
})
```

**Server-side proxy:**
```typescript
// File: src/app/api/mobile/auth/login/route.ts
export async function POST(req: NextRequest) {
  return proxyAuthRequest(req, "/api/mobile/auth/login");
}

// proxyAuthRequest forwards to real backend:
// → fetch("https://admin.youngprofessionals.global/api/mobile/auth/login")
// → Pipes response back to browser (including Set-Cookie headers)
```

---

### **Environment Variables**

**Required `.env.local`:**
```env
# Backend API
BACKEND_URL=https://admin.youngprofessionals.global

# NextAuth (OAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string-here
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Stripe (client-side - requires NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Server-only config:**
```typescript
// File: src/app/lib/config.ts
export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;  // No NEXT_PUBLIC_ prefix
  if (!url) throw new Error("Missing BACKEND_URL");
  return url.replace(/\/$/, "");
}
```

---

### **Cookie Configuration**

**File:** [src/app/lib/api/proxy.ts](../src/app/lib/api/proxy.ts) (lines 242-257)

```typescript
const IS_PROD = process.env.NODE_ENV === "production";

response.cookies.set("access_token", token, {
  httpOnly: true,        // JavaScript cannot read (XSS protection)
  secure: IS_PROD,       // HTTPS only in production
  sameSite: "lax",       // CSRF protection
  path: "/",             // Available to all routes
});

response.cookies.set("profile_completed", status, {
  httpOnly: false,       // Middleware needs to read this
  secure: IS_PROD,
  sameSite: "lax",
  path: "/",
});
```

---

### **Middleware Configuration**

**File:** [src/proxy.ts](../src/proxy.ts) (lines 90-95)

```typescript
export const config = {
  matcher: [
    // Match all paths EXCEPT static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
```

**Infra paths (always allowed):**
```typescript
const INFRA_PATHS = [
  "/api/",        // All API routes
  "/_next/",      // Next.js assets
  "/favicon.ico",
  "/assets/",     // Public folder
];
```

---

### **API Client Auto-Refresh**

**File:** [src/app/lib/api/client.ts](../src/app/lib/api/client.ts) (lines 32-70)

```typescript
// Singleton refresh lock prevents concurrent 401s from spamming refresh endpoint
let refreshInFlight: Promise<boolean> | null = null;

async function request<T>(path: string, options = {}) {
  let res = await fetch(path, { credentials: "include", ... });

  // 401 → try refresh once, then retry original request
  if (res.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();  // POST /api/mobile/auth/token/refresh
    if (refreshed) {
      return request<T>(path, { ...options, skipAuthRefresh: true });
    }
    // Refresh failed → let 401 bubble up (AuthContext signs out)
  }

  // Parse JSON envelope { status, message, data }
  const json = await res.json();
  if (!res.ok) throw new ApiError(json.message, res.status);
  return json.data;  // Return unwrapped data
}
```

---

### **Key File Paths Summary**

**Authentication Flow:**
- [src/auth.ts](../src/auth.ts) - NextAuth config
- [src/proxy.ts](../src/proxy.ts) - Middleware (route protection)
- [src/app/api/auth/social-complete/route.ts](../src/app/api/auth/social-complete/route.ts) - OAuth bridge
- [src/app/context/AuthContext.tsx](../src/app/context/AuthContext.tsx) - Global state

**API Layer:**
- [src/app/lib/config.ts](../src/app/lib/config.ts) - Environment config
- [src/app/lib/api/client.ts](../src/app/lib/api/client.ts) - Browser API client
- [src/app/lib/api/proxy.ts](../src/app/lib/api/proxy.ts) - Server proxy helper
- [src/app/lib/api/endpoints.ts](../src/app/lib/api/endpoints.ts) - Endpoint registry
- [src/app/lib/api/types.ts](../src/app/lib/api/types.ts) - TypeScript interfaces

**Main Pages:**
- [src/app/home/page.tsx](../src/app/home/page.tsx) - Social feed (1824 lines)
- [src/app/jobs/page.tsx](../src/app/jobs/page.tsx) - Job listings (2052 lines)
- [src/app/events/page.tsx](../src/app/events/page.tsx) - Event listings (1728 lines)
- [src/app/auth/stepper/page.tsx](../src/app/auth/stepper/page.tsx) - Profile wizard (301 lines)

---

**End of Documentation**

---

This comprehensive documentation covers the entire demoYP codebase architecture, authentication flows, API integration patterns, component structure, and data flow. The application is a sophisticated full-stack Next.js 16 platform with dual authentication systems, optimistic UI updates, Stripe payment integration, and a comprehensive social/professional networking feature set.
