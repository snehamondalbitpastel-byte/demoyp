/**
 * Auth API module — typed wrappers around every auth endpoint.
 * Keep UI components free of raw fetch calls; they call these helpers.
 */

import { apiClient } from "./client";
import { endpoints } from "./endpoints";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  SignupRequest,
  SignupResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "./types";

export const authApi = {
  signup: (payload: SignupRequest) =>
    apiClient.post<SignupResponse>(endpoints.auth.signup, payload, {
      skipAuthRefresh: true,
    }),

  verifyOtp: (payload: VerifyOtpRequest) =>
    apiClient.post<VerifyOtpResponse>(endpoints.auth.verifyOtp, payload, {
      skipAuthRefresh: true,
    }),

  login: (payload: LoginRequest) =>
    apiClient.post<LoginResponse>(endpoints.auth.login, payload, {
      skipAuthRefresh: true,
    }),

  resendOtp: (payload: ResendOtpRequest) =>
    apiClient.post<ResendOtpResponse>(endpoints.auth.resendOtp, payload, {
      skipAuthRefresh: true,
    }),

  refreshToken: (payload: RefreshTokenRequest) =>
    apiClient.post<RefreshTokenResponse>(endpoints.auth.refreshToken, payload, {
      skipAuthRefresh: true,
    }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    apiClient.post<ForgotPasswordResponse>(endpoints.auth.forgotPassword, payload, {
      skipAuthRefresh: true,
    }),

  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.post<ChangePasswordResponse>(endpoints.auth.changePassword, payload, {
      skipAuthRefresh: true,
    }),
};
