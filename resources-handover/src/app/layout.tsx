/* ================================================================
 * HANDOVER — Resources Module
 * File:    src/app/layout.tsx
 * Role:    Demo-only root layout. Wires AuthProvider + ThemeProvider +
 *          ThemedToaster, loads Font Awesome + Line Awesome (CDN), and
 *          ships the pre-hydration script that stamps
 *          `data-theme="light"` on <html> before first paint on
 *          /resources routes.
 * COPY?:   ❌ DO NOT copy into the target project — the real YP project
 *          has its own layout. The only thing worth keeping from here is
 *          the pre-hydration <script> in <head> (if the target's layout
 *          doesn't already do the same anti-flash trick).
 * See README.md §2 (Light mode) and §4 (Integration steps).
 * ================================================================ */

import type { Metadata } from "next";
import { Geist, Geist_Mono, Alumni_Sans_SC, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ThemedToaster from "./components/providers/ThemedToaster";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const alumniSansSC = Alumni_Sans_SC({
  variable: "--font-alumni-sans-sc",
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Resources Demo",
  description: "Standalone runnable demo of the Resources UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${alumniSansSC.variable} ${dmSans.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Line Awesome — needed for `las la-*` icon classes the live YP
            site uses. Served from jsdelivr (mirrors the npm package
            directly). Font Awesome is also imported above for the
            `fas fa-*` glyphs used elsewhere; the two icon sets coexist. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/line-awesome@1.3.0/dist/line-awesome/css/line-awesome.min.css"
        />
        {/* Pre-hydration theme bootstrap — synchronously sets
            <html data-theme="light"> before first paint on /resources
            so refreshing in light mode doesn't flash dark for one frame. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("yp.theme");var p=(window.location&&window.location.pathname)||"";if(t==="light"&&p.indexOf("/resources")===0){document.documentElement.setAttribute("data-theme","light");}}catch(e){}})();`,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ThemeProvider>
            {children}
            <ThemedToaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
