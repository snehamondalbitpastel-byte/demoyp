/**
 * NextAuth (Auth.js v5) configuration.
 *
 * Used ONLY for social OAuth flows (Google). Regular email/password auth
 * bypasses NextAuth entirely — it uses our own /api/mobile/auth/* proxy
 * routes and HttpOnly cookies.
 *
 * After Google OAuth succeeds, the `signIn` callback calls the YoungPro
 * backend to register/login the social user and attach the backend tokens
 * to the NextAuth JWT so the social-complete bridge can set them as cookies.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const backendUrl = process.env.BACKEND_URL!;
          const [firstName, ...rest] = (user.name || "User").split(" ");
          const lastName = rest.join(" ") || firstName;

          // Register or login the social user on the backend.
          const res = await fetch(`${backendUrl}/api/mobile/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signup_type: "social",
              auth_provider: "google",
              first_name: firstName,
              last_name: lastName,
              email: user.email,
            }),
          });

          const json = await res.json();
          console.log("[auth signIn] Backend signup status:", res.status);
          console.log("[auth signIn] Backend signup body:", JSON.stringify(json));

          // Try to extract tokens from multiple possible response shapes.
          const data = json?.data as Record<string, unknown> | undefined;
          const root = data || json;

          const accessToken =
            typeof root?.access_token === "string" ? root.access_token : undefined;
          const refreshToken =
            typeof root?.refresh_token === "string" ? root.refresh_token : undefined;
          const backendUser = root?.user || data?.user;

          if (accessToken) {
            (user as Record<string, unknown>).backendAccessToken = accessToken;
          }
          if (refreshToken) {
            (user as Record<string, unknown>).backendRefreshToken = refreshToken;
          }
          if (backendUser) {
            (user as Record<string, unknown>).backendUser = backendUser;
          }

          if (!accessToken) {
            console.warn("[auth signIn] No access_token from signup — social-complete will retry");
          }

          return true;
        } catch (err) {
          console.error("[auth signIn] Backend call failed:", err);
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // On initial sign in, copy backend data from user into the JWT.
      if (user) {
        const u = user as Record<string, unknown>;
        if (u.backendUser) token.backendUser = u.backendUser;
        if (u.backendAccessToken)
          token.backendAccessToken = u.backendAccessToken;
        if (u.backendRefreshToken)
          token.backendRefreshToken = u.backendRefreshToken;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose backend data in the session so the social-complete bridge
      // can read it and set HttpOnly cookies.
      const s = session as unknown as Record<string, unknown>;
      s.backendUser = token.backendUser;
      s.backendAccessToken = token.backendAccessToken;
      s.backendRefreshToken = token.backendRefreshToken;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After Google sign in, always go through our social-complete handler
      // which converts the NextAuth session into backend HttpOnly cookies.
      if (
        url.includes("/api/auth/callback/google") ||
        url.includes("/api/auth/social-complete")
      ) {
        return `${baseUrl}/api/auth/social-complete`;
      }
      // Handle relative URLs (e.g. "/auth/stepper").
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
});
