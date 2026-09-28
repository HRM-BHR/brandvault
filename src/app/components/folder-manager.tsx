"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Folder as FolderIcon, FolderPlus, Pencil, Trash2, X } from "lucide-react";

import type { Folder } from "@/lib/folders";
import { MAX_FOLDER_DEPTH } from "@/lib/schemas";

type FolderManagerProps = {
  initialFolders: Folder[];
  loadFailed: boolean;
};

type ApiPayload = {
  folder?: Folder;
  error?: string;
};

type FolderRow = {
  folder: Folder;
  depth: number;
  path: string;
};

function createFolderIndex(folders: Folder[]) {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

function getFolderPath(folder: Folder, byId: Map<string, Folder>) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current: Folder | undefined = folder;

  while (current) {
    if (visited.has(current.id)) {
      return { depth: MAX_FOLDER_DEPTH + 1, path: "Invalid folder hierarchy" };
    }

    visited.add(current.id);
    path.unshift(current.name);
    current = current.parent_folder_id ? byId.get(current.parent_folder_id) : undefined;
  }

  return { depth: path.length, path: path.join(" / ") };
}

function getDescendantIds(folderId: string, folders: Folder[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parent_folder_id) {
      continue;
    }
    const children = childrenByParent.get(folder.parent_folder_id) ?? [];
    children.push(folder.id);
    childrenByParent.set(folder.parent_folder_id, children);
  }

  const descendants = new Set<string>();
  const pending = [...(childrenByParent.get(folderId) ?? [])];
  while (pending.length > 0) {
    const descendantId = pending.pop();
    if (!descendantId || descendants.has(descendantId)) {
      continue;
    }
    descendants.add(descendantId);
    pending.push(...(childrenByParent.get(descendantId) ?? []));
  }

  return descendants;
}

function getSubtreeHeight(folderId: string, folders: Folder[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parent_folder_id) {
      continue;
    }
    const children = childrenByParent.get(folder.parent_folder_id) ?? [];
    children.push(folder.id);
    childrenByParent.set(folder.parent_folder_id, children);
  }

  const pending = [{ id: folderId, depth: 1 }];
  const visited = new Set<string>();
  let height = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }
    if (visited.has(current.id)) {
      return MAX_FOLDER_DEPTH + 1;
    }
    visited.add(current.id);
    height = Math.max(height, current.depth);
    for (const childId of childrenByParent.get(current.id) ?? []) {
      pending.push({ id: childId, depth: current.depth + 1 });
    }
  }

  return height;
}

async function getResponsePayload(response: Response): Promise<ApiPayload | null> {
  return response.json().catch(() => null) as Promise<ApiPayload | null>;
}

export function FolderManager({ initialFolders, loadFailed }: FolderManagerProps) {
  const [folders, setFolders] = useState(initialFolders);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const byId = createFolderIndex(folders);
  const rows: FolderRow[] = folders
    .map((folder) => ({ folder, ...getFolderPath(folder, byId) }))
    .sort((left, right) => left.path.localeCompare(right.path) || left.folder.id.localeCompare(right.folder.id));

  function showRequestError(message: string, status?: number) {
    setError(message);
    setSessionExpired(status === 401);
    setSuccess(null);
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          parent_folder_id: newParentId || null,
        }),
      });
      const payload = await getResponsePayload(response);

      if (!response.ok || !payload?.folder) {
        showRequestError(payload?.error ?? "Unable to create the folder.", response.status);
        return;
      }

      setFolders((current) => [...current, payload.folder!]);
      setNewName("");
      setNewParentId("");
      setSuccess("Folder created.");
    } catch {
      showRequestError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function updateFolder(folderId: string, updates: { name?: string; parent_folder_id?: string | null }) {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await getResponsePayload(response);

      if (!response.ok || !payload?.folder) {
        showRequestError(payload?.error ?? "Unable to update the folder.", response.status);
        return false;
      }

      setFolders((current) => current.map((folder) =>
        folder.id === payload.folder?.id ? payload.folder : folder,
      ));
      setEditingId(null);
      setSuccess("Folder updated.");
      return true;
    } catch {
      showRequestError("Unable to reach BrandVault. Check your connection and try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function deleteFolder(folder: Folder) {
    if (!window.confirm(`Delete the empty folder "${folder.name}"?`)) {
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      const payload = response.status === 204 ? null : await getResponsePayload(response);

      if (!response.ok) {
        showRequestError(payload?.error ?? "Unable to delete the folder.", response.status);
        return;
      }

      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setSuccess("Folder deleted.");
    } catch {
      showRequestError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadFailed) {
    return (
      <div className="border-l-2 border-destructive pl-4" role="alert">
        <p className="font-medium">Folders could not be loaded.</p>
        <Link href="/folders" className="mt-2 inline-block text-sm underline underline-offset-4">
          Try again
        </Link>
      </div>
    );
  }

  const createParentChoices = rows.filter((row) => row.depth < MAX_FOLDER_DEPTH);

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

      <section aria-labelledby="create-folder-heading" className="border-b border-border pb-7">
        <h2 id="create-folder-heading" className="text-lg font-semibold">Create folder</h2>
        <form onSubmit={createFolder} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)_auto]">
          <div className="space-y-1.5">
            <label htmlFor="new-folder-name" className="text-sm font-medium">Name</label>
            <input
              id="new-folder-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={100}
              required
              disabled={pending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-folder-parent" className="text-sm font-medium">Parent folder</label>
            <select
              id="new-folder-parent"
              value={newParentId}
              onChange={(event) => setNewParentId(event.target.value)}
              disabled={pending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <option value="">Root folder</option>
              {createParentChoices.map(({ folder, path }) => (
                <option key={folder.id} value={folder.id}>{path}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FolderPlus aria-hidden="true" className="size-4" />
            {pending ? "Working…" : "Create"}
          </button>
        </form>
      </section>

      <section aria-labelledby="folder-list-heading" className="pt-7">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="folder-list-heading" className="text-lg font-semibold">Folder hierarchy</h2>
          <span className="text-sm text-muted-foreground">{folders.length} {folders.length === 1 ? "folder" : "folders"}</span>
        </div>

        {folders.length === 0 ? (
          <div className="mt-4 border-y border-border py-10 text-center">
            <FolderIcon aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No folders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a root folder or choose a parent to start a hierarchy.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border border-y border-border">
            {rows.map(({ folder, depth, path }) => {
              const descendants = getDescendantIds(folder.id, folders);
              const subtreeHeight = getSubtreeHeight(folder.id, folders);
              const parentChoices = rows.filter(({ folder: candidate }) =>
                candidate.id !== folder.id
                && !descendants.has(candidate.id)
                && getFolderPath(candidate, byId).depth + subtreeHeight <= MAX_FOLDER_DEPTH,
              );

              return (
                <div key={folder.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4">
                  <div className="min-w-52 flex-1" style={{ paddingInlineStart: `${(depth - 1) * 24}px` }}>
                    <div className="flex items-center gap-2">
                      <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      {editingId === folder.id ? (
                        <input
                          aria-label={`Rename ${folder.name}`}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          maxLength={100}
                          autoFocus
                          disabled={pending}
                          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        />
                      ) : (
                        <span className="break-words font-medium">{folder.name}</span>
                      )}
                    </div>
                    <p className="mt-1 pl-6 text-xs text-muted-foreground">{path} · Level {depth}</p>
                  </div>

                  {editingId === folder.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Save name for ${folder.name}`}
                        title="Save name"
                        disabled={pending}
                        onClick={() => void updateFolder(folder.id, { name: editingName })}
                        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        <Check aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename"
                        title="Cancel rename"
                        disabled={pending}
                        onClick={() => setEditingId(null)}
                        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="sr-only">Move {folder.name} under</span>
                        <select
                          aria-label={`Move ${folder.name} under`}
                          value={folder.parent_folder_id ?? ""}
                          disabled={pending}
                          onChange={(event) => void updateFolder(folder.id, {
                            parent_folder_id: event.target.value || null,
                          })}
                          className="h-9 max-w-56 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        >
                          <option value="">Root</option>
                          {parentChoices.map(({ folder: candidate, path: candidatePath }) => (
                            <option key={candidate.id} value={candidate.id}>{candidatePath}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Rename ${folder.name}`}
                          title="Rename folder"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(folder.id);
                            setEditingName(folder.name);
                            setError(null);
                            setSuccess(null);
                          }}
                          className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${folder.name}`}
                          title="Delete empty folder"
                          disabled={pending}
                          onClick={() => void deleteFolder(folder)}
                          className="inline-flex size-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}