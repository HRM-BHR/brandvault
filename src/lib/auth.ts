import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userIdSchema, workspaceIdSchema } from "@/lib/schemas";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error?.name === "AuthSessionMissingError" || error?.status === 401) {
    throw new Error("Unauthorized");
  }

  if (error) {
    throw new Error("Unable to verify the current session.");
  }

  if (!data.user) {
    throw new Error("Unauthorized");
  }

  return data.user;
}

export async function ensureAuthenticatedWorkspace() {
  const user = await getAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const workspaceFields = "id, name, user_id";

  const { data: existingWorkspace, error: lookupError } = await supabase
    .from("workspaces")
    .select(workspaceFields)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Unable to resolve the workspace.");
  }

  if (existingWorkspace) {
    return { user, workspace: existingWorkspace };
  }

  const { data: createdWorkspace, error: insertError } = await supabase
    .from("workspaces")
    .insert({ user_id: user.id })
    .select(workspaceFields)
    .single();

  if (!insertError && createdWorkspace) {
    return { user, workspace: createdWorkspace };
  }

  if (insertError?.code === "23505") {
    const { data: racedWorkspace, error: retryError } = await supabase
      .from("workspaces")
      .select(workspaceFields)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!retryError && racedWorkspace) {
      return { user, workspace: racedWorkspace };
    }
  }

  throw new Error("Unable to create the workspace.");
}

export async function requireWorkspaceAccess(workspaceIdInput: string) {
  const workspaceId = workspaceIdSchema.parse(workspaceIdInput);
  const user = await getAuthenticatedUser();
  const userId = userIdSchema.parse(user.id);

  const supabase = await createSupabaseServerClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, user_id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the workspace.");
  }

  if (!workspace || workspace.user_id !== userId) {
    throw new Error("Workspace not found");
  }

  return {
    user,
    workspace,
    workspaceId,
  };
}

export const authErrorSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});
