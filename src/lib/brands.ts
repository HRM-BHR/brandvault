import "server-only";

import { ensureAuthenticatedWorkspace } from "@/lib/auth";
import type { BrandProfileInput } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BrandProfile = {
  id: string;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  default_font: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandOperationErrorKind = "not-found" | "already-exists" | "database";

export class BrandOperationError extends Error {
  constructor(readonly kind: BrandOperationErrorKind) {
    super(kind);
  }
}

const brandFields =
  "id, name, primary_color, secondary_color, logo_url, default_font, created_at, updated_at";

export async function getBrandForCurrentWorkspace(): Promise<BrandProfile | null> {
  const { workspace } = await ensureAuthenticatedWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select(brandFields)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (error) {
    throw new BrandOperationError("database");
  }

  return data as BrandProfile | null;
}

export async function createBrandForCurrentWorkspace(
  input: BrandProfileInput,
): Promise<BrandProfile> {
  const { workspace } = await ensureAuthenticatedWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ ...input, workspace_id: workspace.id })
    .select(brandFields)
    .single();

  if (error?.code === "23505") {
    throw new BrandOperationError("already-exists");
  }

  if (error || !data) {
    throw new BrandOperationError("database");
  }

  return data as BrandProfile;
}

export async function updateBrandForCurrentWorkspace(
  input: BrandProfileInput,
): Promise<BrandProfile> {
  const { workspace } = await ensureAuthenticatedWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .update(input)
    .eq("workspace_id", workspace.id)
    .select(brandFields)
    .maybeSingle();

  if (error) {
    throw new BrandOperationError("database");
  }

  if (!data) {
    throw new BrandOperationError("not-found");
  }

  return data as BrandProfile;
}