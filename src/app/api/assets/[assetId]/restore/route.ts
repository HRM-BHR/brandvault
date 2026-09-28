import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleAssetError } from "@/lib/asset-api";
import { restoreDeletedAssetForCurrentWorkspace } from "@/lib/assets";
import { assetIdSchema } from "@/lib/schemas";

type RestoreRouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(_request: Request, context: RestoreRouteContext) {
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
    const asset = await restoreDeletedAssetForCurrentWorkspace(assetId);
    return NextResponse.json({ asset });
  } catch (error) {
    return handleAssetError(error);
  }
}