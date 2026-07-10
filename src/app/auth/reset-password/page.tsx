"use client";

import { Suspense } from "react";
import AuthCard from "@/app/components/auth/AuthCard/AuthCard";
import ResetPasswordForm from "@/app/components/auth/ResetPasswordForm/ResetPasswordForm";
import BgGlow from "@/app/components/ui/BgGlow";
import authStyles from "../auth.module.css";

export default function ResetPasswordPage() {
  return (
    <div className={authStyles.page}>
      <div className={authStyles.bgEllipse1} />
      <div className={authStyles.bgEllipse2} />
      <BgGlow />

      <AuthCard>
        {/* Logo */}
        <div className={authStyles.logo}>
          <span className={authStyles.logoYoung}>YOUNG</span>
          <span className={authStyles.logoPro}>PRO</span>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
