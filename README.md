# BrandVault

BrandVault is a secure brand asset management application built with Next.js App Router, TypeScript, Supabase, and Zod.

## Security principles

- Every private resource is tied to a workspace.
- Every workspace is owned by the authenticated user.
- Browser-supplied workspace IDs and user IDs are never trusted for authorization.
- Protected data is read through server-side checks before the app exposes it.
- PostgreSQL row-level security remains enabled as the final ownership boundary.
- AI outputs are validated before they are surfaced to the user.

## Local setup

1. Create `.env.local` with the values below.
2. Install dependencies:

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Set `NEXT_PUBLIC_SITE_URL` to the deployed app origin in Vercel. Add both the local and deployed `/auth/confirm` URLs to Supabase Auth's allowed redirect URLs so email confirmation returns to BrandVault. No service-role key is used by the application.
