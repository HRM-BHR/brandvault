import { NextResponse } from "next/server";

import { handleAssetError } from "@/lib/asset-api";
import { listDeletedAssetsForCurrentWorkspace } from "@/lib/assets";

export async function GET() {
  try {
    const assets = await listDeletedAssetsForCurrentWorkspace();
    return NextResponse.json({ assets });
  } catch (error) {
    return handleAssetError(error);
  }
}