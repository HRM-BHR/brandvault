import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodError } from "zod";

import { AssetOperationError, getActiveAssetContextForCurrentWorkspace } from "@/lib/assets";
import {
  assetMetadataModelOutputSchema,
  assetMetadataSaveSchema,
  type AssetMetadataSaveInput,
} from "@/lib/schemas";
import {
  assetMetadataInstructions,
  serializeAssetMetadataContext,
  type AssetMetadataContext,
} from "@/lib/ai/asset-metadata-prompt";

export type AssetMetadataErrorKind =
  | "not-configured"
  | "rate-limited"
  | "provider"
  | "incomplete"
  | "invalid-output"
  | "context";

export class AssetMetadataError extends Error {
  constructor(readonly kind: AssetMetadataErrorKind) {
    super(kind);
  }
}

const defaultModel = "gpt-5-mini";
const maxOutputTokens = 4_096;
type AssetSupabaseClient = Awaited<ReturnType<typeof getActiveAssetContextForCurrentWorkspace>>["supabase"];
type FolderContextResult = {
  data: { id: string; name: string; parent_folder_id: string | null } | null;
  error: { message: string } | null;
};

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AssetMetadataError("not-configured");
  }

  return new OpenAI({
    apiKey,
    timeout: 30_000,
    maxRetries: 1,
    logLevel: "off",
  });
}

async function getFolderPath(
  folderId: string | null,
  workspaceId: string,
  supabase: AssetSupabaseClient,
) {
  if (!folderId) {
    return null;
  }

  const path: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = folderId;

  while (currentId) {
    if (visited.has(currentId) || path.length >= 3) {
      throw new AssetMetadataError("context");
    }
    visited.add(currentId);

    const folderResult: FolderContextResult = await supabase
      .from("folders")
      .select("id, name, parent_folder_id")
      .eq("id", currentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (folderResult.error || !folderResult.data) {
      throw new AssetMetadataError("context");
    }

    path.unshift(folderResult.data.name);
    const parentFolderId: string | null = folderResult.data.parent_folder_id;
    currentId = parentFolderId;
  }

  return path.join(" / ");
}

async function loadAssetMetadataContext(assetId: string): Promise<AssetMetadataContext> {
  let assetContext: Awaited<ReturnType<typeof getActiveAssetContextForCurrentWorkspace>>;

  try {
    assetContext = await getActiveAssetContextForCurrentWorkspace(assetId);
  } catch (error) {
    if (error instanceof AssetOperationError) {
      throw error;
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    throw new AssetMetadataError("context");
  }

  const { asset, workspaceId, supabase } = assetContext;
  const [{ data: brand, error: brandError }, folderPath] = await Promise.all([
    supabase
      .from("brands")
      .select("name, primary_color, secondary_color, default_font")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    getFolderPath(asset.folder_id, workspaceId, supabase),
  ]);

  if (brandError) {
    throw new AssetMetadataError("context");
  }

  return {
    asset: { name: asset.name, type: asset.type, url: asset.url },
    folderPath,
    brand: brand
      ? {
          name: brand.name,
          primary_color: brand.primary_color,
          secondary_color: brand.secondary_color,
          default_font: brand.default_font,
        }
      : null,
  };
}

export async function suggestAssetMetadata(assetId: string): Promise<AssetMetadataSaveInput> {
  const context = await loadAssetMetadataContext(assetId);
  const openai = createOpenAIClient();
  const model = process.env.OPENAI_MODEL?.trim() || defaultModel;

  let response;
  try {
    response = await openai.responses.parse({
      model,
      store: false,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: "low" },
      instructions: assetMetadataInstructions,
      input: serializeAssetMetadataContext(context),
      text: {
        format: zodTextFormat(assetMetadataModelOutputSchema, "asset_metadata_suggestion"),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AssetMetadataError("invalid-output");
    }
    if (error instanceof OpenAI.APIError && error.status === 429) {
      throw new AssetMetadataError("rate-limited");
    }
    throw new AssetMetadataError("provider");
  }

  if (response.status === "incomplete") {
    throw new AssetMetadataError("incomplete");
  }

  if (response.status !== "completed" || !response.output_parsed) {
    throw new AssetMetadataError("invalid-output");
  }

  const validated = assetMetadataSaveSchema.safeParse(response.output_parsed);
  if (!validated.success) {
    throw new AssetMetadataError("invalid-output");
  }

  return validated.data;
}