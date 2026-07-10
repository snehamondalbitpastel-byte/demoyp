"use client";

/* HANDOVER — Resources Module · src/app/components/providers/ThemedToaster.tsx · COPY? ✅ */

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

export default function ThemedToaster() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return (
    <Toaster
      position="top-right"
      theme={theme}
      richColors
      closeButton
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
          : undefined
      }
    />
  );
}
