"use client";

import Link from "next/link";
import { useState } from "react";

import type { Asset } from "@/lib/assets";
import type { AssetMetadataSaveInput } from "@/lib/schemas";

type MetadataPayload = {
  asset?: Asset;
  suggestion?: AssetMetadataSaveInput;
  error?: string;
};

type AssetMetadataReviewProps = {
  asset: Asset;
  onSaved: (asset: Asset) => void;
};

async function readPayload(response: Response): Promise<MetadataPayload | null> {
  return response.json().catch(() => null) as Promise<MetadataPayload | null>;
}

export function AssetMetadataReview({ asset, onSaved }: AssetMetadataReviewProps) {
  const [suggestion, setSuggestion] = useState<AssetMetadataSaveInput | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [description, setDescription] = useState("");
  const [usageSuggestion, setUsageSuggestion] = useState("");
  const [pending, setPending] = useState<"generating" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function generateSuggestion() {
    setPending("generating");
    setError(null);
    setSuccess(null);
    setSessionExpired(false);

    try {
      const response = await fetch(`/api/assets/${asset.id}/ai/suggest`, { method: "POST" });
      const payload = await readPayload(response);

      if (!response.ok || !payload?.suggestion) {
        setError(payload?.error ?? "Unable to generate AI metadata.");
        setSessionExpired(response.status === 401);
        return;
      }

      setSuggestion(payload.suggestion);
      setTagsText(payload.suggestion.tags.join(", "));
      setDescription(payload.suggestion.description);
      setUsageSuggestion(payload.suggestion.usage_suggestion);
    } catch {
      setError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  function cancelReview() {
    setSuggestion(null);
    setTagsText("");
    setDescription("");
    setUsageSuggestion("");
    setError(null);
    setSuccess(null);
    setSessionExpired(false);
  }

  async function saveSuggestion() {
    if (!suggestion) {
      return;
    }

    const reviewedMetadata = {
      tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
      description,
      usage_suggestion: usageSuggestion,
    };

    setPending("saving");
    setError(null);
    setSuccess(null);
    setSessionExpired(false);

    try {
      const response = await fetch(`/api/assets/${asset.id}/ai/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewedMetadata),
      });
      const payload = await readPayload(response);

      if (!response.ok || !payload?.asset) {
        setError(payload?.error ?? "Unable to save AI metadata.");
        setSessionExpired(response.status === 401);
        return;
      }

      onSaved(payload.asset);
      setSuggestion(null);
      setSuccess("AI metadata saved.");
    } catch {
      setError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  const hasSavedMetadata = asset.tags.length > 0 || asset.description || asset.usage_suggestion;

  return (
    <div className="border-t border-border pt-3 lg:col-span-3">
      {hasSavedMetadata ? (
        <div className="mb-3 space-y-2 text-sm">
          {asset.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Saved asset tags">
              {asset.tags.map((tag) => (
                <span key={tag} className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {asset.description ? <p className="text-foreground">{asset.description}</p> : null}
          {asset.usage_suggestion ? (
            <p className="text-sm text-muted-foreground">Suggested use: {asset.usage_suggestion}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          <p>{error}</p>
          {sessionExpired ? (
            <Link href="/login" className="mt-1 inline-block underline underline-offset-4">
              Sign in again
            </Link>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <p className="mb-3 text-sm text-emerald-800" role="status">{success}</p>
      ) : null}

      {!suggestion ? (
        <div>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void generateSuggestion()}
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "generating" ? "Generating…" : "Generate Tags"}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">Generates tags, a description, and a usage suggestion for review.</p>
        </div>
      ) : (
        <section aria-label={`Review AI metadata for ${asset.name}`} className="space-y-3 rounded-md border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Review AI metadata</h3>
            <p className="mt-1 text-xs text-muted-foreground">Nothing is saved until you choose Save AI Metadata.</p>
          </div>
          <fieldset disabled={pending !== null} className="grid gap-3 disabled:opacity-70">
            <div className="space-y-1">
              <label htmlFor={`asset-tags-${asset.id}`} className="text-sm font-medium">Tags</label>
              <input
                id={`asset-tags-${asset.id}`}
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                maxLength={360}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Separate 3 to 8 tags with commas.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor={`asset-description-${asset.id}`} className="text-sm font-medium">Description</label>
              <textarea
                id={`asset-description-${asset.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`asset-usage-${asset.id}`} className="text-sm font-medium">Usage suggestion</label>
              <textarea
                id={`asset-usage-${asset.id}`}
                value={usageSuggestion}
                onChange={(event) => setUsageSuggestion(event.target.value)}
                maxLength={300}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void saveSuggestion()}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "saving" ? "Saving…" : "Save AI Metadata"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={cancelReview}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}