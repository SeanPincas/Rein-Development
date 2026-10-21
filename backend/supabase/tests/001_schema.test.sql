begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'tools', 'tools table exists');
select has_pk('public', 'categories', 'categories has a primary key');
select has_pk('public', 'tools', 'tools has a primary key');
select col_type_is('public', 'categories', 'user_id', 'text', 'category owner is text');
select col_type_is('public', 'tools', 'user_id', 'text', 'tool owner is text');
select col_type_is('public', 'categories', 'version', 'bigint', 'category version is bigint');
select col_type_is('public', 'tools', 'version', 'bigint', 'tool version is bigint');
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_user_normalized_name_key'
  ),
  'category names are unique per owner'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tools'::regclass
      and conname = 'tools_user_normalized_url_key'
  ),
  'tool URLs are unique per owner'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tools'::regclass
      and conname = 'tools_category_owner_fkey'
      and contype = 'f'
  ),
  'tool category references include ownership'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  'categories has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tools'::regclass),
  'tools has RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'categories'),
  4,
  'categories has four operation-specific policies'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tools'),
  4,
  'tools has four operation-specific policies'
);
select has_trigger(
  'public',
  'categories',
  'categories_touch_owned_record',
  'categories has the versioning trigger'
);
select has_trigger(
  'public',
  'tools',
  'tools_touch_owned_record',
  'tools has the versioning trigger'
);
select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('categories', 'tools')
      and grantee = 'anon'
  ),
  0,
  'anon has no direct table grants'
);

select * from finish();
rollback;
