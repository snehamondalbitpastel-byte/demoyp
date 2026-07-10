"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import AuthCard from "@/app/components/auth/AuthCard/AuthCard";
import StepperHeader from "@/app/components/auth/StepperHeader/StepperHeader";
import AboutForm, {
  type AboutFormData,
} from "@/app/components/auth/AboutForm/AboutForm";
import EducationForm, {
  type EducationFormData,
  EDUCATION_OPTIONS,
} from "@/app/components/auth/EducationForm/EducationForm";
import ProfileImageForm from "@/app/components/auth/ProfileImageForm/ProfileImageForm";
import BgGlow from "@/app/components/ui/BgGlow";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import type {
  UserLocationsData,
  InstitutionsData,
  SkillsData,
} from "@/app/lib/api/types";
import authStyles from "../auth.module.css";
import styles from "./stepper.module.css";

const STEP_PERCENTAGES = [0, 33, 67];

export default function StepperPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [percentage, setPercentage] = useState(0);

  // Auth guard — prevent browser back button from going to login/OTP pages.
  // If cookies are cleared (manually from Application tab), redirect to login.
  useEffect(() => {
    window.history.replaceState(null, "", "/auth/stepper");
    window.history.pushState(null, "", "/auth/stepper");

    function handlePopState() {
      // profile_completed is not HttpOnly — if it's gone, all cookies were cleared.
      if (!document.cookie.includes("profile_completed")) {
        window.location.replace("/auth");
        return;
      }
      window.history.pushState(null, "", "/auth/stepper");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── Lifted form state ──
  const [aboutData, setAboutData] = useState<AboutFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    dob: "",
    gender: "",
  });

  // Pre-fill name and email from the logged-in user's signup/login data.
  useEffect(() => {
    if (user) {
      setAboutData((prev) => ({
        ...prev,
        firstName: prev.firstName || user.first_name || "",
        lastName: prev.lastName || user.last_name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const [educationData, setEducationData] = useState<EducationFormData>({
    placeOfStudy: "",
    education: "",
    startDate: "",
    endDate: "",
    additionalSkills: "",
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);

  // ── Prefetch dropdown data (also used for ID → name resolution) ──
  const { data: locationsData } = useApi<UserLocationsData>({
    key: ["userLocations"],
    url: endpoints.data.userLocations,
  });
  const { data: institutionsData } = useApi<InstitutionsData>({
    key: ["institutions"],
    url: endpoints.data.institutions,
  });
  const { data: skillsData } = useApi<SkillsData>({
    key: ["skills"],
    url: endpoints.data.skills,
  });

  // ── Generic field updater ──
  function handleAboutChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setAboutData((prev) => ({ ...prev, [name]: value }));
  }

  function handleEducationChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setEducationData((prev) => ({ ...prev, [name]: value }));
  }

  // ── Navigation ──
  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  // ── Resolve IDs to names for the API payload ──
  function resolveLocationName(): string {
    const loc = locationsData?.location?.find(
      (l) => l.id === aboutData.location
    );
    return loc?.name ?? aboutData.location;
  }

  function resolvePlaceOfStudyName(): string {
    const inst = institutionsData?.institutions?.find(
      (i) => i.id === educationData.placeOfStudy
    );
    return inst?.name ?? educationData.placeOfStudy;
  }

  function resolveEducationLabel(): string {
    const opt = EDUCATION_OPTIONS.find(
      (o) => o.value === educationData.education
    );
    return opt?.label ?? educationData.education;
  }

  function resolveSkillNames(): string {
    if (!educationData.additionalSkills) return "";
    const ids = educationData.additionalSkills.split(",").filter(Boolean);
    return ids
      .map((id) => {
        const sk = skillsData?.skills?.find((s) => s.id === id);
        return sk?.name ?? id;
      })
      .join(", ");
  }

  function capitalizeGender(): string {
    const g = aboutData.gender;
    if (!g) return "";
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  function formatStartYear(): string {
    return educationData.startDate
      ? `01-01-${educationData.startDate}`
      : "";
  }

  function formatEndYear(): string {
    return educationData.endDate
      ? `01-01-${educationData.endDate}`
      : "";
  }

  // ── Submit create-profile API ──
  async function handleProfileSubmit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("first_name", aboutData.firstName.trim());
      fd.append("last_name", aboutData.lastName.trim());
      fd.append("email", aboutData.email.trim());
      fd.append("phone_number", aboutData.phone);
      fd.append("location", resolveLocationName());
      fd.append("dob", aboutData.dob); // DatePicker already stores DD/MM/YYYY
      fd.append("gender", capitalizeGender());
      fd.append("place_of_study", resolvePlaceOfStudyName());
      fd.append("education", resolveEducationLabel());
      fd.append("start_year", formatStartYear());
      fd.append("end_year", formatEndYear());
      fd.append("skills", resolveSkillNames());
      fd.append("additional_skills", resolveSkillNames());
      if (profileImage) {
        fd.append("profile_image", profileImage);
      }

      const res = await fetch(endpoints.profile.createProfile, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const text = await res.text();
      let json: { status?: string; message?: string; data?: import("@/app/lib/api/types").AuthUser } | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        // not JSON
      }

      if (!res.ok || json?.status !== "OK") {
        throw new Error(
          json?.message || `Request failed with status ${res.status}`
        );
      }

      // Store the profile data in AuthContext so Navbar can use it.
      if (json?.data) {
        setUser(json.data);
      }

      // Success — fill progress bar to 100%.
      setPercentage(100);
      toast.success("Profile created successfully.");

      // Brief pause to show the 100% bar, then redirect.
      setTimeout(() => {
        router.replace("/home");
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  const currentPercentage =
    percentage === 100 ? 100 : STEP_PERCENTAGES[currentStep];

  return (
    <div className={authStyles.page}>
      <div className={authStyles.bgEllipse1} />
      <div className={authStyles.bgEllipse2} />
      <BgGlow />

      <AuthCard className={styles.stepperCard}>
        {/* Logo */}
        <div className={`${authStyles.logo} ${styles.stepperLogo}`}>
          <span
            className={`${authStyles.logoYoung} ${styles.stepperLogoYoung}`}
          >
            YOUNG
          </span>
          <span
            className={`${authStyles.logoPro} ${styles.stepperLogoPro}`}
          >
            PRO
          </span>
        </div>

        {/* Stepper Header */}
        <StepperHeader
          activeStep={currentStep}
          totalSteps={3}
          percentage={currentPercentage}
        />

        {/* Step Content */}
        {currentStep === 0 && (
          <AboutForm
            onNext={handleNext}
            formData={aboutData}
            onFormChange={handleAboutChange}
          />
        )}
        {currentStep === 1 && (
          <EducationForm
            onNext={handleNext}
            onBack={handleBack}
            formData={educationData}
            onFormChange={handleEducationChange}
          />
        )}
        {currentStep === 2 && (
          <ProfileImageForm
            onNext={handleProfileSubmit}
            onBack={handleBack}
            profileImage={profileImage}
            onProfileImageChange={setProfileImage}
            submitting={submitting}
          />
        )}
      </AuthCard>
    </div>
  );
}
