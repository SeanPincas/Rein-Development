drop function public.create_tool_with_category(
  text, text, text, text, text, text, text
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
  p_icon_status text default 'fallback'
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

  insert into public.categories (name, icon_key)
  values (p_category_name, p_category_icon_key)
  returning * into created_category;

  insert into public.tools (
    category_id, name, url, normalized_url, hostname, description, icon_url, icon_status
  ) values (
    created_category.id, p_name, p_url, p_normalized_url, p_hostname, p_description,
    case when p_icon_status = 'ready' then p_icon_url else null end,
    p_icon_status
  )
  returning * into created_tool;

  return jsonb_build_object(
    'category', to_jsonb(created_category),
    'tool', to_jsonb(created_tool)
  );
end;
$$;

revoke all on function public.create_tool_with_category(
  text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_tool_with_category(
  text, text, text, text, text, text, text, text, text
) to authenticated;
