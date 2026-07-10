/**
 * Shared API types matching the YoungPro backend response envelope.
 *
 * Every endpoint returns:
 *   { status: "OK" | "ERROR", message: string, data: T }
 */

export type ApiStatus = "OK" | "ERROR";

export interface ApiEnvelope<T = unknown> {
  status: ApiStatus;
  message: string;
  data: T;
}

/**
 * Thrown by the API client when a request fails (non-2xx, network error,
 * or backend responded with status: "ERROR").
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

// ─── Generic reference types ────────────────────────────────────────────────

/**
 * Generic { id, name } option returned by most reference endpoints
 * (locations, skills, institutions, …). The `id` is an opaque encrypted
 * string that the backend expects back when the user submits a form.
 */
export interface IdNameOption {
  id: string;
  name: string;
}

export type UserLocation = IdNameOption;
export type Institution = IdNameOption;
export type Skill = IdNameOption;

export interface UserLocationsData {
  location: UserLocation[];
}

export interface InstitutionsData {
  institutions: Institution[];
}

export interface SkillsData {
  skills: Skill[];
}

// ─── Auth domain types ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_name: string | null;
  role: string;
  profile_completion_status: string;
  profile_image_url: string | null;
  is_2fa_enabled: boolean;
  is_social_user: boolean;
  auth_provider: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  theme_settings: string;
  terms_accepted?: boolean;
  is_suspended: boolean;
}

export type OtpPurpose = "SIGNUP" | "TWO_FACTOR" | "FORGOT_PASSWORD";

export interface SignupRequest {
  signup_type: "system" | "social";
  auth_provider?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface SignupResponse {
  verification_status: boolean;
  user: AuthUser;
}

export interface VerifyOtpRequest {
  purpose: OtpPurpose;
  user_id: string;
  otp: string;
}

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

export interface ResendOtpResponse {
  verification_status: boolean;
}

export interface ForgotPasswordRequest {
  identifier: "email" | "phone";
  value: string;
}

export interface ForgotPasswordResponse {
  verification_status: boolean;
  user: Pick<AuthUser, "id">;
}

export interface ChangePasswordRequest {
  user_id: string;
  otp: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  [key: string]: never;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}
