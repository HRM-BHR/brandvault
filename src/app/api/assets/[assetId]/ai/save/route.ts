import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleAssetError, parseAssetJson } from "@/lib/asset-api";
import { saveActiveAssetMetadataForCurrentWorkspace } from "@/lib/assets";
import { assetIdSchema, assetMetadataSaveSchema, type AssetMetadataSaveInput } from "@/lib/schemas";

type SaveMetadataRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(request: Request, context: SaveMetadataRouteContext) {
  let assetId: string;

  try {
    assetId = assetIdSchema.parse((await context.params).assetId);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
    }
    return handleAssetError(error);
  }

  const parsed = await parseAssetJson<AssetMetadataSaveInput>(
    request,
    assetMetadataSaveSchema,
    "AI metadata",
  );
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const asset = await saveActiveAssetMetadataForCurrentWorkspace(assetId, parsed.data);
    return NextResponse.json({ asset });
  } catch (error) {
    return handleAssetError(error);
  }
}