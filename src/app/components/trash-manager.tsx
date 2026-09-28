"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

import type { DeletedAsset } from "@/lib/assets";
import type { Folder } from "@/lib/folders";

type TrashManagerProps = {
  initialAssets: DeletedAsset[];
  folders: Folder[];
  loadFailed: boolean;
};

type ApiPayload = {
  asset?: DeletedAsset;
  error?: string;
};

function folderPaths(folders: Folder[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  return (folderId: string) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let current = byId.get(folderId);

    while (current) {
      if (visited.has(current.id)) {
        return "Invalid folder hierarchy";
      }
      visited.add(current.id);
      path.unshift(current.name);
      current = current.parent_folder_id ? byId.get(current.parent_folder_id) : undefined;
    }

    return path.join(" / ");
  };
}

async function readPayload(response: Response): Promise<ApiPayload | null> {
  return response.json().catch(() => null) as Promise<ApiPayload | null>;
}

export function TrashManager({ initialAssets, folders, loadFailed }: TrashManagerProps) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const getFolderPath = folderPaths(folders);

  async function restoreAsset(asset: DeletedAsset) {
    setPendingId(asset.id);
    setError(null);
    setSuccess(null);
    setSessionExpired(false);

    try {
      const response = await fetch(`/api/assets/${asset.id}/restore`, { method: "POST" });
      const payload = await readPayload(response);
      if (!response.ok) {
        setError(payload?.error ?? "Unable to restore this asset.");
        setSessionExpired(response.status === 401);
        return;
      }

      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setSuccess(`${asset.name} restored.`);
      router.refresh();
    } catch {
      setError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (loadFailed) {
    return (
      <div className="border-l-2 border-destructive pl-4" role="alert">
        <p className="font-medium">Trash could not be loaded.</p>
        <Link href="/trash" className="mt-2 inline-block text-sm underline underline-offset-4">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {sessionExpired ? (
            <Link href="/login" className="mt-1 inline-block underline underline-offset-4">
              Sign in again
            </Link>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <p className="mb-5 rounded-md border border-emerald-700/20 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {assets.length === 0 ? (
        <div className="border-y border-border py-14 text-center">
          <p className="font-medium">Trash is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Items you move to Trash will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {assets.map((asset) => (
            <article key={asset.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="min-w-0 flex-1">
                <h2 className="break-words font-medium">{asset.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {asset.type} · Deleted {asset.deleted_at.slice(0, 10)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Folder: {asset.folder_id ? getFolderPath(asset.folder_id) || "Unavailable" : "No folder"}
                </p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-sm text-muted-foreground underline underline-offset-4"
                >
                  {asset.url}
                </a>
              </div>
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={() => void restoreAsset(asset)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {pendingId === asset.id ? "Restoring…" : "Restore"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}