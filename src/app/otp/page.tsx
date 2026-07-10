"use client";

import { Suspense } from "react";
import AuthCard from "@/app/components/auth/AuthCard/AuthCard";
import OtpForm from "@/app/components/auth/OtpForm/OtpForm";
import BgGlow from "@/app/components/ui/BgGlow";
import authStyles from "../auth/auth.module.css";
import styles from "./otp.module.css";

export default function OtpPage() {
  return (
    <div className={`${authStyles.page} ${styles.otpPage}`}>
      <div className={authStyles.bgEllipse1} />
      <div className={authStyles.bgEllipse2} />
      <BgGlow />

      <AuthCard className={styles.otpCard}>
        {/* Logo */}
        <div className={authStyles.logo}>
          <span className={authStyles.logoYoung}>YOUNG</span>
          <span className={`${authStyles.logoPro} ${styles.logoProSpaced}`}>PRO</span>
        </div>

        {/* Title */}
        <h1 className={styles.title}>Verify Code</h1>

        <Suspense fallback={null}>
          <OtpForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
