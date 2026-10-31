import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { writeAudit } from "./audit";
import { MAX_FAILED_ATTEMPTS, SESSION_IDLE_MINUTES } from "./constants";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_IDLE_MINUTES * 60 },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { username: {}, password: {} },
      // Thrown messages (INVALID / LOCKED / INACTIVE) reach the login page as signIn().error
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) throw new Error("INVALID");

        const user = await db.user.findUnique({ where: { username } });
        if (!user) throw new Error("INVALID");
        if (!user.isActive) throw new Error("INACTIVE");
        if (user.lockedAt) throw new Error("LOCKED");

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          const failedAttempts = user.failedAttempts + 1;
          const lock = failedAttempts >= MAX_FAILED_ATTEMPTS;
          await db.user.update({
            where: { id: user.id },
            data: { failedAttempts, lockedAt: lock ? new Date() : null },
          });
          if (lock) {
            await writeAudit(user.id, "ACCOUNT_LOCKED", "User", user.id, "Too many failed login attempts");
            throw new Error("LOCKED");
          }
          throw new Error("INVALID");
        }

        await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0 } });
        await writeAudit(user.id, "LOGIN", "User", user.id);
        return { id: user.id, name: user.fullName, username: user.username, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as string,
        username: token.username as string,
      };
      return session;
    },
  },
};
