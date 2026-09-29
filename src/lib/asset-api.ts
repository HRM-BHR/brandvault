import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { AssetMetadataError } from "@/lib/ai/asset-metadata";
import { AssetOperationError } from "@/lib/assets";

export type ParsedAssetJson<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function parseAssetJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  entityName = "asset",
): Promise<ParsedAssetJson<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: `Invalid ${entityName} JSON request body.` }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: `Invalid ${entityName} details.`, details: parsed.error.flatten().fieldErrors },
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

export function handleAssetMetadataError(error: unknown) {
  if (error instanceof AssetMetadataError) {
    switch (error.kind) {
      case "not-configured":
        return NextResponse.json(
          { error: "AI metadata generation is not configured on this server." },
          { status: 503 },
        );
      case "rate-limited":
        return NextResponse.json(
          { error: "AI metadata is temporarily rate-limited. Please try again shortly." },
          { status: 429 },
        );
      case "incomplete":
        return NextResponse.json(
          { error: "AI metadata generation did not complete. Please try again." },
          { status: 502 },
        );
      case "invalid-output":
        return NextResponse.json(
          { error: "AI returned metadata that could not be validated. Please try again." },
          { status: 502 },
        );
      case "provider":
        return NextResponse.json(
          { error: "AI metadata generation is temporarily unavailable." },
          { status: 502 },
        );
      case "context":
        return NextResponse.json(
          { error: "Unable to load the asset context for AI metadata." },
          { status: 500 },
        );
    }
  }

  return handleAssetError(error);
}
