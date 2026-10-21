alter table public.categories
  add column sort_order bigint not null default 0;

with ranked as (
  select
    id,
    row_number() over (partition by user_id order by created_at, id)::bigint as next_sort_order
  from public.categories
)
update public.categories c
set sort_order = ranked.next_sort_order
from ranked
where c.id = ranked.id;

alter table public.categories
  add constraint categories_sort_order_positive check (sort_order > 0);

create index categories_user_sort_order_idx
  on public.categories (user_id, sort_order, id);

create function private.assign_category_sort_order()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.sort_order = 0 then
    select coalesce(max(c.sort_order), 0) + 1
    into new.sort_order
    from public.categories c
    where c.user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function private.assign_category_sort_order() from public;
revoke all on function private.assign_category_sort_order() from anon, authenticated;

create trigger categories_assign_sort_order
before insert on public.categories
for each row execute function private.assign_category_sort_order();

create or replace function public.reorder_categories(p_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  received_count integer;
  owned_count integer;
  distinct_order_count integer;
  updated_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'Category order must be an array.';
  end if;

  select count(*)::integer, count(distinct item.id)::integer, count(distinct item.sort_order)::integer
  into received_count, owned_count, distinct_order_count
  from jsonb_to_recordset(p_items) as item(id uuid, sort_order bigint)
  join public.categories c on c.id = item.id
  where c.user_id = (select auth.jwt() ->> 'sub');

  select count(*)::integer
  into expected_count
  from public.categories c
  where c.user_id = (select auth.jwt() ->> 'sub');

  if received_count <> expected_count or owned_count <> expected_count
     or distinct_order_count <> expected_count
     or exists (
       select 1
       from jsonb_to_recordset(p_items) as item(id uuid, sort_order bigint)
       where item.sort_order < 1 or item.sort_order > expected_count
     ) then
    raise exception using errcode = '22023', message = 'Provide every owned category exactly once with a valid order.';
  end if;

  update public.categories c
  set sort_order = item.sort_order
  from jsonb_to_recordset(p_items) as item(id uuid, sort_order bigint)
  where c.id = item.id
    and c.user_id = (select auth.jwt() ->> 'sub');

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.reorder_categories(jsonb) from public, anon;
grant execute on function public.reorder_categories(jsonb) to authenticated;

-- Keep the read model ordered after this migration is applied to an existing project.
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
