import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { SignupNotice } from "@/components/signup-notice";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage() {
  if (await auth()) redirect("/quests");
  return (
    <>
      <SignupNotice />
      <AuthForm mode="register" action={registerAction} />
    </>
  );
}
