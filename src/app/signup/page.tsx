import { redirect } from "next/navigation";

import { AuthForm } from "@/app/components/auth-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  let authenticated = false;

  try {
    await getAuthenticatedUser();
    authenticated = true;
  } catch {}

  if (authenticated) {
    redirect("/dashboard");
  }

  return <AuthForm mode="sign-up" />;
}