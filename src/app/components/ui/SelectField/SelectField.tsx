"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./SelectField.module.css";

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Show a search input at the top of the dropdown panel. */
  searchable?: boolean;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /** Icon to render before each option label (e.g. a map pin for Location). */
  optionIcon?: ReactNode;
  /** Show a "Loading..." state in the panel while options are being fetched. */
  loading?: boolean;
  /** Show a clear (X) button when a value is selected. Default: true. */
  clearable?: boolean;
  /** Enable multi-select mode. Value is stored as comma-separated IDs. */
  multi?: boolean;
  /** Max selections allowed in multi mode. Default: Infinity. */
  maxSelections?: number;
  /** Force the dropdown to always open upward instead of auto-detecting. */
  forceUp?: boolean;
  /** If provided, shows an "Add {query}" row in the search dropdown when the
   * typed search doesn't match any existing option. Clicking it calls this
   * callback with the trimmed query so the caller can add it as a custom
   * selection. Does NOT mutate the backend-provided `options` list. */
  onAddCustom?: (name: string) => void;
}

function ChevronIcon() {
  return (
    <svg width="13" height="7" viewBox="0 0 13 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l5.5 5L12 1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

interface PanelRect {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
}

const PANEL_MAX_HEIGHT = 260;

export default function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  searchPlaceholder = "Search...",
  optionIcon,
  loading = false,
  clearable = true,
  multi = false,
  maxSelections = Infinity,
  forceUp = false,
  onAddCustom,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<PanelRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [showMaxError, setShowMaxError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset search when dropdown is closed.
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  // Clear the "max reached" error the moment the count drops below the limit
  // (e.g. the user removes a chip). Also keeps the error cleared on the first
  // render when the caller already has N selected items from saved data.
  useEffect(() => {
    if (!multi) return;
    if (value.split(",").filter(Boolean).length < maxSelections) {
      setShowMaxError(false);
    }
  }, [multi, value, maxSelections]);

  const computeRect = useCallback((): PanelRect | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const tr = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - tr.bottom;
    const spaceAbove = tr.top;
    const placeAbove = forceUp
      ? true
      : spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    return {
      top: placeAbove ? tr.top : tr.bottom,
      left: tr.left,
      width: tr.width,
      placeAbove,
    };
  }, [forceUp]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const nextRect = computeRect();
    if (nextRect) {
      setRect(nextRect);
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const r = computeRect();
      if (r) setRect(r);
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, computeRect]);

  // Multi-select: value is comma-separated IDs.
  const selectedValues = useMemo(
    () => (multi && value ? value.split(",").filter(Boolean) : []),
    [multi, value]
  );

  function handleSelect(optValue: string) {
    if (multi) {
      const current = new Set(selectedValues);
      if (current.has(optValue)) {
        current.delete(optValue);
      } else {
        if (current.size >= maxSelections) {
          setShowMaxError(true);
          return;
        }
        current.add(optValue);
      }
      const next = Array.from(current).join(",");
      onChange({ target: { name, value: next } } as React.ChangeEvent<HTMLSelectElement>);
      // Keep dropdown open in multi mode.
      return;
    }
    const syntheticEvent = {
      target: { name, value: optValue },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
    setOpen(false);
  }

  function handleRemoveChip(optValue: string) {
    const next = selectedValues.filter((v) => v !== optValue).join(",");
    onChange({ target: { name, value: next } } as React.ChangeEvent<HTMLSelectElement>);
  }

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const visibleOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, search]);

  // Show "Add {query}" row when search has a value, no existing option
  // matches it exactly, the custom-add callback is provided, and the typed
  // name isn't already present as a selected chip.
  const showAddCustom = useMemo(() => {
    if (!searchable || !onAddCustom || !search.trim()) return false;
    const q = search.trim().toLowerCase();
    const matchesExisting = options.some((o) => o.label.toLowerCase() === q);
    if (matchesExisting) return false;
    const alreadySelected = selectedValues.some((sv) => {
      const opt = options.find((o) => o.value === sv);
      const label = opt?.label ?? sv;
      return label.toLowerCase() === q;
    });
    return !alreadySelected;
  }, [searchable, onAddCustom, search, options, selectedValues]);

  function handleAddCustomClick() {
    if (!onAddCustom) return;
    const trimmed = search.trim();
    if (!trimmed) return;
    if (multi && selectedValues.length >= maxSelections) {
      setShowMaxError(true);
      return;
    }
    onAddCustom(trimmed);
    setSearch("");
  }

  const panel =
    open && rect && mounted ? (
      <div
        ref={panelRef}
        className={styles.dropdown}
        role="listbox"
        style={{
          position: "fixed",
          top: rect.placeAbove ? undefined : rect.top + 6,
          bottom: rect.placeAbove
            ? window.innerHeight - rect.top + 6
            : undefined,
          left: rect.left,
          width: rect.width,
          maxHeight: PANEL_MAX_HEIGHT,
        }}
      >
        {searchable && (
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon} aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className={styles.optionsScroll}>
          {showAddCustom && (
            <button
              type="button"
              className={styles.option}
              onClick={handleAddCustomClick}
            >
              <span className={styles.optionLabel}>
                Add &quot;{search.trim()}&quot;
              </span>
            </button>
          )}
          {loading ? (
            <div className={styles.emptyState}>Loading...</div>
          ) : options.length === 0 && !showAddCustom ? (
            <div className={styles.emptyState}>No options available</div>
          ) : visibleOptions.length === 0 && !showAddCustom ? (
            <div className={styles.emptyState}>No results found</div>
          ) : visibleOptions.length === 0 ? null : (
            visibleOptions.map((opt) => {
              const isSelected = multi
                ? selectedValues.includes(opt.value)
                : opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.option} ${isSelected ? styles.optionActive : ""}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {optionIcon ? (
                    <span className={styles.optionIcon} aria-hidden="true">
                      {optionIcon}
                    </span>
                  ) : null}
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className={styles.fieldGroup} ref={wrapperRef}>
      <label className={styles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        {multi && selectedValues.length > 0 ? (
          <>
            <div
              ref={triggerRef as unknown as React.RefObject<HTMLDivElement>}
              className={`${styles.triggerMulti} ${open ? styles.triggerOpen : ""}`}
              onClick={handleToggle}
              role="button"
              tabIndex={0}
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              <div className={styles.chipScroll}>
                <div className={styles.chipList}>
                  {selectedValues.map((sv) => {
                    const opt = options.find((o) => o.value === sv);
                    return (
                      <span key={sv} className={styles.chip}>
                        <span className={styles.chipLabel}>{opt?.label ?? sv}</span>
                        <button
                          type="button"
                          className={styles.chipRemove}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveChip(sv);
                          }}
                          aria-label={`Remove ${opt?.label ?? sv}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className={`${styles.multiChevron} ${open ? styles.chevronOpen : ""}`}>
                <ChevronIcon />
              </span>
            </div>
          </>
        ) : (
          <>
            <button
              ref={triggerRef}
              type="button"
              className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${!value ? styles.triggerPlaceholder : ""}`}
              onClick={handleToggle}
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              {selectedLabel || placeholder}
            </button>
            {value && clearable && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ target: { name, value: "" } } as React.ChangeEvent<HTMLSelectElement>);
                }}
                aria-label="Clear selection"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
              <ChevronIcon />
            </span>
          </>
        )}
      </div>
      {multi && showMaxError && (
        <p className={styles.multiMaxError}>
          You can select maximum {maxSelections} skills only
        </p>
      )}
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
