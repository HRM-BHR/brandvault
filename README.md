# BrandVault

BrandVault is a secure brand asset management application built with Next.js App Router, TypeScript, Supabase, and Zod.

## Security principles

- Every private resource is tied to a workspace..
- Every workspace is owned by the authenticated user.
- Browser-supplied workspace IDs and user IDs are never trusted for authorization.
- Protected data is read through server-side checks before the app exposes it.
- AI outputs are validated before they are surfaced to the user.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase project URL and anonymous key.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

Only the public Supabase values are exposed to the browser. The service role key remains server-only.
