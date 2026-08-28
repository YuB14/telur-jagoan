import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { SESSION_IDLE_TIMEOUT_SECONDS } from "@/lib/auth-constants";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  isLoginBlocked,
  recordBlockedLogin,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/server/services/login-rate-limit";

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(8).max(255),
});

function isUserRole(value: unknown): value is "OWNER" | "CASHIER" {
  return value === "OWNER" || value === "CASHIER";
}

const INVALID_PASSWORD_HASH = "$2b$12$z.TFZJsyxlhrFhPFtn644.8GWuk0xKJcP3sRTmo0tMp64bvIkW8jG";

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.SESSION_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
  },
  jwt: {
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
  },
  providers: [
    Credentials({
      credentials: {
        identifier: {
          label: "Email atau username",
          type: "text",
        },
        password: {
          label: "Kata sandi",
          type: "password",
        },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { identifier, password } = parsed.data;
        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { username: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });
        const loginContext = {
          identifier,
          userId: user?.id ?? null,
          request,
        };

        if (await isLoginBlocked(loginContext)) {
          await recordBlockedLogin(loginContext);
          return null;
        }

        const passwordMatches = await verifyPassword(
          password,
          user?.passwordHash ?? INVALID_PASSWORD_HASH,
        );

        if (!user || !user.isActive || !passwordMatches) {
          await recordFailedLogin(loginContext);
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await recordSuccessfulLogin(loginContext);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string" && isUserRole(token.role)) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },
  },
});
