"use client";

/**
 * Ellipse41 — Top-right gradient glow blob (SVG-based)
 *
 * Exact Figma properties:
 * - Ellipse: 1121.057 × 2410.577px
 * - Center: (1305, -426) in 1440×1024 viewport
 * - Rotation: 151.675deg
 * - Gradient: 208deg, #20BDFF (0.4) → #5433FF (0.4)
 * - Gaussian blur: stdDeviation 250
 * - Right-edge gap: 135px (9.375% from right at 1440px)
 */
export default function BgGlow() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "visible",
      }}
      viewBox="0 0 1440 1024"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="ellipse41Blur"
          x="-200%"
          y="-200%"
          width="500%"
          height="500%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="250" />
        </filter>
        <linearGradient
          id="ellipse41Grad"
          x1="0.74"
          y1="0.06"
          x2="0.26"
          y2="0.94"
        >
          <stop offset="16.35%" stopColor="#20BDFF" stopOpacity="0.4" />
          <stop offset="79.68%" stopColor="#5433FF" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <ellipse
        cx="1305"
        cy="-426"
        rx="560.5"
        ry="1205"
        fill="url(#ellipse41Grad)"
        filter="url(#ellipse41Blur)"
        transform="rotate(151.675 1305 -426)"
      />
    </svg>
  );
}
