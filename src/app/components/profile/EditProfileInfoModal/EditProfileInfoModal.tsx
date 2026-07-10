"use client";

import { useEffect, useMemo, useState } from "react";
import InputField from "@/app/components/ui/InputField/InputField";
import SelectField from "@/app/components/ui/SelectField/SelectField";
import DatePicker from "@/app/components/ui/DatePicker/DatePicker";
import PhoneInputField from "@/app/components/ui/PhoneInputField/PhoneInputField";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import type { UserLocationsData } from "@/app/lib/api/types";
import styles from "./EditProfileInfoModal.module.css";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

interface EditProfileInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: ProfileInfoUpdatePayload) => Promise<void> | void;
  initial: ProfileInfoFormValues;
}

export interface ProfileInfoFormValues {
  firstName: string;
  lastName: string;
  location: string; // may be a name from API or an id after user changes it
  email: string;
  phone: string;
  dob: string; // DD/MM/YYYY (DatePicker format)
  gender: string; // lowercase value or capitalized label from API
}

export interface ProfileInfoUpdatePayload {
  first_name: string;
  last_name: string;
  location: string;
  email: string;
  phone_number: string;
  dob: string; // DD-MM-YYYY for backend
  gender: string; // Capitalized (Male/Female/...)
}

export default function EditProfileInfoModal({
  open,
  onClose,
  onSave,
  initial,
}: EditProfileInfoModalProps) {
  const [formData, setFormData] = useState<ProfileInfoFormValues>(initial);
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});

  useEffect(() => {
    if (open) {
      setFormData(initial);
      setNameErrors({});
    }
  }, [open, initial]);

  // Locations (same cache + endpoint as stepper About form).
  const { data: locationsData, loading: locationsLoading } =
    useApi<UserLocationsData>({
      key: ["userLocations"],
      url: endpoints.data.userLocations,
      enabled: open,
    });

  const LOCATION_OPTIONS = useMemo(
    () =>
      (locationsData?.location ?? []).map((loc) => ({
        value: loc.id,
        label: loc.name,
      })),
    [locationsData]
  );

  // If initial.location is a name (not an id), map it to the id.
  useEffect(() => {
    if (!open || LOCATION_OPTIONS.length === 0 || !formData.location) return;
    const asId = LOCATION_OPTIONS.find((o) => o.value === formData.location);
    if (asId) return;
    const byName = LOCATION_OPTIONS.find(
      (o) => o.label.toLowerCase() === formData.location.toLowerCase()
    );
    if (byName) {
      setFormData((prev) => ({ ...prev, location: byName.value }));
    }
  }, [open, LOCATION_OPTIONS, formData.location]);

  // Normalize gender from "Female" → "female" if needed.
  useEffect(() => {
    if (!open || !formData.gender) return;
    const byValue = GENDER_OPTIONS.find((o) => o.value === formData.gender);
    if (byValue) return;
    const byLabel = GENDER_OPTIONS.find(
      (o) => o.label.toLowerCase() === formData.gender.toLowerCase()
    );
    if (byLabel) {
      setFormData((prev) => ({ ...prev, gender: byLabel.value }));
    }
  }, [open, formData.gender]);

  const allFilled =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.location !== "" &&
    formData.dob.trim() !== "" &&
    formData.gender !== "";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      const cleaned = value.replace(/[^A-Za-z\s]/g, "");
      const hadInvalid = cleaned !== value;
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      const label = name === "firstName" ? "First name" : "Last name";
      setNameErrors((prev) => ({
        ...prev,
        [name]: hadInvalid
          ? `${label} can only contain letters`
          : undefined,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  /** Convert DatePicker "DD/MM/YYYY" → backend "DD-MM-YYYY". */
  function normalizeDob(dob: string): string {
    return dob.replaceAll("/", "-");
  }

  /** Capitalize first letter for gender (male → Male). */
  function capitalize(s: string): string {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function handleSave() {
    if (!allFilled) return;
    const locationLabel =
      LOCATION_OPTIONS.find((o) => o.value === formData.location)?.label ||
      formData.location;
    const genderLabel =
      GENDER_OPTIONS.find((o) => o.value === formData.gender)?.label ||
      capitalize(formData.gender);

    await onSave({
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      location: locationLabel,
      email: formData.email.trim(),
      phone_number: formData.phone,
      dob: normalizeDob(formData.dob),
      gender: genderLabel,
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
          <div>
            <h2 className={styles.title}>Edit Profile Information</h2>
            <p className={styles.subtitle}>Update your profile details below.</p>
          </div>
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
              First Name <span className={styles.required}>*</span>
            </label>
            <InputField
              label="First Name"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              error={nameErrors.firstName}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Last Name <span className={styles.required}>*</span>
            </label>
            <InputField
              label="Last Name"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              error={nameErrors.lastName}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Location <span className={styles.required}>*</span>
            </label>
            <SelectField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              options={LOCATION_OPTIONS}
              placeholder={
                locationsLoading ? "Loading locations..." : "Location"
              }
              searchable
              loading={locationsLoading}
              searchPlaceholder="Search Locations..."
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
                  <path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              disabled
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Phone Number</label>
            <PhoneInputField
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                DOB <span className={styles.required}>*</span>
              </label>
              <DatePicker
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                placeholder="DOB"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Gender <span className={styles.required}>*</span>
              </label>
              <SelectField
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                options={GENDER_OPTIONS}
                placeholder="Gender"
                clearable={false}
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
