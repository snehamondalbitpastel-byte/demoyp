"use client";

import { useMemo } from "react";
import InputField from "@/app/components/ui/InputField/InputField";
import SelectField from "@/app/components/ui/SelectField/SelectField";
import DatePicker from "@/app/components/ui/DatePicker/DatePicker";
import PhoneInputField from "@/app/components/ui/PhoneInputField/PhoneInputField";
import Button from "@/app/components/ui/Button/Button";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import type { UserLocationsData } from "@/app/lib/api/types";

import styles from "./AboutForm.module.css";

export interface AboutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  dob: string;
  gender: string;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

interface AboutFormProps {
  onNext: () => void;
  formData: AboutFormData;
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export default function AboutForm({
  onNext,
  formData,
  onFormChange,
}: AboutFormProps) {
  const { data: locationsData, loading: locationsLoading } =
    useApi<UserLocationsData>({
      key: ["userLocations"],
      url: endpoints.data.userLocations,
      enabled: true,
    });

  const LOCATION_OPTIONS = useMemo(
    () =>
      (locationsData?.location ?? []).map((loc) => ({
        value: loc.id,
        label: loc.name,
      })),
    [locationsData]
  );

  const allFilled =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.location !== "" &&
    formData.dob.trim() !== "" &&
    formData.gender !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;
    onNext();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>About You</h2>
      <p className={styles.subtitle}>
        Make a YP profile for your job hunt
      </p>

      <div className={styles.fieldWrapper}>
        <InputField
          label="First Name"
          name="firstName"
          placeholder="First Name*"
          value={formData.firstName}
          onChange={onFormChange}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Last Name"
          name="lastName"
          placeholder="Last Name*"
          value={formData.lastName}
          onChange={onFormChange}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={onFormChange}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <PhoneInputField
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={onFormChange}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <SelectField
          label="Location"
          name="location"
          value={formData.location}
          onChange={onFormChange}
          options={LOCATION_OPTIONS}
          placeholder={locationsLoading ? "Loading locations..." : "Location*"}
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

      <div className={styles.row}>
        <div className={styles.halfField}>
          <DatePicker
            name="dob"
            value={formData.dob}
            onChange={onFormChange}
            placeholder="DOB*"
          />
        </div>
        <div className={styles.halfField}>
          <SelectField
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={onFormChange}
            options={GENDER_OPTIONS}
            placeholder="Gender"
            clearable={false}
          />
        </div>
      </div>

      <div className={styles.buttonWrapper}>
        <Button type="submit" variant="primary" disabled={!allFilled}>
          Save &amp; Continue
        </Button>
      </div>
    </form>
  );
}
