# BrandVault Architecture

## Goal

Build the BrandVault technical assignment as a small,
secure, production-deployable full-stack web application.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Zod
- OpenAI
- Vercel

## Architecture

Browser
  |
  v
Next.js
  |
  +-- Server Components
  |
  +-- Route Handlers / API
        |
        +-- Authentication
        +-- Zod validation
        +-- Authorization
        |
        v
     Supabase
        |
        +-- PostgreSQL
        +-- Auth
        +-- RLS

AI flow:

Browser
  |
  | Generate Tags
  v
Next.js API
  |
  | server-side API key
  v
OpenAI
  |
  | structured response
  v
Zod validation
  |
  v
Review UI
  |
  | user confirms
  v
Database

## Core Principles

1. Every private resource belongs to a workspace.
2. Every workspace belongs to an authenticated user.
3. Users must never access another user's data.
4. All API inputs are validated.
5. AI calls happen server-side only.
6. AI output is validated before being returned.
7. AI suggestions are never saved without user confirmation.
8. Assets use soft deletion.
9. Optional features cannot delay core functionality.
10. Production deployment must remain functional throughout development.

## Scope

### Required

- Authentication
- Single workspace
- Brand kit
- Folder hierarchy
- Asset CRUD
- Move assets
- Search
- Sorting
- Trash
- Restore
- AI metadata generation
- AI review before save
- Loading states
- Empty states
- Error states
- Hosted PostgreSQL database
- Public deployment
- Demo account

### Initially excluded

- Real file uploads
- Drag and drop
- Activity log
- Dark mode
- Permanent deletion
- n8n
- Mobile application