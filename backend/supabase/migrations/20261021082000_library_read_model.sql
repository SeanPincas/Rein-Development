create function public.get_library()
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
            'version', x.version,
            'createdAt', x.created_at,
            'updatedAt', x.updated_at
          ) order by x.created_at desc, x.id
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
