create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  name text not null,
  normalized_name text generated always as (lower(name)) stored,
  icon_key text not null,
  version bigint not null default 1,
  created_at timestamp with time zone not null default statement_timestamp(),
  updated_at timestamp with time zone not null default statement_timestamp(),

  constraint categories_id_user_id_key unique (id, user_id),
  constraint categories_user_normalized_name_key unique (user_id, normalized_name),
  constraint categories_user_id_length check (char_length(user_id) between 1 and 255),
  constraint categories_name_length check (char_length(name) between 1 and 50),
  constraint categories_name_canonical check (
    name = regexp_replace(btrim(name), '\s+', ' ', 'g')
  ),
  constraint categories_icon_key_format check (
    char_length(icon_key) between 1 and 64
    and icon_key ~ '^[A-Za-z0-9_-]+$'
  ),
  constraint categories_version_positive check (version > 0),
  constraint categories_timestamps_ordered check (updated_at >= created_at)
);

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  category_id uuid not null,
  name text not null,
  url text not null,
  normalized_url text not null,
  hostname text not null,
  description text not null,
  icon_url text,
  icon_status text not null default 'fallback',
  version bigint not null default 1,
  created_at timestamp with time zone not null default statement_timestamp(),
  updated_at timestamp with time zone not null default statement_timestamp(),

  constraint tools_id_user_id_key unique (id, user_id),
  constraint tools_user_normalized_url_key unique (user_id, normalized_url),
  constraint tools_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on update restrict
    on delete restrict,
  constraint tools_user_id_length check (char_length(user_id) between 1 and 255),
  constraint tools_name_length check (char_length(name) between 1 and 100),
  constraint tools_name_canonical check (name = btrim(name)),
  constraint tools_url_length check (char_length(url) between 1 and 2048),
  constraint tools_url_scheme check (url ~* '^https?://'),
  constraint tools_normalized_url_length check (
    char_length(normalized_url) between 1 and 2048
  ),
  constraint tools_normalized_url_scheme check (normalized_url ~ '^https?://'),
  constraint tools_hostname_format check (
    char_length(hostname) between 1 and 253
    and hostname = lower(hostname)
    and hostname !~ '\s'
  ),
  constraint tools_description_length check (
    char_length(description) between 1 and 280
  ),
  constraint tools_description_canonical check (description = btrim(description)),
  constraint tools_icon_url check (
    icon_url is null
    or (char_length(icon_url) between 1 and 2048 and icon_url ~* '^https?://')
  ),
  constraint tools_icon_status check (
    icon_status in ('ready', 'fallback', 'unavailable')
  ),
  constraint tools_version_positive check (version > 0),
  constraint tools_timestamps_ordered check (updated_at >= created_at)
);

create index categories_user_created_at_idx
  on public.categories (user_id, created_at desc, id);

create index tools_user_category_created_at_idx
  on public.tools (user_id, category_id, created_at desc, id);

create index tools_user_created_at_idx
  on public.tools (user_id, created_at desc, id);

create function private.touch_owned_record()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception using
      errcode = '22023',
      message = 'record id is immutable';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception using
      errcode = '22023',
      message = 'record owner is immutable';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '22023',
      message = 'record creation timestamp is immutable';
  end if;

  new.version := old.version + 1;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.touch_owned_record() from public;
revoke all on function private.touch_owned_record() from anon, authenticated;

create trigger categories_touch_owned_record
before update on public.categories
for each row execute function private.touch_owned_record();

create trigger tools_touch_owned_record
before update on public.tools
for each row execute function private.touch_owned_record();

alter table public.categories enable row level security;
alter table public.tools enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.tools from anon, authenticated;

grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.tools to authenticated;

create policy categories_select_own
on public.categories
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy categories_insert_own
on public.categories
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy categories_update_own
on public.categories
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy categories_delete_own
on public.categories
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy tools_select_own
on public.tools
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy tools_insert_own
on public.tools
for insert
to authenticated
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy tools_update_own
on public.tools
for update
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy tools_delete_own
on public.tools
for delete
to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

comment on table public.categories is
  'Private user-owned categories. user_id is the Clerk session token subject.';
comment on table public.tools is
  'Private user-owned saved tools. Ownership must match the referenced category.';
comment on column public.tools.normalized_url is
  'Application-normalized URL used only for per-user duplicate detection.';
