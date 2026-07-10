"use client";

/**
 * ThemedToaster — wraps `sonner`'s <Toaster> and feeds it the current
 * theme. `richColors` STAYS ON so success/error toasts keep their
 * coloured glyphs (green tick for success, red cross for error).
 *
 * In LIGHT mode we ONLY override the toast `background` to pure
 * #ffffff — the text + tick colour stay green via richColors, so the
 * toast reads as "white card, green tick + label". In DARK mode we
 * pass `toastOptions: undefined` so Sonner's default richColors styling
 * applies (subtle dark surface with green tint).
 */

import { Toaster } from "sonner";
import { useTheme } from "@/app/context/ThemeContext";

/* Custom success tick — uses the EXACT SVG path data per spec, just
   split into two <path> elements so the outer circle (#22c55e green)
   and the inner tick (#ffffff white) can carry different fills. The
   combined paths are identical to the live YP / react-toastify
   `--toastify-icon-color-success` icon. Rendered via Sonner's
   `icons.success` slot so every `toast.success(...)` call — incl.
   the navbar's theme-change toast — shows this badge instead of
   Sonner's default tick. */
function SuccessTickIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 0a12 12 0 1012 12A12.014 12.014 0 0012 0z"
        fill="#22c55e"
      />
      <path
        d="M18.927 8.2l-6.845 9.289a1.011 1.011 0 01-1.43.188l-4.888-3.908a1 1 0 111.25-1.562l4.076 3.261 6.227-8.451a1 1 0 111.61 1.183z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function ThemedToaster() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return (
    <Toaster
      position="top-right"
      theme={theme}
      richColors
      closeButton
      icons={{ success: <SuccessTickIcon /> }}
      toastOptions={
        isLight
          ? {
              style: {
                /* Pure white surface only — DO NOT set `color` here;
                   leaving it unset lets richColors keep applying the
                   green text/icon for success toasts. */
                background: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.1)",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
              },
            }
          : {
              /* Dark-mode toast — exact values per spec. Mirrors the
                 `.Toastify__toast` rule from the live YP site, just
                 translated into sonner's inline-style API so the same
                 surface ships in both libraries. */
              style: {
                color: "#fff",
                background: "#233855",
                borderRadius: "12px",
                width: "calc(100% + 20px)",
                minHeight: "50px",
                padding: "8px",
              },
            }
      }
    />
  );
}
