begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column('public', 'tools', 'icon_slug', 'tools have a Simple Icons slug');
select col_type_is('public', 'tools', 'icon_slug', 'text', 'icon slug is text');

insert into public.categories (id, user_id, name, icon_key)
values ('54000000-0000-4000-8000-000000000001', 'user_icon_slug', 'Tools', 'general');

insert into public.tools (id, user_id, category_id, name, url, normalized_url, hostname, description, icon_slug)
values ('55000000-0000-4000-8000-000000000001', 'user_icon_slug', '54000000-0000-4000-8000-000000000001',
  'GitHub', 'https://github.com', 'https://github.com/', 'github.com', 'Code hosting.', 'github');

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_icon_slug","role":"authenticated"}';

select is(public.get_library() #>> '{categories,0,tools,0,iconSlug}', 'github', 'library returns the selected icon slug');
select throws_ok(
  $$insert into public.tools (user_id, category_id, name, url, normalized_url, hostname, description, icon_slug)
    values ('user_icon_slug', '54000000-0000-4000-8000-000000000001', 'Invalid', 'https://invalid.example',
      'https://invalid.example/', 'invalid.example', 'Invalid slug.', 'GitHub');$$,
  '23514', null, 'invalid icon slugs are rejected');

select is((select icon_url from public.tools where id = '55000000-0000-4000-8000-000000000001'), null, 'selected icons do not store remote URLs');

reset role;
select * from finish();
rollback;
