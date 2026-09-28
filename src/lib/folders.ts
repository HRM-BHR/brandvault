import "server-only";

import { ensureAuthenticatedWorkspace } from "@/lib/auth";
import {
  MAX_FOLDER_DEPTH,
  type CreateFolderInput,
  type UpdateFolderInput,
} from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
};

type FolderRecord = Folder;

export type FolderErrorKind =
  | "not-found"
  | "parent-not-found"
  | "depth-limit"
  | "cycle"
  | "self-parent"
  | "duplicate-name"
  | "not-empty"
  | "database";

export class FolderOperationError extends Error {
  constructor(readonly kind: FolderErrorKind) {
    super(kind);
  }
}

const folderFields = "id, name, parent_folder_id, created_at, updated_at";

async function getWorkspaceFolderContext() {
  const { workspace } = await ensureAuthenticatedWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("folders")
    .select(folderFields)
    .eq("workspace_id", workspace.id)
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new FolderOperationError("database");
  }

  return {
    workspace,
    supabase,
    folders: (data ?? []) as FolderRecord[],
  };
}

function buildFolderIndex(folders: FolderRecord[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const childrenByParent = new Map<string, FolderRecord[]>();

  for (const folder of folders) {
    if (!folder.parent_folder_id) {
      continue;
    }

    const siblings = childrenByParent.get(folder.parent_folder_id) ?? [];
    siblings.push(folder);
    childrenByParent.set(folder.parent_folder_id, siblings);
  }

  return { byId, childrenByParent };
}

function getFolderDepth(folderId: string, byId: Map<string, FolderRecord>) {
  let current = byId.get(folderId);
  let depth = 0;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) {
      throw new FolderOperationError("database");
    }

    visited.add(current.id);
    depth += 1;

    if (!current.parent_folder_id) {
      return depth;
    }

    current = byId.get(current.parent_folder_id);
    if (!current) {
      throw new FolderOperationError("database");
    }
  }

  throw new FolderOperationError("database");
}

function getSubtreeInfo(folderId: string, childrenByParent: Map<string, FolderRecord[]>) {
  const descendants = new Set<string>();
  const pending = [{ id: folderId, depth: 1 }];
  let height = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    if (descendants.has(current.id)) {
      throw new FolderOperationError("database");
    }

    descendants.add(current.id);
    height = Math.max(height, current.depth);

    for (const child of childrenByParent.get(current.id) ?? []) {
      pending.push({ id: child.id, depth: current.depth + 1 });
    }
  }

  return { descendants, height };
}

function validateMove(
  folderId: string,
  parentFolderId: string | null,
  byId: Map<string, FolderRecord>,
  childrenByParent: Map<string, FolderRecord[]>,
) {
  if (parentFolderId === folderId) {
    throw new FolderOperationError("self-parent");
  }

  const subtree = getSubtreeInfo(folderId, childrenByParent);

  if (!parentFolderId) {
    if (subtree.height > MAX_FOLDER_DEPTH) {
      throw new FolderOperationError("depth-limit");
    }
    return;
  }

  const parent = byId.get(parentFolderId);
  if (!parent) {
    throw new FolderOperationError("parent-not-found");
  }

  if (subtree.descendants.has(parentFolderId)) {
    throw new FolderOperationError("cycle");
  }

  const resultingDepth = getFolderDepth(parentFolderId, byId) + subtree.height;
  if (resultingDepth > MAX_FOLDER_DEPTH) {
    throw new FolderOperationError("depth-limit");
  }
}

export async function listFoldersForCurrentWorkspace(): Promise<Folder[]> {
  const { folders } = await getWorkspaceFolderContext();
  return folders;
}

export async function createFolderForCurrentWorkspace(input: CreateFolderInput): Promise<Folder> {
  const { workspace, supabase, folders } = await getWorkspaceFolderContext();
  const parentFolderId = input.parent_folder_id ?? null;

  if (parentFolderId) {
    const { byId } = buildFolderIndex(folders);
    const parent = byId.get(parentFolderId);
    if (!parent) {
      throw new FolderOperationError("parent-not-found");
    }

    if (getFolderDepth(parent.id, byId) >= MAX_FOLDER_DEPTH) {
      throw new FolderOperationError("depth-limit");
    }
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({
      workspace_id: workspace.id,
      parent_folder_id: parentFolderId,
      name: input.name,
    })
    .select(folderFields)
    .single();

  if (error?.code === "23505") {
    throw new FolderOperationError("duplicate-name");
  }

  if (error?.code === "23503") {
    throw new FolderOperationError("parent-not-found");
  }

  if (error || !data) {
    throw new FolderOperationError("database");
  }

  return data as Folder;
}

export async function updateFolderForCurrentWorkspace(
  folderId: string,
  input: UpdateFolderInput,
): Promise<Folder> {
  const { workspace, supabase, folders } = await getWorkspaceFolderContext();
  const { byId, childrenByParent } = buildFolderIndex(folders);
  const target = byId.get(folderId);

  if (!target) {
    throw new FolderOperationError("not-found");
  }

  const hasParentUpdate = Object.hasOwn(input, "parent_folder_id");
  const parentFolderId = hasParentUpdate
    ? input.parent_folder_id ?? null
    : target.parent_folder_id;

  if (hasParentUpdate) {
    validateMove(folderId, parentFolderId, byId, childrenByParent);
  }

  const updates: { name?: string; parent_folder_id?: string | null } = {};
  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (hasParentUpdate) {
    updates.parent_folder_id = parentFolderId;
  }

  const { data, error } = await supabase
    .from("folders")
    .update(updates)
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .select(folderFields)
    .maybeSingle();

  if (error?.code === "23505") {
    throw new FolderOperationError("duplicate-name");
  }

  if (error?.code === "23503") {
    throw new FolderOperationError("parent-not-found");
  }

  if (error) {
    throw new FolderOperationError("database");
  }

  if (!data) {
    throw new FolderOperationError("not-found");
  }

  return data as Folder;
}

export async function deleteFolderForCurrentWorkspace(folderId: string): Promise<void> {
  const { workspace, supabase } = await getWorkspaceFolderContext();
  const { data, error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle();

  if (error?.code === "23503") {
    throw new FolderOperationError("not-empty");
  }

  if (error) {
    throw new FolderOperationError("database");
  }

  if (!data) {
    throw new FolderOperationError("not-found");
  }
}