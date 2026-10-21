begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into public.categories (id, user_id, name, icon_key)
values
  ('40000000-0000-4000-8000-000000000001', 'user_rls_one', 'Icons', 'icon-libraries'),
  ('40000000-0000-4000-8000-000000000002', 'user_rls_two', 'Courses', 'courses');

insert into public.tools (
  id, user_id, category_id, name, url, normalized_url, hostname, description
)
values
  (
    '41000000-0000-4000-8000-000000000001',
    'user_rls_one',
    '40000000-0000-4000-8000-000000000001',
    'Icon One',
    'https://example.com/icon-one',
    'https://example.com/icon-one',
    'example.com',
    'Owned by the first test user.'
  ),
  (
    '42000000-0000-4000-8000-000000000001',
    'user_rls_two',
    '40000000-0000-4000-8000-000000000002',
    'Course Two',
    'https://example.org/course-two',
    'https://example.org/course-two',
    'example.org',
    'Owned by the second test user.'
  );

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_rls_one","role":"authenticated"}';

select is(
  (select count(*)::integer from public.categories),
  1,
  'user one sees only their category'
);
select is(
  (select count(*)::integer from public.tools),
  1,
  'user one sees only their tool'
);
select is(
  (select user_id from public.categories limit 1),
  'user_rls_one',
  'visible category belongs to user one'
);
select lives_ok(
  $$insert into public.categories (name, icon_key) values ('AI Agents', 'ai-agents')$$,
  'user one can insert with the Clerk subject default'
);
select is(
  (select user_id from public.categories where name = 'AI Agents'),
  'user_rls_one',
  'inserted category receives the Clerk subject'
);
select lives_ok(
  $$update public.categories
    set name = 'Attempted Change'
    where id = '40000000-0000-4000-8000-000000000002'$$,
  'updating a category hidden by RLS affects no visible row'
);
select lives_ok(
  $$delete from public.tools
    where id = '42000000-0000-4000-8000-000000000001'$$,
  'deleting a tool hidden by RLS affects no visible row'
);
select throws_ok(
  $$insert into public.categories (user_id, name, icon_key) values ('user_rls_two', 'Stolen', 'general')$$,
  '42501',
  null,
  'user one cannot insert a category for user two'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"user_rls_two","role":"authenticated"}';

select is(
  (select name from public.categories),
  'Courses',
  'user two sees their unchanged category'
);
select is(
  (select count(*)::integer from public.tools),
  1,
  'user two sees only their tool'
);

reset role;
set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$select * from public.categories$$,
  '42501',
  'permission denied for table categories',
  'anonymous role cannot read categories'
);
select throws_ok(
  $$insert into public.categories (user_id, name, icon_key) values ('anonymous', 'Nope', 'general')$$,
  '42501',
  'permission denied for table categories',
  'anonymous role cannot insert categories'
);

reset role;
select * from finish();
rollback;
