"use client";

import { useEffect, useState } from "react";
import AuthCard from "@/app/components/auth/AuthCard/AuthCard";
import LoginForm from "@/app/components/auth/LoginForm/LoginForm";
import SignupForm from "@/app/components/auth/SignupForm/SignupForm";
import BgGlow from "@/app/components/ui/BgGlow";
import styles from "./auth.module.css";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signup");

  // Force re-render when the page is restored from the browser's
  // back-forward cache (bfcache). Without this, React event handlers
  // can become stale after back-navigation and the toggle stops working.
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) forceUpdate((n) => n + 1);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.bgEllipse1} />
      <div className={styles.bgEllipse2} />
      <BgGlow />

      <AuthCard>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoYoung}>YOUNG</span>
          <span className={styles.logoPro}>PRO</span>
        </div>

        {/* Title */}
        <h1 className={styles.title}>
          {mode === "login" ? "Welcome Back" : "Let\u2019s Get Started"}
        </h1>

        {/* Sign up / Login toggle.
            `suppressHydrationWarning` is set on both toggle buttons because
            form-filler / password-manager browser extensions inject a
            `fdprocessedid="…"` attribute onto every <button> they detect
            BEFORE React hydrates. React then sees an attribute on the
            client that wasn't in the server HTML and flags a hydration
            mismatch. Suppressing the warning at the leaf level is the
            React-recommended workaround for extension-injected attrs —
            our own props are still compared against the SSR output
            elsewhere, so this scope is intentionally narrow. */}
        <div className={styles.toggle}>
          <button
            type="button"
            className={`${styles.toggleTab} ${mode === "signup" ? styles.toggleTabActive : ""}`}
            onClick={() => setMode("signup")}
            suppressHydrationWarning
          >
            Sign up
          </button>
          <button
            type="button"
            className={`${styles.toggleTab} ${mode === "login" ? styles.toggleTabActive : ""}`}
            onClick={() => setMode("login")}
            suppressHydrationWarning
          >
            Login
          </button>
        </div>

        {mode === "login" && (
          <LoginForm onToggle={() => setMode("signup")} />
        )}

        {mode === "signup" && (
          <SignupForm onToggle={() => setMode("login")} />
        )}
      </AuthCard>
    </div>
  );
}
