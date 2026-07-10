"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/app/lib/api/auth";
import { ApiError } from "@/app/lib/api/client";
import InputField from "@/app/components/ui/InputField/InputField";
import Button from "@/app/components/ui/Button/Button";
import styles from "./ForgotPasswordForm.module.css";

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.forgotPassword({
        identifier: "email",
        value: trimmed,
      });

      toast.success("Verification code sent to your email");

      const params = new URLSearchParams({
        email: trimmed,
        userId: data.user.id,
      });
      router.push(`/auth/reset-password?${params.toString()}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.heading}>Forgot Password?</h2>
      <p className={styles.subtitle}>
        Enter your email address. We will send you a verification code to reset your password.
      </p>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={handleChange}
          icon={<MailIcon />}
        />
      </div>

      <div className={styles.buttonWrapper}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Sending..." : "Send Verification Code"}
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
