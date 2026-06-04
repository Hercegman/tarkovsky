import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await auth()) redirect("/quests");
  return <AuthForm mode="login" action={loginAction} />;
}
