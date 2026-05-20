import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "tenant-credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true, userLocations: true },
        });

        if (!user || !user.hashedPassword || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const locationIds = user.userLocations.map((ul) => ul.locationId);
        if (user.homeLocationId && !locationIds.includes(user.homeLocationId)) {
          locationIds.push(user.homeLocationId);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          title: user.title,
          role: user.role.name,
          permissions: user.role.permissions as string[],
          organizationId: user.organizationId,
          homeLocationId: user.homeLocationId,
          locationIds,
          appAccess: user.appAccess as string[],
        };
      },
    }),

    Credentials({
      id: "pin-credentials",
      name: "PIN Login",
      credentials: {
        pin: { label: "PIN", type: "text" },
        deviceToken: { label: "Device Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.pin || !credentials?.deviceToken) return null;

        const device = await prisma.registeredDevice.findUnique({
          where: { deviceToken: credentials.deviceToken as string },
        });
        if (!device || !device.isActive) return null;

        const user = await prisma.user.findFirst({
          where: {
            pin: credentials.pin as string,
            isActive: true,
            organization: {
              locations: { some: { id: device.locationId } },
            },
          },
          include: { role: true, organization: true },
        });

        if (!user) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await prisma.registeredDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          title: user.title,
          role: user.role.name,
          permissions: user.role.permissions as string[],
          organizationId: user.organizationId,
          homeLocationId: device.locationId,
          locationIds: [device.locationId],
          appAccess: user.appAccess as string[],
        };
      },
    }),

    Credentials({
      id: "saas-admin-credentials",
      name: "SaaS Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.saasAdmin.findUnique({
          where: { email: credentials.email as string },
        });
        if (!admin || !admin.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          admin.hashedPassword
        );
        if (!valid) return null;

        await prisma.saasAdmin.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: admin.id,
          saasAdminId: admin.id,
          name: admin.name,
          email: admin.email,
          saasRole: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any) = {
          id: token.id,
          name: token.name,
          email: token.email,
          ...(token.saasAdminId
            ? { saasAdminId: token.saasAdminId, saasRole: token.saasRole }
            : {
                title: token.title,
                role: token.role,
                permissions: token.permissions,
                organizationId: token.organizationId,
                homeLocationId: token.homeLocationId,
                locationIds: token.locationIds,
                appAccess: token.appAccess,
              }),
        };
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});
