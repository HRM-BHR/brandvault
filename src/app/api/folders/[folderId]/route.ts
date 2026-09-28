import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleFolderError, parseJsonBody } from "@/lib/folder-api";
import { deleteFolderForCurrentWorkspace, updateFolderForCurrentWorkspace } from "@/lib/folders";
import { updateFolderInputSchema, workspaceIdSchema, type UpdateFolderInput } from "@/lib/schemas";

type FolderRouteContext = {
  params: Promise<{ folderId: string }>;
};

async function parseFolderId(context: FolderRouteContext) {
  return workspaceIdSchema.parse((await context.params).folderId);
}

export async function PATCH(request: Request, context: FolderRouteContext) {
  let folderId: string;

  try {
    folderId = await parseFolderId(context);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid folder ID." }, { status: 400 });
    }
    return handleFolderError(error);
  }

  const parsed = await parseJsonBody<UpdateFolderInput>(request, updateFolderInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const folder = await updateFolderForCurrentWorkspace(folderId, parsed.data);
    return NextResponse.json({ folder });
  } catch (error) {
    return handleFolderError(error);
  }
}

export async function DELETE(_request: Request, context: FolderRouteContext) {
  let folderId: string;

  try {
    folderId = await parseFolderId(context);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid folder ID." }, { status: 400 });
    }
    return handleFolderError(error);
  }

  try {
    await deleteFolderForCurrentWorkspace(folderId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleFolderError(error);
  }
}