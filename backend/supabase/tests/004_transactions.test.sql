begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_transactions","role":"authenticated"}';

select lives_ok(
  $$select public.create_tool_with_category(
    'Icon Libraries', 'icon-libraries', 'Heroicons', 'https://heroicons.com/',
    'https://heroicons.com/', 'heroicons.com', 'SVG icons for interfaces.'
  )$$,
  'inline category and tool creation succeeds'
);

select is(
  (select count(*)::integer from public.categories),
  1,
  'inline creation creates one category'
);
select is(
  (select count(*)::integer from public.tools),
  1,
  'inline creation creates one tool'
);

select throws_ok(
  $$select public.create_tool_with_category(
    'Temporary Category', 'general', 'Duplicate Heroicons', 'https://heroicons.com/',
    'https://heroicons.com/', 'heroicons.com', 'Must roll back the category.'
  )$$,
  '23505',
  null,
  'duplicate tool URL rejects the transaction'
);
select is(
  (select count(*)::integer from public.categories),
  1,
  'failed tool creation rolls back its inline category'
);

select is(
  (public.delete_category_with_reassignment(
    (select id from public.categories where name = 'Icon Libraries'), 1, null
  ) ->> 'status'),
  'category_not_empty',
  'populated category requires reassignment'
);

insert into public.categories (name, icon_key)
values ('Design', 'design');

select is(
  (public.delete_category_with_reassignment(
    (select id from public.categories where name = 'Icon Libraries'), 99,
    (select id from public.categories where name = 'Design')
  ) ->> 'status'),
  'stale_version',
  'stale category deletion is rejected'
);

select is(
  (public.delete_category_with_reassignment(
    (select id from public.categories where name = 'Icon Libraries'), 1,
    (select id from public.categories where name = 'Design')
  ) ->> 'status'),
  'deleted',
  'populated category can be atomically reassigned and deleted'
);

select is(
  (select c.name from public.categories c join public.tools t on t.category_id = c.id),
  'Design',
  'tool moves to the destination category'
);
select is(
  (select version from public.tools),
  2::bigint,
  'reassignment increments the tool version'
);

reset role;
select * from finish();
rollback;
