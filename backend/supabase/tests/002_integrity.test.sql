begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into public.categories (id, user_id, name, icon_key)
values
  ('30000000-0000-4000-8000-000000000001', 'user_test_one', 'Databases', 'databases'),
  ('30000000-0000-4000-8000-000000000002', 'user_test_two', 'Databases', 'databases');

select lives_ok(
  $$
    insert into public.tools (
      id, user_id, category_id, name, url, normalized_url, hostname, description
    ) values (
      '31000000-0000-4000-8000-000000000001',
      'user_test_one',
      '30000000-0000-4000-8000-000000000001',
      'Postgres Docs',
      'https://www.postgresql.org/docs/',
      'https://www.postgresql.org/docs/',
      'www.postgresql.org',
      'Official PostgreSQL documentation.'
    )
  $$,
  'a tool can reference its owner category'
);

select throws_ok(
  $$
    insert into public.tools (
      user_id, category_id, name, url, normalized_url, hostname, description
    ) values (
      'user_test_one',
      '30000000-0000-4000-8000-000000000002',
      'Foreign category',
      'https://example.com/foreign',
      'https://example.com/foreign',
      'example.com',
      'Must fail ownership-aware foreign key.'
    )
  $$,
  '23503',
  null,
  'a tool cannot reference another owner category'
);

select throws_ok(
  $$
    insert into public.categories (user_id, name, icon_key)
    values ('user_test_one', 'databases', 'general')
  $$,
  '23505',
  null,
  'category names are case-insensitively unique per user'
);

select throws_ok(
  $$
    insert into public.categories (user_id, name, icon_key)
    values ('user_test_one', '  Invalid spacing', 'general')
  $$,
  '23514',
  null,
  'category names must be canonical'
);

select throws_ok(
  $$
    insert into public.categories (user_id, name, icon_key)
    values ('user_test_one', 'Unknown icon', 'not-in-catalogue')
  $$,
  '23514',
  null,
  'category icons must use the shared catalogue'
);

select throws_ok(
  $$
    insert into public.tools (
      user_id, category_id, name, url, normalized_url, hostname, description
    ) values (
      'user_test_one',
      '30000000-0000-4000-8000-000000000001',
      'Invalid URL',
      'javascript:alert(1)',
      'javascript:alert(1)',
      'example.com',
      'Unsafe schemes are rejected.'
    )
  $$,
  '23514',
  null,
  'tool URLs require HTTP or HTTPS'
);

update public.categories
set name = 'Database Tools'
where id = '30000000-0000-4000-8000-000000000001';

select is(
  (select version from public.categories where id = '30000000-0000-4000-8000-000000000001'),
  2::bigint,
  'updates increment category versions'
);

select ok(
  (
    select updated_at >= created_at
    from public.categories
    where id = '30000000-0000-4000-8000-000000000001'
  ),
  'updates refresh updated_at'
);

select throws_ok(
  $$
    update public.categories
    set user_id = 'user_test_two'
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  '22023',
  'record owner is immutable',
  'category ownership is immutable'
);

select throws_ok(
  $$
    delete from public.categories
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  '23503',
  null,
  'a populated category cannot be deleted directly'
);

select is(
  (
    select count(*)::integer
    from public.categories
    where user_id = 'user_test_one'
  ),
  1,
  'failed integrity operations preserve the original category'
);

select * from finish();
rollback;
