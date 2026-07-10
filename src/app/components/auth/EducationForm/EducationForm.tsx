"use client";

import { useMemo } from "react";
import SelectField from "@/app/components/ui/SelectField/SelectField";
import Button from "@/app/components/ui/Button/Button";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import type { InstitutionsData, SkillsData } from "@/app/lib/api/types";
import styles from "./EducationForm.module.css";

export interface EducationFormData {
  placeOfStudy: string;
  education: string;
  startDate: string;
  endDate: string;
  additionalSkills: string;
}

export const EDUCATION_OPTIONS = [
  { value: "apprenticeship", label: "Apprenticeship" },
  { value: "degree", label: "Degree" },
  { value: "a_level", label: "A level" },
  { value: "gcse", label: "GCSE" },
  { value: "school", label: "School" },
];

const START_DATE_OPTIONS = Array.from({ length: 2026 - 1970 + 1 }, (_, i) => {
  const y = String(2026 - i);
  return { value: y, label: y };
});

const ALL_YEARS = Array.from({ length: 2026 - 1970 + 1 }, (_, i) => {
  const y = String(2026 - i);
  return { value: y, label: y };
});

const DEFAULT_END_DATE_OPTIONS = [...ALL_YEARS];

interface EducationFormProps {
  onNext: () => void;
  onBack: () => void;
  formData: EducationFormData;
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export default function EducationForm({
  onNext,
  onBack,
  formData,
  onFormChange,
}: EducationFormProps) {
  const { data: institutionsData, loading: institutionsLoading } =
    useApi<InstitutionsData>({
      key: ["institutions"],
      url: endpoints.data.institutions,
      enabled: true,
    });

  const { data: skillsData, loading: skillsLoading } = useApi<SkillsData>({
    key: ["skills"],
    url: endpoints.data.skills,
    enabled: true,
  });

  const PLACE_OPTIONS = useMemo(
    () =>
      (institutionsData?.institutions ?? []).map((inst) => ({
        value: inst.id,
        label: inst.name,
      })),
    [institutionsData]
  );

  const SKILLS_OPTIONS = useMemo(
    () =>
      (skillsData?.skills ?? []).map((sk) => ({
        value: sk.id,
        label: sk.name,
      })),
    [skillsData]
  );

  const endDateOptions = formData.startDate
    ? Array.from({ length: 5 }, (_, i) => {
        const y = String(parseInt(formData.startDate, 10) + i + 1);
        return { value: y, label: y };
      })
    : DEFAULT_END_DATE_OPTIONS;

  const allFilled =
    formData.placeOfStudy !== "" &&
    formData.education !== "" &&
    formData.startDate.trim() !== "" &&
    formData.endDate !== "" &&
    formData.additionalSkills !== "";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    onFormChange(e);
    // If startDate changed, reset endDate if it's no longer > startDate
    if (name === "startDate" && formData.endDate) {
      if (parseInt(formData.endDate, 10) <= parseInt(value, 10)) {
        onFormChange({
          target: { name: "endDate", value: "" },
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    }
  }

  /**
   * Same custom-skill-add behaviour as EditSkillsModal on the profile page.
   * Skill typed in the search box that doesn't exist in the backend list
   * is appended to `additionalSkills` as the raw name. SKILLS_OPTIONS is
   * NOT mutated — the dropdown list remains backend-driven.
   * resolveSkillNames() in the stepper already falls back to the raw ID
   * when it's not in skillsData, so custom names flow through to the
   * API payload correctly.
   */
  function handleAddCustomSkill(name: string) {
    const current = formData.additionalSkills.split(",").filter(Boolean);
    if (current.length >= 5) return;
    const normalized = name.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    const dupe = current.some((id) => {
      const opt = SKILLS_OPTIONS.find((o) => o.value === id);
      const label = opt?.label ?? id;
      return label.toLowerCase() === lower;
    });
    if (dupe) return;
    const next = [...current, normalized].join(",");
    onFormChange({
      target: { name: "additionalSkills", value: next },
    } as React.ChangeEvent<HTMLSelectElement>);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;
    onNext();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>Education</h2>
      <p className={styles.subtitle}>
        Mention your education background
      </p>

      <div className={styles.fieldWrapper}>
        <SelectField
          label="Place of Study"
          name="placeOfStudy"
          value={formData.placeOfStudy}
          onChange={handleChange}
          options={PLACE_OPTIONS}
          placeholder={
            institutionsLoading ? "Loading institutions..." : "Place of Study*"
          }
          searchable
          loading={institutionsLoading}
          searchPlaceholder="Search Institutions..."
          optionIcon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
            </svg>
          }
        />
      </div>

      <div className={styles.fieldWrapper}>
        <SelectField
          label="Education"
          name="education"
          value={formData.education}
          onChange={handleChange}
          options={EDUCATION_OPTIONS}
          placeholder="Education*"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.halfField}>
          <SelectField
            label="Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            options={START_DATE_OPTIONS}
            placeholder="Start Date*"
            clearable={false}
          />
        </div>
        <div className={styles.halfField}>
          <SelectField
            label="End Date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            options={endDateOptions}
            placeholder="End Date*"
            clearable={false}
          />
        </div>
      </div>

      <div className={styles.fieldWrapper}>
        <SelectField
          label="Additional Skills"
          name="additionalSkills"
          value={formData.additionalSkills}
          onChange={handleChange}
          options={SKILLS_OPTIONS}
          placeholder={
            skillsLoading ? "Loading skills..." : "Additional Skills*"
          }
          searchable
          loading={skillsLoading}
          searchPlaceholder="Search Skills..."
          multi
          maxSelections={5}
          onAddCustom={handleAddCustomSkill}
        />
      </div>

      <div className={styles.buttonWrapper}>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </button>
          <div className={styles.continueBtn}>
            <Button type="submit" variant="primary" disabled={!allFilled}>
              Save &amp; Continue
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
