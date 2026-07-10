"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Button from "@/app/components/ui/Button/Button";
import { authApi } from "@/app/lib/api/auth";
import { ApiError } from "@/app/lib/api/client";
import { useAuth } from "@/app/context/AuthContext";
import type { OtpPurpose } from "@/app/lib/api/types";
import styles from "./OtpForm.module.css";

function isOtpPurpose(value: string | null): value is OtpPurpose {
  return value === "SIGNUP" || value === "TWO_FACTOR" || value === "FORGOT_PASSWORD";
}

/** Seconds the user must wait before they can request a new OTP. */
const RESEND_COOLDOWN_SECONDS = 90;

export default function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const userId = searchParams.get("userId") ?? "";
  const emailParam = searchParams.get("email") ?? "";
  const rawPurpose = searchParams.get("purpose");
  const purpose: OtpPurpose = isOtpPurpose(rawPurpose) ? rawPurpose : "SIGNUP";

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown for the "Resend in Xs" button. Ticks once per second until 0,
  // then the user can click Resend OTP.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  // Guard: if someone lands on /otp without a userId, bounce them to /auth.
  useEffect(() => {
    if (!userId) {
      toast.error("Session expired. Please sign up or log in again.");
      router.replace("/auth");
    }
  }, [userId, router]);

  function handleChange(index: number, value: string) {
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

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
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

  function handlePaste(e: React.ClipboardEvent) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.verifyOtp({
        purpose,
        user_id: userId,
        otp: code,
      });

      setUser(data.user);
      toast.success("Verification successful");

      // Redirect based on profile completion status.
      // "0" = incomplete → stepper, "1"/"200" = complete → home.
      const profileStatus = data.user?.profile_completion_status;
      const destination =
        profileStatus && profileStatus !== "0"
          ? "/home"
          : "/auth/stepper";
      router.replace(destination);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Invalid OTP. Please try again.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || resending) return;
    if (!emailParam) {
      toast.error("Cannot resend — email is missing. Please sign up again.");
      return;
    }
    setResending(true);
    try {
      await authApi.resendOtp({
        purpose,
        identifier: "email",
        value: emailParam,
        user_id: userId,
      });
      setOtp(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      toast.success("A new OTP has been sent to your email");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not resend OTP. Please try again.";
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  const maskedEmail = maskEmail(emailParam);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.subtitle}>
        {maskedEmail
          ? <>Please enter a six digit code sent on your <strong>{maskedEmail}</strong> for verification</>
          : "Please enter the six digit code sent to your email for verification"}
      </p>

      <div className={styles.otpGroup} onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
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

      <div className={styles.buttonWrapper}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Verifying..." : "Verify Code"}
        </Button>
      </div>
    </form>
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
