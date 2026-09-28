import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { FolderOperationError } from "@/lib/folders";

export type ParsedJson<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<ParsedJson<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid folder details.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: parsed.data };
}

export function handleFolderError(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (error instanceof FolderOperationError) {
    switch (error.kind) {
      case "not-found":
      case "parent-not-found":
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      case "depth-limit":
        return NextResponse.json({ error: "Folders cannot exceed 3 levels." }, { status: 400 });
      case "cycle":
        return NextResponse.json({ error: "A folder cannot be moved into its descendants." }, { status: 400 });
      case "self-parent":
        return NextResponse.json({ error: "A folder cannot be its own parent." }, { status: 400 });
      case "duplicate-name":
        return NextResponse.json({ error: "A folder with that name already exists at this level." }, { status: 409 });
      case "not-empty":
        return NextResponse.json({ error: "This folder is not empty." }, { status: 409 });
      case "database":
        return NextResponse.json({ error: "Unable to process folders." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unable to process folders." }, { status: 500 });
}