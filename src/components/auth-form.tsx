"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/app/(auth)/actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded border border-[var(--gold-dim)] bg-[var(--gold)] px-4 py-2.5 font-medium text-[var(--background)] transition-colors hover:bg-[var(--gold-hi)] disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--muted)]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--gold-dim)]"
      />
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: Action;
}) {
  const [state, formAction] = useActionState(action, { error: null });
  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {isRegister
          ? "Track your quest progress across raids."
          : "Log in with your username and password."}
      </p>

      <form action={formAction} className="space-y-4">
        {isRegister && (
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            hint="Used for account recovery only."
          />
        )}
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          hint={isRegister ? "3–24 letters, numbers or underscores." : undefined}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          hint={isRegister ? "At least 8 characters." : undefined}
        />

        {state.error && (
          <p className="rounded border border-[var(--danger)] bg-[var(--danger)]/15 px-3 py-2 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        )}

        <SubmitButton label={isRegister ? "Sign up" : "Log in"} />
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--gold)] hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="text-[var(--gold)] hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
