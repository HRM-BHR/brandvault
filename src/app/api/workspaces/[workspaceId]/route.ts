import { ZodError } from "zod";
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
      name: workspace.name,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid workspace ID." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (message === "Forbidden") {
      return NextResponse.json({ error: "Workspace access denied." }, { status: 403 });
    }

    if (message === "Workspace not found") {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to read workspace." }, { status: 500 });
  }
}
