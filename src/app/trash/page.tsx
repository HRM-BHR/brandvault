import Link from "next/link";
import { redirect } from "next/navigation";

import { TrashManager } from "@/app/components/trash-manager";
import { listDeletedAssetsForCurrentWorkspace } from "@/lib/assets";
import { listFoldersForCurrentWorkspace } from "@/lib/folders";
import type { DeletedAsset } from "@/lib/assets";
import type { Folder } from "@/lib/folders";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  let assets: DeletedAsset[] = [];
  let folders: Folder[] = [];
  let loadFailed = false;

  try {
    assets = await listDeletedAssetsForCurrentWorkspace();
    folders = await listFoldersForCurrentWorkspace();
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
          <h1 className="mt-3 text-2xl font-semibold">Trash</h1>
        </div>
        <Link
          href="/assets"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
        >
          Back to Assets
        </Link>
      </div>

      <TrashManager initialAssets={assets} folders={folders} loadFailed={loadFailed} />
    </main>
  );
}