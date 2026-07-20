import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Alumni_Sans_SC, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import SessionWrapper from "./components/providers/SessionWrapper";
import ThemedToaster from "./components/providers/ThemedToaster";
import ChatBot from "./components/chatbot/ChatBot";
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
  title: "Young Pro",
  description: "Young Pro - Login",
};

// App-Router viewport export (per Next.js docs:
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md).
// Without this, mobile browsers render the page at a fake ~980px desktop
// width and scale it down — so `@media (max-width: 640px)` rules never
// fire, and detail pages (resources, company, jobs, events) all look
// identical to desktop on a phone. Setting width=device-width makes the
// viewport match the actual physical pixel width, which is what the
// responsive cascade in each page's CSS module is written against.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        {/* Line Awesome — needed for `las la-*` icon classes the live
            YP site uses (e.g. `la-search-plus` on the showcase image
            hover affordance). Served from jsdelivr (mirrors the npm
            package directly), which is far more reliable than the
            older maxcdn.icons8 endpoint that often returns no CSS.
            Font Awesome is also imported for the `fas fa-*` glyphs
            used elsewhere; the two icon sets coexist and only the
            classes you actually reference get rendered. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/line-awesome@1.3.0/dist/line-awesome/css/line-awesome.min.css"
        />
        {/* ── Pre-hydration theme bootstrap ──
            Refreshing /career-talks while the saved theme is "light"
            used to render the page in DARK mode for the few-second
            skeleton window, then snap to light once React hydrated +
            useEffect read localStorage. This blocking script runs
            BEFORE React mounts (and before first paint), reads
            `yp.theme` from localStorage, and — only on /career-talks
            paths, since light mode is scoped to that section per
            the project spec — sets `<html data-theme="light">`
            up-front. Result: the very first paint already has the
            light CSS-variable cascade, so the skeleton (and
            everything else) renders in the right palette with zero
            flash.

            Switched from `next/script` `beforeInteractive` to a raw
            inline `<script>` in <head> — `next/script` could end up
            deferring execution past first paint in some browsers,
            which let a one-frame DARK skeleton flicker through on
            light-mode refreshes. A plain inline script in <head>
            blocks HTML parsing until it finishes (synchronous), so
            `data-theme` is guaranteed to be on `<html>` before any
            body content paints. `suppressHydrationWarning` on the
            script element keeps React from complaining about the
            inline `dangerouslySetInnerHTML`. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("yp.theme");var p=(window.location&&window.location.pathname)||"";if(t==="light"&&p.indexOf("/career-talks")===0){document.documentElement.setAttribute("data-theme","light");}}catch(e){}})();`,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionWrapper>
          <AuthProvider>
            <ThemeProvider>
              {children}
              {/* ThemedToaster reads the current theme via useTheme
                  and feeds it to <Toaster> so toasts flip white/dark
                  in sync with the navbar's Light/Dark selector. */}
              <ThemedToaster />
              {/* Floating FAQ chatbot — mounted once here so its bubble
                  appears in the bottom-right of EVERY page. Rule-based,
                  no API. Inside ThemeProvider so it reads light/dark. */}
              <ChatBot />
            </ThemeProvider>
          </AuthProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
