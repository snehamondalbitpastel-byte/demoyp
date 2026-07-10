"use client";

import { useState } from "react";
import styles from "./InputField.module.css";
import { PASSWORD_RULES } from "@/app/lib/validations/auth";

interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  showToggle?: boolean;
  showInfoTooltip?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function InputField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  showToggle = false,
  showInfoTooltip = false,
  icon,
  disabled = false,
}: InputFieldProps) {
  const [visible, setVisible] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const inputType = showToggle ? (visible ? "text" : "password") : type;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.leftIcon}>{icon}</span>}
        <input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={disabled}
          className={`${styles.input} ${icon ? styles.inputWithIcon : ""} ${error ? styles.inputError : ""} ${disabled ? styles.inputDisabled : ""}`}
          autoComplete={type === "password" ? "current-password" : "off"}
          /* Browser form-filler / password-manager extensions (LastPass,
             1Password, Bitwarden, ChromeAutofill, Edge password manager,
             etc.) inject an `fdprocessedid="..."` attribute onto every
             <input> they detect BEFORE React hydrates. React then sees
             an attribute on the client that wasn't in the server HTML
             and flags a hydration mismatch. Suppressing the warning at
             the leaf <input> is the React-recommended workaround — our
             own props are still hydration-checked normally elsewhere;
             this scope is intentionally narrow to the one element the
             extension touches. */
          suppressHydrationWarning
        />
        <div className={styles.iconGroup}>
          {showToggle && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              /* Browser form-filler / password-manager extensions
                 (LastPass, 1Password, Bitwarden, etc.) inject an
                 `fdprocessedid="..."` attribute onto every <button>
                 adjacent to a password field BEFORE React hydrates,
                 producing a server/client attribute mismatch on
                 every login page load. Same suppression pattern
                 already applied to the <input> element above —
                 scoped to this leaf <button> only so our own props
                 are still hydration-checked normally everywhere else. */
              suppressHydrationWarning
            >
              {visible ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          )}
          {showInfoTooltip && (
            <div className={styles.tooltipWrapper}>
              <button
                type="button"
                className={styles.iconBtn}
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
                aria-label="Password requirements"
                /* Same `fdprocessedid` suppression as the toggle
                   button above — extensions tag this one too. */
                suppressHydrationWarning
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>
              {tooltipOpen && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipTitle}>Password Requirements</div>
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.regex.test(value);
                    return (
                      <div
                        key={rule.label}
                        className={`${styles.ruleItem} ${met ? styles.ruleMet : styles.ruleUnmet}`}
                      >
                        <span>{met ? "✓" : "○"}</span>
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
