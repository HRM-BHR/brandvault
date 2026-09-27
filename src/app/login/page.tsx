import { redirect } from "next/navigation";

import { AuthForm } from "@/app/components/auth-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  let authenticated = false;

  try {
    await getAuthenticatedUser();
    authenticated = true;
  } catch {}

  if (authenticated) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const notice = error === "confirmation"
    ? "That confirmation link could not be verified. Request a new signup link and try again."
    : error === "workspace"
      ? "Your account is verified, but workspace setup did not finish. Sign in to retry."
      : undefined;

  return <AuthForm mode="sign-in" notice={notice} />;
}