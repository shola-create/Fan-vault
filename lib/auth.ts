import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        if (user.bannedAt && (!user.banExpiresAt || user.banExpiresAt > new Date())) return null;
        if (user.banExpiresAt && user.banExpiresAt <= new Date()) {
          await prisma.user.update({ where: { id: user.id }, data: { bannedAt: null, banReason: null, banExpiresAt: null } });
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const dbUser = token.id ? await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true, bannedAt: true, banExpiresAt: true } }) : null;
        if (dbUser?.bannedAt && (!dbUser.banExpiresAt || dbUser.banExpiresAt > new Date())) return null as any;
        if (dbUser?.bannedAt && dbUser.banExpiresAt && dbUser.banExpiresAt <= new Date()) {
          await prisma.user.update({ where: { id: token.id as string }, data: { bannedAt: null, banReason: null, banExpiresAt: null } });
        }
        (session.user as any).id = token.id;
        (session.user as any).role = dbUser?.role ?? token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
