-- Per-user tool favorites. Favorites are a presentation priority, not a
-- separate resource, so they use the existing owner/version update path.
alter table public.tools
  add column is_favorite boolean not null default false;

create index tools_user_favorite_created_at_idx
  on public.tools (user_id, is_favorite desc, created_at desc, id);

create or replace function public.get_library()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with category_rows as (
    select
      c.id,
      c.name,
      c.icon_key,
      c.version,
      c.created_at,
      c.updated_at,
      coalesce(t.tools, '[]'::jsonb) as tools,
      coalesce(t.tool_count, 0) as tool_count
    from public.categories c
    left join lateral (
      select
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'categoryId', x.category_id,
            'name', x.name,
            'url', x.url,
            'hostname', x.hostname,
            'description', x.description,
            'iconUrl', x.icon_url,
            'iconStatus', x.icon_status,
            'isFavorite', x.is_favorite,
            'version', x.version,
            'createdAt', x.created_at,
            'updatedAt', x.updated_at
          ) order by x.is_favorite desc, x.created_at desc, x.id
        ) as tools,
        count(*)::integer as tool_count
      from public.tools x
      where x.category_id = c.id
    ) t on true
  )
  select jsonb_build_object(
    'categories', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'iconKey', icon_key,
          'toolCount', tool_count,
          'version', version,
          'createdAt', created_at,
          'updatedAt', updated_at,
          'tools', tools
        ) order by lower(name), id
      ),
      '[]'::jsonb
    ),
    'meta', jsonb_build_object(
      'categoryCount', count(*)::integer,
      'toolCount', coalesce(sum(tool_count), 0)::integer
    )
  )
  from category_rows;
$$;

revoke all on function public.get_library() from public, anon;
grant execute on function public.get_library() to authenticated;
