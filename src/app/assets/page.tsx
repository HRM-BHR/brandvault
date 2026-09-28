import Link from "next/link";
import { redirect } from "next/navigation";

import { AssetManager } from "@/app/components/asset-manager";
import { listActiveAssetsForCurrentWorkspace, type Asset } from "@/lib/assets";
import { listFoldersForCurrentWorkspace, type Folder } from "@/lib/folders";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  let assets: Asset[] = [];
  let folders: Folder[] = [];
  let loadFailed = false;

  try {
    folders = await listFoldersForCurrentWorkspace();
    assets = await listActiveAssetsForCurrentWorkspace();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/login");
    }

    loadFailed = true;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            BrandVault
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Assets</h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>

      <AssetManager initialAssets={assets} folders={folders} loadFailed={loadFailed} />
    </main>
  );
}