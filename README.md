# BrandVault

BrandVault is a brand asset management application built for the BrandVault technical assignment. It organizes brand profiles, folders, and URL-based assets, with server-validated AI metadata suggestions that users review before saving.

## Live Demo

**Application URL:** `https://brandvault-three.vercel.app`

## Features

- Email sign-up, sign-in, confirmation, and sign-out through Supabase Auth.
- One workspace per authenticated user and one brand profile per workspace.
- Brand profile editing, including colors, logo URL, and default font.
- Nested folders with create, rename, move, cycle prevention, and a maximum depth of three.
- URL-based assets with create, edit, move, name search, and sorting by update time or name.
- Soft-delete Trash and restore for assets.
- AI-generated tags, description, and usage suggestion, presented for review and editing before explicit save.

## Tech Stack

- Next.js 16 App Router and React 19
- TypeScript
- Tailwind CSS 4 and shadcn/ui
- Supabase PostgreSQL and Supabase Auth, using `@supabase/ssr` and `@supabase/supabase-js`
- PostgreSQL Row Level Security (RLS)
- Zod 4
- OpenAI Node SDK 7.23.0 and the Responses API
- Vercel

## Architecture

```text
Browser
  -> Next.js UI
  -> authenticated Route Handlers and server services
  -> Supabase Auth and PostgreSQL with RLS
```

For AI metadata, the server loads the active asset and its workspace-scoped folder and brand context. It sends that text context to OpenAI Structured Outputs, validates the result with Zod, and returns a draft to the review UI. The user can edit or cancel the draft; only the separate save endpoint persists reviewed metadata. OpenAI never writes to the database.

```text
Asset -> Generate Tags -> trusted server context -> OpenAI Structured Outputs
		-> Zod validation -> user review/edit -> explicit Save -> Supabase
```

## Data Model

- **workspaces** belong to authenticated users. A unique `user_id` enforces one workspace per user.
- **brands** belong to a workspace. A unique `workspace_id` enforces one brand profile per workspace.
- **folders** belong to a workspace and may have a parent folder. Composite foreign keys keep parent relationships within the same workspace.
- **assets** belong to a workspace and may reference a folder in that workspace. `deleted_at` records soft deletion. Tags, description, and usage suggestion are stored as asset metadata.

The checked-in migration creates these tables, constraints, indexes, triggers, grants, and RLS policies.

## Security

- Server services resolve the current user from the Supabase Auth session and derive that user's workspace. Requests do not supply trusted user or workspace ownership IDs for asset, folder, or brand operations.
- Queries scope private data to the derived workspace; RLS policies provide a database-level ownership boundary. Same-workspace foreign keys protect folder and asset relationships.
- Normal application operations use the authenticated Supabase server client and publishable key; the application does not use a Supabase service-role key.
- The OpenAI key is read only by server-side code from `OPENAI_API_KEY` and is not exposed to browser code.
- Active asset operations filter out deleted assets. Trash and restore use separate workspace-scoped operations.
- Cross-user resource access is rejected by the workspace-scoped server services and RLS.

## Folder Behavior

Folders can be created, renamed, and moved within the current workspace. Moves reject cycles and any hierarchy deeper than three levels. Deleting a non-empty folder is blocked by its asset/child references; deletion is not recursive.

## Asset Behavior

Assets may be at the workspace root or in a folder. They can be edited or moved, searched by name, and sorted by most recently updated or name. Trash is a soft delete; restore returns an asset to the active list. Permanent deletion is not implemented. Assets reference URLs; direct file upload and object storage are not implemented.

## AI Metadata

**Generate Tags** uses server-loaded asset name, type, URL text, folder path, and brand details as context. The URL is treated as text only: the application and prompt do not download or fetch the remote asset. The server calls the OpenAI Responses API with Structured Outputs. The configured model defaults to `gpt-5-mini` and can be overridden with the server-side `OPENAI_MODEL` variable; the request uses low reasoning effort and a bounded 4,096-token output limit.

Zod requires 3–8 unique, non-empty tags of at most 40 characters, a non-empty description of at most 500 characters, and a non-empty usage suggestion of at most 300 characters. Unknown fields are rejected. Generated content remains a draft until the user explicitly saves it; Cancel does not persist it.

## API Overview

All API routes use the current authenticated user and server-derived workspace. Inputs are validated, and private resource queries are workspace-scoped.

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/workspaces/[workspaceId]` | GET | Read the current user's workspace after access validation. |
| `/api/brand` | GET, POST, PATCH | Read, create, or update the current workspace's brand profile. |
| `/api/folders` | GET, POST | List or create folders in the current workspace. |
| `/api/folders/[folderId]` | PATCH, DELETE | Rename/move or delete a folder; non-empty deletion is rejected. |
| `/api/assets` | GET, POST | List active assets (optional `search` and `sort` query parameters) or create an asset. |
| `/api/assets/[assetId]` | GET, PATCH | Read or update an active asset. |
| `/api/assets/trash` | GET | List the current workspace's deleted assets. |
| `/api/assets/[assetId]/trash` | POST | Soft-delete an active asset. |
| `/api/assets/[assetId]/restore` | POST | Restore a deleted asset. |
| `/api/assets/[assetId]/ai/suggest` | POST | Generate and return a validated suggestion without saving it. |
| `/api/assets/[assetId]/ai/save` | POST | Validate and persist reviewed metadata; does not call OpenAI. |

Asset sorting accepts `updated_desc` and `name_asc`.

## Local Setup

1. Clone the repository and enter its directory:

   ```bash
   git clone <repository-url>
   cd brandvault
   ```

2. Install the JavaScript dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell).
4. Create or select a Supabase project and fill in the Supabase URL, publishable key, and local site URL in `.env.local`.
5. Install and authenticate the Supabase CLI, link the project, and apply the checked-in migration:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

6. Configure Supabase Auth's site URL and allowed redirect URLs to include `http://localhost:3000/auth/confirm`. Add the corresponding `/auth/confirm` URL for the production origin when configuring a hosted deployment.
7. Set `OPENAI_API_KEY` in `.env.local`. `OPENAI_MODEL` is optional; the server defaults to `gpt-5-mini`.
8. Start the development server:

   ```bash
   npm run dev
   ```

The database schema is applied from `supabase/migrations/20260927144322_brandvault_initial_schema.sql`; do not create the tables manually.

## Environment Variables

Values and placeholder formats are defined in `.env.example` only.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key; access is controlled by authenticated sessions and RLS. |
| `NEXT_PUBLIC_SITE_URL` | Public application origin used for auth redirects. |
| `OPENAI_API_KEY` | Server-only OpenAI credential. Never prefix it with `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | Optional server-only model override; defaults to `gpt-5-mini`. |

## Validation / Quality

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Automated API/integration test files are not currently included in the repository.

## Design Decisions / Tradeoffs

- One workspace per user and one brand per workspace match the assignment scope.
- Assets store URLs rather than uploaded files; no remote asset fetching or AI vision is performed.
- Folder depth is capped at three. Non-empty folder deletion is blocked instead of cascading or deleting contents.
- Asset deletion is soft deletion; permanent deletion is not implemented.
- AI suggestion and persistence are separate operations so users can review, edit, or cancel before saving.
- Ownership is derived from the authenticated server session rather than accepted from the client.

## Future Improvements

These are not implemented and are not required to use the current core workflows:

- Direct file uploads and object storage
- Drag and drop
- Permanent asset deletion
- Activity/audit history
- Automated API and integration tests
- Richer asset previews
- Optional workflow automation
