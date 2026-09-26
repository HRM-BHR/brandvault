import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth";

export default async function Home() {
  let userEmail: string | null = null;

  try {
    const user = await getAuthenticatedUser();
    userEmail = user.email ?? null;
  } catch {
    userEmail = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              BrandVault
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Secure brand asset management for a single workspace.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              The app enforces Supabase authentication and workspace ownership checks before any
              private data is accessed. User-supplied workspace IDs are never trusted for
              authorization.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {userEmail ? (
              <>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Open workspace
                </Link>
                <Link
                  href="/api/auth/logout"
                  className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Sign in to continue
              </Link>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Supabase Auth + RLS",
              "Workspace-scoped ownership checks",
              "AI suggestions reviewed before save",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>

          {userEmail ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Signed in as <span className="font-semibold">{userEmail}</span>. Workspace access is
              restricted to the authenticated user’s private workspace.
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No active session detected. Configure Supabase credentials in the environment to enable
              sign-in and protected workspace access.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
