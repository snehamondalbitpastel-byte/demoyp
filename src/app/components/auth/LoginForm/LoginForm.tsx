"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginSchema, type LoginFormData } from "@/app/lib/validations/auth";
import { authApi } from "@/app/lib/api/auth";
import { ApiError } from "@/app/lib/api/client";
import InputField from "@/app/components/ui/InputField/InputField";
import Button from "@/app/components/ui/Button/Button";
import SocialLoginSection from "@/app/components/auth/SocialLoginSection/SocialLoginSection";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onToggle: () => void;
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function LoginForm({ onToggle }: LoginFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const fieldSchema = loginSchema.shape[name as keyof LoginFormData];
    if (!fieldSchema) return;

    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [name]: result.error.issues[0]?.message,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginFormData;
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const email = formData.email.trim();
    try {
      const loginData = await authApi.login({
        login_type: "system",
        identifier: "email",
        value: email,
        password: formData.password,
      });

      // The backend sends the 2FA OTP automatically on login.
      toast.success("OTP sent to your email");

      const params = new URLSearchParams({
        userId: loginData.user.id,
        purpose: "TWO_FACTOR",
        email,
      });
      router.replace(`/otp?${params.toString()}`);
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
      <div className={styles.fieldWrapper}>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          icon={<MailIcon />}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Password"
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          showToggle
          icon={<LockIcon />}
        />
      </div>

      <a href="/auth/forgot-password" className={styles.forgotLink}>
        Forgot password?
      </a>

      <div className={styles.fieldWrapper} style={{ marginTop: "2vh" }}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </Button>
      </div>

      <SocialLoginSection />

      <p className={styles.toggleText}>
        Don&apos;t have an account?{" "}
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggle}
          /* Suppress `fdprocessedid` mismatch from autofill extensions
             that tag this button on the client before React hydrates. */
          suppressHydrationWarning
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
