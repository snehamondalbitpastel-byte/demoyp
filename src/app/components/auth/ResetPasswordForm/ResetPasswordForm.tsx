"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/app/lib/api/auth";
import { ApiError } from "@/app/lib/api/client";
import InputField from "@/app/components/ui/InputField/InputField";
import Button from "@/app/components/ui/Button/Button";
import styles from "./ResetPasswordForm.module.css";

const RESEND_COOLDOWN_SECONDS = 90;

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local}*@${domain}`;
  const visible = local.slice(0, 3);
  const hiddenLen = Math.max(local.length - 3, 3);
  return `${visible}${"*".repeat(hiddenLen)}@${domain}`;
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get("email") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const maskedEmail = maskEmail(emailParam);

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  // Guard: if no email, bounce to forgot-password
  useEffect(() => {
    if (!emailParam) {
      toast.error("Please enter your email first.");
      router.replace("/auth/forgot-password");
    }
  }, [emailParam, router]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    setError("");
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleResend() {
    if (secondsLeft > 0 || resending) return;
    if (!emailParam) {
      toast.error("Cannot resend — email is missing.");
      return;
    }
    setResending(true);
    try {
      await authApi.forgotPassword({
        identifier: "email",
        value: emailParam,
      });
      toast.success("A new code has been sent to your email");
      setOtp(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not resend code. Please try again.";
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!userId) {
      setError("Session expired. Please go back and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword({
        user_id: userId,
        otp: code,
        new_password: newPassword,
      });

      toast.success("Password reset successful! Please login with your new password.");
      router.push("/auth");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to reset password. Please try again.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.heading}>Reset Password</h2>
      <p className={styles.subtitle}>
        {maskedEmail
          ? <>Please enter a six digit code sent on your <strong>{maskedEmail}</strong> for verification</>
          : "Please enter the six digit code sent to your email for verification"}
      </p>

      <p className={styles.codeLabel}>Enter your verification code</p>

      <div className={styles.otpGroup} onPaste={handleOtpPaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className={`${styles.otpInput} ${error ? styles.otpInputError : ""}`}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <p className={styles.resendText}>
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          className={styles.resendBtn}
          onClick={handleResend}
          disabled={resending || secondsLeft > 0}
        >
          {secondsLeft > 0
            ? `Resend in ${secondsLeft}s`
            : resending
              ? "Sending..."
              : "Resend OTP"}
        </button>
      </p>

      <div className={styles.fieldWrapper}>
        <InputField
          label="New Password"
          name="newPassword"
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
          showToggle
          icon={<LockIcon />}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
          onBlur={() => {
            if (confirmPassword && newPassword && confirmPassword !== newPassword) {
              setError("Passwords do not match");
            }
          }}
          error={
            confirmPassword && newPassword && confirmPassword !== newPassword
              ? "Passwords do not match"
              : undefined
          }
          showToggle
          icon={<LockIcon />}
        />
      </div>

      <div className={styles.buttonWrapper}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Resetting..." : "Reset Password!"}
        </Button>
      </div>

      <p className={styles.backText}>
        Remember your password?{" "}
        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push("/auth")}
        >
          Login
        </button>
      </p>
    </form>
  );
}
