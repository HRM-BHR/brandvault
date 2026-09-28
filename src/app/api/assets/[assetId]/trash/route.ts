import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleAssetError } from "@/lib/asset-api";
import { trashActiveAssetForCurrentWorkspace } from "@/lib/assets";
import { assetIdSchema } from "@/lib/schemas";

type TrashRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(_request: Request, context: TrashRouteContext) {
  let assetId: string;

  try {
    assetId = assetIdSchema.parse((await context.params).assetId);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
    }
    return handleAssetError(error);
  }

  try {
    await trashActiveAssetForCurrentWorkspace(assetId);
    return NextResponse.json({ message: "Asset moved to trash." });
  } catch (error) {
    return handleAssetError(error);
  }
}