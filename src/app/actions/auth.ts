"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ensureAuthenticatedWorkspace } from "@/lib/auth";
import { env } from "@/lib/env";
import { signInSchema, signUpSchema } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState =
  | { status: "error"; message: string }
  | { status: "notice"; message: string }
  | null;

function getValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the information and try again.";
}

function getAuthErrorMessage(code: string | undefined, action: "sign in" | "sign up") {
  if (code === "weak_password") {
    return "Choose a stronger password and try again.";
  }

  if (code === "email_address_invalid") {
    return "Enter a valid email address.";
  }

  if (code === "user_already_exists" || code === "email_exists") {
    return "An account with this email may already exist. Try signing in.";
  }

  if (code === "email_not_confirmed") {
    return "Confirm your email address before signing in.";
  }

  if (code === "invalid_credentials") {
    return "Email or password is incorrect.";
  }

  if (code === "over_request_rate_limit" || code === "too_many_requests") {
    return "Too many attempts. Wait a moment and try again.";
  }

  return `Unable to ${action}. Check your details and try again.`;
}

async function getEmailConfirmationUrl() {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;

  if (siteUrl) {
    return new URL("/auth/confirm", siteUrl).toString();
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (origin && host) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host === host && ["http:", "https:"].includes(parsedOrigin.protocol)) {
        return new URL("/auth/confirm", parsedOrigin).toString();
      }
    } catch {
      return new URL("/auth/confirm", "http://localhost:3000").toString();
    }
  }

  return new URL("/auth/confirm", "http://localhost:3000").toString();
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: getValidationMessage(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.code, "sign in") };
  }

  if (!data.session) {
    return { status: "error", message: "Unable to establish a session. Please try again." };
  }

  try {
    await ensureAuthenticatedWorkspace();
  } catch {
    return { status: "error", message: "Unable to finish workspace setup. Please try again." };
  }

  redirect("/dashboard");
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", message: getValidationMessage(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: await getEmailConfirmationUrl() },
  });

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.code, "sign up") };
  }

  if (!data.session) {
    return {
      status: "notice",
      message: "Check your email for a confirmation link. If the address is already registered, sign in instead.",
    };
  }

  try {
    await ensureAuthenticatedWorkspace();
  } catch {
    return { status: "error", message: "Unable to finish workspace setup. Please try again." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    redirect("/dashboard?error=signout");
  }

  redirect("/login");
}