begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.categories (id, user_id, name, icon_key, created_at)
values
  ('50000000-0000-4000-8000-000000000001', 'user_library', 'Zeta', 'general', '2026-01-01'),
  ('50000000-0000-4000-8000-000000000002', 'user_library', 'Alpha', 'general', '2026-01-01'),
  ('50000000-0000-4000-8000-000000000003', 'user_other', 'Foreign', 'general', '2026-01-01');

insert into public.tools (id, user_id, category_id, name, url, normalized_url, hostname, description, created_at)
values
  ('51000000-0000-4000-8000-000000000001', 'user_library', '50000000-0000-4000-8000-000000000001', 'Older', 'https://example.com/old', 'https://example.com/old', 'example.com', 'Older tool.', '2026-01-01'),
  ('51000000-0000-4000-8000-000000000002', 'user_library', '50000000-0000-4000-8000-000000000001', 'Newer', 'https://example.com/new', 'https://example.com/new', 'example.com', 'Newer tool.', '2026-01-02');

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_library","role":"authenticated"}';

select is((public.get_library() #>> '{meta,categoryCount}')::integer, 2, 'counts owned categories');
select is((public.get_library() #>> '{meta,toolCount}')::integer, 2, 'counts owned tools');
select is(public.get_library() #>> '{categories,0,name}', 'Alpha', 'sorts categories by name');
select is(public.get_library() #>> '{categories,0,toolCount}', '0', 'includes empty categories');
select is(public.get_library() #>> '{categories,1,tools,0,name}', 'Newer', 'sorts newest tools first');
select is(jsonb_array_length(public.get_library() -> 'categories'), 2, 'RLS excludes foreign categories');

reset role;
select * from finish();
rollback;
