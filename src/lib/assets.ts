import "server-only";

import { ensureAuthenticatedWorkspace } from "@/lib/auth";
import type { AssetListQuery, CreateAssetInput, UpdateAssetInput } from "@/lib/schemas";
import { assetIdSchema } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Asset = {
  id: string;
  folder_id: string | null;
  name: string;
  type: string;
  url: string;
  created_at: string;
  updated_at: string;
};

export type DeletedAsset = Asset & { deleted_at: string };

export type AssetOperationErrorKind = "not-found" | "folder-not-found" | "database";

export class AssetOperationError extends Error {
  constructor(readonly kind: AssetOperationErrorKind) {
    super(kind);
  }
}

const assetFields = "id, folder_id, name, type, url, created_at, updated_at";
const deletedAssetFields = `${assetFields}, deleted_at`;

async function getAssetContext() {
  const { workspace } = await ensureAuthenticatedWorkspace();
  const supabase = await createSupabaseServerClient();
  return { workspace, supabase };
}

async function assertFolderBelongsToWorkspace(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  folderId: string | null | undefined,
  workspaceId: string,
) {
  if (!folderId) {
    return;
  }

  const { data, error } = await supabase
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new AssetOperationError("database");
  }

  if (!data) {
    throw new AssetOperationError("folder-not-found");
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listActiveAssetsForCurrentWorkspace(
  filters: AssetListQuery,
): Promise<Asset[]> {
  const { workspace, supabase } = await getAssetContext();
  let query = supabase
    .from("assets")
    .select(assetFields)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (filters.search) {
    query = query.ilike("name", `%${escapeLikePattern(filters.search)}%`);
  }

  const { data, error } = filters.sort === "name_asc"
    ? await query.order("name", { ascending: true }).order("id", { ascending: true })
    : await query.order("updated_at", { ascending: false }).order("id", { ascending: true });

  if (error) {
    throw new AssetOperationError("database");
  }

  return (data ?? []) as Asset[];
}

export async function listDeletedAssetsForCurrentWorkspace(): Promise<DeletedAsset[]> {
  const { workspace, supabase } = await getAssetContext();
  const { data, error } = await supabase
    .from("assets")
    .select(deletedAssetFields)
    .eq("workspace_id", workspace.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw new AssetOperationError("database");
  }

  return (data ?? []) as DeletedAsset[];
}

export async function createAssetForCurrentWorkspace(input: CreateAssetInput): Promise<Asset> {
  const { workspace, supabase } = await getAssetContext();
  const folderId = input.folder_id ?? null;
  await assertFolderBelongsToWorkspace(supabase, folderId, workspace.id);

  const { data, error } = await supabase
    .from("assets")
    .insert({
      name: input.name,
      type: input.type,
      url: input.url,
      folder_id: folderId,
      workspace_id: workspace.id,
    })
    .select(assetFields)
    .single();

  if (error?.code === "23503") {
    throw new AssetOperationError("folder-not-found");
  }

  if (error || !data) {
    throw new AssetOperationError("database");
  }

  return data as Asset;
}

export async function getActiveAssetForCurrentWorkspace(assetIdInput: string): Promise<Asset> {
  const assetId = assetIdSchema.parse(assetIdInput);
  const { workspace, supabase } = await getAssetContext();
  const { data, error } = await supabase
    .from("assets")
    .select(assetFields)
    .eq("id", assetId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AssetOperationError("database");
  }

  if (!data) {
    throw new AssetOperationError("not-found");
  }

  return data as Asset;
}

export async function updateActiveAssetForCurrentWorkspace(
  assetIdInput: string,
  input: UpdateAssetInput,
): Promise<Asset> {
  const assetId = assetIdSchema.parse(assetIdInput);
  const { workspace, supabase } = await getAssetContext();
  const { data: currentAsset, error: lookupError } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (lookupError) {
    throw new AssetOperationError("database");
  }

  if (!currentAsset) {
    throw new AssetOperationError("not-found");
  }

  const folderId = Object.hasOwn(input, "folder_id") ? input.folder_id ?? null : undefined;

  if (folderId !== undefined) {
    await assertFolderBelongsToWorkspace(supabase, folderId, workspace.id);
  }

  const updates: Partial<Pick<Asset, "folder_id" | "name" | "type" | "url">> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.url !== undefined) updates.url = input.url;
  if (folderId !== undefined) updates.folder_id = folderId;

  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", currentAsset.id)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .select(assetFields)
    .maybeSingle();

  if (error?.code === "23503") {
    throw new AssetOperationError("folder-not-found");
  }

  if (error) {
    throw new AssetOperationError("database");
  }

  if (!data) {
    throw new AssetOperationError("not-found");
  }

  return data as Asset;
}

export async function trashActiveAssetForCurrentWorkspace(assetIdInput: string): Promise<void> {
  const assetId = assetIdSchema.parse(assetIdInput);
  const { workspace, supabase } = await getAssetContext();
  const { data, error } = await supabase
    .from("assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new AssetOperationError("database");
  }

  if (!data) {
    throw new AssetOperationError("not-found");
  }
}

export async function restoreDeletedAssetForCurrentWorkspace(
  assetIdInput: string,
): Promise<Asset> {
  const assetId = assetIdSchema.parse(assetIdInput);
  const { workspace, supabase } = await getAssetContext();
  const { data, error } = await supabase
    .from("assets")
    .update({ deleted_at: null })
    .eq("id", assetId)
    .eq("workspace_id", workspace.id)
    .not("deleted_at", "is", null)
    .select(assetFields)
    .maybeSingle();

  if (error) {
    throw new AssetOperationError("database");
  }

  if (!data) {
    throw new AssetOperationError("not-found");
  }

  return data as Asset;
}