import { NextResponse } from "next/server";

import { requireWorkspaceAccess } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const { workspace } = await requireWorkspaceAccess(workspaceId);

    return NextResponse.json({
      workspaceId: workspace.id,
      ownerId: workspace.user_id,
      message: "Workspace data is scoped to the authenticated user's workspace only.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";

    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes("Workspace not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to read workspace." }, { status: 500 });
  }
}
