"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, signUp } from "@/app/actions/auth";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  notice?: string;
};

export function AuthForm({ mode, notice }: AuthFormProps) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, null);
  const isSignUp = mode === "sign-up";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          BrandVault
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">
          {isSignUp ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp ? "Your private workspace is created after signup." : "Continue to your workspace."}
        </p>

        {notice ? (
          <p className="mt-5 rounded-md border border-border bg-muted/60 p-3 text-sm text-foreground" role="status">
            {notice}
          </p>
        ) : null}

        {state ? (
          <p
            className={`mt-5 rounded-md border p-3 text-sm ${
              state.status === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-muted/60 text-foreground"
            }`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={isSignUp ? 8 : undefined}
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {isSignUp ? (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {isSignUp ? "Already have an account? " : "New to BrandVault? "}
          <Link
            href={isSignUp ? "/login" : "/signup"}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}