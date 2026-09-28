import { NextResponse } from "next/server";
import {
  createFolderInputSchema,
  type CreateFolderInput,
} from "@/lib/schemas";
import {
  createFolderForCurrentWorkspace,
  listFoldersForCurrentWorkspace,
} from "@/lib/folders";
import { handleFolderError, parseJsonBody } from "@/lib/folder-api";

export async function GET() {
  try {
    const folders = await listFoldersForCurrentWorkspace();
    return NextResponse.json({ folders });
  } catch (error) {
    return handleFolderError(error);
  }
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody<CreateFolderInput>(request, createFolderInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const folder = await createFolderForCurrentWorkspace(parsed.data);
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return handleFolderError(error);
  }
}