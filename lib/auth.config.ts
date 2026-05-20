import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isSaasAdmin = (auth?.user as any)?.saasAdminId;

      if (nextUrl.pathname.startsWith("/saas-admin")) {
        return !!isSaasAdmin;
      }

      if (nextUrl.pathname.startsWith("/saas-login")) {
        return true;
      }

      const isAuthPage =
        nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/pin-login");

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      const isPublicPage =
        nextUrl.pathname === "/pricing" ||
        nextUrl.pathname === "/signup" ||
        nextUrl.pathname.startsWith("/api/health") ||
        nextUrl.pathname.startsWith("/api/webhooks") ||
        nextUrl.pathname.startsWith("/api/stripe/webhook") ||
        nextUrl.pathname.startsWith("/api/resend/inbound") ||
        nextUrl.pathname.startsWith("/api/setup");

      if (isPublicPage) return true;

      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
