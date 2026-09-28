import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { handleAssetError, parseAssetJson } from "@/lib/asset-api";
import { getActiveAssetForCurrentWorkspace, updateActiveAssetForCurrentWorkspace } from "@/lib/assets";
import { assetIdSchema, updateAssetInputSchema, type UpdateAssetInput } from "@/lib/schemas";

type AssetRouteContext = {
  params: Promise<{ assetId: string }>;
};

async function parseAssetId(context: AssetRouteContext) {
  return assetIdSchema.parse((await context.params).assetId);
}

export async function GET(_request: Request, context: AssetRouteContext) {
  let assetId: string;

  try {
    assetId = await parseAssetId(context);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
    }
    return handleAssetError(error);
  }

  try {
    const asset = await getActiveAssetForCurrentWorkspace(assetId);
    return NextResponse.json({ asset });
  } catch (error) {
    return handleAssetError(error);
  }
}

export async function PATCH(request: Request, context: AssetRouteContext) {
  let assetId: string;

  try {
    assetId = await parseAssetId(context);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
    }
    return handleAssetError(error);
  }

  const parsed = await parseAssetJson<UpdateAssetInput>(request, updateAssetInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const asset = await updateActiveAssetForCurrentWorkspace(assetId, parsed.data);
    return NextResponse.json({ asset });
  } catch (error) {
    return handleAssetError(error);
  }
}