alter table public.tools
  add column icon_slug text;

alter table public.tools
  add constraint tools_icon_slug_format check (
    icon_slug is null
    or (
      char_length(icon_slug) between 1 and 100
      and icon_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    )
  );

drop function public.create_tool_with_category(
  text, text, text, text, text, text, text, text, text
);

create function public.create_tool_with_category(
  p_category_name text,
  p_category_icon_key text,
  p_name text,
  p_url text,
  p_normalized_url text,
  p_hostname text,
  p_description text,
  p_icon_url text default null,
  p_icon_status text default 'fallback',
  p_icon_slug text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_category public.categories;
  created_tool public.tools;
begin
  if p_icon_status not in ('ready', 'fallback', 'unavailable') then
    raise exception using errcode = '22023', message = 'invalid icon status';
  end if;
  if p_icon_slug is not null and p_icon_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid icon slug';
  end if;

  insert into public.categories (name, icon_key)
  values (p_category_name, p_category_icon_key)
  returning * into created_category;

  insert into public.tools (
    category_id, name, url, normalized_url, hostname, description,
    icon_url, icon_status, icon_slug
  ) values (
    created_category.id, p_name, p_url, p_normalized_url, p_hostname, p_description,
    case when p_icon_slug is null and p_icon_status = 'ready' then p_icon_url else null end,
    case when p_icon_slug is not null then 'ready' else p_icon_status end,
    p_icon_slug
  )
  returning * into created_tool;

  return jsonb_build_object(
    'category', to_jsonb(created_category),
    'tool', to_jsonb(created_tool)
  );
end;
$$;

revoke all on function public.create_tool_with_category(
  text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_tool_with_category(
  text, text, text, text, text, text, text, text, text, text
) to authenticated;

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
      c.sort_order,
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
            'iconSlug', x.icon_slug,
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
          'sortOrder', sort_order,
          'toolCount', tool_count,
          'version', version,
          'createdAt', created_at,
          'updatedAt', updated_at,
          'tools', tools
        ) order by sort_order, id
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
