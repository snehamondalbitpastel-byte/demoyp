/**
 * Centralized registry of API endpoint paths.
 *
 * These are **local Next.js proxy routes** on the same origin as the app
 * (e.g. `localhost:3000/api/mobile/auth/signup`). They mirror the real
 * backend paths for clarity. Each proxy route forwards the request to the
 * real backend on `BACKEND_URL` server-side.
 */

export const endpoints = {
  auth: {
    signup: "/api/mobile/auth/signup",
    verifyOtp: "/api/mobile/auth/verify-otp",
    login: "/api/mobile/auth/login",
    resendOtp: "/api/mobile/auth/resend-otp",
    refreshToken: "/api/mobile/auth/token/refresh",
    forgotPassword: "/api/mobile/auth/forgot-password",
    changePassword: "/api/mobile/auth/change-password",
    // TODO: add when available
    // logout: "/api/mobile/auth/logout",
  },
  profile: {
    createProfile: "/api/mobile/V1/create-profile",
    updateProfile: "/api/mobile/update-profile",
    uploadProfileImg: "/api/mobile/V1/upload-profile-img",
    profile: "/api/mobile/profile",
  },
  data: {
    userLocations: "/api/mobile/user-locations",
    institutions: "/api/mobile/institutions",
    skills: "/api/mobile/skills",
  },
} as const;
