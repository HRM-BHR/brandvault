"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FilePlus2, Pencil, Trash2, X } from "lucide-react";

import { AssetMetadataReview } from "@/app/components/asset-metadata-review";
import type { Asset } from "@/lib/assets";
import type { Folder } from "@/lib/folders";
import type { AssetListQuery } from "@/lib/schemas";

type AssetManagerProps = {
  initialAssets: Asset[];
  folders: Folder[];
  loadFailed: boolean;
  query: AssetListQuery;
};

type AssetFormValues = {
  name: string;
  type: string;
  url: string;
  folder_id: string;
};

type ApiPayload = {
  asset?: Asset;
  error?: string;
};

function getFolderPath(folder: Folder, byId: Map<string, Folder>) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current: Folder | undefined = folder;

  while (current) {
    if (visited.has(current.id)) {
      return "Invalid folder hierarchy";
    }

    visited.add(current.id);
    path.unshift(current.name);
    current = current.parent_folder_id ? byId.get(current.parent_folder_id) : undefined;
  }

  return path.join(" / ");
}

async function readPayload(response: Response): Promise<ApiPayload | null> {
  return response.json().catch(() => null) as Promise<ApiPayload | null>;
}

function sortAssets(assets: Asset[], sort: AssetListQuery["sort"]) {
  return [...assets].sort((left, right) => sort === "name_asc"
    ? left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
    : right.updated_at.localeCompare(left.updated_at) || left.id.localeCompare(right.id));
}

function matchesSearch(asset: Asset, search: string) {
  return !search || asset.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

function applyAssetResult(current: Asset[], updated: Asset, query: AssetListQuery) {
  const withoutUpdated = current.filter((asset) => asset.id !== updated.id);
  return sortAssets(
    matchesSearch(updated, query.search) ? [...withoutUpdated, updated] : withoutUpdated,
    query.sort,
  );
}

function valuesFromAsset(asset: Asset): AssetFormValues {
  return {
    name: asset.name,
    type: asset.type,
    url: asset.url,
    folder_id: asset.folder_id ?? "",
  };
}

const emptyForm: AssetFormValues = { name: "", type: "", url: "", folder_id: "" };

export function AssetManager({ initialAssets, folders, loadFailed, query }: AssetManagerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const byFolderId = new Map(folders.map((folder) => [folder.id, folder]));
  const folderOptions = folders
    .map((folder) => ({ folder, path: getFolderPath(folder, byFolderId) }))
    .sort((left, right) => left.path.localeCompare(right.path) || left.folder.id.localeCompare(right.folder.id));

  function showError(message: string, status?: number) {
    setError(message);
    setSuccess(null);
    setSessionExpired(status === 401);
  }

  function openCreateForm() {
    setEditingAsset(null);
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  async function openEditForm(assetId: string) {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/assets/${assetId}`);
      const payload = await readPayload(response);
      if (!response.ok || !payload?.asset) {
        showError(payload?.error ?? "Unable to load this asset.", response.status);
        return;
      }

      setEditingAsset(payload.asset);
      setFormOpen(true);
    } catch {
      showError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditingAsset(null);
  }

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: AssetFormValues = {
      name: String(formData.get("name") ?? ""),
      type: String(formData.get("type") ?? ""),
      url: String(formData.get("url") ?? ""),
      folder_id: String(formData.get("folder_id") ?? ""),
    };

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        editingAsset ? `/api/assets/${editingAsset.id}` : "/api/assets",
        {
          method: editingAsset ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, folder_id: input.folder_id || null }),
        },
      );
      const payload = await readPayload(response);
      if (!response.ok || !payload?.asset) {
        showError(payload?.error ?? "Unable to save this asset.", response.status);
        return;
      }

      setAssets((current) => applyAssetResult(current, payload.asset!, query));
      setSuccess(editingAsset ? "Asset updated." : "Asset created.");
      closeForm();
    } catch {
      showError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function moveAsset(asset: Asset, folderId: string) {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId || null }),
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload?.asset) {
        showError(payload?.error ?? "Unable to move this asset.", response.status);
        return;
      }

      setAssets((current) => applyAssetResult(current, payload.asset!, query));
      setSuccess("Asset moved.");
    } catch {
      showError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function trashAsset(asset: Asset) {
    if (!window.confirm(`Move "${asset.name}" to trash?`)) {
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/assets/${asset.id}/trash`, { method: "POST" });
      const payload = await readPayload(response);
      if (!response.ok) {
        showError(payload?.error ?? "Unable to move this asset to trash.", response.status);
        return;
      }

      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setSuccess("Asset moved to trash.");
    } catch {
      showError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadFailed) {
    return (
      <div className="border-l-2 border-destructive pl-4" role="alert">
        <p className="font-medium">Assets could not be loaded.</p>
        <Link href="/assets" className="mt-2 inline-block text-sm underline underline-offset-4">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm text-muted-foreground">{assets.length} active {assets.length === 1 ? "asset" : "assets"}</p>
          <Link href="/trash" className="mt-1 inline-block text-sm font-medium underline underline-offset-4">
            Open Trash
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form action="/assets" method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="asset-search" className="text-xs font-medium text-muted-foreground">Search name</label>
              <input
                id="asset-search"
                name="search"
                type="search"
                defaultValue={query.search}
                maxLength={120}
                placeholder="Search assets…"
                className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="asset-sort" className="text-xs font-medium text-muted-foreground">Sort</label>
              <select
                id="asset-sort"
                name="sort"
                defaultValue={query.sort}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="updated_desc">Recently updated</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
            <button type="submit" className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted">
              Apply
            </button>
          </form>
          <button
            type="button"
            onClick={formOpen && !editingAsset ? closeForm : openCreateForm}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formOpen && !editingAsset ? <X aria-hidden="true" className="size-4" /> : <FilePlus2 aria-hidden="true" className="size-4" />}
            {formOpen && !editingAsset ? "Close" : "Add asset"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {sessionExpired ? (
            <Link href="/login" className="mt-1 inline-block underline underline-offset-4">
              Sign in again
            </Link>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <p className="mt-5 rounded-md border border-emerald-700/20 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {formOpen ? (
        <AssetEditorForm
          asset={editingAsset}
          folders={folderOptions}
          pending={pending}
          onSubmit={saveAsset}
          onCancel={closeForm}
        />
      ) : null}

      {assets.length === 0 ? (
        <div className="border-b border-border py-14 text-center">
          <p className="font-medium">{query.search ? "No assets match your search" : "No active assets yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.search ? "Try another name or clear the search." : "Add an asset using its URL to get started."}
          </p>
          {query.search ? (
            <Link href="/assets" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              Clear search
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {assets.map((asset) => (
            <article key={asset.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-center">
              <div className="min-w-0">
                <h2 className="break-words font-medium">{asset.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{asset.type} · Updated {asset.updated_at.slice(0, 10)}</p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-sm text-muted-foreground underline underline-offset-4"
                >
                  {asset.url}
                </a>
              </div>

              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>Folder</span>
                <select
                  aria-label={`Move ${asset.name} to folder`}
                  value={asset.folder_id ?? ""}
                  disabled={pending}
                  onChange={(event) => void moveAsset(asset, event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <option value="">No folder</option>
                  {folderOptions.map(({ folder, path }) => (
                    <option key={folder.id} value={folder.id}>{path}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void openEditForm(asset.id)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void trashAsset(asset)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Trash
                </button>
              </div>
              <AssetMetadataReview
                asset={asset}
                onSaved={(updatedAsset) =>
                  setAssets((current) => applyAssetResult(current, updatedAsset, query))
                }
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type FolderOption = { folder: Folder; path: string };

type AssetEditorFormProps = {
  asset: Asset | null;
  folders: FolderOption[];
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function AssetEditorForm({ asset, folders, pending, onSubmit, onCancel }: AssetEditorFormProps) {
  const initial = asset ? valuesFromAsset(asset) : emptyForm;

  return (
    <section aria-labelledby="asset-editor-heading" className="border-b border-border py-6">
      <h2 id="asset-editor-heading" className="text-lg font-semibold">
        {asset ? "Edit asset" : "Add asset"}
      </h2>
      <form key={asset?.id ?? "new-asset"} onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <fieldset disabled={pending} className="contents disabled:opacity-70">
          <div className="space-y-1.5">
            <label htmlFor="asset-name" className="text-sm font-medium">Name</label>
            <input id="asset-name" name="name" defaultValue={initial.name} maxLength={160} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="asset-type" className="text-sm font-medium">Type</label>
            <input id="asset-type" name="type" defaultValue={initial.type} maxLength={80} required placeholder="Image, document, link…" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="asset-url" className="text-sm font-medium">URL</label>
            <input id="asset-url" name="url" type="url" defaultValue={initial.url} maxLength={2048} required placeholder="https://example.com/resource" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="asset-folder" className="text-sm font-medium">Folder</label>
            <select id="asset-folder" name="folder_id" defaultValue={initial.folder_id} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">No folder</option>
              {folders.map(({ folder, path }) => <option key={folder.id} value={folder.id}>{path}</option>)}
            </select>
          </div>
        </fieldset>
        <div className="flex items-center gap-2 md:col-span-2">
          <button type="submit" disabled={pending} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving…" : asset ? "Save changes" : "Create asset"}
          </button>
          <button type="button" disabled={pending} onClick={onCancel} className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60">
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}