import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { AssetOperationError } from "@/lib/assets";

export type ParsedAssetJson<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function parseAssetJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParsedAssetJson<T>> {
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
        { error: "Invalid asset details.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: parsed.data };
}

export function handleAssetError(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (error instanceof AssetOperationError) {
    if (error.kind === "not-found") {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (error.kind === "folder-not-found") {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Unable to process the asset." }, { status: 500 });
}