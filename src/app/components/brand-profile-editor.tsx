"use client";

import Link from "next/link";
import { useState } from "react";

import type { BrandProfile } from "@/lib/brands";

type BrandFormValues = {
  name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  default_font: string;
};

type BrandProfileEditorProps = {
  initialBrand: BrandProfile | null;
  loadFailed: boolean;
};

function valuesFromBrand(brand: BrandProfile | null): BrandFormValues {
  return {
    name: brand?.name ?? "",
    primary_color: brand?.primary_color ?? "",
    secondary_color: brand?.secondary_color ?? "",
    logo_url: brand?.logo_url ?? "",
    default_font: brand?.default_font ?? "",
  };
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const response = payload as { error?: unknown; details?: unknown };
  if (typeof response.error === "string") {
    return response.error;
  }

  if (response.details && typeof response.details === "object") {
    const firstMessage = Object.values(response.details).flat().find(
      (message): message is string => typeof message === "string",
    );
    if (firstMessage) {
      return firstMessage;
    }
  }

  return fallback;
}

export function BrandProfileEditor({ initialBrand, loadFailed }: BrandProfileEditorProps) {
  const [savedBrand, setSavedBrand] = useState(initialBrand);
  const [values, setValues] = useState(() => valuesFromBrand(initialBrand));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  function updateField(field: keyof BrandFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess(null);
    setSessionExpired(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    setSessionExpired(false);

    try {
      const response = await fetch("/api/brand", {
        method: savedBrand ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as
        | { brand?: BrandProfile; error?: unknown; details?: unknown }
        | null;

      if (!response.ok) {
        setSessionExpired(response.status === 401);
        setError(getErrorMessage(payload, "Unable to save the brand profile. Try again."));
        return;
      }

      if (!payload?.brand) {
        setError("The server returned an unexpected response. Reload and try again.");
        return;
      }

      setSavedBrand(payload.brand);
      setValues(valuesFromBrand(payload.brand));
      setSuccess(savedBrand ? "Brand profile updated." : "Brand profile created.");
    } catch {
      setError("Unable to reach BrandVault. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadFailed) {
    return (
      <div className="border-l-2 border-destructive pl-4" role="alert">
        <p className="font-medium">Brand profile could not be loaded.</p>
        <Link href="/brand" className="mt-2 inline-block text-sm underline underline-offset-4">
          Try again
        </Link>
      </div>
    );
  }

  const primarySwatch = isHexColor(values.primary_color) ? values.primary_color : "transparent";
  const secondarySwatch = isHexColor(values.secondary_color)
    ? values.secondary_color
    : "transparent";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <section aria-labelledby="brand-form-heading">
        <h2 id="brand-form-heading" className="text-lg font-semibold">
          {savedBrand ? "Edit brand details" : "Create your brand profile"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One profile is shared by your workspace.
        </p>

        {error ? (
          <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            <p>{error}</p>
            {sessionExpired ? (
              <Link href="/login" className="mt-1 inline-block underline underline-offset-4">
                Sign in again
              </Link>
            ) : null}
          </div>
        ) : null}

        {success ? (
          <p className="mt-5 rounded-md border border-emerald-700/20 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-70">
            <div className="space-y-2">
              <label htmlFor="brand-name" className="text-sm font-medium">Brand Name</label>
              <input
                id="brand-name"
                name="name"
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={120}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <ColorField
              id="primary-color"
              label="Primary Color"
              value={values.primary_color}
              swatch={primarySwatch}
              onChange={(value) => updateField("primary_color", value)}
            />

            <ColorField
              id="secondary-color"
              label="Secondary Color"
              value={values.secondary_color}
              swatch={secondarySwatch}
              onChange={(value) => updateField("secondary_color", value)}
            />

            <div className="space-y-2">
              <label htmlFor="logo-url" className="text-sm font-medium">Logo URL</label>
              <input
                id="logo-url"
                name="logo_url"
                type="url"
                value={values.logo_url}
                onChange={(event) => updateField("logo_url", event.target.value)}
                maxLength={2048}
                placeholder="https://example.com/logo.svg"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="default-font" className="text-sm font-medium">Default Font</label>
              <input
                id="default-font"
                name="default_font"
                value={values.default_font}
                onChange={(event) => updateField("default_font", event.target.value)}
                maxLength={120}
                placeholder="Inter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : savedBrand ? "Update Brand" : "Save Brand"}
          </button>
        </form>
      </section>

      <section aria-labelledby="brand-preview-heading" className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h2 id="brand-preview-heading" className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Preview
        </h2>
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div
            className="min-h-36 p-6"
            style={{
              backgroundColor: primarySwatch,
              color: isHexColor(values.primary_color) ? "white" : "var(--foreground)",
            }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.1em] opacity-75">Brand</p>
            <p className="mt-4 break-words text-2xl font-semibold" style={{ fontFamily: values.default_font || undefined }}>
              {values.name || "Brand Name"}
            </p>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-4 p-4" style={{ backgroundColor: secondarySwatch }}>
            <span className="text-sm">Color palette</span>
            <span className="flex gap-2" aria-label="Brand color swatches">
              <span className="size-6 rounded-sm border border-black/15" style={{ backgroundColor: primarySwatch }} />
              <span className="size-6 rounded-sm border border-black/15" style={{ backgroundColor: secondarySwatch }} />
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Default Font: <span className="text-foreground">{values.default_font || "Not set"}</span>
        </p>
        {values.logo_url.trim() ? (
          <a
            href={values.logo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-sm underline underline-offset-4"
          >
            Open logo URL
          </a>
        ) : null}
      </section>
    </div>
  );
}

type ColorFieldProps = {
  id: string;
  label: string;
  value: string;
  swatch: string;
  onChange: (value: string) => void;
};

function ColorField({ id, label, value, swatch, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
          placeholder="#008FCF"
          autoCapitalize="characters"
          required
          aria-describedby={`${id}-help`}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span
          role="img"
          aria-label={`${label} preview${isHexColor(value) ? ` ${value}` : " unavailable"}`}
          className="size-10 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: swatch }}
        />
      </div>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">Use # followed by six hex digits.</p>
    </div>
  );
}