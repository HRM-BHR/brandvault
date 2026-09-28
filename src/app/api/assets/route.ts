import { NextResponse } from "next/server";

import { handleAssetError, parseAssetJson } from "@/lib/asset-api";
import { createAssetForCurrentWorkspace, listActiveAssetsForCurrentWorkspace } from "@/lib/assets";
import {
  assetListQuerySchema,
  createAssetInputSchema,
  type CreateAssetInput,
} from "@/lib/schemas";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = assetListQuerySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid asset query parameters.", details: parsedQuery.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const assets = await listActiveAssetsForCurrentWorkspace(parsedQuery.data);
    return NextResponse.json({ assets });
  } catch (error) {
    return handleAssetError(error);
  }
}

export async function POST(request: Request) {
  const parsed = await parseAssetJson<CreateAssetInput>(request, createAssetInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const asset = await createAssetForCurrentWorkspace(parsed.data);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return handleAssetError(error);
  }
}