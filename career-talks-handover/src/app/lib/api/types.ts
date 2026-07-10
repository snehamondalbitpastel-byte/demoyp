/* ================================================================
 * HANDOVER PACKAGE — Career Talks Module
 * File:    src/app/lib/api/types.ts
 * Role:    Minimal AuthUser interface for the standalone demo —
 *          enough fields for the mini-profile + navbar avatar.
 * COPY?:   ❌ DO NOT copy — the target project's `lib/api/types.ts`
 *          already defines the full AuthUser (and many other API
 *          types). The shape here is a subset; the real type is a
 *          superset, so career-talks code stays compatible.
 * ================================================================ */

/**
 * STANDALONE DEMO — Minimal type definitions.
 *
 * In the real project, this file contains the full set of API request/
 * response types. For the standalone demo we only need the `AuthUser`
 * type (referenced by career-talks pages) — everything else is omitted.
 */

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  user_name?: string | null;
  role: string;
  profile_completion_status?: string;
  profile_image_url: string | null;
  is_2fa_enabled?: boolean;
  is_social_user?: boolean;
  auth_provider?: string;
  status?: string;
  created_at?: string;
  updated_at?: string | null;
  theme_settings?: string;
  terms_accepted?: boolean;
  is_suspended?: boolean;
  // Extended profile fields read by the mini-profile
  education?: string;
  study_field?: string;
  location?: string;
}
