import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleAssetMetadataError } from "@/lib/asset-api";
import { suggestAssetMetadata } from "@/lib/ai/asset-metadata";
import { assetIdSchema } from "@/lib/schemas";

type SuggestRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(_request: Request, context: SuggestRouteContext) {
  let assetId: string;

  try {
    assetId = assetIdSchema.parse((await context.params).assetId);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
    }
    return handleAssetMetadataError(error);
  }

  try {
    const suggestion = await suggestAssetMetadata(assetId);
    return NextResponse.json({ suggestion });
  } catch (error) {
    return handleAssetMetadataError(error);
  }
}