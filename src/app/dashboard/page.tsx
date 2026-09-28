import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { ensureAuthenticatedWorkspace } from "@/lib/auth";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  let context;

  try {
    context = await ensureAuthenticatedWorkspace();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/login");
    }

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            BrandVault could not load your workspace. Please try again.
          </p>
          <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium underline underline-offset-4">
            Retry
          </Link>
        </section>
      </main>
    );
  }

            <Link
              href="/assets"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Assets
            </Link>
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              BrandVault
            </p>
            <h1 className="mt-4 text-2xl font-semibold">Welcome</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as {context.user.email ?? "your account"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/brand"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
            >
              Brand Profile
            </Link>
            <Link
              href="/folders"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Folders
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {params.error === "signout" ? (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            Sign out did not complete. Please try again.
          </p>
        ) : null}

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">Workspace</p>
          <p className="mt-1 text-base font-medium">{context.workspace.name}</p>
        </div>
      </section>
    </main>
  );
}