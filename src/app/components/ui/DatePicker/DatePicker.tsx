"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./DatePicker.module.css";

interface DatePickerProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  minAgeYears?: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function DatePicker({
  name,
  value,
  onChange,
  placeholder = "DOB*",
  minAgeYears = 14,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLSpanElement>(null);

  const selectedDate = parseDate(value);
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear() - minAgeYears,
    today.getMonth(),
    today.getDate()
  );
  const defaultYear = today.getFullYear() - minAgeYears;
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? defaultYear);
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setYearOpen(false);
      }
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(e.target as Node)
      ) {
        setYearOpen(false);
      }
    }
    if (open || yearOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, yearOpen]);

  useEffect(() => {
    if (yearOpen && yearListRef.current) {
      const selectedEl = yearListRef.current.querySelector(
        `[data-year="${viewYear}"]`
      ) as HTMLElement | null;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [yearOpen, viewYear]);

  const currentYear = today.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; outside: boolean; date: Date }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      day,
      outside: true,
      date: new Date(viewYear, viewMonth - 1, day),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      outside: false,
      date: new Date(viewYear, viewMonth, day),
    });
  }

  // Next month leading days to fill grid (6 rows × 7 cols = 42 cells)
  while (cells.length < 42) {
    const offset = cells.length - (firstDayOfMonth + daysInMonth);
    cells.push({
      day: offset + 1,
      outside: true,
      date: new Date(viewYear, viewMonth + 1, offset + 1),
    });
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function isDisabled(date: Date): boolean {
    return date > maxDate;
  }

  function handleSelectDay(date: Date) {
    if (isDisabled(date)) return;
    onChange({
      target: { name, value: formatDate(date) },
    } as React.ChangeEvent<HTMLInputElement>);
    setOpen(false);
  }

  function isSameDate(a: Date | null, b: Date): boolean {
    if (!a) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "" : styles.triggerPlaceholder}>
          {value || placeholder}
        </span>
        <span
          ref={infoRef}
          className={styles.infoWrapper}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            if (infoRef.current) {
              const rect = infoRef.current.getBoundingClientRect();
              setTooltipPos({
                top: rect.top - 10,
                left: rect.left + rect.width / 2,
              });
              setTooltipOpen(true);
            }
          }}
          onMouseLeave={() => setTooltipOpen(false)}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${styles.infoIcon} lucide lucide-info`}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </span>
      </button>

      {open && (
        <div className={styles.calendar}>
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={handlePrevMonth} aria-label="Previous month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className={styles.selects}>
              <select
                className={styles.select}
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <div className={styles.yearWrapper} ref={yearDropdownRef}>
                <button
                  type="button"
                  className={styles.select}
                  onClick={() => setYearOpen((o) => !o)}
                >
                  {viewYear}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginLeft: 4 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {yearOpen && (
                  <div className={styles.yearList} ref={yearListRef}>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        data-year={y}
                        className={`${styles.yearItem} ${y === viewYear ? styles.yearItemActive : ""}`}
                        onClick={() => {
                          setViewYear(y);
                          setYearOpen(false);
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" className={styles.navBtn} onClick={handleNextMonth} aria-label="Next month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} className={styles.weekday}>{wd}</div>
            ))}
          </div>

          <div className={styles.days}>
            {cells.map((cell, i) => {
              const selected = isSameDate(selectedDate, cell.date);
              const disabled = isDisabled(cell.date);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  className={`${styles.day} ${cell.outside ? styles.dayOutside : ""} ${selected ? styles.daySelected : ""} ${disabled ? styles.dayDisabled : ""}`}
                  onClick={() => handleSelectDay(cell.date)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tooltipOpen && tooltipPos && typeof document !== "undefined" &&
        createPortal(
          <div
            className={styles.tooltip}
            role="tooltip"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            <span className={styles.tooltipTitle}>Age Requirement:</span>
            <span className={styles.tooltipText}>
              You must be at least {minAgeYears} years old to create a profile on Young Pro.
            </span>
          </div>,
          document.body
        )}
    </div>
  );
}
