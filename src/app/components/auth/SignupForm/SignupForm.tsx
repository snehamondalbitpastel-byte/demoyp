"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signupSchema, signupFieldSchemas, type SignupFormData } from "@/app/lib/validations/auth";
import { authApi } from "@/app/lib/api/auth";
import { ApiError } from "@/app/lib/api/client";
import InputField from "@/app/components/ui/InputField/InputField";
import Button from "@/app/components/ui/Button/Button";
import SocialLoginSection from "@/app/components/auth/SocialLoginSection/SocialLoginSection";
import styles from "./SignupForm.module.css";

interface SignupFormProps {
  onToggle: () => void;
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
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

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13L2 4" />
    </svg>
  );
}

export default function SignupForm({ onToggle }: SignupFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<SignupFormData>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof SignupFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    // confirm_password uses cross-field .refine(), validate manually.
    if (name === "confirm_password") {
      if (value && formData.password && value !== formData.password) {
        setErrors((prev) => ({ ...prev, confirm_password: "Passwords do not match" }));
      } else {
        setErrors((prev) => ({ ...prev, confirm_password: undefined }));
      }
      return;
    }

    const fieldSchema = signupFieldSchemas[name as keyof typeof signupFieldSchemas];
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

    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SignupFormData;
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.signup({
        signup_type: "system",
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        password: formData.confirm_password,
      });

      toast.success("OTP sent to your email");

      const params = new URLSearchParams({
        userId: data.user.id,
        purpose: "SIGNUP",
        email: data.user.email,
      });
      router.replace(`/otp?${params.toString()}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.nameRow}>
        <div className={styles.nameField}>
          <InputField
            label="First Name"
            name="first_name"
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.first_name}
            icon={<UserIcon />}
          />
        </div>
        <div className={styles.nameField}>
          <InputField
            label="Last Name"
            name="last_name"
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.last_name}
            icon={<UserIcon />}
          />
        </div>
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Email Id"
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
          showInfoTooltip
          icon={<LockIcon />}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Confirm Password"
          name="confirm_password"
          type="password"
          placeholder="Confirm Password"
          value={formData.confirm_password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirm_password}
          showToggle
          icon={<LockIcon />}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Signing up..." : "Sign up"}
        </Button>
      </div>

      <SocialLoginSection />

      <p className={styles.toggleText}>
        Already have an account?{" "}
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggle}
          /* Suppress `fdprocessedid` mismatch from autofill extensions
             that tag this button on the client before React hydrates. */
          suppressHydrationWarning
        >
          Login
        </button>
      </p>
    </form>
  );
}
