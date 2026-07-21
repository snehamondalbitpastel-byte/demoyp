"use client";

import { useEffect, useMemo, useState } from "react";
import SelectField from "@/app/components/ui/SelectField/SelectField";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import { EDUCATION_OPTIONS } from "@/app/components/auth/EducationForm/EducationForm";
import type { InstitutionsData } from "@/app/lib/api/types";
import styles from "./EditEducationModal.module.css";

interface EditEducationModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with API-ready payload (names, not IDs). */
  onSave: (payload: EducationUpdatePayload) => Promise<void> | void;
  initial: EducationFormValues;
}

export interface EducationFormValues {
  placeOfStudy: string; // institution name or id
  education: string; // degree value or label
  startYear: string;
  endYear: string;
}

/** Shape sent to the backend update-profile endpoint. */
export interface EducationUpdatePayload {
  place_of_study: string;
  education: string;
  start_year: string;
  end_year: string;
}

const YEAR_OPTIONS = Array.from({ length: 2026 - 1970 + 1 }, (_, i) => {
  const y = String(2026 - i);
  return { value: y, label: y };
});

export default function EditEducationModal({
  open,
  onClose,
  onSave,
  initial,
}: EditEducationModalProps) {
  const [formData, setFormData] = useState<EducationFormValues>(initial);

  // Reset form when modal opens with fresh data.
  useEffect(() => {
    if (open) setFormData(initial);
  }, [open, initial]);

  // Fetch institutions (same endpoint + caching as stepper).
  const { data: institutionsData, loading: institutionsLoading } =
    useApi<InstitutionsData>({
      key: ["institutions"],
      url: endpoints.data.institutions,
      enabled: open,
    });

  const PLACE_OPTIONS = useMemo(
    () =>
      (institutionsData?.institutions ?? []).map((inst) => ({
        value: inst.id,
        label: inst.name,
      })),
    [institutionsData]
  );

  // If initial.placeOfStudy is a name (not an id), map it to the matching id
  // so the dropdown shows it as selected.
  useEffect(() => {
    if (!open || PLACE_OPTIONS.length === 0) return;
    if (!formData.placeOfStudy) return;
    // Already an id that exists in options → nothing to do.
    const asId = PLACE_OPTIONS.find((o) => o.value === formData.placeOfStudy);
    if (asId) return;
    // Otherwise try to match by label (name).
    const byName = PLACE_OPTIONS.find(
      (o) => o.label.toLowerCase() === formData.placeOfStudy.toLowerCase()
    );
    if (byName) {
      setFormData((prev) => ({ ...prev, placeOfStudy: byName.value }));
    }
  }, [open, PLACE_OPTIONS, formData.placeOfStudy]);

  // Same: map education value from label if needed.
  useEffect(() => {
    if (!open || !formData.education) return;
    const byValue = EDUCATION_OPTIONS.find((o) => o.value === formData.education);
    if (byValue) return;
    const byLabel = EDUCATION_OPTIONS.find(
      (o) => o.label.toLowerCase() === formData.education.toLowerCase()
    );
    if (byLabel) {
      setFormData((prev) => ({ ...prev, education: byLabel.value }));
    }
  }, [open, formData.education]);

  // Show all years strictly greater than startYear (so saved end years
  // outside a 5-year window still match and display correctly on edit).
  const endYearOptions = formData.startYear
    ? YEAR_OPTIONS.filter(
        (y) => parseInt(y.value, 10) > parseInt(formData.startYear, 10)
      )
    : YEAR_OPTIONS;

  const allFilled =
    formData.placeOfStudy.trim() !== "" &&
    formData.education.trim() !== "" &&
    formData.startYear.trim() !== "" &&
    formData.endYear.trim() !== "";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "startYear" && prev.endYear) {
        if (parseInt(prev.endYear, 10) <= parseInt(value, 10)) {
          next.endYear = "";
        }
      }
      return next;
    });
  }

  async function handleSave() {
    if (!allFilled) return;
    // Resolve IDs/values → display names that the backend expects.
    const placeLabel =
      PLACE_OPTIONS.find((o) => o.value === formData.placeOfStudy)?.label ||
      formData.placeOfStudy;
    const educationLabel =
      EDUCATION_OPTIONS.find((o) => o.value === formData.education)?.label ||
      formData.education;

    await onSave({
      place_of_study: placeLabel,
      education: educationLabel,
      start_year: formData.startYear,
      end_year: formData.endYear,
    });
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Education Details</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>
            NEW University <span className={styles.required}>*</span>
            </label>
            <SelectField
              label="Select University"
              name="placeOfStudy"
              value={formData.placeOfStudy}
              onChange={handleChange}
              options={PLACE_OPTIONS}
              placeholder={
                institutionsLoading ? "Loading institutions..." : "Select University"
              }
              searchable
              loading={institutionsLoading}
              searchPlaceholder="Search Institutions..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Education <span className={styles.required}>*</span>
            </label>
            <SelectField
              label="Education / Degree"
              name="education"
              value={formData.education}
              onChange={handleChange}
              options={EDUCATION_OPTIONS}
              placeholder="Select Degree"
              searchable
              searchPlaceholder="Search degrees..."
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                Start Year <span className={styles.required}>*</span>
              </label>
              <SelectField
                label="Start Year"
                name="startYear"
                value={formData.startYear}
                onChange={handleChange}
                options={YEAR_OPTIONS}
                placeholder="Start Year"
                forceUp
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                End Year <span className={styles.required}>*</span>
              </label>
              <SelectField
                label="End Year"
                name="endYear"
                value={formData.endYear}
                onChange={handleChange}
                options={endYearOptions}
                placeholder="End Year"
                forceUp
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!allFilled}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
