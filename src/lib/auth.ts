import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userIdSchema, workspaceIdSchema } from "@/lib/schemas";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Unauthorized: no active session.");
  }

  return data.user;
}

export async function requireWorkspaceAccess(workspaceIdInput: string) {
  const workspaceId = workspaceIdSchema.parse(workspaceIdInput);
  const user = await getAuthenticatedUser();
  const userId = userIdSchema.parse(user.id);

  const supabase = await createSupabaseServerClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load workspace: ${error.message}`);
  }

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (workspace.user_id !== userId) {
    throw new Error("Forbidden: workspace is not owned by the authenticated user.");
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
