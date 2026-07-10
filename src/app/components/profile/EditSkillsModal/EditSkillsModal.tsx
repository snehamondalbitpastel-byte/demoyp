"use client";

import { useEffect, useMemo, useState } from "react";
import SelectField from "@/app/components/ui/SelectField/SelectField";
import { useApi } from "@/app/lib/api/useApi";
import { endpoints } from "@/app/lib/api/endpoints";
import type { SkillsData } from "@/app/lib/api/types";
import styles from "./EditSkillsModal.module.css";

const MAX_SKILLS = 5;

interface EditSkillsModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with API-ready payload (comma-separated names). */
  onSave: (payload: SkillsUpdatePayload) => Promise<void> | void;
  /** Current skill names from the profile (e.g. ["Python", "git"]). */
  initial: string[];
}

export interface SkillsUpdatePayload {
  skills: string;
}

export default function EditSkillsModal({
  open,
  onClose,
  onSave,
  initial,
}: EditSkillsModalProps) {
  // Value stored by SelectField multi-mode is comma-separated IDs.
  const [selectedIds, setSelectedIds] = useState<string>("");

  // Fetch skills (same endpoint + caching as stepper).
  const { data: skillsData, loading: skillsLoading } = useApi<SkillsData>({
    key: ["skills"],
    url: endpoints.data.skills,
    enabled: open,
  });

  const SKILL_OPTIONS = useMemo(
    () =>
      (skillsData?.skills ?? []).map((sk) => ({
        value: sk.id,
        label: sk.name,
      })),
    [skillsData]
  );

  // When modal opens, map the initial names to IDs so the multi-select
  // preselects them correctly.
  useEffect(() => {
    if (!open) return;
    if (SKILL_OPTIONS.length === 0) {
      // Fallback: store names directly — will be resolved to IDs once data loads.
      setSelectedIds(initial.join(","));
      return;
    }
    const ids = initial
      .map((name) => {
        const match = SKILL_OPTIONS.find(
          (o) => o.label.toLowerCase() === name.toLowerCase()
        );
        return match?.value ?? name;
      })
      .filter(Boolean)
      .join(",");
    setSelectedIds(ids);
  }, [open, SKILL_OPTIONS, initial]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setSelectedIds(e.target.value);
  }

  /**
   * User typed a skill not in the backend-provided list and clicked
   * "Add 'xxx'". Append the raw name as a selected value. It is NOT
   * merged into SKILL_OPTIONS — the dropdown list stays backend-driven.
   * On save, handleSave's fallback turns unknown IDs into names verbatim,
   * so custom skills flow through to the update-profile API correctly.
   */
  function handleAddCustomSkill(name: string) {
    const current = selectedIds.split(",").filter(Boolean);
    if (current.length >= MAX_SKILLS) return;
    const normalized = name.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    // Prevent duplicates (case-insensitive) against either an existing
    // option label already selected, or a previously added custom entry.
    const dupe = current.some((id) => {
      const opt = SKILL_OPTIONS.find((o) => o.value === id);
      const label = opt?.label ?? id;
      return label.toLowerCase() === lower;
    });
    if (dupe) return;
    setSelectedIds([...current, normalized].join(","));
  }

  async function handleSave() {
    // Convert selected IDs back to names for the API payload.
    const ids = selectedIds.split(",").filter(Boolean);
    const names = ids.map((id) => {
      const match = SKILL_OPTIONS.find((o) => o.value === id);
      return match?.label ?? id;
    });
    await onSave({
      skills: names.join(", "),
    });
  }

  if (!open) return null;

  const selectedCount = selectedIds.split(",").filter(Boolean).length;
  const remaining = Math.max(0, MAX_SKILLS - selectedCount);
  const canSave = selectedCount > 0 && selectedCount <= MAX_SKILLS;

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
            <h2 className={styles.title}>Edit Skills</h2>
            <p className={styles.subtitle}>Add your skills (max {MAX_SKILLS})</p>
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
            <label className={styles.label}>Skills</label>
            <SelectField
              label="Skills"
              name="skills"
              value={selectedIds}
              onChange={handleChange}
              options={SKILL_OPTIONS}
              placeholder={
                skillsLoading ? "Loading skills..." : "Select skills"
              }
              searchable
              loading={skillsLoading}
              searchPlaceholder="Search Skills..."
              multi
              maxSelections={MAX_SKILLS}
              forceUp
              onAddCustom={handleAddCustomSkill}
            />
          </div>

          <div className={styles.meta}>
            <span className={styles.metaSelected}>
              {selectedCount} skill{selectedCount === 1 ? "" : "s"} selected
            </span>
            <span className={styles.metaRemaining}>{remaining} remaining</span>
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
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
