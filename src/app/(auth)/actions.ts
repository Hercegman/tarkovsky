"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signIn, signOut } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type FormState = { error: string | null };

async function checkRate(
  ns: string,
  identityKeys: string[],
  limit: number,
): Promise<boolean> {
  // Limit on the real client IP *and* the supplied identity keys, so a spoofed
  // X-Forwarded-For can't bypass the per-account (username/email) limits.
  const ip = clientIp(await headers());
  const keys = [`${ns}:ip:${ip}`, ...identityKeys.map((k) => `${ns}:${k}`)];
  return keys.every((k) => rateLimit(k, limit, 60_000).ok);
}

/** Postgres unique-constraint violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, username, password } = parsed.data;

  if (!(await checkRate("register", [`email:${email}`], 5))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  // Hash regardless of whether the account exists, so timing can't reveal it.
  // No racy pre-check: rely on the DB unique constraints and a single generic
  // message that does not disclose which field (username/email) collided.
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await db.insert(users).values({ username, email, passwordHash });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "That username or email is already taken." };
    }
    console.error("register error", err);
    return { error: "Something went wrong. Please try again." };
  }

  // On success this signs in and redirects to /quests.
  return signInOrError(username, password);
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your username and password." };
  }
  const { username, password } = parsed.data;

  if (!(await checkRate("login", [`user:${username.toLowerCase()}`], 10))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }
  return signInOrError(username, password);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

async function signInOrError(
  username: string,
  password: string,
): Promise<FormState> {
  // redirect:false so signIn sets the session cookie and returns instead of
  // throwing its own redirect (which has cookie-loss gotchas in the beta).
  // We then redirect ourselves, carrying the freshly-set cookie.
  try {
    await signIn("credentials", { username, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    throw err;
  }
  redirect("/quests");
}
