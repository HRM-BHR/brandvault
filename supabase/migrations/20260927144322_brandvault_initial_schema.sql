create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := pg_catalog.now();
	return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.workspaces (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null unique references auth.users (id) on delete cascade,
	name text not null default 'My Workspace',
	created_at timestamptz not null default pg_catalog.now(),
	updated_at timestamptz not null default pg_catalog.now(),
	constraint workspaces_name_not_blank check (pg_catalog.length(pg_catalog.btrim(name)) > 0)
);

create table public.brands (
	id uuid primary key default gen_random_uuid(),
	workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
	name text not null default 'My Brand',
	logo_url text,
	default_font text,
	primary_color text,
	secondary_color text,
	created_at timestamptz not null default pg_catalog.now(),
	updated_at timestamptz not null default pg_catalog.now(),
	constraint brands_name_not_blank check (pg_catalog.length(pg_catalog.btrim(name)) > 0),
	constraint brands_primary_color_format check (
		primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'
	),
	constraint brands_secondary_color_format check (
		secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'
	)
);

create table public.folders (
	id uuid primary key default gen_random_uuid(),
	workspace_id uuid not null references public.workspaces (id) on delete cascade,
	parent_folder_id uuid,
	name text not null,
	created_at timestamptz not null default pg_catalog.now(),
	updated_at timestamptz not null default pg_catalog.now(),
	constraint folders_workspace_id_id_key unique (workspace_id, id),
	constraint folders_name_not_blank check (pg_catalog.length(pg_catalog.btrim(name)) > 0),
	constraint folders_not_own_parent check (parent_folder_id is null or parent_folder_id <> id),
	constraint folders_parent_same_workspace_fkey
		foreign key (workspace_id, parent_folder_id)
		references public.folders (workspace_id, id)
		on delete no action deferrable initially deferred
);

create table public.assets (
	id uuid primary key default gen_random_uuid(),
	workspace_id uuid not null references public.workspaces (id) on delete cascade,
	folder_id uuid,
	name text not null,
	description text,
	url text not null,
	type text not null,
	usage_suggestion text,
	tags text[] not null default array[]::text[],
	deleted_at timestamptz,
	created_at timestamptz not null default pg_catalog.now(),
	updated_at timestamptz not null default pg_catalog.now(),
	constraint assets_workspace_id_id_key unique (workspace_id, id),
	constraint assets_name_not_blank check (pg_catalog.length(pg_catalog.btrim(name)) > 0),
	constraint assets_type_not_blank check (pg_catalog.length(pg_catalog.btrim(type)) > 0),
	constraint assets_url_not_blank check (pg_catalog.length(pg_catalog.btrim(url)) > 0),
	constraint assets_folder_same_workspace_fkey
		foreign key (workspace_id, folder_id)
		references public.folders (workspace_id, id)
		on delete no action deferrable initially deferred
);

create index folders_workspace_parent_idx
	on public.folders (workspace_id, parent_folder_id);
create unique index folders_root_name_unique_idx
	on public.folders (workspace_id, pg_catalog.lower(name))
	where parent_folder_id is null;
create unique index folders_child_name_unique_idx
	on public.folders (workspace_id, parent_folder_id, pg_catalog.lower(name))
	where parent_folder_id is not null;

create index assets_workspace_folder_idx
	on public.assets (workspace_id, folder_id);
create index assets_workspace_active_updated_idx
	on public.assets (workspace_id, updated_at desc)
	where deleted_at is null;
create index assets_workspace_deleted_idx
	on public.assets (workspace_id, deleted_at desc)
	where deleted_at is not null;

create trigger workspaces_set_updated_at
	before update on public.workspaces
	for each row execute function private.set_updated_at();
create trigger brands_set_updated_at
	before update on public.brands
	for each row execute function private.set_updated_at();
create trigger folders_set_updated_at
	before update on public.folders
	for each row execute function private.set_updated_at();
create trigger assets_set_updated_at
	before update on public.assets
	for each row execute function private.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.brands enable row level security;
alter table public.folders enable row level security;
alter table public.assets enable row level security;

revoke all on table public.workspaces, public.brands, public.folders, public.assets
	from public, anon, authenticated;
grant select, insert, update, delete
	on table public.folders
	to authenticated;
grant select, insert, update
	on table public.workspaces, public.brands, public.assets
	to authenticated;

create policy workspaces_select_own
	on public.workspaces for select to authenticated
	using ((select auth.uid()) = user_id);
create policy workspaces_insert_own
	on public.workspaces for insert to authenticated
	with check ((select auth.uid()) = user_id);
create policy workspaces_update_own
	on public.workspaces for update to authenticated
	using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);
create policy brands_select_own_workspace
	on public.brands for select to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = brands.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy brands_insert_own_workspace
	on public.brands for insert to authenticated
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = brands.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy brands_update_own_workspace
	on public.brands for update to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = brands.workspace_id
			and workspace.user_id = (select auth.uid())
	))
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = brands.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy folders_select_own_workspace
	on public.folders for select to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = folders.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy folders_insert_own_workspace
	on public.folders for insert to authenticated
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = folders.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy folders_update_own_workspace
	on public.folders for update to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = folders.workspace_id
			and workspace.user_id = (select auth.uid())
	))
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = folders.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy folders_delete_own_workspace
	on public.folders for delete to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = folders.workspace_id
			and workspace.user_id = (select auth.uid())
	));

create policy assets_select_own_workspace
	on public.assets for select to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = assets.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy assets_insert_own_workspace
	on public.assets for insert to authenticated
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = assets.workspace_id
			and workspace.user_id = (select auth.uid())
	));
create policy assets_update_own_workspace
	on public.assets for update to authenticated
	using (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = assets.workspace_id
			and workspace.user_id = (select auth.uid())
	))
	with check (exists (
		select 1 from public.workspaces as workspace
		where workspace.id = assets.workspace_id
			and workspace.user_id = (select auth.uid())
	));
