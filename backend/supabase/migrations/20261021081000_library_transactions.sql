create function public.create_tool_with_category(
  p_category_name text,
  p_category_icon_key text,
  p_name text,
  p_url text,
  p_normalized_url text,
  p_hostname text,
  p_description text
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
  insert into public.categories (name, icon_key)
  values (p_category_name, p_category_icon_key)
  returning * into created_category;

  insert into public.tools (
    category_id, name, url, normalized_url, hostname, description
  ) values (
    created_category.id, p_name, p_url, p_normalized_url, p_hostname, p_description
  )
  returning * into created_tool;

  return jsonb_build_object(
    'category', to_jsonb(created_category),
    'tool', to_jsonb(created_tool)
  );
end;
$$;

create function public.delete_category_with_reassignment(
  p_category_id uuid,
  p_version bigint,
  p_reassign_to uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_category public.categories;
  destination_category public.categories;
  reassigned_count integer := 0;
begin
  select * into source_category
  from public.categories
  where id = p_category_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if source_category.version <> p_version then
    return jsonb_build_object('status', 'stale_version');
  end if;

  if p_reassign_to is null then
    if exists (
      select 1 from public.tools where category_id = p_category_id limit 1
    ) then
      return jsonb_build_object('status', 'category_not_empty');
    end if;
  else
    if p_reassign_to = p_category_id then
      return jsonb_build_object('status', 'invalid_destination');
    end if;

    select * into destination_category
    from public.categories
    where id = p_reassign_to
    for update;

    if not found then
      return jsonb_build_object('status', 'invalid_destination');
    end if;

    update public.tools
    set category_id = destination_category.id
    where category_id = source_category.id;
    get diagnostics reassigned_count = row_count;
  end if;

  delete from public.categories where id = source_category.id;

  return jsonb_build_object(
    'status', 'deleted',
    'reassigned_count', reassigned_count
  );
end;
$$;

revoke all on function public.create_tool_with_category(
  text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_tool_with_category(
  text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.delete_category_with_reassignment(
  uuid, bigint, uuid
) from public, anon;
grant execute on function public.delete_category_with_reassignment(
  uuid, bigint, uuid
) to authenticated;
