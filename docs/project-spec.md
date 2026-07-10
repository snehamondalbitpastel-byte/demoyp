# Young Pro – Auth Module Spec

## 1. Core Architecture (CRITICAL)

- Auth is a SINGLE page: /auth
- Login and Signup are NOT separate pages
- Both are toggled views inside same layout

## Default Behavior
- Default view: Login
- Toggle → Signup
- No route change

---

## 2. Screens Flow

1. Auth (Login/Signup toggle)
2. OTP Verification
3. Onboarding Stepper

---

## 3. UI Layout

- Fullscreen dark gradient background
- Centered glassmorphism card
- Rounded corners
- Soft glow effects

---

## 4. Components Required

### Shared UI
- InputField
- Button
- SocialButton
- ToggleSwitch

### Auth Specific
- LoginForm
- SignupForm
- AuthCard
- SocialLoginSection

---

## 5. Login Fields

- Email
- Password

---

## 6. Signup Fields

- Name
- Phone
- Email
- Password
- Confirm Password

---

## 7. Validation Rules (ZOD)

### Email
- Must be valid format
- Domain must be lowercase

### Password
- Min 8 characters
- 1 uppercase
- 1 lowercase
- 1 number
- 1 special character

### Confirm Password
- Must match password

### Errors
- Inline error messages
- Red color text

---

## 8. Password UX

- Eye icon → show/hide password
- Info icon (hover):
  - Show password requirements tooltip

---

## 9. Social Login

- Google
- Apple
- LinkedIn

- Horizontal alignment
- Equal width buttons
- Icon + text

---

## 10. Behavior

- Form validation before submit
- On success → navigate to /otp
- No API (simulate success)

---

## 11. Tech Rules

- Next.js (App Router)
- TypeScript
- CSS Modules
- Bootstrap (layout only)
- Zod (validation)

---

## 12. Important Rules

- Do NOT create separate login/signup pages
- Use conditional rendering
- Reusable components only
- Clean scalable structure

## 13. Component Architecture Guidelines

- Identify reusable components based on UI repetition and similarity
- Avoid unnecessary abstraction for one-time components
- Group components logically (UI / Auth / Feature-based)

- Prefer modular and scalable structure
- Use CSS Modules (no inline styles)

- Maintain separation of concerns:
  - UI (presentation)
  - Logic (state/validation)

## 14. State Management

- Use React useState for form state
- Use controlled inputs
- Manage toggle state inside Auth page

Example:
- mode = "login" | "signup"

- if mode === "login" → show LoginForm
- if mode === "signup" → show SignupForm  
## 15. UI Accuracy Rules

- Match Figma spacing, alignment, and proportions closely
- Maintain consistent padding and margins
- Use responsive layout (centered card for all screen sizes)
- Preserve visual hierarchy (heading → form → actions)

- Avoid arbitrary spacing or guesswork
- Follow MCP design strictly for UI details