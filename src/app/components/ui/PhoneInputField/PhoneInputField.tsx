"use client";

/**
 * PhoneInputField — wraps `react-phone-number-input` and styles it to match
 * the app's existing InputField look (rounded pill, dark translucent, flag
 * in the country-select slot).
 *
 * Emits E.164-formatted strings (e.g. "+917001848380") to keep parity with
 * what the backend expects. Includes built-in country auto-detection: typing
 * a prefix like `+44` switches the flag to 🇬🇧 automatically.
 */

import PhoneInput, { type Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./PhoneInputField.module.css";

interface PhoneInputFieldProps {
  name: string;
  value: string;
  /**
   * Accepts the same signature as a native React change handler so callers
   * can reuse their generic `handleChange` function from InputField /
   * SelectField without adapters.
   */
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  placeholder?: string;
  error?: string;
  defaultCountry?: string;
  onBlur?: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

export default function PhoneInputField({
  name,
  value,
  onChange,
  placeholder = "Phone Number",
  error,
  defaultCountry = "GB",
  onBlur,
}: PhoneInputFieldProps) {
  function handleChange(next: Value | undefined) {
    // Synthesize a minimal change event so callers can reuse their generic
    // handlers. The library emits E.164 strings which we forward as-is.
    onChange({
      target: { name, value: (next as string | undefined) ?? "" },
    } as React.ChangeEvent<HTMLInputElement>);
  }

  function handleBlur() {
    onBlur?.({
      target: { name, value },
    } as React.FocusEvent<HTMLInputElement>);
  }

  return (
    <div className={styles.wrapper}>
      <PhoneInput
        international
        defaultCountry={defaultCountry as "IN"}
        value={value as Value | undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${styles.phoneInput} ${error ? styles.hasError : ""}`}
        name={name}
        autoComplete="tel"
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
