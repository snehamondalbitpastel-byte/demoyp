"use client";

import AuthCard from "@/app/components/auth/AuthCard/AuthCard";
import ForgotPasswordForm from "@/app/components/auth/ForgotPasswordForm/ForgotPasswordForm";
import BgGlow from "@/app/components/ui/BgGlow";
import authStyles from "../auth.module.css";

export default function ForgotPasswordPage() {
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

        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
