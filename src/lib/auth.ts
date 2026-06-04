import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Auth.js auto-trusts the host on Vercel. Only force it elsewhere via an
  // explicit opt-in, to avoid host-header poisoning of auth redirects.
  trustHost: process.env.AUTH_TRUST_HOST === "true" || undefined,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        // Always run a hash comparison to avoid timing-based user enumeration.
        const hash =
          user?.passwordHash ??
          "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvi";
        const ok = await bcrypt.compare(password, hash);
        if (!user || !ok) return null;

        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
