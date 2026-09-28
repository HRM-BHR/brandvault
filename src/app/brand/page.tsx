import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandProfileEditor } from "@/app/components/brand-profile-editor";
import { getBrandForCurrentWorkspace } from "@/lib/brands";

export const dynamic = "force-dynamic";

export default async function BrandProfilePage() {
  let brand = null;
  let loadFailed = false;

  try {
    brand = await getBrandForCurrentWorkspace();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/login");
    }

    loadFailed = true;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            BrandVault
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Brand Profile</h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>

      <BrandProfileEditor initialBrand={brand} loadFailed={loadFailed} />
    </main>
  );
}